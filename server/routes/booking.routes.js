/**
 * booking.routes.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Booking API routes for HomeServe Phase 6.
 *
 * IMPORTANT: Specific routes (e.g. /my, /technician/requests) are declared
 * before parameterized routes (/:id) to prevent collision.
 *
 * Route summary:
 *   Customer:
 *     POST   /api/bookings              — create booking
 *     GET    /api/bookings/my           — list own bookings
 *     GET    /api/bookings/:id          — get booking detail (ownership checked)
 *     PATCH  /api/bookings/:id/cancel   — cancel eligible booking
 *
 *   Technician:
 *     GET    /api/bookings/technician/requests — pending assigned requests
 *     GET    /api/bookings/technician/my       — all own bookings
 *     PATCH  /api/bookings/:id/accept          — accept assigned request
 *     PATCH  /api/bookings/:id/reject          — reject assigned request
 *     PATCH  /api/bookings/:id/status          — update job status
 *
 *   Admin:
 *     GET    /api/bookings              — list all bookings (with filters)
 *     GET    /api/bookings/:id          — inspect any booking
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const {
  createBooking,
  getMyBookings,
  cancelBooking,
  getBookingById,
  getBookingLocation,
  getTechnicianRequests,
  getTechnicianBookings,
  acceptBooking,
  rejectBooking,
  updateBookingStatus,
  adminGetAllBookings,
} = require('../controllers/booking.controller');

// ── All booking routes require authentication ──────────────────────────────
router.use(protect);

// ── Customer routes ────────────────────────────────────────────────────────

/**
 * POST /api/bookings
 * Admin may also list all here — handled via role check inside
 */
router.post('/', authorize('CUSTOMER'), createBooking);

/**
 * GET /api/bookings/my
 * Must be before /:id to avoid "my" being treated as an ObjectId
 */
router.get('/my', authorize('CUSTOMER'), getMyBookings);

// ── Technician specific routes ─────────────────────────────────────────────

/**
 * GET /api/bookings/technician/requests
 * Must be declared before /:id routes
 */
router.get('/technician/requests', authorize('TECHNICIAN'), getTechnicianRequests);

/**
 * GET /api/bookings/technician/my
 */
router.get('/technician/my', authorize('TECHNICIAN'), getTechnicianBookings);

// ── Admin: list all bookings ───────────────────────────────────────────────

/**
 * GET /api/bookings
 * Admin-only; customer/technician use their specific endpoints above.
 */
router.get('/', authorize('ADMIN'), adminGetAllBookings);

const { validateObjectIdParams } = require('../middleware/security.middleware');

// ── Parameterized routes (:id) ─────────────────────────────────────────────

/**
 * GET /api/bookings/:id
 * Accessible to CUSTOMER (own), TECHNICIAN (assigned), ADMIN (all)
 */
router.get('/:id', validateObjectIdParams('id'), authorize('CUSTOMER', 'TECHNICIAN', 'ADMIN'), getBookingById);

/**
 * GET /api/bookings/:id/location
 * Get latest live GPS coordinates for an active booking
 */
router.get('/:id/location', validateObjectIdParams('id'), authorize('CUSTOMER', 'TECHNICIAN', 'ADMIN'), getBookingLocation);

/**
 * PATCH /api/bookings/:id/cancel — customer cancels eligible booking
 */
router.patch('/:id/cancel', validateObjectIdParams('id'), authorize('CUSTOMER'), cancelBooking);

/**
 * PATCH /api/bookings/:id/accept — technician accepts assigned request
 */
router.patch('/:id/accept', validateObjectIdParams('id'), authorize('TECHNICIAN'), acceptBooking);

/**
 * PATCH /api/bookings/:id/reject — technician rejects assigned request
 */
router.patch('/:id/reject', validateObjectIdParams('id'), authorize('TECHNICIAN'), rejectBooking);

/**
 * PATCH /api/bookings/:id/status — technician updates job status
 */
router.patch('/:id/status', validateObjectIdParams('id'), authorize('TECHNICIAN'), updateBookingStatus);

module.exports = router;
