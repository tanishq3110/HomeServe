/**
 * review.controller.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Phase 11 — Reviews & Ratings for HomeServe.
 *
 * Security invariants:
 *   • customerId and technicianId are ALWAYS derived from the booking document;
 *     they are never accepted from the client body.
 *   • Only the customer who owns the booking may submit a review.
 *   • Booking must be in COMPLETED status.
 *   • Each booking may have at most one review (MongoDB unique index + graceful
 *     duplicate-key handling).
 *   • After a review is saved, the technician's denormalised rating/totalReviews
 *     fields are recalculated via aggregation and written back.
 *   • Review responses never include customer email, phone, or password.
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const mongoose = require('mongoose');
const Review = require('../models/review.model');
const Booking = require('../models/booking.model');
const Technician = require('../models/technician.model');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Recalculate and persist the technician's average rating and total review count
 * from the Review collection. Uses MongoDB aggregation for accuracy.
 *
 * @param {mongoose.Types.ObjectId|string} technicianId
 */
async function recalculateTechnicianRating(technicianId) {
  const [result] = await Review.aggregate([
    { $match: { technicianId: new mongoose.Types.ObjectId(technicianId) } },
    {
      $group: {
        _id: '$technicianId',
        avgRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
      },
    },
  ]);

  const avgRating = result ? Math.round(result.avgRating * 10) / 10 : 0;
  const totalReviews = result ? result.totalReviews : 0;

  await Technician.findByIdAndUpdate(technicianId, {
    rating: avgRating,
    totalReviews,
  });
}

/**
 * Build a safe public review object — exposes only name, not email/phone.
 */
function buildReviewResponse(review) {
  const r = review.toObject ? review.toObject() : review;
  return {
    _id: r._id,
    bookingId: r.bookingId,
    customerId: r.customerId?._id || r.customerId,
    customerName: r.customerId?.name || null, // Only name — no email/phone
    technicianId: r.technicianId,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * @desc    Submit a review for a completed booking
 * @route   POST /api/reviews
 * @access  Private — CUSTOMER only
 * @body    { bookingId, rating, comment? }
 */
const createReview = async (req, res) => {
  try {
    const { bookingId, rating, comment } = req.body;

    // ── Validate required fields ──
    if (!bookingId) {
      return res.status(400).json({ success: false, message: 'bookingId is required.' });
    }
    if (rating === undefined || rating === null || rating === '') {
      return res.status(400).json({ success: false, message: 'rating is required.' });
    }

    // ── Validate rating is an integer in [1, 5] ──
    const ratingNum = Number(rating);
    if (!Number.isFinite(ratingNum) || !Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({
        success: false,
        message: 'rating must be an integer between 1 and 5.',
      });
    }

    // ── Validate comment length ──
    if (comment !== undefined && comment !== null) {
      const commentStr = String(comment).trim();
      if (commentStr.length > 500) {
        return res.status(400).json({
          success: false,
          message: 'Review comment cannot exceed 500 characters.',
        });
      }
    }

    // ── Validate bookingId format ──
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({ success: false, message: 'Invalid bookingId.' });
    }

    // ── Load booking ──
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    // ── Ownership check — only the booking's customer can review ──
    if (booking.customerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to review this booking.',
      });
    }

    // ── Status check — only COMPLETED bookings ──
    if (booking.status !== 'COMPLETED') {
      return res.status(400).json({
        success: false,
        message: 'Reviews can only be submitted for completed bookings.',
      });
    }

    // ── Technician check — booking must have an assigned technician ──
    if (!booking.technicianId) {
      return res.status(400).json({
        success: false,
        message: 'This booking has no assigned technician and cannot be reviewed.',
      });
    }

    // ── Create review — let unique index catch duplicates ──
    const review = await Review.create({
      bookingId: booking._id,
      customerId: booking.customerId,   // Always from booking, never from client
      technicianId: booking.technicianId, // Always from booking, never from client
      rating: ratingNum,
      comment: comment ? String(comment).trim() : '',
    });

    // ── Recalculate technician aggregate rating ──
    await recalculateTechnicianRating(booking.technicianId);

    // ── Populate customer name for response ──
    const populated = await Review.findById(review._id).populate('customerId', 'name');

    return res.status(201).json({
      success: true,
      message: 'Review submitted successfully.',
      data: buildReviewResponse(populated),
    });
  } catch (error) {
    // MongoDB duplicate key error (booking already has a review)
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'You have already submitted a review for this booking.',
      });
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join('. ') });
    }
    console.error('[Review.createReview]', error);
    return res.status(500).json({ success: false, message: 'Internal server error creating review.' });
  }
};

/**
 * @desc    Get reviews for a technician (paginated)
 * @route   GET /api/reviews/technician/:technicianId
 * @access  Public
 * @query   page (default 1), limit (default 10)
 */
