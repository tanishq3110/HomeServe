/**
 * test_phase7.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Comprehensive automated test suite for HomeServe Phase 7:
 * Socket.IO Real-Time Booking Updates & Room Security.
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const http = require('http');
const { io: ioClient } = require('socket.io-client');

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

function waitForStatus(socket, bookingId, expectedStatus, timeoutMs = 4000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off('booking:status_updated', handler);
      reject(new Error(`Timeout (${timeoutMs}ms) waiting for status "${expectedStatus}" on booking "${bookingId}"`));
    }, timeoutMs);

    const handler = (payload) => {
      if (payload?.bookingId === bookingId && payload?.status === expectedStatus) {
        clearTimeout(timer);
        socket.off('booking:status_updated', handler);
        resolve(payload);
      }
    };

    socket.on('booking:status_updated', handler);
  });
}

async function run() {
  console.log('====================================================');
  console.log('   HOMESERVE PHASE 7 AUTOMATED VERIFICATION SUITE   ');
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
  const testCustomerIds = [];
  const openSockets = [];

  try {
    // ── 1. Health check ──
    console.log('1. Health Check & HTTP Regression');
    const health = await request({ ...BASE_HTTP, path: '/api/health', method: 'GET' });
    assert(health.status === 200 && health.data?.database === 'connected', '/api/health is 200 and DB is connected');

    // ── 2. Authenticate Users via REST ──
    console.log('\n2. Authentication & Test Users Setup');

    // Admin
    const adminLogin = await request(
      { ...BASE_HTTP, path: '/api/auth/login', method: 'POST' },
      { email: 'admin@homeserve.com', password: 'AdminPassword123!' }
    );
    assert(adminLogin.status === 200 && adminLogin.data?.token, 'Admin login succeeded');
    const adminToken = adminLogin.data?.token;

    // Technician (Rajesh)
    const techLogin = await request(
      { ...BASE_HTTP, path: '/api/auth/login', method: 'POST' },
      { email: 'rajesh.electrician@homeserve.com', password: 'Password123!' }
    );
    assert(techLogin.status === 200 && techLogin.data?.token, 'Technician login succeeded (Rajesh)');
    const techToken = techLogin.data?.token;

    // Customer A (primary test customer)
    const custEmailA = 'custA.phase7@homeserve.com';
    let custALogin = await request(
      { ...BASE_HTTP, path: '/api/auth/login', method: 'POST' },
      { email: custEmailA, password: 'CustomerPassword123!' }
    );
    if (custALogin.status !== 200) {
      const regA = await request(
        { ...BASE_HTTP, path: '/api/auth/register', method: 'POST' },
        { name: 'Customer A (Phase 7)', email: custEmailA, password: 'CustomerPassword123!', phone: '+91 9911223344', role: 'CUSTOMER' }
      );
      custALogin = regA;
    }
    const custAToken = custALogin.data?.token;
    testCustomerIds.push(custALogin.data?.user?.id);
    assert(!!custAToken, 'Customer A token obtained');

    // Customer B (unauthorized third-party customer)
    const custEmailB = 'custB.phase7@homeserve.com';
    let custBLogin = await request(
      { ...BASE_HTTP, path: '/api/auth/login', method: 'POST' },
      { email: custEmailB, password: 'CustomerPassword123!' }
    );
    if (custBLogin.status !== 200) {
      const regB = await request(
        { ...BASE_HTTP, path: '/api/auth/register', method: 'POST' },
        { name: 'Customer B (Phase 7)', email: custEmailB, password: 'CustomerPassword123!', phone: '+91 9955667788', role: 'CUSTOMER' }
      );
      custBLogin = regB;
    }
    const custBToken = custBLogin.data?.token;
    testCustomerIds.push(custBLogin.data?.user?.id);
    assert(!!custBToken, 'Customer B token obtained');

    // Ensure technician is available for auto-assignment
    await request(
      {
        ...BASE_HTTP,
        path: '/api/technicians/availability',
        method: 'PATCH',
        headers: { ...BASE_HTTP.headers, Authorization: `Bearer ${techToken}` },
      },
      { isAvailable: true }
    );

    // Fetch an active electrical service
    const servicesRes = await request({ ...BASE_HTTP, path: '/api/services', method: 'GET' });
    const service = servicesRes.data.data.find(
      (s) => s.category?.toLowerCase().includes('electric') || s.name?.toLowerCase().includes('fan') || s.name?.toLowerCase().includes('wiring')
    ) || servicesRes.data.data[0];
    assert(!!service, `Target service found: ${service.name}`);

    // ── 3. Socket.IO Connection & Authentication Tests ──
    console.log('\n3. Socket.IO Connection & Authentication');

    // 3a. Connection without token -> Must FAIL
    const noTokenResult = await connectSocket(null);
    assert(noTokenResult.error && noTokenResult.error.includes('No authentication token'), 'Rejected connection with no token');
    if (noTokenResult.socket) noTokenResult.socket.disconnect();

    // 3b. Connection with invalid token -> Must FAIL
    const badTokenResult = await connectSocket('invalid_bogus_token_xyz');
    assert(badTokenResult.error && badTokenResult.error.includes('Invalid authentication token'), 'Rejected connection with invalid token');
    if (badTokenResult.socket) badTokenResult.socket.disconnect();

    // 3c. Valid Customer A socket connection -> Must SUCCEED
    const custASocket = await connectSocket(custAToken);
    assert(custASocket && custASocket.connected, 'Customer A socket connected successfully');
    openSockets.push(custASocket);

    // 3d. Valid Customer B socket connection -> Must SUCCEED
    const custBSocket = await connectSocket(custBToken);
    assert(custBSocket && custBSocket.connected, 'Customer B socket connected successfully');
    openSockets.push(custBSocket);

    // 3e. Valid Technician socket connection -> Must SUCCEED
    const techSocket = await connectSocket(techToken);
    assert(techSocket && techSocket.connected, 'Technician socket connected successfully');
    openSockets.push(techSocket);

    // 3f. Valid Admin socket connection -> Must SUCCEED
    const adminSocket = await connectSocket(adminToken);
    assert(adminSocket && adminSocket.connected, 'Admin socket connected successfully');
    openSockets.push(adminSocket);

    // ── 4. Booking Creation & Real-Time Broadcast ──
    console.log('\n4. Booking Creation & Real-Time Event Broadcast');

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);
    const dateStr = futureDate.toISOString().split('T')[0];

    // Setup listener on admin socket for booking:created
    const adminCreatedPromise = waitForEvent(adminSocket, 'booking:created');
    // Setup listener on tech socket for booking:new_request
    const techNewReqPromise = waitForEvent(techSocket, 'booking:new_request');

    // Create Booking via REST API
    const bookingRes = await request(
      {
        ...BASE_HTTP,
        path: '/api/bookings',
        method: 'POST',
        headers: { ...BASE_HTTP.headers, Authorization: `Bearer ${custAToken}` },
      },
      {
        serviceId: service._id,
        scheduledDate: dateStr,
        scheduledTime: '11:00',
        urgency: 'NORMAL',
        address: {
          fullName: 'Customer A',
          phone: '+91 9911223344',
          addressLine: 'Apt 101, Phase 7 Tower',
          city: 'Bangalore',
          state: 'Karnataka',
          postalCode: '560001',
        },
      }
    );

    assert(bookingRes.status === 201, 'Booking 1 created via REST (201)');
    const booking1 = bookingRes.data?.data;
    createdBookingIds.push(booking1._id);

    // Verify Admin received booking:created broadcast
    const adminEvent = await adminCreatedPromise;
    assert(adminEvent.bookingId === booking1._id, 'Admin received booking:created event with matching bookingId');

    // Verify Technician received booking:new_request broadcast
    const techEvent = await techNewReqPromise;
    assert(techEvent.bookingId === booking1._id, 'Assigned Technician received booking:new_request in private room');

    // ── 5. Room Security & Authorization Tests ──
    console.log('\n5. Room Joining Security & Authorization');

    // 5a. Customer A joins own booking room -> Allowed
    const custAJoinRes = await new Promise((res) => {
      custASocket.emit('booking:join', { bookingId: booking1._id }, res);
    });
    assert(custAJoinRes?.success === true, 'Authorized Customer A joined own booking room');

    // 5b. Customer B tries to join Customer A's booking room -> Rejected (Forbidden)
    const custBJoinRes = await new Promise((res) => {
      custBSocket.emit('booking:join', { bookingId: booking1._id }, res);
    });
    assert(custBJoinRes?.success === false && custBJoinRes?.error?.includes('Forbidden'), 'Unauthorized Customer B rejected from joining booking room (Forbidden)');

    // 5c. Invalid booking ID -> Rejected
    const invalidIdRes = await new Promise((res) => {
      custASocket.emit('booking:join', { bookingId: 'nonexistent_id_123' }, res);
    });
    assert(invalidIdRes?.success === false, 'Rejected join request with invalid booking ID');

    // 5d. Non-existent booking ID -> Rejected
    const nonExistentIdRes = await new Promise((res) => {
      custASocket.emit('booking:join', { bookingId: '600000000000000000000001' }, res);
    });
    assert(nonExistentIdRes?.success === false && nonExistentIdRes?.error?.includes('not found'), 'Rejected join request for non-existent booking');

    // 5e. Admin joins booking room -> Allowed
    const adminJoinRes = await new Promise((res) => {
      adminSocket.emit('booking:join', { bookingId: booking1._id }, res);
    });
    assert(adminJoinRes?.success === true, 'Admin authorized to join booking room');

    // 5f. Assigned technician joins booking room -> Allowed
    const techJoinRes = await new Promise((res) => {
      techSocket.emit('booking:join', { bookingId: booking1._id }, res);
    });
    assert(techJoinRes?.success === true, 'Assigned technician authorized to join booking room');

    // ── 6. Live Technician Acceptance Broadcast ──
    console.log('\n6. Real-Time Technician Acceptance');

    // Setup listener for Customer A
    const custAcceptPromise = waitForStatus(custASocket, booking1._id, 'ACCEPTED');
    // Setup listener for Admin
    const adminAcceptPromise = waitForStatus(adminSocket, booking1._id, 'ACCEPTED');

    // Technician accepts booking via REST API
    const acceptRes = await request({
      ...BASE_HTTP,
      path: `/api/bookings/${booking1._id}/accept`,
      method: 'PATCH',
      headers: { ...BASE_HTTP.headers, Authorization: `Bearer ${techToken}` },
    });
    assert(acceptRes.status === 200, 'Technician accepted booking via REST (200)');

    const custAcceptEvent = await custAcceptPromise;
    assert(custAcceptEvent.status === 'ACCEPTED' && custAcceptEvent.bookingId === booking1._id, 'Customer A received real-time status_updated: ACCEPTED');

    const adminAcceptEvent = await adminAcceptPromise;
    assert(adminAcceptEvent.status === 'ACCEPTED' && adminAcceptEvent.bookingId === booking1._id, 'Admin received real-time status_updated: ACCEPTED');

    // ── 7. Live Sequential Status Progression ──
    console.log('\n7. Real-Time Status Progression (ON_THE_WAY -> ARRIVED -> SERVICE_STARTED -> COMPLETED)');

    // Step 1: ON_THE_WAY
    let custUpdatePromise = waitForStatus(custASocket, booking1._id, 'ON_THE_WAY');
    await request(
      {
        ...BASE_HTTP,
        path: `/api/bookings/${booking1._id}/status`,
        method: 'PATCH',
        headers: { ...BASE_HTTP.headers, Authorization: `Bearer ${techToken}` },
      },
      { status: 'ON_THE_WAY' }
    );
    let event = await custUpdatePromise;
    assert(event.status === 'ON_THE_WAY', 'Customer received real-time event: ON_THE_WAY');

    // Step 2: ARRIVED
    custUpdatePromise = waitForStatus(custASocket, booking1._id, 'ARRIVED');
    await request(
      {
        ...BASE_HTTP,
        path: `/api/bookings/${booking1._id}/status`,
        method: 'PATCH',
        headers: { ...BASE_HTTP.headers, Authorization: `Bearer ${techToken}` },
      },
      { status: 'ARRIVED' }
    );
    event = await custUpdatePromise;
    assert(event.status === 'ARRIVED', 'Customer received real-time event: ARRIVED');

    // Step 3: SERVICE_STARTED
    custUpdatePromise = waitForStatus(custASocket, booking1._id, 'SERVICE_STARTED');
    await request(
      {
        ...BASE_HTTP,
        path: `/api/bookings/${booking1._id}/status`,
        method: 'PATCH',
        headers: { ...BASE_HTTP.headers, Authorization: `Bearer ${techToken}` },
      },
      { status: 'SERVICE_STARTED' }
    );
    event = await custUpdatePromise;
    assert(event.status === 'SERVICE_STARTED', 'Customer received real-time event: SERVICE_STARTED');

    // Step 4: COMPLETED
    custUpdatePromise = waitForStatus(custASocket, booking1._id, 'COMPLETED');
    await request(
      {
        ...BASE_HTTP,
        path: `/api/bookings/${booking1._id}/status`,
        method: 'PATCH',
        headers: { ...BASE_HTTP.headers, Authorization: `Bearer ${techToken}` },
      },
      { status: 'COMPLETED' }
    );
    event = await custUpdatePromise;
    assert(event.status === 'COMPLETED', 'Customer received real-time event: COMPLETED');

    // ── 8. Customer Cancellation Broadcast ──
    console.log('\n8. Customer Cancellation Real-Time Broadcast');

    // Create Booking 2
    const booking2Res = await request(
      {
        ...BASE_HTTP,
        path: '/api/bookings',
        method: 'POST',
        headers: { ...BASE_HTTP.headers, Authorization: `Bearer ${custAToken}` },
      },
      {
        serviceId: service._id,
        scheduledDate: dateStr,
        scheduledTime: '15:00',
        urgency: 'NORMAL',
        address: {
          fullName: 'Customer A',
          phone: '+91 9911223344',
          addressLine: 'Apt 101, Phase 7 Tower',
          city: 'Bangalore',
          state: 'Karnataka',
          postalCode: '560001',
        },
      }
    );
    const booking2 = booking2Res.data?.data;
    createdBookingIds.push(booking2._id);

    // Join Customer A to booking 2 room
    await new Promise((res) => custASocket.emit('booking:join', { bookingId: booking2._id }, res));

    // Setup listener on Customer A and Admin
    const cancelCustPromise = waitForStatus(custASocket, booking2._id, 'CANCELLED');
    const cancelAdminPromise = waitForStatus(adminSocket, booking2._id, 'CANCELLED');

    // Customer cancels Booking 2
    await request({
      ...BASE_HTTP,
      path: `/api/bookings/${booking2._id}/cancel`,
      method: 'PATCH',
      headers: { ...BASE_HTTP.headers, Authorization: `Bearer ${custAToken}` },
    });

    const cancelCustEvent = await cancelCustPromise;
    assert(cancelCustEvent.status === 'CANCELLED' && cancelCustEvent.bookingId === booking2._id, 'Customer A received real-time CANCELLED event');

    const cancelAdminEvent = await cancelAdminPromise;
    assert(cancelAdminEvent.status === 'CANCELLED' && cancelAdminEvent.bookingId === booking2._id, 'Admin received real-time CANCELLED event');

    // ── 9. Technician Rejection & Reassignment Broadcast ──
    console.log('\n9. Technician Rejection & Removal Event');

    // Create Booking 3 assigned to technician
    const booking3Res = await request(
      {
        ...BASE_HTTP,
        path: '/api/bookings',
        method: 'POST',
        headers: { ...BASE_HTTP.headers, Authorization: `Bearer ${custAToken}` },
      },
      {
        serviceId: service._id,
        scheduledDate: dateStr,
        scheduledTime: '17:00',
        urgency: 'NORMAL',
        address: {
          fullName: 'Customer A',
          phone: '+91 9911223344',
          addressLine: 'Apt 101, Phase 7 Tower',
          city: 'Bangalore',
          state: 'Karnataka',
          postalCode: '560001',
        },
      }
    );
    const booking3 = booking3Res.data?.data;
    createdBookingIds.push(booking3._id);

    // Join Customer A to booking 3 room
    await new Promise((res) => custASocket.emit('booking:join', { bookingId: booking3._id }, res));

    // Setup listeners:
    // Technician should receive booking:removed
    const techRemovedPromise = waitForEvent(techSocket, 'booking:removed');
    // Customer should receive booking:status_updated reverting to REQUESTED with null tech
    const custRevertPromise = waitForStatus(custASocket, booking3._id, 'REQUESTED');

    // Technician rejects Booking 3
    await request(
      {
        ...BASE_HTTP,
        path: `/api/bookings/${booking3._id}/reject`,
        method: 'PATCH',
        headers: { ...BASE_HTTP.headers, Authorization: `Bearer ${techToken}` },
      },
      { rejectionReason: 'Fully booked this afternoon' }
    );

    const techRemovedEvent = await techRemovedPromise;
    assert(techRemovedEvent.bookingId === booking3._id, 'Technician received real-time booking:removed notification');

    const custRevertEvent = await custRevertPromise;
    assert(
      custRevertEvent.status === 'REQUESTED' && custRevertEvent.bookingId === booking3._id,
      'Customer received real-time booking:status_updated reverting to REQUESTED'
    );

    // ── 10. Privacy & Room Isolation Check ──
    console.log('\n10. Privacy & Room Isolation');

    // Customer B should NOT receive updates for booking 1 or booking 3
    let custBReceivedAny = false;
    const custBLeakHandler = (p) => {
      if (p.bookingId === booking1._id || p.bookingId === booking3._id) {
        custBReceivedAny = true;
      }
    };
    custBSocket.on('booking:status_updated', custBLeakHandler);

    // Leave Customer A room cleanly
    const custALeaveRes = await new Promise((res) => {
      custASocket.emit('booking:leave', { bookingId: booking1._id }, res);
    });
    assert(custALeaveRes?.success === true, 'Customer A cleanly left booking room (booking:leave)');

    // Verify Customer B remained isolated
    await new Promise((r) => setTimeout(r, 500));
    custBSocket.off('booking:status_updated', custBLeakHandler);
    assert(!custBReceivedAny, 'Unrelated Customer B received zero private booking room broadcasts');

    // ── 11. Disconnection & Cleanup ──
    console.log('\n11. Disconnection');
    for (const s of openSockets) {
      if (s && s.connected) s.disconnect();
    }
    assert(true, 'All test socket connections closed cleanly');

  } catch (err) {
    console.error('Unexpected test failure:', err);
    failed++;
  } finally {
    // ── 12. Safe Test Data Cleanup ──
    console.log('\n12. Safe Test Data Cleanup');
    if (createdBookingIds.length > 0 || testCustomerIds.length > 0) {
      const mongoose = require('mongoose');
      const path = require('path');
      require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
      const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/homeserve';
      await mongoose.connect(mongoURI);
      const Booking = require('../models/booking.model');
      const User = require('../models/user.model');

      if (createdBookingIds.length > 0) {
        const delResult = await Booking.deleteMany({ _id: { $in: createdBookingIds } });
        console.log(`  Cleaned up ${delResult.deletedCount} temporary test bookings.`);
      }

      if (testCustomerIds.length > 0) {
        const delUsers = await User.deleteMany({ _id: { $in: testCustomerIds } });
        console.log(`  Cleaned up ${delUsers.deletedCount} temporary test customers.`);
      }

      await mongoose.disconnect();
    }
  }

  console.log('\n====================================================');
  console.log(` RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

run();
