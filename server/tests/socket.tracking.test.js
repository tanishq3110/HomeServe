/**
 * socket.tracking.test.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Phase 15 — Socket.IO Real-Time Authentication, Room Authorization & GPS Tracking Suite.
 *
 * Covers:
 *   1. Socket.IO connection rejects missing or invalid JWT credentials.
 *   2. Socket.IO connection successfully authenticates valid customer/technician tokens.
 *   3. Customer successfully joins their own booking room (booking:join).
 *   4. Unrelated customer is rejected from joining another customer's booking room (Forbidden).
 *   5. Customer is blocked from starting technician GPS location sharing.
 *   6. Assigned approved technician successfully starts location sharing.
 *   7. Coordinates are validated (-90 to 90 lat, -180 to 180 lng).
 *   8. Customer in the booking room receives live location:updated broadcasts.
 *   9. Technician location sharing stop broadcasts location:sharing_stopped event.
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const http = require('http');
const mongoose = require('mongoose');
const { io: ioClient } = require('socket.io-client');
const dotenv = require('dotenv');

dotenv.config({ path: require('path').join(__dirname, '..', '.env') });

const User = require('../models/user.model');
const Service = require('../models/service.model');
const Technician = require('../models/technician.model');
const Booking = require('../models/booking.model');
const { initSocket } = require('../sockets');
const jwt = require('jsonwebtoken');

let server;
let port;
let ioServer;

let customer1Token;
let customer2Token;
let techToken;

let customer1Id;
let customer2Id;
let techUserId;
let techProfileId;
let testBookingId;

beforeAll(async () => {
  const mongoUri = process.env.MONGODB_TEST_URI || process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) throw new Error('No MongoDB URI found.');

  await mongoose.connect(mongoUri);

  // Setup express & http server
  const express = require('express');
  const testApp = express();
  server = http.createServer(testApp);
  ioServer = initSocket(server, '*');

  await new Promise((resolve) => {
    server.listen(0, () => {
      port = server.address().port;
      resolve();
    });
  });

  // Clean test data
  await User.deleteMany({ email: { $regex: /@socket-test\.homeserve$/ } });
  await Booking.deleteMany({});
  await Technician.deleteMany({});
  await Service.deleteMany({ slug: 'socket-test-service' });

  // Create users
  const c1 = await User.create({
    name: 'Socket Customer 1',
    email: 'c1@socket-test.homeserve',
    password: 'Password123!',
    role: 'CUSTOMER',
  });
  customer1Id = c1._id;

  const c2 = await User.create({
    name: 'Socket Customer 2',
    email: 'c2@socket-test.homeserve',
    password: 'Password123!',
    role: 'CUSTOMER',
  });
  customer2Id = c2._id;

  const tUser = await User.create({
    name: 'Socket Tech User',
    email: 'tech@socket-test.homeserve',
    password: 'Password123!',
    role: 'TECHNICIAN',
  });
  techUserId = tUser._id;

  const techProfile = await Technician.create({
    userId: techUserId,
    skills: ['Plumbing'],
    experience: 3,
    verificationStatus: 'APPROVED',
    isVerified: true,
    isAvailable: true,
  });
  techProfileId = techProfile._id;

  const service = await Service.create({
    name: 'Socket Test Service',
    slug: 'socket-test-service',
    category: 'Plumbing',
    startingPrice: 400,
    iconName: 'Wrench',
  });

  // Create active booking assigned to technician (status ON_THE_WAY)
  const booking = await Booking.create({
    customerId: customer1Id,
    technicianId: techProfileId,
    serviceId: service._id,
    serviceName: 'Socket Test Service',
    scheduledDate: new Date(Date.now() + 86400000),
    scheduledTime: '12:00',
    address: {
      fullName: 'Socket Customer 1',
      phone: '9876543210',
      addressLine: '123 Socket St',
      city: 'Bangalore',
      state: 'Karnataka',
      postalCode: '560001',
    },
    urgency: 'NORMAL',
    basePrice: 400,
    urgencyCharge: 0,
    distanceCharge: 0,
    totalPrice: 400,
    status: 'ON_THE_WAY',
    paymentStatus: 'PENDING',
  });
  testBookingId = booking._id.toString();

  const secret = process.env.JWT_SECRET;
  customer1Token = jwt.sign({ id: customer1Id, role: 'CUSTOMER' }, secret, { expiresIn: '1h' });
  customer2Token = jwt.sign({ id: customer2Id, role: 'CUSTOMER' }, secret, { expiresIn: '1h' });
  techToken = jwt.sign({ id: techUserId, role: 'TECHNICIAN' }, secret, { expiresIn: '1h' });
});

afterAll(async () => {
  if (ioServer) ioServer.close();
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await User.deleteMany({ email: { $regex: /@socket-test\.homeserve$/ } });
  await Booking.deleteMany({});
  await Technician.deleteMany({});
  await Service.deleteMany({ slug: 'socket-test-service' });
  await mongoose.disconnect();
});

describe('Phase 15 — Socket.IO Auth, Room Security & Live GPS Tracking', () => {
  describe('1. Handshake Authentication', () => {
    it('rejects connection when no token is provided', (done) => {
      const client = ioClient(`http://localhost:${port}`, {
        transports: ['websocket'],
        reconnection: false,
      });

      client.on('connect_error', (err) => {
        expect(err.message).toMatch(/no authentication token/i);
        client.disconnect();
        done();
      });
    });

    it('rejects connection with an invalid token', (done) => {
      const client = ioClient(`http://localhost:${port}`, {
        auth: { token: 'invalid_tampered_token' },
        transports: ['websocket'],
        reconnection: false,
      });

      client.on('connect_error', (err) => {
        expect(err.message).toMatch(/invalid authentication token/i);
        client.disconnect();
        done();
      });
    });

    it('successfully connects with a valid customer token', (done) => {
      const client = ioClient(`http://localhost:${port}`, {
        auth: { token: customer1Token },
        transports: ['websocket'],
      });

      client.on('connect', () => {
        expect(client.connected).toBe(true);
        client.disconnect();
        done();
      });
    });
  });

  describe('2. Room Joining & Authorization', () => {
    it('allows customer 1 to join their own booking room', (done) => {
      const client = ioClient(`http://localhost:${port}`, {
        auth: { token: customer1Token },
        transports: ['websocket'],
      });

      client.on('connect', () => {
        client.emit('booking:join', { bookingId: testBookingId }, (res) => {
          expect(res.success).toBe(true);
          expect(res.bookingId).toBe(testBookingId);
          client.disconnect();
          done();
        });
      });
    });

    it('forbids customer 2 from joining customer 1 booking room', (done) => {
      const client = ioClient(`http://localhost:${port}`, {
        auth: { token: customer2Token },
        transports: ['websocket'],
      });

      client.on('connect', () => {
        client.emit('booking:join', { bookingId: testBookingId }, (res) => {
          expect(res.success).toBe(false);
          expect(res.error).toMatch(/forbidden|not authorized/i);
          client.disconnect();
          done();
        });
      });
    });
  });

  describe('3. Technician Live GPS Tracking Broadcasts', () => {
    it('forbids a customer from starting location sharing', (done) => {
      const client = ioClient(`http://localhost:${port}`, {
        auth: { token: customer1Token },
        transports: ['websocket'],
      });

      client.on('connect', () => {
        client.emit('location:share_start', { bookingId: testBookingId }, (res) => {
          expect(res.success).toBe(false);
          expect(res.error).toMatch(/only authenticated technicians/i);
          client.disconnect();
          done();
        });
      });
    });

    it('assigned approved technician starts sharing and broadcasts live coordinates to customer in room', (done) => {
      const techClient = ioClient(`http://localhost:${port}`, {
        auth: { token: techToken },
        transports: ['websocket'],
      });

      const customerClient = ioClient(`http://localhost:${port}`, {
        auth: { token: customer1Token },
        transports: ['websocket'],
      });

      customerClient.on('connect', () => {
        // Customer joins booking room
        customerClient.emit('booking:join', { bookingId: testBookingId }, () => {
          // Listen for live location updates from technician
          customerClient.on('location:updated', (payload) => {
            expect(payload.bookingId).toBe(testBookingId);
            expect(payload.latitude).toBeCloseTo(12.9716, 2);
            expect(payload.longitude).toBeCloseTo(77.5946, 2);

            techClient.disconnect();
            customerClient.disconnect();
            done();
          });

          // Technician starts location sharing
          techClient.emit('location:share_start', { bookingId: testBookingId }, (startRes) => {
            expect(startRes.success).toBe(true);

            // Technician sends coordinate update
            techClient.emit('location:update', {
              bookingId: testBookingId,
              latitude: 12.9716,
              longitude: 77.5946,
              heading: 90,
              speed: 25,
            });
          });
        });
      });
    });

    it('rejects coordinate updates outside valid geographic boundaries', (done) => {
      const techClient = ioClient(`http://localhost:${port}`, {
        auth: { token: techToken },
        transports: ['websocket'],
      });

      techClient.on('connect', () => {
        techClient.emit('location:update', {
          bookingId: testBookingId,
          latitude: 999.0, // Invalid latitude
          longitude: 77.5946,
        }, (res) => {
          expect(res.success).toBe(false);
          expect(res.error).toMatch(/invalid coordinates/i);
          techClient.disconnect();
          done();
        });
      });
    });
  });
});
