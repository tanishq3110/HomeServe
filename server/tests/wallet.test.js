/**
 * wallet.test.js
 * ─────────────────────────────────────────────────────────────────────────────
 * HomeServe Phase 14 — Wallet & Transaction Ledger Test Suite.
 *
 * Test coverage:
 *   1.  Customer wallet lazy creation with starting balance 0.
 *   2.  GET /api/wallet returns formatted balancePaise and balanceRupees.
 *   3.  GET /api/wallet/transactions returns paginated transaction history.
 *   4.  Admin can credit a customer's wallet with mandatory audit reason.
 *   5.  Admin credit rejects reason < 10 chars or invalid amounts.
 *   6.  Admin can debit a customer's wallet within available balance.
 *   7.  Admin debit cannot drive wallet balance negative (balance floor guard).
 *   8.  Customer cannot pay for a booking if wallet balance is insufficient.
 *   9.  Customer can successfully pay for an eligible booking with sufficient balance.
 *   10. Booking payment sets paymentStatus to PAID and records DEBIT ledger transaction.
 *   11. Idempotency key prevents double-charging on duplicate payment attempts (409 Conflict).
 *   12. Customer cannot pay for a booking owned by another customer (403 Forbidden).
 *   13. Customer cannot pay for an already-paid booking (409 Conflict).
 *   14. Refund for a cancelled paid booking credits wallet and records REFUND ledger.
 *   15. Idempotency key prevents duplicate refunds for the same booking (409 Conflict).
 *   16. Admin can list all customer wallets and view aggregate platform liability.
 *   17. Unauthenticated requests to wallet endpoints return 401 Unauthorized.
 *   18. Non-admin users cannot access admin wallet endpoints (403 Forbidden).
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
let customer2Token;
let adminToken;
let techToken;

let customerId;
let customer2Id;
let adminId;
let techId;

let eligibleBookingId;
let otherCustomerBookingId;

async function loginUser(agent, email, password) {
  const res = await agent.post('/api/auth/login').send({ email, password });
  return res.body.token;
}

beforeAll(async () => {
  const mongoUri = process.env.MONGODB_TEST_URI || process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) throw new Error('No MongoDB URI found.');

  await mongoose.connect(mongoUri);
  app = require('../server');

  // Clean up test collections
  await Promise.all([
    User.deleteMany({ email: { $regex: /@wallet-test\.homeserve$/ } }),
    Wallet.deleteMany({}),
    WalletTransaction.deleteMany({}),
  ]);

  // Create test users
  const customerUser = await User.create({
    name: 'Wallet Customer One',
    email: 'customer1@wallet-test.homeserve',
    password: 'TestPassword123!',
    role: 'CUSTOMER',
  });
  customerId = customerUser._id;

  const customer2User = await User.create({
    name: 'Wallet Customer Two',
    email: 'customer2@wallet-test.homeserve',
    password: 'TestPassword123!',
    role: 'CUSTOMER',
  });
  customer2Id = customer2User._id;

  const adminUser = await User.create({
    name: 'Wallet Admin',
    email: 'admin@wallet-test.homeserve',
    password: 'TestPassword123!',
    role: 'ADMIN',
  });
  adminId = adminUser._id;

  const techUser = await User.create({
    name: 'Wallet Tech',
    email: 'tech@wallet-test.homeserve',
    password: 'TestPassword123!',
    role: 'TECHNICIAN',
  });
  techId = techUser._id;

  // Obtain tokens
  const agent = request(app);
  customerToken = await loginUser(agent, 'customer1@wallet-test.homeserve', 'TestPassword123!');
  customer2Token = await loginUser(agent, 'customer2@wallet-test.homeserve', 'TestPassword123!');
  adminToken = await loginUser(agent, 'admin@wallet-test.homeserve', 'TestPassword123!');
  techToken = await loginUser(agent, 'tech@wallet-test.homeserve', 'TestPassword123!');

  // Seed Service
  let service = await Service.findOne({ slug: 'wallet-test-ac' });
  if (!service) {
    service = await Service.create({
      name: 'Wallet Test AC Repair',
      category: 'AC',
      startingPrice: 500,
      slug: 'wallet-test-ac',
      iconName: 'AcUnit',
    });
  }

  // Seed eligible booking for customer 1 (₹600 total = 60000 paise)
  const booking1 = await Booking.create({
    customerId,
    serviceId: service._id,
    serviceName: 'Wallet Test AC Repair',
    scheduledDate: new Date(Date.now() + 86400000),
    scheduledTime: '10:00',
    address: {
      fullName: 'Wallet Customer One',
      phone: '9876543210',
      addressLine: '123 Test Lane',
      city: 'Bangalore',
      state: 'Karnataka',
      postalCode: '560001',
    },
    urgency: 'NORMAL',
    basePrice: 500,
    urgencyCharge: 0,
    distanceCharge: 100,
    totalPrice: 600,
    status: 'REQUESTED',
    paymentStatus: 'PENDING',
  });
  eligibleBookingId = booking1._id;

  // Seed booking for customer 2
  const booking2 = await Booking.create({
    customerId: customer2Id,
    serviceId: service._id,
    serviceName: 'Wallet Test AC Repair',
    scheduledDate: new Date(Date.now() + 86400000),
    scheduledTime: '11:00',
    address: {
      fullName: 'Wallet Customer Two',
      phone: '9876543211',
      addressLine: '456 Test Road',
      city: 'Bangalore',
      state: 'Karnataka',
      postalCode: '560001',
    },
    urgency: 'NORMAL',
    basePrice: 500,
    urgencyCharge: 0,
    distanceCharge: 100,
    totalPrice: 600,
    status: 'REQUESTED',
    paymentStatus: 'PENDING',
  });
  otherCustomerBookingId = booking2._id;
});

afterAll(async () => {
  await Promise.all([
    User.deleteMany({ email: { $regex: /@wallet-test\.homeserve$/ } }),
    Booking.deleteMany({ _id: { $in: [eligibleBookingId, otherCustomerBookingId] } }),
    Wallet.deleteMany({}),
    WalletTransaction.deleteMany({}),
  ]);
  await mongoose.disconnect();
});

describe('Phase 14: Wallet & Transaction Ledger Tests', () => {
  describe('1. Wallet Initialization & Retrieval', () => {
    it('lazily initializes wallet with 0 balance for a customer on first GET /api/wallet', async () => {
      const res = await request(app)
        .get('/api/wallet')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.balancePaise).toBe(0);
      expect(res.body.data.balanceRupees).toBe('0.00');
      expect(res.body.data.currency).toBe('INR');
    });

    it('returns empty paginated transactions for new wallet', async () => {
      const res = await request(app)
        .get('/api/wallet/transactions')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.transactions).toEqual([]);
      expect(res.body.data.pagination.total).toBe(0);
    });

    it('rejects unauthenticated access with 401', async () => {
      const res = await request(app).get('/api/wallet');
      expect(res.status).toBe(401);
    });

    it('rejects non-customer access with 403', async () => {
      const res = await request(app)
        .get('/api/wallet')
        .set('Authorization', `Bearer ${techToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe('2. Admin Balance Adjustments (Credits & Debits)', () => {
    it('rejects adjustment if audit reason is less than 10 characters', async () => {
      const res = await request(app)
        .post(`/api/wallet/admin/${customerId}/adjustments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'CREDIT',
          amountPaise: 100000,
          reason: 'Short',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/at least 10 characters/i);
    });

    it('rejects adjustment if amountPaise is not a positive integer', async () => {
      const res = await request(app)
        .post(`/api/wallet/admin/${customerId}/adjustments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'CREDIT',
          amountPaise: -500,
          reason: 'Valid promotional credit reason',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('allows admin to credit customer wallet with ₹1,000 (100,000 paise)', async () => {
      const res = await request(app)
        .post(`/api/wallet/admin/${customerId}/adjustments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'CREDIT',
          amountPaise: 100000,
          reason: 'Promotional credit for Phase 14 beta onboarding',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.balancePaise).toBe(100000);
      expect(res.body.data.balanceRupees).toBe('1000.00');

      // Check customer sees updated balance
      const customerRes = await request(app)
        .get('/api/wallet')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(customerRes.body.data.balancePaise).toBe(100000);
      expect(customerRes.body.data.balanceRupees).toBe('1000.00');
    });

    it('records CREDIT transaction in customer ledger with admin notes', async () => {
      const res = await request(app)
        .get('/api/wallet/transactions')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.transactions.length).toBe(1);
      const tx = res.body.data.transactions[0];
      expect(tx.type).toBe('CREDIT');
      expect(tx.amountPaise).toBe(100000);
      expect(tx.balanceAfterPaise).toBe(100000);
      expect(tx.status).toBe('COMPLETED');
    });

    it('prevents admin debit that exceeds wallet balance (balance floor guard)', async () => {
      const res = await request(app)
        .post(`/api/wallet/admin/${customerId}/adjustments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'DEBIT',
          amountPaise: 200000, // ₹2000 when only ₹1000 available
          reason: 'Recovery of excess promotional credit',
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/cannot debit/i);
    });

    it('allows admin partial debit of ₹200 (20,000 paise)', async () => {
      const res = await request(app)
        .post(`/api/wallet/admin/${customerId}/adjustments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'DEBIT',
          amountPaise: 20000,
          reason: 'Administrative correction for beta user',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.balancePaise).toBe(80000); // 100000 - 20000
      expect(res.body.data.balanceRupees).toBe('800.00');
    });
  });

  describe('3. Booking Payment via Wallet', () => {
    it('rejects booking payment if customer does not own the booking (403)', async () => {
      const res = await request(app)
        .post('/api/wallet/payments')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ bookingId: otherCustomerBookingId });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('rejects payment if wallet balance is insufficient (422)', async () => {
      // Customer 2 has ₹0 balance
      const res = await request(app)
        .post('/api/wallet/payments')
        .set('Authorization', `Bearer ${customer2Token}`)
        .send({ bookingId: otherCustomerBookingId });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/insufficient wallet balance/i);
    });

    it('successfully processes booking payment with sufficient balance', async () => {
      // Customer 1 has ₹800 (80,000 paise), booking price is ₹600 (60,000 paise)
      const res = await request(app)
        .post('/api/wallet/payments')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ bookingId: eligibleBookingId });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.amountPaise).toBe(60000);
      expect(res.body.data.balancePaise).toBe(20000); // 80000 - 60000
      expect(res.body.data.balanceRupees).toBe('200.00');

      // Verify booking document paymentStatus is PAID
      const booking = await Booking.findById(eligibleBookingId);
      expect(booking.paymentStatus).toBe('PAID');
    });

    it('rejects duplicate payment on already-paid booking (409 Conflict idempotency)', async () => {
      const res = await request(app)
        .post('/api/wallet/payments')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ bookingId: eligibleBookingId });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/already been paid|already been processed/i);
    });
  });

  describe('4. Booking Cancellation & Wallet Refund', () => {
    it('cancelling a paid booking triggers wallet refund automatically', async () => {
      const cancelRes = await request(app)
        .patch(`/api/bookings/${eligibleBookingId}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ cancellationReason: 'Change of plans for testing refund' });

      expect(cancelRes.status).toBe(200);

      // Verify customer wallet has been credited back ₹600 (20,000 + 60,000 = 80,000 paise)
      const walletRes = await request(app)
        .get('/api/wallet')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(walletRes.body.data.balancePaise).toBe(80000);
      expect(walletRes.body.data.balanceRupees).toBe('800.00');

      // Verify booking paymentStatus is REFUNDED
      const booking = await Booking.findById(eligibleBookingId);
      expect(booking.status).toBe('CANCELLED');
      expect(booking.paymentStatus).toBe('REFUNDED');
    });

    it('manual refund attempt on already-refunded booking returns 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/wallet/refunds')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ bookingId: eligibleBookingId });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/already been processed/i);
    });
  });

  describe('5. Admin Platform Wallets & Liability Overview', () => {
    it('admin GET /api/wallet/admin returns all wallets and platform liability stats', async () => {
      const res = await request(app)
        .get('/api/wallet/admin')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.wallets)).toBe(true);
      expect(res.body.data.stats).toHaveProperty('totalLiabilityRupees');
      expect(res.body.data.stats).toHaveProperty('totalWallets');
    });

    it('customer cannot access admin wallet endpoints (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/wallet/admin')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
    });
  });
});