const getReviewsForTechnician = async (req, res) => {
  try {
    const { technicianId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(technicianId)) {
      return res.status(400).json({ success: false, message: 'Invalid technicianId.' });
    }

    // Verify technician exists
    const tech = await Technician.findById(technicianId);
    if (!tech) {
      return res.status(404).json({ success: false, message: 'Technician not found.' });
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      Review.find({ technicianId })
        .populate('customerId', 'name') // Only name — no email/phone
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Review.countDocuments({ technicianId }),
    ]);

    // Aggregate stats
    const [stats] = await Review.aggregate([
      { $match: { technicianId: new mongoose.Types.ObjectId(technicianId) } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
        },
      },
    ]);

    const avgRating = stats ? Math.round(stats.avgRating * 10) / 10 : 0;
    const totalReviews = stats ? stats.totalReviews : 0;

    return res.status(200).json({
      success: true,
      data: {
        reviews: reviews.map((r) => ({
          _id: r._id,
          bookingId: r.bookingId,
          customerId: r.customerId?._id || r.customerId,
          customerName: r.customerId?.name || 'Customer',
          technicianId: r.technicianId,
          rating: r.rating,
          comment: r.comment,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        })),
        avgRating,
        totalReviews,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('[Review.getReviewsForTechnician]', error);
    return res.status(500).json({ success: false, message: 'Internal server error fetching reviews.' });
  }
};

/**
 * @desc    Get the review for a specific booking
 * @route   GET /api/reviews/booking/:bookingId
 * @access  Private — CUSTOMER (own), TECHNICIAN (assigned), ADMIN
 */
const getReviewForBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({ success: false, message: 'Invalid bookingId.' });
    }

    // Load booking to check authorization
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    // Authorization: CUSTOMER can only see their own booking's review
    if (req.user.role === 'CUSTOMER') {
      if (booking.customerId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to view this review.',
        });
      }
    }

    // Authorization: TECHNICIAN can only see reviews for their bookings
    if (req.user.role === 'TECHNICIAN') {
      const tech = await Technician.findOne({ userId: req.user._id });
      if (!tech || !booking.technicianId || booking.technicianId.toString() !== tech._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to view this review.',
        });
      }
    }

    const review = await Review.findOne({ bookingId })
      .populate('customerId', 'name')
      .lean();

    if (!review) {
      return res.status(200).json({
        success: true,
        data: null,
        message: 'No review submitted for this booking yet.',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        _id: review._id,
        bookingId: review.bookingId,
        customerId: review.customerId?._id || review.customerId,
        customerName: review.customerId?.name || 'Customer',
        technicianId: review.technicianId,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
        updatedAt: review.updatedAt,
      },
    });
  } catch (error) {
    console.error('[Review.getReviewForBooking]', error);
    return res.status(500).json({ success: false, message: 'Internal server error fetching review.' });
  }
};

/**
 * @desc    Get the authenticated customer's own reviews
 * @route   GET /api/reviews/my
 * @access  Private — CUSTOMER only
 * @query   page, limit
 */
const getMyReviews = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      Review.find({ customerId: req.user._id })
        .populate('technicianId', 'skills experience')
        .populate({
          path: 'technicianId',
          populate: { path: 'userId', select: 'name profileImage' },
        })
        .populate('bookingId', 'serviceName scheduledDate status')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Review.countDocuments({ customerId: req.user._id }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        reviews,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('[Review.getMyReviews]', error);
    return res.status(500).json({ success: false, message: 'Internal server error fetching your reviews.' });
  }
};

/**
 * @desc    Admin: list all reviews with optional filters and pagination
 * @route   GET /api/reviews/admin
 * @access  Private — ADMIN only
 * @query   technicianId, customerId, rating, page, limit, search
 */
const adminGetAllReviews = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.technicianId && mongoose.Types.ObjectId.isValid(req.query.technicianId)) {
      filter.technicianId = new mongoose.Types.ObjectId(req.query.technicianId);
    }
    if (req.query.customerId && mongoose.Types.ObjectId.isValid(req.query.customerId)) {
      filter.customerId = new mongoose.Types.ObjectId(req.query.customerId);
    }
    if (req.query.rating) {
      const r = parseInt(req.query.rating);
      if (!isNaN(r) && r >= 1 && r <= 5) filter.rating = r;
    }

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate('customerId', 'name email') // Email shown for admin only
        .populate({
          path: 'technicianId',
          populate: { path: 'userId', select: 'name email' },
        })
        .populate('bookingId', 'serviceName scheduledDate status')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Review.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      count: reviews.length,
      data: reviews,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[Review.adminGetAllReviews]', error);
    return res.status(500).json({ success: false, message: 'Internal server error fetching reviews.' });
  }
};

/**
 * @desc    Admin: delete a review (moderation)
 * @route   DELETE /api/reviews/:id
 * @access  Private — ADMIN only
 */
const adminDeleteReview = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid review ID.' });
    }

    const review = await Review.findByIdAndDelete(id);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found.' });
    }

    // Recalculate technician aggregate rating after deletion
    await recalculateTechnicianRating(review.technicianId);

    return res.status(200).json({
      success: true,
      message: 'Review removed successfully.',
    });
  } catch (error) {
    console.error('[Review.adminDeleteReview]', error);
    return res.status(500).json({ success: false, message: 'Internal server error deleting review.' });
  }
};

module.exports = {
  createReview,
  getReviewsForTechnician,
  getReviewForBooking,
  getMyReviews,
  adminGetAllReviews,
  adminDeleteReview,
};
