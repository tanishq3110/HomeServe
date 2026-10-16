/**
 * auth.rbac.test.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Phase 15 — Comprehensive Authentication, RBAC & Security Boundaries Test Suite.
 *
 * Covers:
 *   1.  Missing, malformed, expired, and invalid signature JWTs.
 *   2.  Customer, technician, and admin access boundaries across route groups.
 *   3.  User registration validation (email format, password min length, duplicates).
 *   4.  Password hashing verification (passwords never stored in plain text).
 *   5.  Login credential verification and safe user profile returns.
 *   6.  NoSQL query injection sanitization in auth routes.
 *   7.  Request payload size limits (50KB limit).
 *   8.  Zero leakage of secrets, stack traces, or DB internals in error responses.
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config({ path: require('path').join(__dirname, '..', '.env') });

let app;
const User = require('../models/user.model');

let customerToken;
let techToken;
let adminToken;
let customerId;

beforeAll(async () => {
  const mongoUri = process.env.MONGODB_TEST_URI || process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) throw new Error('No MongoDB URI found.');

  await mongoose.connect(mongoUri);
  app = require('../server');

  // Clean up test users
  await User.deleteMany({ email: { $regex: /@auth-test\.homeserve$/ } });

  // Seed test users
  const customer = await User.create({
    name: 'Auth Customer',
    email: 'customer@auth-test.homeserve',
    password: 'Password123!',
    role: 'CUSTOMER',
  });
  customerId = customer._id;

  await User.create({
    name: 'Auth Tech',
    email: 'tech@auth-test.homeserve',
    password: 'Password123!',
    role: 'TECHNICIAN',
  });

  await User.create({
    name: 'Auth Admin',
    email: 'admin@auth-test.homeserve',
    password: 'Password123!',
    role: 'ADMIN',
  });

  const agent = request(app);
  const custRes = await agent.post('/api/auth/login').send({
    email: 'customer@auth-test.homeserve',
    password: 'Password123!',
  });
  customerToken = custRes.body.token;

  const techRes = await agent.post('/api/auth/login').send({
    email: 'tech@auth-test.homeserve',
    password: 'Password123!',
  });
  techToken = techRes.body.token;

  const adminRes = await agent.post('/api/auth/login').send({
    email: 'admin@auth-test.homeserve',
    password: 'Password123!',
  });
  adminToken = adminRes.body.token;
});

afterAll(async () => {
  await User.deleteMany({ email: { $regex: /@auth-test\.homeserve$/ } });
  await mongoose.disconnect();
});

describe('Phase 15 — Auth & RBAC Security Suite', () => {
  describe('1. Registration Validation', () => {
    it('rejects registration with missing required fields (400)', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'incomplete@auth-test.homeserve',
      });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects registration with invalid email format (400)', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Invalid Email User',
        email: 'not-an-email',
        password: 'Password123!',
      });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects registration with password shorter than 6 characters (400)', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Short Pass User',
        email: 'shortpass@auth-test.homeserve',
        password: '123',
      });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects duplicate email registration (400 or 409)', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Duplicate User',
        email: 'customer@auth-test.homeserve',
        password: 'Password123!',
      });
      expect([400, 409]).toContain(res.status);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/already registered|already exists/i);
    });

    it('hashes passwords securely and never returns password in response', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Hashed User',
        email: 'hashed@auth-test.homeserve',
        password: 'SecurePassword123!',
      });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).not.toHaveProperty('password');

      // Verify in DB with .select('+password') that password is a bcrypt hash ($2...)
      const dbUser = await User.findOne({ email: 'hashed@auth-test.homeserve' }).select('+password');
      expect(dbUser.password).toMatch(/^\$2[aby]\$\d+\$/);
      expect(dbUser.password).not.toBe('SecurePassword123!');
    });
  });

  describe('2. Login Credential Verification', () => {
    it('rejects login with incorrect password (401)', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'customer@auth-test.homeserve',
        password: 'WrongPassword!',
      });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.token).toBeUndefined();
    });

    it('rejects login with non-existent email (401)', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'nonexistent@auth-test.homeserve',
        password: 'Password123!',
      });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns valid JWT and safe user object on successful login', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'customer@auth-test.homeserve',
        password: 'Password123!',
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe('customer@auth-test.homeserve');
      expect(res.body.user.role).toBe('CUSTOMER');
      expect(res.body.user).not.toHaveProperty('password');
    });
  });

  describe('3. JWT Token Validation Edge Cases', () => {
    it('rejects request with missing Authorization header (401)', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects malformed Authorization header without Bearer prefix (401)', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Token ${customerToken}`);
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects expired JWT token (401)', async () => {
      const secret = process.env.JWT_SECRET || 'secret';
      const expiredToken = jwt.sign(
        { id: customerId, role: 'CUSTOMER' },
        secret,
        { expiresIn: '-10s' } // Expired 10 seconds ago
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/expired/i);
    });

    it('rejects JWT signed with invalid secret key (401)', async () => {
      const forgedToken = jwt.sign(
        { id: customerId, role: 'ADMIN' },
        'wrong_tampered_secret_key_123',
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${forgedToken}`);
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('4. Role-Based Access Control (RBAC) Boundaries', () => {
    it('prevents CUSTOMER from accessing admin analytics (403)', async () => {
      const res = await request(app)
        .get('/api/admin/analytics/overview')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('prevents CUSTOMER from accessing admin technician management (403)', async () => {
      const res = await request(app)
        .get('/api/admin/technicians')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('prevents TECHNICIAN from accessing customer wallet (403)', async () => {
      const res = await request(app)
        .get('/api/wallet')
        .set('Authorization', `Bearer ${techToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('prevents TECHNICIAN from accessing customer bookings list (403)', async () => {
      const res = await request(app)
        .get('/api/bookings/my')
        .set('Authorization', `Bearer ${techToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('allows ADMIN to access admin analytics overview (200)', async () => {
      const res = await request(app)
        .get('/api/admin/analytics/overview')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('5. Security Sanitization & DoS Limits', () => {
    it('sanitizes NoSQL operator injection in request body', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: { $gt: '' }, // NoSQL query injection attempt
        password: 'Password123!',
      });
      // Should not authenticate or crash; either 400 (bad type) or 401 (invalid credentials)
      expect([400, 401]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    it('enforces payload size limit and rejects payloads > 50KB (413)', async () => {
      const largePayload = {
        name: 'Oversized User',
        email: 'large@auth-test.homeserve',
        password: 'Password123!',
        junkData: 'X'.repeat(60 * 1024), // 60KB payload
      };

      const res = await request(app)
        .post('/api/auth/register')
        .send(largePayload);

      expect(res.status).toBe(413);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/exceeds size limit/i);
    });

    it('never leaks stack traces, environment variables, or database internals in error responses', async () => {
      const res = await request(app)
        .get('/api/bookings/invalid-object-id-12345')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(400);
      expect(res.body).not.toHaveProperty('stack');
      expect(JSON.stringify(res.body)).not.toMatch(/mongodb:\/\//i);
      expect(JSON.stringify(res.body)).not.toMatch(/JWT_SECRET/i);
    });
  });
});
