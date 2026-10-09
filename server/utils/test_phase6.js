/**
 * test_phase6.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Comprehensive automated test suite for HomeServe Phase 6:
 * Booking Management System & Dynamic Pricing.
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const http = require('http');

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

const BASE_OPT = {
  hostname: 'localhost',
  port: 5000,
  headers: { 'Content-Type': 'application/json' },
};

async function run() {
  console.log('====================================================');
  console.log('   HOMESERVE PHASE 6 AUTOMATED VERIFICATION SUITE   ');
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
  let testCustomerId = null;

  try {
    // ── 1. Health check ──
    console.log('1. Health Check & Regression');
    const health = await request({ ...BASE_OPT, path: '/api/health', method: 'GET' });
    assert(health.status === 200 && health.data?.database === 'connected', '/api/health is 200 and DB is connected');

    // ── 2. Logins ──
    console.log('\n2. User Authentication');
    const adminLogin = await request(
      { ...BASE_OPT, path: '/api/auth/login', method: 'POST' },
      { email: 'admin@homeserve.com', password: 'AdminPassword123!' }
    );
    assert(adminLogin.status === 200 && adminLogin.data?.token, 'Admin login succeeded');
    const adminToken = adminLogin.data?.token;

    const techLogin = await request(
      { ...BASE_OPT, path: '/api/auth/login', method: 'POST' },
      { email: 'rajesh.electrician@homeserve.com', password: 'Password123!' }
    );
    assert(techLogin.status === 200 && techLogin.data?.token, 'Technician login succeeded (Rajesh)');
    const techToken = techLogin.data?.token;

    // Register / Login Test Customer
    const customerEmail = 'testcustomer.phase6@homeserve.com';
    let customerLogin = await request(
      { ...BASE_OPT, path: '/api/auth/login', method: 'POST' },
      { email: customerEmail, password: 'CustomerPassword123!' }
    );

    if (customerLogin.status !== 200) {
      const customerRegister = await request(
        { ...BASE_OPT, path: '/api/auth/register', method: 'POST' },
        {
          name: 'Priya Sharma (Phase 6 Test)',
          email: customerEmail,
          password: 'CustomerPassword123!',
          phone: '+91 9988776655',
          role: 'CUSTOMER',
        }
      );
      assert(customerRegister.status === 201 || customerRegister.status === 200, 'Test Customer registered');
      customerLogin = customerRegister;
    } else {
      assert(true, 'Test Customer logged in');
    }
    const customerToken = customerLogin.data?.token;
    testCustomerId = customerLogin.data?.user?.id;

    // Ensure Rajesh is online for booking assignments
    await request(
      {
        ...BASE_OPT,
        path: '/api/technicians/availability',
        method: 'PATCH',
        headers: { ...BASE_OPT.headers, Authorization: `Bearer ${techToken}` },
      },
      { isAvailable: true }
    );

    // ── 3. Fetch Service ──
    console.log('\n3. Service Discovery');
    const servicesRes = await request({ ...BASE_OPT, path: '/api/services', method: 'GET' });
    assert(servicesRes.status === 200 && Array.isArray(servicesRes.data?.data) && servicesRes.data.data.length > 0, 'Fetched active services');
    
    // Pick an electrical service (matches Rajesh's skills)
    const electricalService = servicesRes.data.data.find(
      (s) => s.category?.toLowerCase().includes('electric') || s.name?.toLowerCase().includes('fan') || s.name?.toLowerCase().includes('wiring')
    ) || servicesRes.data.data[0];
    assert(!!electricalService, `Found service to book: "${electricalService.name}" (Base: ₹${electricalService.startingPrice})`);

    // ── 4. Booking Validation Tests ──
    console.log('\n4. Booking Creation Validations');

    // Missing scheduledDate
    const invalidDateRes = await request(
      {
        ...BASE_OPT,
        path: '/api/bookings',
        method: 'POST',
        headers: { ...BASE_OPT.headers, Authorization: `Bearer ${customerToken}` },
      },
      {
        serviceId: electricalService._id,
        scheduledDate: '',
        scheduledTime: '10:00',
        urgency: 'NORMAL',
        address: {
          fullName: 'Priya Sharma',
          phone: '+91 9988776655',
          addressLine: '123 Test Apt',
          city: 'Bangalore',
          state: 'Karnataka',
          postalCode: '560001',
        },
      }
    );
    assert(invalidDateRes.status === 400, 'Rejects booking with empty scheduledDate (400)');

    // Past date
    const pastDateRes = await request(
      {
        ...BASE_OPT,
        path: '/api/bookings',
        method: 'POST',
        headers: { ...BASE_OPT.headers, Authorization: `Bearer ${customerToken}` },
      },
      {
        serviceId: electricalService._id,
        scheduledDate: '2020-01-01',
        scheduledTime: '10:00',
        urgency: 'NORMAL',
        address: {
          fullName: 'Priya Sharma',
          phone: '+91 9988776655',
          addressLine: '123 Test Apt',
          city: 'Bangalore',
          state: 'Karnataka',
          postalCode: '560001',
        },
      }
    );
    assert(pastDateRes.status === 400, 'Rejects booking with past scheduledDate (400)');

    // Invalid time format
    const invalidTimeRes = await request(
      {
        ...BASE_OPT,
        path: '/api/bookings',
        method: 'POST',
        headers: { ...BASE_OPT.headers, Authorization: `Bearer ${customerToken}` },
      },
      {
        serviceId: electricalService._id,
        scheduledDate: '2027-01-01',
        scheduledTime: '10:00 AM - 12:00 PM',
        urgency: 'NORMAL',
        address: {
          fullName: 'Priya Sharma',
          phone: '+91 9988776655',
          addressLine: '123 Test Apt',
          city: 'Bangalore',
          state: 'Karnataka',
          postalCode: '560001',
        },
      }
    );
    assert(invalidTimeRes.status === 400, 'Rejects booking with non-HH:MM time format (400)');

    // Technician attempting to book (RBAC Rule: only CUSTOMER can create)
    const techCreateAttempt = await request(
      {
        ...BASE_OPT,
        path: '/api/bookings',
        method: 'POST',
        headers: { ...BASE_OPT.headers, Authorization: `Bearer ${techToken}` },
      },
      {
        serviceId: electricalService._id,
        scheduledDate: '2027-01-01',
        scheduledTime: '10:00',
        urgency: 'NORMAL',
        address: {
          fullName: 'Tech User',
          phone: '+91 9988776655',
          addressLine: '123 Test Apt',
          city: 'Bangalore',
          state: 'Karnataka',
          postalCode: '560001',
        },
      }
    );
    assert(techCreateAttempt.status === 403, 'Rejects technician attempting to create booking (403 Forbidden)');

    // ── 5. Dynamic Pricing & Booking Creation ──
    console.log('\n5. Dynamic Pricing & Successful Booking Creation');

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const dateStr = futureDate.toISOString().split('T')[0];

    // Create NORMAL booking
    const normalBookingRes = await request(
      {
        ...BASE_OPT,
        path: '/api/bookings',
        method: 'POST',
        headers: { ...BASE_OPT.headers, Authorization: `Bearer ${customerToken}` },
      },
      {
        serviceId: electricalService._id,
        scheduledDate: dateStr,
        scheduledTime: '10:00',
        urgency: 'NORMAL',
        customerNotes: 'Please ring bell twice',
        address: {
          fullName: 'Priya Sharma',
          phone: '+91 9988776655',
          addressLine: 'Flat 402, Sunshine Heights',
          city: 'Bangalore',
          state: 'Karnataka',
          postalCode: '560034',
        },
      }
    );
    assert(normalBookingRes.status === 201, 'Normal booking created successfully (201)');
    const normalBooking = normalBookingRes.data?.data;
    if (normalBooking) {
      createdBookingIds.push(normalBooking._id);
      assert(normalBooking.basePrice === electricalService.startingPrice, `basePrice equals service price (₹${normalBooking.basePrice})`);
      assert(normalBooking.urgencyCharge === 0, 'urgencyCharge is 0 for NORMAL');
      assert(normalBooking.distanceCharge === 0, 'distanceCharge is 0');
      assert(normalBooking.totalPrice === electricalService.startingPrice, `totalPrice equals basePrice (₹${normalBooking.totalPrice})`);
      assert(normalBooking.status === 'REQUESTED', 'Initial status is REQUESTED');
      assert(normalBooking.address?.city === 'Bangalore', 'Address snapshot persisted');
    }

    // Create URGENT booking
    const urgentBookingRes = await request(
      {
        ...BASE_OPT,
        path: '/api/bookings',
        method: 'POST',
        headers: { ...BASE_OPT.headers, Authorization: `Bearer ${customerToken}` },
      },
      {
        serviceId: electricalService._id,
        scheduledDate: dateStr,
        scheduledTime: '14:00',
        urgency: 'URGENT',
        address: {
          fullName: 'Priya Sharma',
          phone: '+91 9988776655',
          addressLine: 'Flat 402, Sunshine Heights',
          city: 'Bangalore',
          state: 'Karnataka',
          postalCode: '560034',
        },
      }
    );
    assert(urgentBookingRes.status === 201, 'Urgent booking created successfully (201)');
    const urgentBooking = urgentBookingRes.data?.data;
    if (urgentBooking) {
      createdBookingIds.push(urgentBooking._id);
      assert(urgentBooking.urgencyCharge === 150, 'urgencyCharge is ₹150 for URGENT');
      assert(urgentBooking.totalPrice === electricalService.startingPrice + 150, `Dynamic totalPrice is base + 150 (₹${urgentBooking.totalPrice})`);
      assert(urgentBooking.technicianId !== null, 'Eligible technician auto-assigned');
    }

    // ── 6. Technician Job Workflow ──
    console.log('\n6. Technician Workflow & Status State Machine');

    // Fetch assigned requests for technician
    const techRequestsRes = await request({
      ...BASE_OPT,
      path: '/api/bookings/technician/requests',
      method: 'GET',
      headers: { ...BASE_OPT.headers, Authorization: `Bearer ${techToken}` },
    });
    assert(techRequestsRes.status === 200 && Array.isArray(techRequestsRes.data?.data), 'Technician fetched assigned requests');

    const jobToProgress = urgentBooking;

    // Technician accepts booking
    const acceptRes = await request({
      ...BASE_OPT,
      path: `/api/bookings/${jobToProgress._id}/accept`,
      method: 'PATCH',
      headers: { ...BASE_OPT.headers, Authorization: `Bearer ${techToken}` },
    });
    assert(acceptRes.status === 200 && acceptRes.data?.data?.status === 'ACCEPTED', 'Technician accepted booking -> status ACCEPTED');

    // Invalid status transition: jumping directly from ACCEPTED to COMPLETED must fail
    const invalidJumpRes = await request(
      {
        ...BASE_OPT,
        path: `/api/bookings/${jobToProgress._id}/status`,
        method: 'PATCH',
        headers: { ...BASE_OPT.headers, Authorization: `Bearer ${techToken}` },
      },
      { status: 'COMPLETED' }
    );
    assert(invalidJumpRes.status === 400 || invalidJumpRes.status === 409, 'Direct transition from ACCEPTED to COMPLETED rejected (400/409 Conflict)');

    // Step 1: ON_THE_WAY
    const otwRes = await request(
      {
        ...BASE_OPT,
        path: `/api/bookings/${jobToProgress._id}/status`,
        method: 'PATCH',
        headers: { ...BASE_OPT.headers, Authorization: `Bearer ${techToken}` },
      },
      { status: 'ON_THE_WAY' }
    );
    assert(otwRes.status === 200 && otwRes.data?.data?.status === 'ON_THE_WAY', 'Status transitioned to ON_THE_WAY');

    // Step 2: ARRIVED
    const arrRes = await request(
      {
        ...BASE_OPT,
        path: `/api/bookings/${jobToProgress._id}/status`,
        method: 'PATCH',
        headers: { ...BASE_OPT.headers, Authorization: `Bearer ${techToken}` },
      },
      { status: 'ARRIVED' }
    );
    assert(arrRes.status === 200 && arrRes.data?.data?.status === 'ARRIVED', 'Status transitioned to ARRIVED');

    // Step 3: SERVICE_STARTED
    const startRes = await request(
      {
        ...BASE_OPT,
        path: `/api/bookings/${jobToProgress._id}/status`,
        method: 'PATCH',
        headers: { ...BASE_OPT.headers, Authorization: `Bearer ${techToken}` },
      },
      { status: 'SERVICE_STARTED' }
    );
    assert(startRes.status === 200 && startRes.data?.data?.status === 'SERVICE_STARTED', 'Status transitioned to SERVICE_STARTED');

    // Customer tries to cancel during SERVICE_STARTED -> Must FAIL
    const cancelDuringJob = await request({
      ...BASE_OPT,
      path: `/api/bookings/${jobToProgress._id}/cancel`,
      method: 'PATCH',
      headers: { ...BASE_OPT.headers, Authorization: `Bearer ${customerToken}` },
    });
    assert(cancelDuringJob.status === 400 || cancelDuringJob.status === 409, 'Customer cannot cancel once SERVICE_STARTED (400/409 Conflict)');

    // Step 4: COMPLETED
    const compRes = await request(
      {
        ...BASE_OPT,
        path: `/api/bookings/${jobToProgress._id}/status`,
        method: 'PATCH',
        headers: { ...BASE_OPT.headers, Authorization: `Bearer ${techToken}` },
      },
      { status: 'COMPLETED' }
    );
    assert(compRes.status === 200 && compRes.data?.data?.status === 'COMPLETED', 'Status transitioned to COMPLETED');

    // ── 7. Customer Cancellation on Eligible Booking ──
    console.log('\n7. Customer Cancellation Flow');

    const cancelRes = await request({
      ...BASE_OPT,
      path: `/api/bookings/${normalBooking._id}/cancel`,
      method: 'PATCH',
      headers: { ...BASE_OPT.headers, Authorization: `Bearer ${customerToken}` },
    });
    assert(cancelRes.status === 200 && cancelRes.data?.data?.status === 'CANCELLED', 'Customer successfully cancelled REQUESTED booking');

    // ── 8. Technician Rejection Flow ──
    console.log('\n8. Technician Rejection Flow');

    // Create a 3rd booking to test rejection
    const rejectTestBookingRes = await request(
      {
        ...BASE_OPT,
        path: '/api/bookings',
        method: 'POST',
        headers: { ...BASE_OPT.headers, Authorization: `Bearer ${customerToken}` },
      },
      {
        serviceId: electricalService._id,
        scheduledDate: dateStr,
        scheduledTime: '16:00',
        urgency: 'NORMAL',
        address: {
          fullName: 'Priya Sharma',
          phone: '+91 9988776655',
          addressLine: 'Flat 402, Sunshine Heights',
          city: 'Bangalore',
          state: 'Karnataka',
          postalCode: '560034',
        },
      }
    );
    const rejectBooking = rejectTestBookingRes.data?.data;
    if (rejectBooking) {
      createdBookingIds.push(rejectBooking._id);
      const rejRes = await request(
        {
          ...BASE_OPT,
          path: `/api/bookings/${rejectBooking._id}/reject`,
          method: 'PATCH',
          headers: { ...BASE_OPT.headers, Authorization: `Bearer ${techToken}` },
        },
        { rejectionReason: 'Busy with another emergency job' }
      );
      assert(rejRes.status === 200, 'Technician rejected assignment');
      assert(rejRes.data?.data?.status === 'REQUESTED', 'Booking status reverted to REQUESTED');
      assert(rejRes.data?.data?.technicianId === null, 'technicianId cleared for re-assignment');
    }

    // ── 9. Customer History & Details ──
    console.log('\n9. Customer History & Details');

    const myBookingsRes = await request({
      ...BASE_OPT,
      path: '/api/bookings/my',
      method: 'GET',
      headers: { ...BASE_OPT.headers, Authorization: `Bearer ${customerToken}` },
    });
    assert(myBookingsRes.status === 200 && Array.isArray(myBookingsRes.data?.data), 'Customer fetched own bookings history');
    assert(myBookingsRes.data.data.length >= 2, `Customer history contains ${myBookingsRes.data.data.length} records`);

    const detailRes = await request({
      ...BASE_OPT,
      path: `/api/bookings/${jobToProgress._id}`,
      method: 'GET',
      headers: { ...BASE_OPT.headers, Authorization: `Bearer ${customerToken}` },
    });
    assert(detailRes.status === 200 && detailRes.data?.data?._id === jobToProgress._id, 'Customer retrieved booking detail page payload');

    // ── 10. Admin Booking Management ──
    console.log('\n10. Admin Bookings Inspection');

    const adminListRes = await request({
      ...BASE_OPT,
      path: '/api/bookings',
      method: 'GET',
      headers: { ...BASE_OPT.headers, Authorization: `Bearer ${adminToken}` },
    });
    assert(adminListRes.status === 200 && Array.isArray(adminListRes.data?.data), 'Admin listed all system bookings');

    const adminFilterRes = await request({
      ...BASE_OPT,
      path: '/api/bookings?status=COMPLETED',
      method: 'GET',
      headers: { ...BASE_OPT.headers, Authorization: `Bearer ${adminToken}` },
    });
    assert(adminFilterRes.status === 200 && adminFilterRes.data?.data?.every((b) => b.status === 'COMPLETED'), 'Admin filtered bookings by status=COMPLETED');

    // ── 11. Security & RBAC Checks ──
    console.log('\n11. Security & RBAC Checks');

    // Customer trying to access Admin bookings endpoint
    const custAdminAttempt = await request({
      ...BASE_OPT,
      path: '/api/bookings',
      method: 'GET',
      headers: { ...BASE_OPT.headers, Authorization: `Bearer ${customerToken}` },
    });
    assert(custAdminAttempt.status === 403, 'Customer forbidden from GET /api/bookings (403)');

    // Technician trying to access /api/bookings/my (Customer only)
    const techMyAttempt = await request({
      ...BASE_OPT,
      path: '/api/bookings/my',
      method: 'GET',
      headers: { ...BASE_OPT.headers, Authorization: `Bearer ${techToken}` },
    });
    assert(techMyAttempt.status === 403, 'Technician forbidden from GET /api/bookings/my (403)');

    // Customer trying to update technician job status
    const custStatusAttempt = await request(
      {
        ...BASE_OPT,
        path: `/api/bookings/${jobToProgress._id}/status`,
        method: 'PATCH',
        headers: { ...BASE_OPT.headers, Authorization: `Bearer ${customerToken}` },
      },
      { status: 'COMPLETED' }
    );
    assert(custStatusAttempt.status === 403, 'Customer forbidden from PATCH /api/bookings/:id/status (403)');

  } catch (err) {
    console.error('Unexpected test error:', err);
    failed++;
  } finally {
    // ── 12. Safe Cleanup ──
    console.log('\n12. Safe Test Data Cleanup');
    if (createdBookingIds.length > 0) {
      const mongoose = require('mongoose');
      const path = require('path');
      require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
      const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/homeserve';
      await mongoose.connect(mongoURI);
      const Booking = require('../models/booking.model');
      const User = require('../models/user.model');

      const delResult = await Booking.deleteMany({ _id: { $in: createdBookingIds } });
      console.log(`  Cleaned up ${delResult.deletedCount} temporary test bookings.`);

      if (testCustomerId) {
        await User.findByIdAndDelete(testCustomerId);
        console.log(`  Cleaned up test customer user (${testCustomerId}).`);
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
