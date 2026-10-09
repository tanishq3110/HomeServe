/**
 * test_phase8.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Comprehensive automated verification suite for HomeServe Phase 8 & 9:
 * Real-Time Technician GPS Tracking, Security Invariants, and Room Isolation.
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const http = require('http');
const mongoose = require('mongoose');
const { io: ioClient } = require('socket.io-client');
const dotenv = require('dotenv');

dotenv.config();

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

const BASE_HTTP = {
  hostname: 'localhost',
  port: 5000,
  headers: { 'Content-Type': 'application/json' },
};

const SOCKET_URL = 'http://localhost:5000';

function connectSocket(token, opts = {}) {
  return new Promise((resolve, reject) => {
    const s = ioClient(SOCKET_URL, {
      auth: token ? { token } : undefined,
      transports: ['websocket'],
      reconnection: false,
      timeout: 5000,
      ...opts,
    });

    s.on('connect', () => resolve(s));
    s.on('connect_error', (err) => resolve({ error: err.message, socket: s }));
  });
}

function waitForEvent(socket, eventName, timeoutMs = 4000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(eventName, handler);
      reject(new Error(`Timeout (${timeoutMs}ms) waiting for event "${eventName}"`));
    }, timeoutMs);

    const handler = (payload) => {
      clearTimeout(timer);
      socket.off(eventName, handler);
      resolve(payload);
    };

    socket.on(eventName, handler);
  });
}

function waitForLocation(socket, bookingId, timeoutMs = 4000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off('location:updated', handler);
      reject(new Error(`Timeout (${timeoutMs}ms) waiting for location:updated on booking "${bookingId}"`));
    }, timeoutMs);

    const handler = (payload) => {
      if (payload?.bookingId === bookingId) {
        clearTimeout(timer);
        socket.off('location:updated', handler);
        resolve(payload);
      }
    };

    socket.on('location:updated', handler);
  });
}

async function run() {
  console.log('====================================================');
  console.log('   HOMESERVE PHASE 8 AUTOMATED VERIFICATION SUITE   ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  const createdBookingIds = [];
  const createdUserIds = [];

  try {
    // ── 1. Health check
    console.log('1. Health Check & HTTP Regression');
    const health = await request({ ...BASE_HTTP, path: '/api/health', method: 'GET' });
    assert(health.status === 200 && health.data.database === 'connected', '/api/health is 200 and DB is connected');

    // ── 2. Authentications
    console.log('\n2. User Setup & Role Logins');
    const adminLogin = await request(
      { ...BASE_HTTP, path: '/api/auth/login', method: 'POST' },
      { email: 'admin@homeserve.com', password: 'AdminPassword123!' }
    );
    assert(adminLogin.status === 200 && adminLogin.data.token, 'Admin login succeeded');
    const adminToken = adminLogin.data?.token;

    const techLogin = await request(
      { ...BASE_HTTP, path: '/api/auth/login', method: 'POST' },
      { email: 'rajesh.electrician@homeserve.com', password: 'Password123!' }
    );
    assert(techLogin.status === 200 && techLogin.data.token, 'Approved Technician login succeeded (Rajesh)');
    const techToken = techLogin.data?.token;

    // Ensure technician is available for assignment
    await request(
      {
        ...BASE_HTTP,
        path: '/api/technicians/availability',
        method: 'PATCH',
        headers: { ...BASE_HTTP.headers, Authorization: `Bearer ${techToken}` },
      },
      { isAvailable: true }
    );

    // Register Customer A
    const custASuffix = Math.floor(Math.random() * 90000 + 10000);
    const custARes = await request(
      { ...BASE_HTTP, path: '/api/auth/register', method: 'POST' },
      {
        name: `Cust A ${custASuffix}`,
        email: `custA_${custASuffix}@test.com`,
        password: 'Password123!',
        phone: `9111${custASuffix}`,
        role: 'CUSTOMER',
      }
    );
    assert(custARes.status === 201 && custARes.data.token, 'Customer A token obtained');
    const custAToken = custARes.data?.token;
    const custAId = custARes.data?.user?.id || custARes.data?.user?._id;
    if (custAId) createdUserIds.push(custAId);

    // Register Customer B (Unrelated user)
    const custBSuffix = Math.floor(Math.random() * 90000 + 10000);
    const custBRes = await request(
      { ...BASE_HTTP, path: '/api/auth/register', method: 'POST' },
      {
        name: `Cust B ${custBSuffix}`,
        email: `custB_${custBSuffix}@test.com`,
        password: 'Password123!',
        phone: `9222${custBSuffix}`,
        role: 'CUSTOMER',
      }
    );
    assert(custBRes.status === 201 && custBRes.data.token, 'Customer B token obtained');
    const custBToken = custBRes.data?.token;
    const custBId = custBRes.data?.user?.id || custBRes.data?.user?._id;
    if (custBId) createdUserIds.push(custBId);

    // Register Unapproved Technician (Pending verification)
    const unapprovedSuffix = Math.floor(Math.random() * 90000 + 10000);
    const unapprovedRes = await request(
      { ...BASE_HTTP, path: '/api/auth/register', method: 'POST' },
      {
        name: `Unapproved Tech ${unapprovedSuffix}`,
        email: `unapproved_${unapprovedSuffix}@test.com`,
        password: 'Password123!',
        phone: `9333${unapprovedSuffix}`,
        role: 'TECHNICIAN',
      }
    );
    assert(unapprovedRes.status === 201 && unapprovedRes.data.token, 'Unapproved Technician registered');
    const unapprovedToken = unapprovedRes.data?.token;
    const unapprovedId = unapprovedRes.data?.user?.id || unapprovedRes.data?.user?._id;
    if (unapprovedId) createdUserIds.push(unapprovedId);

    // Get active electrician service
    const srvRes = await request({ ...BASE_HTTP, path: '/api/services', method: 'GET' });
    const targetService = srvRes.data?.data?.find(
      (s) => s.category?.toLowerCase().includes('electric') || s.name?.toLowerCase().includes('electric')
    ) || srvRes.data?.data?.[0];
    assert(Boolean(targetService?._id), `Target service found: ${targetService?.name}`);

    // ── 3. Connect Sockets
    console.log('\n3. Socket.IO Connections');
    const custASocket = await connectSocket(custAToken);
    const custBSocket = await connectSocket(custBToken);
    const techSocket = await connectSocket(techToken);
    const unapprovedSocket = await connectSocket(unapprovedToken);
    assert(custASocket.connected, 'Customer A socket connected');
    assert(techSocket.connected, 'Technician socket connected');
    assert(unapprovedSocket.connected, 'Unapproved technician socket connected');

    // ── 4. Create and Accept Booking 1
    console.log('\n4. Booking Creation & Acceptance');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const b1Res = await request(
      {
        ...BASE_HTTP,
        path: '/api/bookings',
        method: 'POST',
        headers: { ...BASE_HTTP.headers, Authorization: `Bearer ${custAToken}` },
      },
      {
        serviceId: targetService._id,
        scheduledDate: tomorrow.toISOString().split('T')[0],
        scheduledTime: '10:00',
        urgency: 'NORMAL',
        address: {
          fullName: 'Test Customer A',
          phone: '9876543210',
          addressLine: 'Apt 101, Galaxy Tower',
          city: 'Delhi',
          state: 'Delhi',
          postalCode: '110001',
          latitude: 28.6139,
          longitude: 77.209,
        },
      }
    );
    assert(b1Res.status === 201, 'Booking 1 created via REST (201)');
    const booking1Id = b1Res.data?.data?._id;
    if (booking1Id) createdBookingIds.push(booking1Id);

    // Technician accepts booking
    const acceptRes = await request({
      ...BASE_HTTP,
      path: `/api/bookings/${booking1Id}/accept`,
      method: 'PATCH',
      headers: { ...BASE_HTTP.headers, Authorization: `Bearer ${techToken}` },
    });
    assert(acceptRes.status === 200, 'Technician accepted booking 1 (status: ACCEPTED)');

    // Customer A joins booking 1 room
    const joinPromise = new Promise((resolve) => {
      custASocket.emit('booking:join', { bookingId: booking1Id }, (ack) => resolve(ack));
    });
    const joinAck = await joinPromise;
    assert(joinAck?.success === true, 'Customer A joined booking 1 room');

    // ── 5. Location Sharing Initiation (location:share_start)
    console.log('\n5. Location Sharing Initiation');
    const startSharePromise = new Promise((resolve) => {
      techSocket.emit('location:share_start', { bookingId: booking1Id }, (ack) => resolve(ack));
    });

    const [startAck, sharingStartedEvent] = await Promise.all([
      startSharePromise,
      waitForEvent(custASocket, 'location:sharing_started'),
    ]);
    assert(startAck?.success === true, 'Technician location:share_start acknowledged');
    assert(sharingStartedEvent?.bookingId === booking1Id && sharingStartedEvent.isSharing === true, 'Customer A received location:sharing_started event');

    // ── 6. Live GPS Coordinates Streaming (location:update)
    console.log('\n6. Real-Time GPS Coordinates Streaming');
    const testLat = 28.6253;
    const testLng = 77.2185;
    const testAccuracy = 8.5;
    const testSpeed = 4.2;

    const locPromise = waitForLocation(custASocket, booking1Id);

    const updateAckPromise = new Promise((resolve) => {
      techSocket.emit(
        'location:update',
        {
          bookingId: booking1Id,
          latitude: testLat,
          longitude: testLng,
          accuracy: testAccuracy,
          speed: testSpeed,
          heading: 180,
          timestamp: new Date().toISOString(),
        },
        (ack) => resolve(ack)
      );
    });

    const [updateAck, receivedLoc] = await Promise.all([updateAckPromise, locPromise]);
    assert(updateAck?.success === true, 'location:update acknowledged by server');
    assert(
      receivedLoc.latitude === testLat && receivedLoc.longitude === testLng && receivedLoc.accuracy === testAccuracy,
      'Customer A received verified GPS coordinates (Lat: 28.6253, Lng: 77.2185, Acc: 8.5m)'
    );

    // ── 7. Coordinate Validation Invariants
    console.log('\n7. GPS Coordinate Validation & Boundary Checks');

    // Invalid Latitude (> 90)
    await new Promise((resolve) => {
      setTimeout(resolve, 1600); // Wait past throttle interval
    });
    const invalidLatAck = await new Promise((resolve) => {
      techSocket.emit('location:update', { bookingId: booking1Id, latitude: 95.0, longitude: 77.2 }, (ack) => resolve(ack));
    });
    assert(invalidLatAck?.success === false, 'Rejects latitude > 90');

    // Invalid Longitude (< -180)
    const invalidLngAck = await new Promise((resolve) => {
      techSocket.emit('location:update', { bookingId: booking1Id, latitude: 28.0, longitude: -195.0 }, (ack) => resolve(ack));
    });
    assert(invalidLngAck?.success === false, 'Rejects longitude < -180');

    // Non-finite / NaN coordinate
    const nanAck = await new Promise((resolve) => {
      techSocket.emit('location:update', { bookingId: booking1Id, latitude: 'not-a-number', longitude: null }, (ack) => resolve(ack));
    });
    assert(nanAck?.success === false, 'Rejects non-finite/NaN coordinates');

    // ── 8. Security & RBAC Enforcement
    console.log('\n8. Role-Based Authorization & Privacy Enforcement');

    // Customer cannot publish location updates
    const custPublishAck = await new Promise((resolve) => {
      custASocket.emit('location:update', { bookingId: booking1Id, latitude: 28.6, longitude: 77.2 }, (ack) => resolve(ack));
    });
    assert(custPublishAck?.success === false, 'Customer rejected from broadcasting location (Forbidden)');

    // Unapproved technician cannot share location
    const unapprovedAck = await new Promise((resolve) => {
      unapprovedSocket.emit('location:share_start', { bookingId: booking1Id }, (ack) => resolve(ack));
    });
    assert(unapprovedAck?.success === false, 'Unapproved technician rejected from starting location sharing');

    // Technician cannot share for an unassigned booking
    const fakeBookingId = new mongoose.Types.ObjectId().toString();
    const wrongBookingAck = await new Promise((resolve) => {
      techSocket.emit('location:share_start', { bookingId: fakeBookingId }, (ack) => resolve(ack));
    });
    assert(wrongBookingAck?.success === false, 'Technician cannot share location for non-assigned/unknown booking');

    // Unrelated Customer B in private room does NOT receive location events
    let custBGotEvent = false;
    custBSocket.on('location:updated', () => { custBGotEvent = true; });

    await new Promise((resolve) => setTimeout(resolve, 1600)); // Past throttle
    await new Promise((resolve) => {
      techSocket.emit(
        'location:update',
        { bookingId: booking1Id, latitude: 28.63, longitude: 77.22 },
        (ack) => resolve(ack)
      );
    });
    await new Promise((resolve) => setTimeout(resolve, 500));
    assert(custBGotEvent === false, 'Room Isolation: Unrelated Customer B received zero private booking GPS events');

    // ── 9. Throttling Verification
    console.log('\n9. GPS Update Throttling');
    // Immediate subsequent emission within 50ms (less than 1500ms throttle)
    const rapidAck = await new Promise((resolve) => {
      techSocket.emit(
        'location:update',
        { bookingId: booking1Id, latitude: 28.631, longitude: 77.221 },
        (ack) => resolve(ack)
      );
    });
    assert(rapidAck?.throttled === true, 'Rapid-fire location update properly throttled (< 1.5s interval)');

    // ── 10. REST API Location Retrieval & Security
    console.log('\n10. REST GET /api/bookings/:id/location Verification');
    const custALocRes = await request({
      ...BASE_HTTP,
      path: `/api/bookings/${booking1Id}/location`,
      method: 'GET',
      headers: { ...BASE_HTTP.headers, Authorization: `Bearer ${custAToken}` },
    });
    assert(custALocRes.status === 200, 'Customer A authorized to retrieve latest location (200)');
    assert(
      custALocRes.data?.data?.isSharing === true && typeof custALocRes.data?.data?.location?.latitude === 'number',
      'Returned valid location payload with latitude and isSharing: true'
    );

    // Customer B forbidden
    const custBLocRes = await request({
      ...BASE_HTTP,
      path: `/api/bookings/${booking1Id}/location`,
      method: 'GET',
      headers: { ...BASE_HTTP.headers, Authorization: `Bearer ${custBToken}` },
    });
    assert(custBLocRes.status === 403, 'Unauthorized Customer B rejected with 403 Forbidden');

    // Unauthenticated request
    const unauthLocRes = await request({
      ...BASE_HTTP,
      path: `/api/bookings/${booking1Id}/location`,
      method: 'GET',
    });
    assert(unauthLocRes.status === 401, 'Unauthenticated location request rejected with 401 Unauthorized');

    // ── 11. Explicit Stop Sharing (location:share_stop)
    console.log('\n11. Explicit Stop Sharing Control');
    const stopPromise = waitForEvent(custASocket, 'location:sharing_stopped');
    const stopAck = await new Promise((resolve) => {
      techSocket.emit('location:share_stop', { bookingId: booking1Id }, (ack) => resolve(ack));
    });
    const stopEvent = await stopPromise;
    assert(stopAck?.success === true, 'location:share_stop acknowledged');
    assert(stopEvent?.isSharing === false && stopEvent?.reason === 'technician_stopped', 'Customer A received location:sharing_stopped (reason: technician_stopped)');

    // ── 12. Auto-Stop on Job Progression & Ineligibility
    console.log('\n12. Job Progression & Ineligible Status Termination');
    // Progress status to ON_THE_WAY
    await request({
      ...BASE_HTTP,
      path: `/api/bookings/${booking1Id}/status`,
      method: 'PATCH',
      headers: { ...BASE_HTTP.headers, Authorization: `Bearer ${techToken}` },
    }, { status: 'ON_THE_WAY' });

    // Restart sharing
    await new Promise((resolve) => {
      techSocket.emit('location:share_start', { bookingId: booking1Id }, (ack) => resolve(ack));
    });

    // Progress to ARRIVED (tracking still eligible)
    await request({
      ...BASE_HTTP,
      path: `/api/bookings/${booking1Id}/status`,
      method: 'PATCH',
      headers: { ...BASE_HTTP.headers, Authorization: `Bearer ${techToken}` },
    }, { status: 'ARRIVED' });

    // Progress to SERVICE_STARTED (ineligible -> must auto-stop sharing)
    const autoStopPromise = waitForEvent(custASocket, 'location:sharing_stopped');
    await request({
      ...BASE_HTTP,
      path: `/api/bookings/${booking1Id}/status`,
      method: 'PATCH',
      headers: { ...BASE_HTTP.headers, Authorization: `Bearer ${techToken}` },
    }, { status: 'SERVICE_STARTED' });

    const autoStopEvent = await autoStopPromise;
    assert(
      autoStopEvent?.isSharing === false && autoStopEvent?.reason === 'booking_service_started',
      'Transition to SERVICE_STARTED automatically terminated location sharing'
    );

    // Subsequent location update rejected
    await new Promise((resolve) => setTimeout(resolve, 1600));
    const rejectAfterStartAck = await new Promise((resolve) => {
      techSocket.emit('location:update', { bookingId: booking1Id, latitude: 28.6, longitude: 77.2 }, (ack) => resolve(ack));
    });
    assert(rejectAfterStartAck?.success === false, 'Cannot update location once status is SERVICE_STARTED');

    // Complete booking
    await request({
      ...BASE_HTTP,
      path: `/api/bookings/${booking1Id}/status`,
      method: 'PATCH',
      headers: { ...BASE_HTTP.headers, Authorization: `Bearer ${techToken}` },
    }, { status: 'COMPLETED' });

    // ── 13. Auto-Stop on Booking Cancellation
    console.log('\n13. Auto-Stop on Cancellation');
    // Create Booking 2
    const b2Res = await request(
      {
        ...BASE_HTTP,
        path: '/api/bookings',
        method: 'POST',
        headers: { ...BASE_HTTP.headers, Authorization: `Bearer ${custAToken}` },
      },
      {
        serviceId: targetService._id,
        scheduledDate: tomorrow.toISOString().split('T')[0],
        scheduledTime: '14:00',
        urgency: 'NORMAL',
        address: {
          fullName: 'Test Customer A',
          phone: '9876543210',
          addressLine: 'Apt 202, Galaxy Tower',
          city: 'Delhi',
          state: 'Delhi',
          postalCode: '110001',
        },
      }
    );
    const booking2Id = b2Res.data?.data?._id;
    if (booking2Id) createdBookingIds.push(booking2Id);

    // Accept & start sharing
    await request({
      ...BASE_HTTP,
      path: `/api/bookings/${booking2Id}/accept`,
      method: 'PATCH',
      headers: { ...BASE_HTTP.headers, Authorization: `Bearer ${techToken}` },
    });

    await new Promise((resolve) => {
      custASocket.emit('booking:join', { bookingId: booking2Id }, resolve);
    });

    await new Promise((resolve) => {
      techSocket.emit('location:share_start', { bookingId: booking2Id }, resolve);
    });

    // Customer cancels booking
    const cancelStopPromise = waitForEvent(custASocket, 'location:sharing_stopped');
    await request({
      ...BASE_HTTP,
      path: `/api/bookings/${booking2Id}/cancel`,
      method: 'PATCH',
      headers: { ...BASE_HTTP.headers, Authorization: `Bearer ${custAToken}` },
    }, { cancellationReason: 'Plans changed' });

    const cancelStopEvent = await cancelStopPromise;
    assert(
      cancelStopEvent?.isSharing === false && cancelStopEvent?.reason === 'booking_cancelled',
      'Customer cancellation automatically stopped live location sharing'
    );

    // ── 14. Socket Disconnect Handling
    console.log('\n14. Technician Socket Disconnection Handling');
    // Create Booking 3
    const b3Res = await request(
      {
        ...BASE_HTTP,
        path: '/api/bookings',
        method: 'POST',
        headers: { ...BASE_HTTP.headers, Authorization: `Bearer ${custAToken}` },
      },
      {
        serviceId: targetService._id,
        scheduledDate: tomorrow.toISOString().split('T')[0],
        scheduledTime: '16:00',
        urgency: 'NORMAL',
        address: {
          fullName: 'Test Customer A',
          phone: '9876543210',
          addressLine: 'Apt 303, Galaxy Tower',
          city: 'Delhi',
          state: 'Delhi',
          postalCode: '110001',
        },
      }
    );
    const booking3Id = b3Res.data?.data?._id;
    if (booking3Id) createdBookingIds.push(booking3Id);

    await request({
      ...BASE_HTTP,
      path: `/api/bookings/${booking3Id}/accept`,
      method: 'PATCH',
      headers: { ...BASE_HTTP.headers, Authorization: `Bearer ${techToken}` },
    });

    await new Promise((resolve) => {
      custASocket.emit('booking:join', { bookingId: booking3Id }, resolve);
    });

    // Temporary socket for disconnect test
    const tempTechSocket = await connectSocket(techToken);
    await new Promise((resolve) => {
      tempTechSocket.emit('location:share_start', { bookingId: booking3Id }, resolve);
    });

    const disconnectStopPromise = waitForEvent(custASocket, 'location:sharing_stopped');
    tempTechSocket.disconnect();

    const disconnectStopEvent = await disconnectStopPromise;
    assert(
      disconnectStopEvent?.isSharing === false && disconnectStopEvent?.reason === 'technician_disconnected',
      'Technician socket disconnection emitted location:sharing_stopped to booking room'
    );

    // ── 15. Teardown Sockets
    console.log('\n15. Socket Cleanup');
    custASocket.disconnect();
    custBSocket.disconnect();
    techSocket.disconnect();
    unapprovedSocket.disconnect();
    assert(true, 'All test socket connections closed cleanly');

    // ── 16. Database Cleanup
    console.log('\n16. Safe Test Data Cleanup');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/homeserve');
    const Booking = require('../models/booking.model');
    const User = require('../models/user.model');
    const Technician = require('../models/technician.model');

    if (createdBookingIds.length > 0) {
      await Booking.deleteMany({ _id: { $in: createdBookingIds } });
      console.log(`  Cleaned up ${createdBookingIds.length} temporary test bookings.`);
    }

    if (createdUserIds.length > 0) {
      await Technician.deleteMany({ userId: { $in: createdUserIds } });
      await User.deleteMany({ _id: { $in: createdUserIds } });
      console.log(`  Cleaned up ${createdUserIds.length} temporary test users.`);
    }
    await mongoose.disconnect();
  } catch (err) {
    console.error('Unexpected test suite error:', err);
    failed++;
  }

  console.log('\n====================================================');
  console.log(` RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

run();
