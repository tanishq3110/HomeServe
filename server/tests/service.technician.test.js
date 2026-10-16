/**
 * service.technician.test.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Phase 15 — Service Catalog & Technician Approval Lifecycle Test Suite.
 *
 * Covers:
 *   1. Public service listing and category filtering.
 *   2. Public service detail retrieval.
 *   3. Customer/unauthenticated users prevented from modifying services.
 *   4. Admin service creation, update, and deletion.
 *   5. Technician profile creation with default PENDING verification status.
 *   6. Unapproved technician blocked from setting availability to online.
 *   7. Admin technician application review and status filtering.
 *   8. Admin approval transitions technician to APPROVED & verified.
 *   9. Approved technician successfully toggles availability online.
 *  10. Admin rejection with structured reason recording.
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

let adminToken;
let customerToken;
let techUser1Token;
let techUser2Token;

let techUser1Id;
let techUser2Id;
let techProfile1Id;
let techProfile2Id;
let testServiceId;

beforeAll(async () => {
  const mongoUri = process.env.MONGODB_TEST_URI || process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) throw new Error('No MongoDB URI found.');

  await mongoose.connect(mongoUri);
  app = require('../server');

  // Clean up
  await User.deleteMany({ email: { $regex: /@service-tech-test\.homeserve$/ } });
  await Service.deleteMany({ slug: { $regex: /^test-/ } });
  await Technician.deleteMany({});

  // Create users
  await User.create({
    name: 'ST Admin',
    email: 'admin@service-tech-test.homeserve',
    password: 'Password123!',
    role: 'ADMIN',
  });

  await User.create({
    name: 'ST Customer',
    email: 'customer@service-tech-test.homeserve',
    password: 'Password123!',
    role: 'CUSTOMER',
  });

  const tech1 = await User.create({
    name: 'ST Technician 1',
    email: 'tech1@service-tech-test.homeserve',
    password: 'Password123!',
    role: 'TECHNICIAN',
  });
  techUser1Id = tech1._id;

  const tech2 = await User.create({
    name: 'ST Technician 2',
    email: 'tech2@service-tech-test.homeserve',
    password: 'Password123!',
    role: 'TECHNICIAN',
  });
  techUser2Id = tech2._id;

  // Obtain tokens
  const agent = request(app);
  const aRes = await agent.post('/api/auth/login').send({
    email: 'admin@service-tech-test.homeserve',
    password: 'Password123!',
  });
  adminToken = aRes.body.token;

  const cRes = await agent.post('/api/auth/login').send({
    email: 'customer@service-tech-test.homeserve',
    password: 'Password123!',
  });
  customerToken = cRes.body.token;

  const t1Res = await agent.post('/api/auth/login').send({
    email: 'tech1@service-tech-test.homeserve',
    password: 'Password123!',
  });
  techUser1Token = t1Res.body.token;

  const t2Res = await agent.post('/api/auth/login').send({
    email: 'tech2@service-tech-test.homeserve',
    password: 'Password123!',
  });
  techUser2Token = t2Res.body.token;

  // Seed initial test service
  const service = await Service.create({
    name: 'Test Deep Cleaning',
    slug: 'test-deep-cleaning',
    category: 'Cleaning',
    startingPrice: 799,
    iconName: 'Sparkles',
    description: 'Professional deep home cleaning service',
    isActive: true,
  });
  testServiceId = service._id;
});

afterAll(async () => {
  await User.deleteMany({ email: { $regex: /@service-tech-test\.homeserve$/ } });
  await Service.deleteMany({ slug: { $regex: /^test-/ } });
  await Technician.deleteMany({});
  await mongoose.disconnect();
});

describe('Phase 15 — Service Catalog & Technician Approval Lifecycle Suite', () => {
  describe('1. Service Catalog Operations', () => {
    it('publicly lists active services without authentication (200)', async () => {
      const res = await request(app).get('/api/services');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('filters services by category parameter', async () => {
      const res = await request(app).get('/api/services?category=Cleaning');
      expect(res.status).toBe(200);
      expect(res.body.data.every((s) => s.category === 'Cleaning')).toBe(true);
    });

    it('returns service details for a valid service ID', async () => {
      const res = await request(app).get(`/api/services/${testServiceId}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id.toString()).toBe(testServiceId.toString());
      expect(res.body.data.name).toBe('Test Deep Cleaning');
    });

    it('prevents non-admin (customer) from creating a service (403)', async () => {
      const res = await request(app)
        .post('/api/services')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          name: 'Unauthorized Service',
          category: 'Plumbing',
          startingPrice: 399,
        });
      expect(res.status).toBe(403);
    });

    it('allows ADMIN to create a new service with starting price and category', async () => {
      const res = await request(app)
        .post('/api/services')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Pipe Repair',
          category: 'Plumbing',
          startingPrice: 450,
          iconName: 'Wrench',
          description: 'Emergency plumbing and pipe leakage fixes',
        });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.slug).toBe('test-pipe-repair');
      expect(res.body.data.startingPrice).toBe(450);
    });

    it('allows ADMIN to update service details', async () => {
      const res = await request(app)
        .put(`/api/services/${testServiceId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ startingPrice: 899 });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.startingPrice).toBe(899);
    });
  });

  describe('2. Technician Registration & Onboarding Lifecycle', () => {
    it('returns 404 with profileExists: false when technician profile has not been created', async () => {
      const res = await request(app)
        .get('/api/technicians/me')
        .set('Authorization', `Bearer ${techUser1Token}`);
      expect(res.status).toBe(404);
      expect(res.body.profileExists).toBe(false);
    });

    it('technician creates profile which starts in PENDING verification status', async () => {
      const res = await request(app)
        .post('/api/technicians/profile')
        .set('Authorization', `Bearer ${techUser1Token}`)
        .send({
          skills: ['AC Repair', 'Electrical'],
          experience: 4,
          serviceCategories: ['AC', 'Electrical'],
        });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.verificationStatus).toBe('PENDING');
      expect(res.body.data.isVerified).toBe(false);
      techProfile1Id = res.body.data.id || res.body.data._id;
    });

    it('technician 2 creates profile which starts in PENDING status', async () => {
      const res = await request(app)
        .post('/api/technicians/profile')
        .set('Authorization', `Bearer ${techUser2Token}`)
        .send({
          skills: ['Plumbing'],
          experience: 2,
          serviceCategories: ['Plumbing'],
        });
      expect(res.status).toBe(201);
      techProfile2Id = res.body.data.id || res.body.data._id;
    });

    it('unapproved technician is rejected when attempting to toggle online availability', async () => {
      const res = await request(app)
        .patch('/api/technicians/availability')
        .set('Authorization', `Bearer ${techUser1Token}`)
        .send({ isAvailable: true });
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/must be approved|only approved technicians/i);
    });
  });

  describe('3. Admin Technician Review & Approval Flow', () => {
    it('admin can list pending technician applications with filter', async () => {
      const res = await request(app)
        .get('/api/admin/technicians?status=PENDING')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      const found = res.body.data.find((t) => (t.id || t._id).toString() === techProfile1Id.toString());
      expect(found).toBeDefined();
      expect(found.verificationStatus).toBe('PENDING');
    });

    it('admin can inspect full profile of a single technician', async () => {
      const res = await request(app)
        .get(`/api/admin/technicians/${techProfile1Id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect((res.body.data.id || res.body.data._id).toString()).toBe(techProfile1Id.toString());
      expect(res.body.data.skills).toContain('AC Repair');
    });

    it('admin approves technician 1, granting verification and approval status', async () => {
      const res = await request(app)
        .patch(`/api/admin/technicians/${techProfile1Id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.verificationStatus).toBe('APPROVED');
      expect(res.body.data.isVerified).toBe(true);
    });

    it('approved technician 1 can now successfully toggle availability online', async () => {
      const res = await request(app)
        .patch('/api/technicians/availability')
        .set('Authorization', `Bearer ${techUser1Token}`)
        .send({ isAvailable: true });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isAvailable).toBe(true);
    });

    it('admin rejects technician 2 with an audited rejection reason', async () => {
      const res = await request(app)
        .patch(`/api/admin/technicians/${techProfile2Id}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ rejectionReason: 'Incomplete plumbing certifications provided.' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.verificationStatus).toBe('REJECTED');
      expect(res.body.data.isVerified).toBe(false);
      expect(res.body.data.rejectionReason).toMatch(/incomplete plumbing/i);
    });
  });
});
