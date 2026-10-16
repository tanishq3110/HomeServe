/**
 * e2e.journey.test.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Phase 15 — Complete Customer & Technician End-to-End Integration Journey
 *
 * Exercises the complete 12-step lifecycle:
 *   1. Register and log in as a customer.
 *   2. Browse the public service catalog.
 *   3. Create a service booking.
 *   4. Verify authoritative server-side price calculation.
 *   5. Confirm booking visibility to the technician and platform admin.
 *   6. Exercise valid booking status progression (ACCEPTED -> ON_THE_WAY).
 *   7. Test technician GPS live streaming & customer tracking room reception.
 *   8. Advance status to COMPLETED and submit a verified customer review.
 *   9. Verify review creation and technician average rating recalculation.
 *   10. Verify completed booking reflects in admin analytics overview.
 *   11. Test internal wallet payment and cancellation/refund cycle.
 *   12. Verify final wallet balance and transaction ledger audit reconciliation.
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const http = require('http');
const request = require('supertest');
const mongoose = require('mongoose');
const { io: ioClient } = require('socket.io-client');
const dotenv = require('dotenv');

dotenv.config({ path: require('path').join(__dirname, '..', '.env') });

const User = require('../models/user.model');
const Service = require('../models/service.model');
const Technician = require('../models/technician.model');
const Booking = require('../models/booking.model');
const Review = require('../models/review.model');
const Wallet = require('../models/wallet.model');
const WalletTransaction = require('../models/walletTransaction.model');
const { initSocket } = require('../sockets');

let app;
let server;
let ioServer;
let socketPort;
let customerToken;
let customerId;
let technicianToken;
let technicianUserId;
let technicianProfileId;
let adminToken;
let adminId;

let testService;
let journeyBookingId;
let walletBookingId;

beforeAll(async () => {
  const mongoUri = process.env.MONGODB_TEST_URI || process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) throw new Error('No MongoDB URI found.');

  await mongoose.connect(mongoUri);
  app = require('../server');

  // Launch test http server for Socket.IO on an ephemeral port
  server = http.createServer(app);
  ioServer = initSocket(server, '*');

  await new Promise((resolve) => {
    server.listen(0, () => {
      socketPort = server.address().port;
      resolve();
    });
  });

  // Clean previous test data
  await Promise.all([
    User.deleteMany({ email: { $regex: /@journey-e2e\.homeserve$/ } }),
    Service.deleteMany({ slug: 'e2e-appliance-repair' }),
    Technician.deleteMany({}),
    Booking.deleteMany({ serviceName: 'E2E Appliance Repair' }),
    Review.deleteMany({}),
    Wallet.deleteMany({}),
    WalletTransaction.deleteMany({}),
  ]);

  // Seed Admin user
  const admin = await User.create({
    name: 'E2E Admin User',
    email: 'admin@journey-e2e.homeserve',
    password: 'Password123!',
    role: 'ADMIN',
  });
  adminId = admin._id;

  const aLogin = await request(app).post('/api/auth/login').send({
    email: 'admin@journey-e2e.homeserve',
    password: 'Password123!',
  });
  adminToken = aLogin.body.token;

  // Seed Service Catalog item
  testService = await Service.create({
    name: 'E2E Appliance Repair',
    slug: 'e2e-appliance-repair',
    category: 'Appliance Repair',
    description: 'Comprehensive appliance repair and diagnostics',
    startingPrice: 500,
    iconName: 'Wrench',
  });

  // Seed Technician User & Profile (approved & available)
  const techUser = await User.create({
    name: 'E2E Master Technician',
    email: 'technician@journey-e2e.homeserve',
    password: 'Password123!',
    role: 'TECHNICIAN',
  });
  technicianUserId = techUser._id;

  const techProfile = await Technician.create({
    userId: technicianUserId,
    skills: ['Appliance Repair'],
    experience: 5,
    verificationStatus: 'APPROVED',
    isVerified: true,
    isAvailable: true,
  });
  technicianProfileId = techProfile._id;

  const tLogin = await request(app).post('/api/auth/login').send({
    email: 'technician@journey-e2e.homeserve',
    password: 'Password123!',
  });
  technicianToken = tLogin.body.token;
});

afterAll(async () => {
  if (ioServer) {
    await new Promise((resolve) => ioServer.close(resolve));
  }
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await Promise.all([
    User.deleteMany({ email: { $regex: /@journey-e2e\.homeserve$/ } }),
    Service.deleteMany({ slug: 'e2e-appliance-repair' }),
    Technician.deleteMany({}),
    Booking.deleteMany({ serviceName: 'E2E Appliance Repair' }),
    Review.deleteMany({}),
    Wallet.deleteMany({}),
    WalletTransaction.deleteMany({}),
  ]);
  await mongoose.connection.close();
});

describe('Phase 15 — Full 12-Step Customer & Technician Integration Journey', () => {
  // Step 1: Register and log in as a customer
  it('Step 1: registers and logs in as a new customer', async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Jane Customer',
        email: 'jane@journey-e2e.homeserve',
        password: 'Password123!',
        phone: '9876543210',
        role: 'CUSTOMER',
      });

    expect(regRes.status).toBe(201);
    expect(regRes.body.success).toBe(true);
    expect(regRes.body.token).toBeDefined();
    customerToken = regRes.body.token;
    customerId = regRes.body.user.id || regRes.body.user._id;

    // Verify login works as expected
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'jane@journey-e2e.homeserve',
        password: 'Password123!',
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toBeDefined();
  });

  // Step 2: Browse the service catalog
  it('Step 2: browses catalog and retrieves service details', async () => {
    const catalogRes = await request(app).get('/api/services').expect(200);
    expect(catalogRes.body.success).toBe(true);
    expect(Array.isArray(catalogRes.body.data)).toBe(true);

    const match = catalogRes.body.data.find((s) => s.slug === 'e2e-appliance-repair');
    expect(match).toBeDefined();
    expect(match.startingPrice).toBe(500);

    const detailRes = await request(app)
      .get(`/api/services/${testService.slug}`)
      .expect(200);
    expect(detailRes.body.data.name).toBe('E2E Appliance Repair');
  });

  // Step 3: Create a booking
  it('Step 3: creates a service booking for the customer', async () => {
    const bookingRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        serviceId: testService._id,
        scheduledDate: new Date(Date.now() + 86400000).toISOString(),
        scheduledTime: '11:00',
        urgency: 'NORMAL',
        address: {
          fullName: 'Jane Customer',
          phone: '9876543210',
          addressLine: '42 Baker Street',
          city: 'Bangalore',
          state: 'Karnataka',
          postalCode: '560001',
          latitude: 12.9716,
          longitude: 77.5946,
        },
      });

    expect(bookingRes.status).toBe(201);
    expect(bookingRes.body.success).toBe(true);
    journeyBookingId = bookingRes.body.data._id;
    expect(journeyBookingId).toBeDefined();
  });

  // Step 4: Verify server-side price calculation
  it('Step 4: verifies authoritative server-side pricing on created booking', async () => {
    const bRes = await request(app)
      .get(`/api/bookings/${journeyBookingId}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);

    const b = bRes.body.data;
    expect(b.basePrice).toBe(500);
    expect(b.urgencyCharge).toBe(0);
    expect(b.totalPrice).toBe(b.basePrice + b.urgencyCharge + b.distanceCharge);
    expect(b.paymentStatus).toBe('PENDING');
    expect(b.status).toBe('REQUESTED');
  });

  // Step 5: Confirm booking is visible to technician and admin
  it('Step 5: confirms booking visibility to technician and admin', async () => {
    // Admin can view all bookings
    const adminRes = await request(app)
      .get('/api/bookings')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const bookingInAdmin = adminRes.body.data.find(
      (b) => b._id.toString() === journeyBookingId.toString()
    );
    expect(bookingInAdmin).toBeDefined();

    // Assign or verify technician can access
    const acceptRes = await request(app)
      .patch(`/api/bookings/${journeyBookingId}/accept`)
      .set('Authorization', `Bearer ${technicianToken}`)
      .expect(200);

    expect(acceptRes.body.data.status).toBe('ACCEPTED');
  });

  // Step 6: Exercise allowed booking status changes
  it('Step 6: exercises booking status progression (ACCEPTED -> ON_THE_WAY)', async () => {
    const updateRes = await request(app)
      .patch(`/api/bookings/${journeyBookingId}/status`)
      .set('Authorization', `Bearer ${technicianToken}`)
      .send({ status: 'ON_THE_WAY' })
      .expect(200);

    expect(updateRes.body.data.status).toBe('ON_THE_WAY');
  });

  // Step 7: Test technician location sharing and customer tracking authorization
  it('Step 7: verifies real-time technician location sharing and customer room reception', (done) => {
    const techSocket = ioClient(`http://localhost:${socketPort}`, {
      auth: { token: technicianToken },
      transports: ['websocket'],
    });

    const customerSocket = ioClient(`http://localhost:${socketPort}`, {
      auth: { token: customerToken },
      transports: ['websocket'],
    });

    let techConnected = false;
    let customerConnected = false;

    function runSharingFlow() {
      customerSocket.emit('booking:join', { bookingId: journeyBookingId }, (joinRes) => {
        expect(joinRes.success).toBe(true);

        customerSocket.on('location:updated', (loc) => {
          expect(loc.bookingId).toBe(journeyBookingId);
          expect(loc.latitude).toBeCloseTo(12.9716, 2);
          expect(loc.longitude).toBeCloseTo(77.5946, 2);

          techSocket.disconnect();
          customerSocket.disconnect();
          done();
        });

        techSocket.emit('location:share_start', { bookingId: journeyBookingId }, (startRes) => {
          expect(startRes.success).toBe(true);

          techSocket.emit('location:update', {
            bookingId: journeyBookingId,
            latitude: 12.9716,
            longitude: 77.5946,
            accuracy: 10,
            heading: 90,
            speed: 5,
          });
        });
      });
    }

    techSocket.on('connect', () => {
      techConnected = true;
      if (customerConnected) runSharingFlow();
    });

    customerSocket.on('connect', () => {
      customerConnected = true;
      if (techConnected) runSharingFlow();
    });
  });

  // Step 8: Complete booking and submit a review
  it('Step 8: completes service and submits verified customer review', async () => {
    // Progress through ARRIVED -> SERVICE_STARTED -> COMPLETED
    await request(app)
      .patch(`/api/bookings/${journeyBookingId}/status`)
      .set('Authorization', `Bearer ${technicianToken}`)
      .send({ status: 'ARRIVED' })
      .expect(200);

    await request(app)
      .patch(`/api/bookings/${journeyBookingId}/status`)
      .set('Authorization', `Bearer ${technicianToken}`)
      .send({ status: 'SERVICE_STARTED' })
      .expect(200);

    await request(app)
      .patch(`/api/bookings/${journeyBookingId}/status`)
      .set('Authorization', `Bearer ${technicianToken}`)
      .send({ status: 'COMPLETED' })
      .expect(200);

    // Customer submits 5-star review
    const reviewRes = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        bookingId: journeyBookingId,
        rating: 5,
        comment: 'Superb service, punctual and highly skilled!',
      })
      .expect(201);

    expect(reviewRes.body.success).toBe(true);
    expect(reviewRes.body.data.rating).toBe(5);
  });

  // Step 9: Verify review and technician rating recalculation
  it('Step 9: verifies technician average rating recalculation', async () => {
    const techRes = await request(app)
      .get(`/api/reviews/technician/${technicianProfileId}`)
      .expect(200);

    expect(techRes.body.data.avgRating).toBe(5);
    expect(techRes.body.data.totalReviews).toBe(1);

    const techDoc = await Technician.findById(technicianProfileId);
    expect(techDoc.rating).toBe(5);
    expect(techDoc.totalReviews).toBe(1);
  });

  // Step 10: Verify the booking appears in admin analytics
  it('Step 10: confirms completed booking reflects in admin analytics overview', async () => {
    const analyticsRes = await request(app)
      .get('/api/admin/analytics/overview')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(analyticsRes.body.success).toBe(true);
    const overview = analyticsRes.body.data.overview;
    expect(overview.totalBookings).toBeGreaterThanOrEqual(1);
    expect(overview.completedBookings).toBeGreaterThanOrEqual(1);
  });

  // Step 11: Wallet payment & eligible cancellation/refund flow
  it('Step 11: exercises wallet balance credit, booking payment, cancellation & refund', async () => {
    // 1. Admin credits ₹1000 (100,000 paise) to customer wallet
    await request(app)
      .post(`/api/wallet/admin/${customerId}/adjustments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        type: 'CREDIT',
        amountPaise: 100000,
        reason: 'Promotional credit for Phase 15 E2E test',
      })
      .expect(200);

    // 2. Customer creates a second booking (costs 500 INR = 50,000 paise)
    const b2Res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        serviceId: testService._id,
        scheduledDate: new Date(Date.now() + 172800000).toISOString(),
        scheduledTime: '15:00',
        urgency: 'NORMAL',
        address: {
          fullName: 'Jane Customer',
          phone: '9876543210',
          addressLine: '42 Baker Street',
          city: 'Bangalore',
          state: 'Karnataka',
          postalCode: '560001',
          latitude: 12.9716,
          longitude: 77.5946,
        },
      })
      .expect(201);

    walletBookingId = b2Res.body.data._id;
    const totalPrice = b2Res.body.data.totalPrice;
    const expectedPaise = totalPrice * 100;

    // 3. Customer pays for booking using internal wallet
    const payRes = await request(app)
      .post('/api/wallet/payments')
      .set('Authorization', `Bearer ${customerToken}`)
      .set('Idempotency-Key', `e2e-pay-${walletBookingId}`)
      .send({ bookingId: walletBookingId })
      .expect(200);

    expect(payRes.body.success).toBe(true);
    expect(payRes.body.data.balancePaise).toBe(100000 - expectedPaise);

    // 4. Customer cancels booking while in REQUESTED status
    const cancelRes = await request(app)
      .patch(`/api/bookings/${walletBookingId}/cancel`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ cancellationReason: 'Plans changed for e2e test' })
      .expect(200);

    expect(cancelRes.body.data.status).toBe('CANCELLED');
    expect(cancelRes.body.data.paymentStatus).toBe('REFUNDED');

    // 5. Verify automatic refund has restored full wallet balance
    const walletCheck = await request(app)
      .get('/api/wallet')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);

    expect(walletCheck.body.data.balancePaise).toBe(100000);

    // 6. Duplicate manual refund request is safely rejected with 409 Conflict
    const dupRefundRes = await request(app)
      .post('/api/wallet/refunds')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ bookingId: walletBookingId });

    expect(dupRefundRes.status).toBe(409);
  });

  // Step 12: Verify resulting wallet balance and transaction ledger
  it('Step 12: verifies wallet balance reconciliation against transaction ledger', async () => {
    const walletRes = await request(app)
      .get('/api/wallet')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);

    expect(walletRes.body.data.balancePaise).toBe(100000);
    expect(walletRes.body.data.balanceRupees).toBe('1000.00');

    const txRes = await request(app)
      .get('/api/wallet/transactions')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);

    const transactions = txRes.body.data.transactions;
    expect(transactions.length).toBeGreaterThanOrEqual(3); // CREDIT, DEBIT, REFUND

    const types = transactions.map((t) => t.type);
    expect(types).toContain('CREDIT');
    expect(types).toContain('DEBIT');
    expect(types).toContain('REFUND');

    // Mathematically verify the ledger sum matches the wallet balance
    let ledgerSum = 0;
    for (const tx of transactions) {
      if (tx.type === 'CREDIT' || tx.type === 'REFUND') {
        ledgerSum += tx.amountPaise;
      } else if (tx.type === 'DEBIT') {
        ledgerSum -= tx.amountPaise;
      }
    }
    expect(ledgerSum).toBe(100000);
  });
});
