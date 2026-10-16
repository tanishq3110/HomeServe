/**
 * wallet.concurrency.test.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Phase 15 — Wallet Concurrency, Idempotency & Ledger Reconciliation Suite.
 *
 * Scenarios tested:
 *   1. Atomic balance floor: 5 simultaneous concurrent debit requests on a wallet
 *      with funds sufficient for only 2 debits. Exactly 2 succeed, 3 fail cleanly
 *      with 422 Insufficient Balance, and the balance remains non-negative.
 *   2. Idempotency collisions: Parallel identical payment requests for the same booking
 *      result in exactly one success and proper 409 Conflict rejection for duplicates.
 *   3. Balance Reconciliation: Sum of all transaction ledger entries matches the
 *      wallet's actual balancePaise precisely.
 *   4. Admin adjustments record complete audit trail with admin userId, timestamps,
 *      and balance transitions.
 *   5. API error responses do not leak database credentials, stack traces, or internal paths.
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const request = require('supertest');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: require('path').join(__dirname, '..', '.env') });

let app;
const User = require('../models/user.model');
const Booking = require('../models/booking.model');
const Service = require('../models/service.model');
const Wallet = require('../models/wallet.model');
const WalletTransaction = require('../models/walletTransaction.model');

let customerToken;
let adminToken;
let customerId;
let adminId;
let testService;

beforeAll(async () => {
  const mongoUri = process.env.MONGODB_TEST_URI || process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) throw new Error('No MongoDB URI found.');

  await mongoose.connect(mongoUri);
  app = require('../server');

  await Promise.all([
    User.deleteMany({ email: { $regex: /@concurrency-test\.homeserve$/ } }),
    Wallet.deleteMany({}),
    WalletTransaction.deleteMany({}),
    Booking.deleteMany({ serviceName: 'Concurrency Test Service' }),
    Service.deleteMany({ slug: 'concurrency-test-service' }),
  ]);

  const customer = await User.create({
    name: 'Concurrent Customer',
    email: 'c1@concurrency-test.homeserve',
    password: 'Password123!',
    role: 'CUSTOMER',
  });
  customerId = customer._id;

  const admin = await User.create({
    name: 'Concurrent Admin',
    email: 'admin@concurrency-test.homeserve',
    password: 'Password123!',
    role: 'ADMIN',
  });
  adminId = admin._id;

  testService = await Service.create({
    name: 'Concurrency Test Service',
    slug: 'concurrency-test-service',
    category: 'Electrical',
    startingPrice: 300,
    iconName: 'Zap',
  });

  const cLogin = await request(app).post('/api/auth/login').send({
    email: 'c1@concurrency-test.homeserve',
    password: 'Password123!',
  });
  customerToken = cLogin.body.token;

  const aLogin = await request(app).post('/api/auth/login').send({
    email: 'admin@concurrency-test.homeserve',
    password: 'Password123!',
  });
  adminToken = aLogin.body.token;
});

afterAll(async () => {
  await Promise.all([
    User.deleteMany({ email: { $regex: /@concurrency-test\.homeserve$/ } }),
    Wallet.deleteMany({}),
    WalletTransaction.deleteMany({}),
    Booking.deleteMany({ serviceName: 'Concurrency Test Service' }),
    Service.deleteMany({ slug: 'concurrency-test-service' }),
  ]);
  await mongoose.connection.close();
});

describe('Phase 15 — Wallet Concurrency, Idempotency & Reconciliation', () => {
  describe('1. Concurrency & Balance Floor Guard', () => {
    it('prevents overspending when 5 parallel debit attempts compete for limited funds', async () => {
      // 1. Credit wallet with 600 INR (60,000 paise)
      await request(app)
        .post(`/api/wallet/admin/${customerId}/adjustments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'CREDIT',
          amountPaise: 60000,
          reason: 'Initial seed for concurrency race test',
        })
        .expect(200);

      // Create 5 separate bookings costing 300 INR (30,000 paise) each
      const bookings = [];
      for (let i = 0; i < 5; i++) {
        const b = await Booking.create({
          customerId,
          serviceId: testService._id,
          serviceName: 'Concurrency Test Service',
          scheduledDate: new Date(Date.now() + 86400000),
          scheduledTime: '14:00',
          address: {
            fullName: 'Concurrent Customer',
            phone: '9876543210',
            addressLine: '123 Concurrency Rd',
            city: 'Bangalore',
            state: 'Karnataka',
            postalCode: '560001',
          },
          urgency: 'NORMAL',
          basePrice: 300,
          urgencyCharge: 0,
          distanceCharge: 0,
          totalPrice: 300,
          status: 'REQUESTED',
          paymentStatus: 'PENDING',
        });
        bookings.push(b);
      }

      // Fire 5 simultaneous wallet payment requests (funds only cover 2 payments: 60,000 / 30,000 = 2)
      const paymentPromises = bookings.map((b) =>
        request(app)
          .post('/api/wallet/payments')
          .set('Authorization', `Bearer ${customerToken}`)
          .set('Idempotency-Key', `race-key-${b._id}`)
          .send({ bookingId: b._id.toString() })
      );

      const results = await Promise.all(paymentPromises);

      const successful = results.filter((r) => r.status === 200);
      const rejected = results.filter((r) => r.status === 422);

      // Exactly 2 must succeed, 3 must be rejected with 422 Unprocessable (insufficient balance)
      expect(successful.length).toBe(2);
      expect(rejected.length).toBe(3);

      for (const rej of rejected) {
        expect(rej.body.success).toBe(false);
        expect(rej.body.message.toLowerCase()).toContain('insufficient');
      }

      // Check final wallet balance: must be exactly 0 paise (60,000 - 30,000 - 30,000 = 0)
      const walletRes = await request(app)
        .get('/api/wallet')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(walletRes.body.data.balancePaise).toBe(0);
      expect(walletRes.body.data.balanceRupees).toBe('0.00');
    });
  });

  describe('2. Idempotent Payment Requests', () => {
    it('rejects duplicated payment requests using the same idempotency key or booking', async () => {
      // Add 500 INR (50,000 paise) to wallet
      await request(app)
        .post(`/api/wallet/admin/${customerId}/adjustments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'CREDIT',
          amountPaise: 50000,
          reason: 'Idempotency test funds seed',
        })
        .expect(200);

      const booking = await Booking.create({
        customerId,
        serviceId: testService._id,
        serviceName: 'Concurrency Test Service',
        scheduledDate: new Date(Date.now() + 86400000),
        scheduledTime: '15:00',
        address: {
          fullName: 'Concurrent Customer',
          phone: '9876543210',
          addressLine: '123 Concurrency Rd',
          city: 'Bangalore',
          state: 'Karnataka',
          postalCode: '560001',
        },
        urgency: 'NORMAL',
        basePrice: 300,
        urgencyCharge: 0,
        distanceCharge: 0,
        totalPrice: 300,
        status: 'REQUESTED',
        paymentStatus: 'PENDING',
      });

      const fixedKey = `fixed-idem-key-${Date.now()}`;

      // First call succeeds
      const firstRes = await request(app)
        .post('/api/wallet/payments')
        .set('Authorization', `Bearer ${customerToken}`)
        .set('Idempotency-Key', fixedKey)
        .send({ bookingId: booking._id.toString() })
        .expect(200);

      expect(firstRes.body.success).toBe(true);

      // Repeated call returns 409 Conflict (already paid or idempotent duplicate)
      const secondRes = await request(app)
        .post('/api/wallet/payments')
        .set('Authorization', `Bearer ${customerToken}`)
        .set('Idempotency-Key', fixedKey)
        .send({ bookingId: booking._id.toString() });

      expect(secondRes.status).toBe(409);
      expect(secondRes.body.success).toBe(false);
    });
  });

  describe('3. Ledger & Wallet Balance Reconciliation', () => {
    it('verifies that the sum of all ledger entries mathematically equals wallet balancePaise', async () => {
      const wallet = await Wallet.findOne({ ownerId: customerId });
      expect(wallet).toBeTruthy();

      // Fetch all ledger transactions for this customer
      const transactions = await WalletTransaction.find({ ownerId: customerId, status: 'COMPLETED' });
      expect(transactions.length).toBeGreaterThan(0);

      let computedPaise = 0;
      for (const tx of transactions) {
        if (tx.type === 'CREDIT' || tx.type === 'REFUND') {
          computedPaise += tx.amountPaise;
        } else if (tx.type === 'DEBIT') {
          computedPaise -= tx.amountPaise;
        }
      }

      // The mathematically calculated net amount from the immutable ledger must match wallet balancePaise
      expect(computedPaise).toBe(wallet.balancePaise);
    });
  });

  describe('4. Admin Adjustment Auditing & Boundaries', () => {
    it('audits admin user ID, timestamp, and balance progression on manual adjustment', async () => {
      const creditRes = await request(app)
        .post(`/api/wallet/admin/${customerId}/adjustments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'CREDIT',
          amountPaise: 15000,
          reason: 'Audited promotional credit bonus',
        })
        .expect(200);

      expect(creditRes.body.success).toBe(true);

      // Verify the audit transaction record
      const auditTx = await WalletTransaction.findOne({
        ownerId: customerId,
        type: 'CREDIT',
        adminReason: 'Audited promotional credit bonus',
      });

      expect(auditTx).toBeTruthy();
      expect(auditTx.adminId.toString()).toBe(adminId.toString());
      expect(auditTx.amountPaise).toBe(15000);
      expect(auditTx.balanceAfterPaise).toBeGreaterThanOrEqual(15000);
      expect(auditTx.createdAt).toBeInstanceOf(Date);
    });

    it('rejects unauthenticated and non-admin attempts to execute adjustments', async () => {
      // No token -> 401
      await request(app)
        .post(`/api/wallet/admin/${customerId}/adjustments`)
        .send({ type: 'CREDIT', amountPaise: 10000, reason: 'Valid reason exceeding ten chars' })
        .expect(401);

      // Customer token -> 403
      await request(app)
        .post(`/api/wallet/admin/${customerId}/adjustments`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ type: 'CREDIT', amountPaise: 10000, reason: 'Valid reason exceeding ten chars' })
        .expect(403);
    });
  });

  describe('5. Error Handling & Secret Leak Prevention', () => {
    it('does not leak JWT_SECRET, mongoUri, or system stack trace in API error responses', async () => {
      const res = await request(app)
        .post('/api/wallet/payments')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ bookingId: 'invalid-mongo-id' });

      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.body.success).toBe(false);

      const bodyStr = JSON.stringify(res.body);
      expect(bodyStr).not.toContain(process.env.JWT_SECRET || 'jwt-test-secret');
      expect(bodyStr).not.toContain('mongodb://');
      expect(bodyStr).not.toContain('at Context.');
      expect(bodyStr).not.toContain('node_modules');
    });
  });
});
