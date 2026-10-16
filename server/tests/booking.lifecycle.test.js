/**
 * booking.lifecycle.test.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Phase 15 — Booking Pricing Authority, Ownership & Lifecycle Transitions Test Suite.
 *
 * Covers:
 *   1. Server-side pricing calculation authority (client price fields ignored).
 *   2. Urgency charge calculation (NORMAL = ₹0, URGENT = ₹150 surcharge).
 *   3. Customer booking creation and initial REQUESTED state.
 *   4. Booking ownership isolation (Customer B cannot inspect/cancel Customer A's booking).
 *   5. Technician job assignment and atomic acceptance (prevents double acceptance).
 *   6. Step-by-step valid status transitions:
 *      REQUESTED -> ACCEPTED -> TECHNICIAN_ASSIGNED -> ON_THE_WAY -> ARRIVED -> SERVICE_STARTED -> COMPLETED.
 *   7. Disallowed status transitions rejected with 409 Conflict.
 *   8. Cancellation restrictions (cancellable only in REQUESTED or ACCEPTED states).
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const request = require('supertest');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: require('path').join(__dirname, '..', '.env') });

let app;
const User = require('../models/user.model');
const Service = require('../models/service.model');
const Technician = require('../models/technician.model');
const Booking = require('../models/booking.model');

let customer1Token;
let customer2Token;
let techToken;
let adminToken;

let customer1Id;
let customer2Id;
let techProfileId;
let testService;

beforeAll(async () => {
  const mongoUri = process.env.MONGODB_TEST_URI || process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) throw new Error('No MongoDB URI found.');

  await mongoose.connect(mongoUri);
  app = require('../server');

  // Clean up
  await User.deleteMany({ email: { $regex: /@booking-test\.homeserve$/ } });
  await Booking.deleteMany({});
  await Service.deleteMany({ slug: 'lifecycle-test-electrician' });
  await Technician.deleteMany({});

  // Create users
  const c1 = await User.create({
    name: 'Booking Customer 1',
    email: 'c1@booking-test.homeserve',
    password: 'Password123!',
    role: 'CUSTOMER',
  });
  customer1Id = c1._id;

  const c2 = await User.create({
    name: 'Booking Customer 2',
    email: 'c2@booking-test.homeserve',
    password: 'Password123!',
    role: 'CUSTOMER',
  });
  customer2Id = c2._id;

  const tUser = await User.create({
    name: 'Booking Tech User',
    email: 'tech@booking-test.homeserve',
    password: 'Password123!',
    role: 'TECHNICIAN',
  });

  await User.create({
    name: 'Booking Admin',
    email: 'admin@booking-test.homeserve',
    password: 'Password123!',
    role: 'ADMIN',
  });

  const agent = request(app);
  const c1Res = await agent.post('/api/auth/login').send({ email: 'c1@booking-test.homeserve', password: 'Password123!' });
  customer1Token = c1Res.body.token;

  const c2Res = await agent.post('/api/auth/login').send({ email: 'c2@booking-test.homeserve', password: 'Password123!' });
  customer2Token = c2Res.body.token;

  const tRes = await agent.post('/api/auth/login').send({ email: 'tech@booking-test.homeserve', password: 'Password123!' });
  techToken = tRes.body.token;

  const aRes = await agent.post('/api/auth/login').send({ email: 'admin@booking-test.homeserve', password: 'Password123!' });
  adminToken = aRes.body.token;

  // Create approved technician profile
  const techProfile = await Technician.create({
    userId: tUser._id,
    skills: ['Electrical', 'Lifecycle Test Electrician'],
    experience: 5,
    verificationStatus: 'APPROVED',
    isVerified: true,
    isAvailable: true,
  });
  techProfileId = techProfile._id;

  // Create test service
  testService = await Service.create({
    name: 'Lifecycle Test Electrician',
    slug: 'lifecycle-test-electrician',
    category: 'Electrical',
    startingPrice: 350,
    iconName: 'Zap',
    isActive: true,
  });
});

afterAll(async () => {
  await User.deleteMany({ email: { $regex: /@booking-test\.homeserve$/ } });
  await Booking.deleteMany({});
  await Service.deleteMany({ slug: 'lifecycle-test-electrician' });
  await Technician.deleteMany({});
  await mongoose.disconnect();
});

describe('Phase 15 — Booking Pricing Authority & Lifecycle Transitions', () => {
  let booking1Id;
  let booking2Id;

  describe('1. Server-Side Pricing Calculation Authority', () => {
    it('creates booking with NORMAL urgency, recalculating price from server model and ignoring client-supplied price', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          serviceId: testService._id,
          scheduledDate: new Date(Date.now() + 86400000).toISOString(),
          scheduledTime: '14:30',
          urgency: 'NORMAL',
          address: {
            fullName: 'Booking Customer 1',
            phone: '9876543210',
            addressLine: '100 Test Blvd',
            city: 'Bangalore',
            state: 'Karnataka',
            postalCode: '560001',
            latitude: 12.9716,
            longitude: 77.5946,
          },
          // Attempted client tampering with prices:
          basePrice: 10,
          totalPrice: 10,
          urgencyCharge: 0,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      booking1Id = res.body.data._id;

      // Base price MUST be taken from the service document (350), not client value (10)
      expect(res.body.data.basePrice).toBe(350);
      expect(res.body.data.urgencyCharge).toBe(0);
      expect(res.body.data.totalPrice).toBeGreaterThanOrEqual(350);
      expect(res.body.data.status).toBe('REQUESTED');
      expect(res.body.data.paymentStatus).toBe('PENDING');
    });

    it('creates booking with URGENT priority and applies server-calculated urgency surcharge', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customer2Token}`)
        .send({
          serviceId: testService._id,
          scheduledDate: new Date(Date.now() + 86400000).toISOString(),
          scheduledTime: '16:00',
          urgency: 'URGENT',
          address: {
            fullName: 'Booking Customer 2',
            phone: '9876543211',
            addressLine: '200 Test Lane',
            city: 'Bangalore',
            state: 'Karnataka',
            postalCode: '560001',
            latitude: 12.9716,
            longitude: 77.5946,
          },
        });

      expect(res.status).toBe(201);
      booking2Id = res.body.data._id;
      expect(res.body.data.basePrice).toBe(350);
      expect(res.body.data.urgencyCharge).toBe(150); // ₹150 urgency fee
      expect(res.body.data.totalPrice).toBe(res.body.data.basePrice + res.body.data.urgencyCharge + res.body.data.distanceCharge);
    });
  });

  describe('2. Booking Ownership & Authorization Isolation', () => {
    it('customer 1 sees only their own booking in /api/bookings/my', async () => {
      const res = await request(app)
        .get('/api/bookings/my')
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const ids = res.body.data.map((b) => b._id.toString());
      expect(ids).toContain(booking1Id.toString());
      expect(ids).not.toContain(booking2Id.toString());
    });

    it('customer 2 is forbidden from inspecting customer 1 booking (403)', async () => {
      const res = await request(app)
        .get(`/api/bookings/${booking1Id}`)
        .set('Authorization', `Bearer ${customer2Token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('customer 2 is forbidden from cancelling customer 1 booking (403)', async () => {
      const res = await request(app)
        .patch(`/api/bookings/${booking1Id}/cancel`)
        .set('Authorization', `Bearer ${customer2Token}`)
        .send({ cancellationReason: 'Malicious cancel attempt' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('3. Technician Acceptance & Status Transitions', () => {
    it('technician accepts booking 1 transitioning status to ACCEPTED', async () => {
      const res = await request(app)
        .patch(`/api/bookings/${booking1Id}/accept`)
        .set('Authorization', `Bearer ${techToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ACCEPTED');
      expect(res.body.data.technicianId).toBeDefined();
    });

    it('rejects double-acceptance attempt on already accepted booking (409 Conflict)', async () => {
      const res = await request(app)
        .patch(`/api/bookings/${booking1Id}/accept`)
        .set('Authorization', `Bearer ${techToken}`);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('technician advances status to ON_THE_WAY', async () => {
      const res = await request(app)
        .patch(`/api/bookings/${booking1Id}/status`)
        .set('Authorization', `Bearer ${techToken}`)
        .send({ status: 'ON_THE_WAY' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('ON_THE_WAY');
    });

    it('customer cannot cancel booking once technician is ON_THE_WAY (409 Conflict)', async () => {
      const res = await request(app)
        .patch(`/api/bookings/${booking1Id}/cancel`)
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({ cancellationReason: 'Tried cancelling too late' });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/cannot be cancelled in its current status/i);
    });

    it('technician advances status sequentially: ARRIVED -> SERVICE_STARTED -> COMPLETED', async () => {
      // ARRIVED
      let res = await request(app)
        .patch(`/api/bookings/${booking1Id}/status`)
        .set('Authorization', `Bearer ${techToken}`)
        .send({ status: 'ARRIVED' });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('ARRIVED');

      // SERVICE_STARTED
      res = await request(app)
        .patch(`/api/bookings/${booking1Id}/status`)
        .set('Authorization', `Bearer ${techToken}`)
        .send({ status: 'SERVICE_STARTED' });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('SERVICE_STARTED');

      // COMPLETED
      res = await request(app)
        .patch(`/api/bookings/${booking1Id}/status`)
        .set('Authorization', `Bearer ${techToken}`)
        .send({ status: 'COMPLETED' });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('COMPLETED');
    });

    it('rejects invalid or backward status transition from COMPLETED (409 Conflict)', async () => {
      const res = await request(app)
        .patch(`/api/bookings/${booking1Id}/status`)
        .set('Authorization', `Bearer ${techToken}`)
        .send({ status: 'ON_THE_WAY' });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });
  });

  describe('4. Eligible Customer Cancellation', () => {
    it('customer 2 can successfully cancel their REQUESTED booking', async () => {
      const res = await request(app)
        .patch(`/api/bookings/${booking2Id}/cancel`)
        .set('Authorization', `Bearer ${customer2Token}`)
        .send({ cancellationReason: 'Need to reschedule for next week' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('CANCELLED');
      expect(res.body.data.cancellationReason).toBe('Need to reschedule for next week');
    });
  });
});
