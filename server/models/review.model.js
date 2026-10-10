/**
 * review.model.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Mongoose schema for HomeServe customer reviews (Phase 11).
 *
 * Business rules enforced here and in the controller:
 *   • Only one review per booking (unique index on bookingId).
 *   • rating must be an integer 1–5.
 *   • comment is optional (max 500 chars).
 *   • customerId and technicianId are derived from the booking server-side;
 *     clients cannot supply them directly.
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Booking reference is required'],
      unique: true, // One review per booking
    },

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Customer reference is required'],
      index: true,
    },

    technicianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Technician',
      required: [true, 'Technician reference is required'],
      index: true,
    },

    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
      validate: {
        validator: Number.isInteger,
        message: 'Rating must be an integer',
      },
    },

    comment: {
      type: String,
      trim: true,
      maxlength: [500, 'Review comment cannot exceed 500 characters'],
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Compound index: list reviews for a technician sorted newest-first (paginated)
 */
reviewSchema.index({ technicianId: 1, createdAt: -1 });

/**
 * Compound index: list reviews by a customer sorted newest-first
 */
reviewSchema.index({ customerId: 1, createdAt: -1 });

/**
 * Never expose internal Mongoose fields
 */
reviewSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
