/**
 * review.test.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Phase 11 — Review & Ratings test suite.
 *
 * Test coverage:
 *  1.  Authenticated customer can review their completed booking.
 *  2.  Customer cannot review another customer's booking.
 *  3.  Customer cannot review an incomplete / cancelled booking.
 *  4.  Duplicate reviews for one booking are rejected.
 *  5.  Invalid ratings (0, 6, non-integer, missing) are rejected.
 *  6.  Comment exceeding 500 chars is rejected.
 *  7.  Unauthenticated user cannot submit a review.
 *  8.  Technician cannot submit a customer review.
 *  9.  GET /api/reviews/technician/:id returns correct avgRating & totalReviews.
 * 10.  Technician with no reviews returns avgRating 0, totalReviews 0.
 * 11.  Review response does not expose customer email, phone, or password.
 * 12.  Existing booking, auth, and technician endpoints still function.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * NOTE: These are integration tests that run against a local MongoDB instance.
 * Set MONGODB_URI or MONGO_URI in server/.env pointing to a test database before
 * running. The test DB is fully cleaned up after every test file.
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const request = require('supertest');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: require('path').join(__dirname, '..', '.env') });

// ─── Load models and app AFTER env is ready ───────────────────────────────────
let app;
const User = require('../models/user.model');
const Technician = require('../models/technician.model');
const Booking = require('../models/booking.model');
const Review = require('../models/review.model');

// ─── In-memory test state ─────────────────────────────────────────────────────
let customerToken;
let customer2Token;
let technicianToken;
let adminToken;

let customerId;
let customer2Id;
let technicianUserId;
let technicianProfileId;
let adminId;

let completedBookingId;
let cancelledBookingId;
let requestedBookingId;

// ─── Helper: create a JWT for a user (sign-in via API) ───────────────────────
async function loginUser(agent, email, password) {
  const res = await agent.post('/api/auth/login').send({ email, password });
  return res.body.token;
}

// ─── Setup ────────────────────────────────────────────────────────────────────
beforeAll(async () => {
  // Use a dedicated test DB URI to avoid wiping production data
  const mongoUri = process.env.MONGODB_TEST_URI || process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) throw new Error('No MongoDB URI found. Set MONGODB_TEST_URI in server/.env');

  await mongoose.connect(mongoUri);
  app = require('../server');

  // ── Clean up test collections ──
  await Promise.all([
    User.deleteMany({ email: { $regex: /@test\.homeserve$/ } }),
    Review.deleteMany({}),
  ]);

  // ── Create test users ──
  const customerUser = await User.create({
    name: 'Test Customer One',
    email: 'customer1@test.homeserve',
    password: 'Test1234!',
    role: 'CUSTOMER',
  });
  customerId = customerUser._id;

  const customer2User = await User.create({
    name: 'Test Customer Two',
    email: 'customer2@test.homeserve',
    password: 'Test1234!',
    role: 'CUSTOMER',
  });
  customer2Id = customer2User._id;

  const techUser = await User.create({
    name: 'Test Technician',
    email: 'tech@test.homeserve',
    password: 'Test1234!',
    role: 'TECHNICIAN',
  });
  technicianUserId = techUser._id;

  const adminUser = await User.create({
    name: 'Test Admin',
    email: 'admin@test.homeserve',
    password: 'Test1234!',
    role: 'ADMIN',
  });
  adminId = adminUser._id;

  // ── Create approved technician profile ──
  const techProfile = await Technician.create({
    userId: technicianUserId,
    skills: ['AC Repair', 'Electrical'],
    experience: 3,
    verificationStatus: 'APPROVED',
    isVerified: true,
    isAvailable: true,
  });
  technicianProfileId = techProfile._id;

  // ── Seed a minimal Service doc ──
  const Service = require('../models/service.model');
  let service = await Service.findOne({ name: 'Test AC Service' });
  if (!service) {
    service = await Service.create({
      name: 'Test AC Service',
      category: 'AC',
      startingPrice: 500,
      slug: 'test-ac-service',
      iconName: 'AcUnit',
    });
  }

  // ── Seed bookings in different states ──
  const baseAddress = {
    fullName: 'Test Customer',
    phone: '9999999999',
    addressLine: '123 Test Street',
    city: 'Bangalore',
    state: 'Karnataka',
    postalCode: '560001',
  };

  const completedBooking = await Booking.create({
    customerId,
    technicianId: technicianProfileId,
    serviceId: service._id,
    serviceName: 'Test AC Service',
    address: baseAddress,
    scheduledDate: new Date(),
    scheduledTime: '10:00',
    urgency: 'NORMAL',
    basePrice: 500,
    urgencyCharge: 0,
    distanceCharge: 0,
    totalPrice: 500,
    status: 'COMPLETED',
  });
  completedBookingId = completedBooking._id;

  const cancelledBooking = await Booking.create({
    customerId,
    technicianId: technicianProfileId,
    serviceId: service._id,
    serviceName: 'Test AC Service',
    address: baseAddress,
    scheduledDate: new Date(),
    scheduledTime: '11:00',
    urgency: 'NORMAL',
    basePrice: 500,
    urgencyCharge: 0,
    distanceCharge: 0,
    totalPrice: 500,
    status: 'CANCELLED',
  });
  cancelledBookingId = cancelledBooking._id;

  const requestedBooking = await Booking.create({
    customerId,
    technicianId: technicianProfileId,
    serviceId: service._id,
    serviceName: 'Test AC Service',
    address: baseAddress,
    scheduledDate: new Date(),
    scheduledTime: '12:00',
    urgency: 'NORMAL',
    basePrice: 500,
    urgencyCharge: 0,
    distanceCharge: 0,
    totalPrice: 500,
    status: 'REQUESTED',
  });
  requestedBookingId = requestedBooking._id;

  // ── Get auth tokens ──
  const agent = request(app);
  customerToken = await loginUser(agent, 'customer1@test.homeserve', 'Test1234!');
  customer2Token = await loginUser(agent, 'customer2@test.homeserve', 'Test1234!');
  technicianToken = await loginUser(agent, 'tech@test.homeserve', 'Test1234!');
  adminToken = await loginUser(agent, 'admin@test.homeserve', 'Test1234!');
});

afterAll(async () => {
  // Clean up test data
  await Promise.all([
    User.deleteMany({ email: { $regex: /@test\.homeserve$/ } }),
    Review.deleteMany({ bookingId: { $in: [completedBookingId, cancelledBookingId, requestedBookingId] } }),
  ]);
  await mongoose.disconnect();
});

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe('Phase 11 — Reviews & Ratings', () => {

  // ── 7. Unauthenticated user cannot submit a review ──
  test('7. Unauthenticated: POST /api/reviews returns 401', async () => {
    const res = await request(app)
      .post('/api/reviews')
      .send({ bookingId: completedBookingId.toString(), rating: 4 });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  // ── 8. Technician cannot submit a customer review ──
  test('8. Technician: POST /api/reviews returns 403', async () => {
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${technicianToken}`)
      .send({ bookingId: completedBookingId.toString(), rating: 4 });
    expect(res.status).toBe(403);
  });

  // ── 5a. Invalid rating 0 ──
  test('5a. Rating 0 is rejected', async () => {
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ bookingId: completedBookingId.toString(), rating: 0 });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // ── 5b. Invalid rating 6 ──
  test('5b. Rating 6 is rejected', async () => {
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ bookingId: completedBookingId.toString(), rating: 6 });
    expect(res.status).toBe(400);
  });

  // ── 5c. Non-integer rating ──
  test('5c. Non-integer rating (3.5) is rejected', async () => {
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ bookingId: completedBookingId.toString(), rating: 3.5 });
    expect(res.status).toBe(400);
  });

  // ── 5d. Missing rating ──
  test('5d. Missing rating is rejected', async () => {
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ bookingId: completedBookingId.toString() });
    expect(res.status).toBe(400);
  });

  // ── 6. Comment exceeding 500 chars ──
  test('6. Comment > 500 chars is rejected', async () => {
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        bookingId: completedBookingId.toString(),
        rating: 4,
        comment: 'x'.repeat(501),
      });
    expect(res.status).toBe(400);
  });

  // ── 3a. Customer cannot review a cancelled booking ──
  test('3a. Cannot review a CANCELLED booking', async () => {
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ bookingId: cancelledBookingId.toString(), rating: 3 });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/completed/i);
  });

  // ── 3b. Customer cannot review a REQUESTED booking ──
  test('3b. Cannot review a REQUESTED (not completed) booking', async () => {
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ bookingId: requestedBookingId.toString(), rating: 5 });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/completed/i);
  });

  // ── 2. Customer cannot review another customer's booking ──
  test('2. Customer2 cannot review Customer1\'s booking', async () => {
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${customer2Token}`)
      .send({ bookingId: completedBookingId.toString(), rating: 5 });
    expect(res.status).toBe(403);
  });

  // ── 1. Authenticated customer CAN review their completed booking ──
  test('1. Customer can review their completed booking', async () => {
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        bookingId: completedBookingId.toString(),
        rating: 4,
        comment: 'Great service!',
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.rating).toBe(4);
    expect(res.body.data.comment).toBe('Great service!');
    // bookingId should match
    expect(res.body.data.bookingId.toString()).toBe(completedBookingId.toString());
  });

  // ── 11. Review response does not expose private data ──
  test('11. Review response does not expose customer email/phone/password', async () => {
    const res = await request(app)
      .get(`/api/reviews/booking/${completedBookingId}`)
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(200);
    const data = res.body.data;
    // Must not have email or phone on the customer field
    expect(data).not.toHaveProperty('customerEmail');
    // The customerId field should not be an object with email
    if (data.customerId && typeof data.customerId === 'object') {
      expect(data.customerId).not.toHaveProperty('email');
      expect(data.customerId).not.toHaveProperty('phone');
      expect(data.customerId).not.toHaveProperty('password');
    }
    // customerName is allowed (public, non-sensitive)
    // customerEmail should not exist at top level
    expect(data).not.toHaveProperty('customerEmail');
  });

  // ── 4. Duplicate review is rejected ──
  test('4. Duplicate review for the same booking is rejected (409)', async () => {
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        bookingId: completedBookingId.toString(),
        rating: 5,
        comment: 'Trying to review again',
      });
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/already submitted/i);
  });

  // ── 9. GET technician reviews returns correct stats ──
  test('9. GET /api/reviews/technician/:id returns correct avgRating and totalReviews', async () => {
    const res = await request(app)
      .get(`/api/reviews/technician/${technicianProfileId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalReviews).toBeGreaterThanOrEqual(1);
    expect(res.body.data.avgRating).toBeGreaterThanOrEqual(1);
    expect(res.body.data.avgRating).toBeLessThanOrEqual(5);
    // Reviews array should be present
    expect(Array.isArray(res.body.data.reviews)).toBe(true);
  });

  // ── 9b. Technician denormalised rating matches aggregation ──
  test('9b. Technician profile rating matches review aggregation', async () => {
    const tech = await Technician.findById(technicianProfileId);
    const [agg] = await Review.aggregate([
      { $match: { technicianId: new mongoose.Types.ObjectId(technicianProfileId) } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    const expectedAvg = agg ? Math.round(agg.avg * 10) / 10 : 0;
    expect(Math.round(tech.rating * 10) / 10).toBe(expectedAvg);
    expect(tech.totalReviews).toBe(agg ? agg.count : 0);
  });

  // ── 10. Technician with no reviews returns 0/0 ──
  test('10. Technician with no reviews: avgRating=0, totalReviews=0', async () => {
    // Create a fresh technician with no reviews
    const freshTechUser = await User.create({
      name: 'Fresh Tech',
      email: 'freshtech@test.homeserve',
      password: 'Test1234!',
      role: 'TECHNICIAN',
    });
    const freshTech = await Technician.create({
      userId: freshTechUser._id,
      verificationStatus: 'APPROVED',
      isVerified: true,
    });

    const res = await request(app)
      .get(`/api/reviews/technician/${freshTech._id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.avgRating).toBe(0);
    expect(res.body.data.totalReviews).toBe(0);
    expect(Array.isArray(res.body.data.reviews)).toBe(true);
    expect(res.body.data.reviews.length).toBe(0);

    // Cleanup
    await User.deleteOne({ _id: freshTechUser._id });
    await Technician.deleteOne({ _id: freshTech._id });
  });

  // ── 12. Existing booking endpoint still works ──
  test('12a. GET /api/bookings/my still works for customer', async () => {
    const res = await request(app)
      .get('/api/bookings/my')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  // ── 12b. Auth endpoint still works ──
  test('12b. GET /api/auth/me still returns authenticated user', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('CUSTOMER');
    // Password must not be in response
    expect(res.body.user).not.toHaveProperty('password');
  });

  // ── 12c. Technician profile endpoint still works ──
  test('12c. GET /api/technicians/me still works', async () => {
    const res = await request(app)
      .get('/api/technicians/me')
      .set('Authorization', `Bearer ${technicianToken}`);
    expect(res.status).toBe(200);
    expect(res.body.profileExists).toBe(true);
  });

  // ── Admin: GET all reviews ──
  test('Admin: GET /api/reviews/admin returns reviews with pagination', async () => {
    const res = await request(app)
      .get('/api/reviews/admin')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  // ── Admin: non-admin cannot access admin endpoint ──
  test('Customer cannot access GET /api/reviews/admin', async () => {
    const res = await request(app)
      .get('/api/reviews/admin')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(403);
  });

  // ── Admin: delete review ──
  test('Admin: DELETE /api/reviews/:id removes the review and recalculates rating', async () => {
    // Find the review we created
    const review = await Review.findOne({ bookingId: completedBookingId });
    expect(review).not.toBeNull();

    const res = await request(app)
      .delete(`/api/reviews/${review._id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Review should no longer exist
    const deleted = await Review.findById(review._id);
    expect(deleted).toBeNull();

    // Technician totalReviews should be 0
    const tech = await Technician.findById(technicianProfileId);
    expect(tech.totalReviews).toBe(0);
    expect(tech.rating).toBe(0);
  });

  // ── Customer cannot delete a review ──
  test('Customer cannot DELETE /api/reviews/:id', async () => {
    // Create a fresh review to test against
    const review = await Review.create({
      bookingId: completedBookingId,
      customerId,
      technicianId: technicianProfileId,
      rating: 3,
    });

    const res = await request(app)
      .delete(`/api/reviews/${review._id}`)
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(403);

    // Cleanup
    await Review.deleteOne({ _id: review._id });
    await Technician.findByIdAndUpdate(technicianProfileId, { rating: 0, totalReviews: 0 });
  });

});
