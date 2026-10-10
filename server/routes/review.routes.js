/**
 * review.routes.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Phase 11 — Review API routes for HomeServe.
 *
 * Route summary:
 *   Customer:
 *     POST   /api/reviews                          — submit review for completed booking
 *     GET    /api/reviews/my                       — get own reviews
 *     GET    /api/reviews/booking/:bookingId       — get review for own booking
 *
 *   Public (no auth required):
 *     GET    /api/reviews/technician/:technicianId — get paginated reviews for technician
 *
 *   Admin:
 *     GET    /api/reviews/admin                   — list all reviews with filters
 *     DELETE /api/reviews/:id                     — delete a review (moderation)
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const { validateObjectIdParams } = require('../middleware/security.middleware');
const {
  createReview,
  getReviewsForTechnician,
  getReviewForBooking,
  getMyReviews,
  adminGetAllReviews,
  adminDeleteReview,
} = require('../controllers/review.controller');

/**
 * GET /api/reviews/technician/:technicianId
 * Public — no authentication required (paginated reviews for a technician)
 * IMPORTANT: Must be declared before /booking/:bookingId to avoid route collision
 */
router.get('/technician/:technicianId', validateObjectIdParams('technicianId'), getReviewsForTechnician);

/**
 * POST /api/reviews
 * Customer submits a review for their completed booking
 */
router.post('/', protect, authorize('CUSTOMER'), createReview);

/**
 * GET /api/reviews/my
 * Customer gets their own reviews
 */
router.get('/my', protect, authorize('CUSTOMER'), getMyReviews);

/**
 * GET /api/reviews/admin
 * Admin: list all reviews with optional filters
 */
router.get('/admin', protect, authorize('ADMIN'), adminGetAllReviews);

/**
 * GET /api/reviews/booking/:bookingId
 * Get review for a specific booking (CUSTOMER owns, TECHNICIAN assigned, ADMIN all)
 */
router.get('/booking/:bookingId', validateObjectIdParams('bookingId'), protect, authorize('CUSTOMER', 'TECHNICIAN', 'ADMIN'), getReviewForBooking);

/**
 * DELETE /api/reviews/:id
 * Admin only: remove an inappropriate review
 */
router.delete('/:id', validateObjectIdParams('id'), protect, authorize('ADMIN'), adminDeleteReview);

module.exports = router;
