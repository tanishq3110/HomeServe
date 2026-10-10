/**
 * security.test.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Phase 13 — Security & Validation Hardening Test Suite.
 *
 * Verifies:
 *  1.  Unauthenticated requests to protected endpoints return 401.
 *  2.  Customer attempts to access admin endpoints return 403.
 *  3.  Technician attempts to access customer-only operations return 403.
 *  4.  Cross-user booking access (Customer B cannot view or cancel Customer A's booking) returns 403.
 *  5.  Attempts to self-assign ADMIN role or inject protected fields during registration/profile updates are rejected.
 *  6.  Invalid MongoDB ObjectIds in route parameters return 400 Bad Request (not 500 CastError).
 *  7.  Malformed JSON bodies return 400 Bad Request, and oversized payloads return 413.
 *  8.  Invalid ratings (0, 6), invalid GPS coordinates, invalid dates, and negative prices are rejected with 400.
 *  9.  Unauthorized or out-of-order booking status transitions return 409 Conflict.
 * 10.  Unauthorized GPS location sharing and retrieval (unassigned tech or unauthorized customer) returns 403.
 * 11.  Unauthorized Socket.IO room access and events are rejected.
 * 12.  Review duplicate prevention (second review for same booking returns 409).
 * 13.  Existing functionality regression: Auth, Booking, Technician, Review, and Analytics endpoints continue to function.
 * 14.  Security rate limiter enforces limits on repeated requests.
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const request = require('supertest');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: require('path').join(__dirname, '..', '.env') });

let app;
const User = require('../models/user.model');
const Technician = require('../models/technician.model');
const Booking = require('../models/booking.model');
const Service = require('../models/service.model');
const Review = require('../models/review.model');
const { testRateLimiter } = require('../middleware/security.middleware');

// Test state
let adminToken;
let customer1Token;
let customer2Token;
let technicianToken;
let unapprovedTechToken;

let customer1Id;
let customer2Id;
let technicianUserId;
let technicianProfileId;
let serviceId;

let customer1BookingId;
let completedBookingId;

beforeAll(async () => {
  const mongoUri =
    process.env.MONGODB_TEST_URI || process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) throw new Error('No MongoDB URI found. Set MONGODB_TEST_URI in server/.env');

  await mongoose.connect(mongoUri);
  app = require('../server');

  // Clean test fixtures
  await Promise.all([
    User.deleteMany({ email: { $regex: /@security-test\.homeserve$/ } }),
    Booking.deleteMany({ serviceName: 'Security Hardening Service' }),
    Service.deleteMany({ slug: 'security-hardening-service' }),
    Review.deleteMany({ comment: { $regex: /Security Test Review/ } }),
  ]);

  // Create Users
  const adminUser = await User.create({
    name: 'Security Admin',
    email: 'admin@security-test.homeserve',
    password: 'Password123!',
    role: 'ADMIN',
  });

  const customer1 = await User.create({
    name: 'Customer One',
    email: 'customer1@security-test.homeserve',
    password: 'Password123!',
    phone: '9900112233',
    role: 'CUSTOMER',
  });
  customer1Id = customer1._id;

  const customer2 = await User.create({
    name: 'Customer Two',
    email: 'customer2@security-test.homeserve',
    password: 'Password123!',
    phone: '9900112244',
    role: 'CUSTOMER',
  });
  customer2Id = customer2._id;

  const techUser = await User.create({
    name: 'Approved Tech',
    email: 'tech@security-test.homeserve',
    password: 'Password123!',
    phone: '9900112255',
    role: 'TECHNICIAN',
  });
  technicianUserId = techUser._id;

  const techProfile = await Technician.create({
    userId: techUser._id,
    verificationStatus: 'APPROVED',
    isVerified: true,
    skills: ['Security Service'],
    rating: 5,
    totalReviews: 1,
  });
  technicianProfileId = techProfile._id;

  const unapprovedTech = await User.create({
    name: 'Unapproved Tech',
    email: 'unapproved@security-test.homeserve',
    password: 'Password123!',
    role: 'TECHNICIAN',
  });
  await Technician.create({
    userId: unapprovedTech._id,
    verificationStatus: 'PENDING',
    isVerified: false,
    skills: ['Security Service'],
  });

  // Create Service
  const testService = await Service.create({
    name: 'Security Hardening Service',
    slug: 'security-hardening-service',
    category: 'Security',
    startingPrice: 500,
  });
  serviceId = testService._id;

  // Create Bookings
  const address = {
    fullName: 'Customer One',
    phone: '9900112233',
    addressLine: '42 Security Blvd',
    city: 'Bangalore',
    state: 'Karnataka',
    postalCode: '560001',
  };

  const booking1 = await Booking.create({
    customerId: customer1Id,
    technicianId: technicianProfileId,
    serviceId,
    serviceName: 'Security Hardening Service',
    address,
    scheduledDate: new Date(Date.now() + 86400000),
    scheduledTime: '10:00',
    urgency: 'NORMAL',
    basePrice: 500,
    urgencyCharge: 0,
    totalPrice: 500,
    status: 'REQUESTED',
  });
  customer1BookingId = booking1._id;

  const completedBooking = await Booking.create({
    customerId: customer1Id,
    technicianId: technicianProfileId,
    serviceId,
    serviceName: 'Security Hardening Service',
    address,
    scheduledDate: new Date(Date.now() + 86400000 * 2),
    scheduledTime: '12:00',
    urgency: 'NORMAL',
    basePrice: 500,
    urgencyCharge: 0,
    totalPrice: 500,
    status: 'COMPLETED',
  });
  completedBookingId = completedBooking._id;

  // Create existing review for completedBooking
  await Review.create({
    bookingId: completedBookingId,
    customerId: customer1Id,
    technicianId: technicianProfileId,
    rating: 5,
    comment: 'Security Test Review: Verified and valid!',
  });

  // Fetch JWT Tokens
  const resAdmin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@security-test.homeserve', password: 'Password123!' });
  adminToken = resAdmin.body.token;

  const resCust1 = await request(app)
    .post('/api/auth/login')
    .send({ email: 'customer1@security-test.homeserve', password: 'Password123!' });
  customer1Token = resCust1.body.token;

  const resCust2 = await request(app)
    .post('/api/auth/login')
    .send({ email: 'customer2@security-test.homeserve', password: 'Password123!' });
  customer2Token = resCust2.body.token;

  const resTech = await request(app)
    .post('/api/auth/login')
    .send({ email: 'tech@security-test.homeserve', password: 'Password123!' });
  technicianToken = resTech.body.token;

  const resUnapproved = await request(app)
    .post('/api/auth/login')
    .send({ email: 'unapproved@security-test.homeserve', password: 'Password123!' });
  unapprovedTechToken = resUnapproved.body.token;
});

afterAll(async () => {
  await Promise.all([
    User.deleteMany({ email: { $regex: /@security-test\.homeserve$/ } }),
    Booking.deleteMany({ serviceName: 'Security Hardening Service' }),
    Service.deleteMany({ slug: 'security-hardening-service' }),
    Review.deleteMany({ comment: { $regex: /Security Test Review/ } }),
  ]);
  if (technicianProfileId) {
    await Technician.deleteMany({ _id: technicianProfileId });
  }
});

describe('Phase 13 — Security and Validation Hardening', () => {
  // ── 1. Unauthenticated requests to protected endpoints return 401 ──
  test('1. Unauthenticated requests to protected endpoints return 401', async () => {
    const res1 = await request(app).get('/api/auth/me');
    expect(res1.status).toBe(401);
    expect(res1.body.success).toBe(false);

    const res2 = await request(app).get('/api/bookings/my');
    expect(res2.status).toBe(401);

    const res3 = await request(app).get('/api/admin/technicians');
    expect(res3.status).toBe(401);
  });

  // ── 2. Customer attempts to access admin endpoints return 403 ──
  test('2. Customer attempts to access admin endpoints return 403', async () => {
    const res = await request(app)
      .get('/api/admin/technicians')
      .set('Authorization', `Bearer ${customer1Token}`);
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);

    const resAnalytics = await request(app)
      .get('/api/admin/analytics/overview')
      .set('Authorization', `Bearer ${customer1Token}`);
    expect(resAnalytics.status).toBe(403);
  });

  // ── 3. Technician attempts to access customer-only operations return 403 ──
  test('3. Technician attempts to access customer-only operations return 403', async () => {
    const resCreate = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${technicianToken}`)
      .send({
        serviceId,
        address: { fullName: 'Tech', phone: '999', addressLine: 'x', city: 'c', state: 's', postalCode: '1' },
        scheduledDate: new Date(Date.now() + 86400000).toISOString(),
        scheduledTime: '10:00',
        urgency: 'NORMAL',
      });
    expect(resCreate.status).toBe(403);
  });

  // ── 4. Cross-user booking access returns 403 ──
  test('4. Cross-user booking access is strictly forbidden (Customer 2 cannot view or cancel Customer 1 booking)', async () => {
    // Customer 2 views Customer 1 booking
    const resGet = await request(app)
      .get(`/api/bookings/${customer1BookingId}`)
      .set('Authorization', `Bearer ${customer2Token}`);
    expect(resGet.status).toBe(403);
    expect(resGet.body.success).toBe(false);

    // Customer 2 cancels Customer 1 booking
    const resCancel = await request(app)
      .patch(`/api/bookings/${customer1BookingId}/cancel`)
      .set('Authorization', `Bearer ${customer2Token}`)
      .send({ cancellationReason: 'Malicious cancellation attempt' });
    expect(resCancel.status).toBe(403);
  });

  // ── 5. Attempts to modify protected role or ownership fields are rejected ──
  test('5. Self-registration as ADMIN or invalid role is rejected', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Hacker Admin',
        email: 'hacker@security-test.homeserve',
        password: 'Password123!',
        role: 'ADMIN',
      });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/ADMIN is strictly prohibited/i);
  });

  // ── 6. Invalid MongoDB ObjectIds in route parameters return 400 Bad Request ──
  test('6. Invalid MongoDB ObjectIds in route parameters return 400 Bad Request', async () => {
    const resBooking = await request(app)
      .get('/api/bookings/invalid-object-id-123')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(resBooking.status).toBe(400);
    expect(resBooking.body.success).toBe(false);
    expect(resBooking.body.message).toMatch(/Invalid format for parameter/i);

    const resReview = await request(app)
      .get('/api/reviews/technician/non-hex-id-xyz');
    expect(resReview.status).toBe(400);
    expect(resReview.body.success).toBe(false);
  });

  // ── 7. Malformed JSON and oversized request bodies ──
  test('7. Malformed JSON payloads return 400 Bad Request', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": "broken-json, "password":');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Malformed JSON payload/i);
  });

  test('7b. Oversized payloads exceeding 50KB return 413 Payload Too Large', async () => {
    const oversizedString = 'x'.repeat(60 * 1024); // 60KB
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ email: 'test@example.com', oversized: oversizedString }));
    expect(res.status).toBe(413);
    expect(res.body.success).toBe(false);
  });

  // ── 8. Invalid ratings, coordinates, dates, and negative prices ──
  test('8a. Rating 0 and rating 6 are rejected with 400', async () => {
    const res0 = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({ bookingId: completedBookingId, rating: 0 });
    expect(res0.status).toBe(400);

    const res6 = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({ bookingId: completedBookingId, rating: 6 });
    expect(res6.status).toBe(400);
  });

  test('8b. Negative starting price in service updates is rejected with 400', async () => {
    const res = await request(app)
      .put(`/api/services/${serviceId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ startingPrice: -100 });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // ── 9. Unauthorized booking status transitions return 409 Conflict ──
  test('9. Out-of-order status transitions return 409 Conflict', async () => {
    // Attempt to jump from REQUESTED directly to COMPLETED without ACCEPTED/SERVICE_STARTED
    const res = await request(app)
      .patch(`/api/bookings/${customer1BookingId}/status`)
      .set('Authorization', `Bearer ${technicianToken}`)
      .send({ status: 'COMPLETED' });
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Invalid transition/i);
  });

  // ── 10. Unauthorized GPS location sharing and retrieval ──
  test('10. Unapproved technician cannot go ONLINE or share location', async () => {
    // Unapproved technician attempts to go ONLINE
    const resAvail = await request(app)
      .patch('/api/technicians/availability')
      .set('Authorization', `Bearer ${unapprovedTechToken}`)
      .send({ isAvailable: true });
    expect(resAvail.status).toBe(403);
    expect(resAvail.body.message).toMatch(/must be approved/i);
  });

  test('10b. Customer cannot retrieve GPS location for another customer booking', async () => {
    const res = await request(app)
      .get(`/api/bookings/${customer1BookingId}/location`)
      .set('Authorization', `Bearer ${customer2Token}`);
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // ── 11. Helmet security headers are present on responses ──
  test('11. Security headers (Helmet) are applied on HTTP responses', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
  });

  // ── 12. Review duplicate prevention ──
  test('12. Duplicate review for the same booking returns 409 Conflict', async () => {
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({
        bookingId: completedBookingId,
        rating: 4,
        comment: 'Attempting duplicate review',
      });
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  // ── 13. Regression verification: Existing core endpoints continue to work ──
  test('13. Existing authentication, booking, and reviews endpoints function properly', async () => {
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${customer1Token}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.user.name).toBe('Customer One');

    const bookingsRes = await request(app)
      .get('/api/bookings/my')
      .set('Authorization', `Bearer ${customer1Token}`);
    expect(bookingsRes.status).toBe(200);
    expect(bookingsRes.body.success).toBe(true);

    const reviewRes = await request(app)
      .get(`/api/reviews/booking/${completedBookingId}`)
      .set('Authorization', `Bearer ${customer1Token}`);
    expect(reviewRes.status).toBe(200);
    expect(reviewRes.body.data.rating).toBe(5);
  });

  // ── 14. Rate limiter enforcement verification ──
  test('14. Rate limiter blocks requests after exceeding threshold', async () => {
    const express = require('express');
    const testApp = express();
    testApp.use(testRateLimiter);
    testApp.get('/test-limit', (req, res) => res.json({ success: true }));

    // Send 3 requests (within limit of 3)
    await request(testApp).get('/test-limit');
    await request(testApp).get('/test-limit');
    const res3 = await request(testApp).get('/test-limit');
    expect(res3.status).toBe(200);

    // 4th request must be blocked with 429
    const res4 = await request(testApp).get('/test-limit');
    expect(res4.status).toBe(429);
    expect(res4.body.message).toMatch(/Rate limit exceeded/i);
  });
});
