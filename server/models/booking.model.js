/**
 * booking.model.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Mongoose schema for HomeServe service bookings.
 *
 * STATUS TRANSITION POLICY
 * ──────────────────────────────────────────────────────────────────────────────
 * Standard flow:
 *   REQUESTED → ACCEPTED → TECHNICIAN_ASSIGNED → ON_THE_WAY → ARRIVED
 *             → SERVICE_STARTED → COMPLETED
 *
 * Terminal states:
 *   CANCELLED  — booking ended without service completion
 *
 * Cancellation rules (enforced in controller):
 *   • CUSTOMER may cancel while status is REQUESTED or ACCEPTED.
 *   • Once status reaches SERVICE_STARTED or later, customer cannot cancel.
 *   • ADMIN may inspect all bookings.
 *   • COMPLETED and CANCELLED bookings cannot be cancelled again.
 *   • A technician rejecting a request does NOT cancel the booking; it reverts
 *     to REQUESTED with technicianId cleared so re-assignment can occur.
 *
 * Technician status progression after acceptance:
 *   ACCEPTED / TECHNICIAN_ASSIGNED → ON_THE_WAY → ARRIVED → SERVICE_STARTED → COMPLETED
 *
 * Allowed next statuses per current status (used in controller validation):
 *   REQUESTED          → [ACCEPTED, CANCELLED]
 *   ACCEPTED           → [TECHNICIAN_ASSIGNED, ON_THE_WAY, CANCELLED]
 *   TECHNICIAN_ASSIGNED→ [ON_THE_WAY]
 *   ON_THE_WAY         → [ARRIVED]
 *   ARRIVED            → [SERVICE_STARTED]
 *   SERVICE_STARTED    → [COMPLETED]
 *   COMPLETED          → []  (terminal)
 *   CANCELLED          → []  (terminal)
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const mongoose = require('mongoose');

/** ── Address sub-schema (snapshot at booking time) ── */
const addressSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, default: '' },
    fullName: {
      type: String,
      trim: true,
      required: [true, 'Address full name is required'],
    },
    phone: {
      type: String,
      trim: true,
      required: [true, 'Address phone is required'],
    },
    addressLine: {
      type: String,
      trim: true,
      required: [true, 'Address line is required'],
    },
    landmark: { type: String, trim: true, default: '' },
    city: {
      type: String,
      trim: true,
      required: [true, 'City is required'],
    },
    state: {
      type: String,
      trim: true,
      required: [true, 'State is required'],
    },
    postalCode: {
      type: String,
      trim: true,
      required: [true, 'Postal code is required'],
    },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
  },
  { _id: false }
);

/** ── Booking statuses ── */
const BOOKING_STATUSES = [
  'REQUESTED',
  'ACCEPTED',
  'TECHNICIAN_ASSIGNED',
  'ON_THE_WAY',
  'ARRIVED',
  'SERVICE_STARTED',
  'COMPLETED',
  'CANCELLED',
];

/** ── Payment statuses ── */
const PAYMENT_STATUSES = ['PENDING', 'PAID', 'FAILED', 'REFUNDED'];

/** ── Urgency types ── */
const URGENCY_TYPES = ['NORMAL', 'URGENT'];

/** ── Booking schema ── */
const bookingSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Customer reference is required'],
      index: true,
    },

    technicianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Technician',
      default: null,
      index: true,
    },

    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: [true, 'Service reference is required'],
      index: true,
    },

    /** Snapshot of address at booking time — preserved even if customer edits their saved address */
    address: {
      type: addressSchema,
      required: [true, 'Service address is required'],
    },

    scheduledDate: {
      type: Date,
      required: [true, 'Scheduled date is required'],
    },

    scheduledTime: {
      type: String,
      required: [true, 'Scheduled time is required'],
      trim: true,
      match: [/^\d{2}:\d{2}$/, 'scheduledTime must be in HH:MM format'],
    },

    urgency: {
      type: String,
      enum: {
        values: URGENCY_TYPES,
        message: '{VALUE} is not a valid urgency type',
      },
      required: [true, 'Urgency is required'],
      default: 'NORMAL',
    },

    /** Authoritative pricing fields — always server-calculated */
    basePrice: {
      type: Number,
      required: [true, 'Base price is required'],
      min: [0, 'Base price cannot be negative'],
    },
    urgencyCharge: {
      type: Number,
      required: [true, 'Urgency charge is required'],
      min: [0, 'Urgency charge cannot be negative'],
    },
    distanceCharge: {
      type: Number,
      required: [true, 'Distance charge is required'],
      min: [0, 'Distance charge cannot be negative'],
      default: 0,
    },
    totalPrice: {
      type: Number,
      required: [true, 'Total price is required'],
      min: [0, 'Total price cannot be negative'],
    },

    status: {
      type: String,
      enum: {
        values: BOOKING_STATUSES,
        message: '{VALUE} is not a valid booking status',
      },
      default: 'REQUESTED',
      index: true,
    },

    paymentStatus: {
      type: String,
      enum: {
        values: PAYMENT_STATUSES,
        message: '{VALUE} is not a valid payment status',
      },
      default: 'PENDING',
    },

    customerNotes: {
      type: String,
      trim: true,
      maxlength: [500, 'Customer notes cannot exceed 500 characters'],
      default: '',
    },

    cancellationReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Cancellation reason cannot exceed 500 characters'],
      default: '',
    },

    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    /** Snapshot of service name at booking time (in case service is later renamed) */
    serviceName: {
      type: String,
      trim: true,
      default: '',
    },

    /** Phase 8: Latest authorized technician GPS coordinates for this booking */
    lastLocation: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      accuracy: { type: Number, default: null },
      heading: { type: Number, default: null },
      speed: { type: Number, default: null },
      updatedAt: { type: Date, default: null },
      isSharing: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Compound indexes for common query patterns
 */
// Customer history: list bookings by customer, sorted by date
bookingSchema.index({ customerId: 1, createdAt: -1 });
// Technician inbox/history: list bookings by technician
bookingSchema.index({ technicianId: 1, status: 1 });
// Admin filtered lists
bookingSchema.index({ status: 1, createdAt: -1 });
// Trends and analytics date range queries
bookingSchema.index({ createdAt: -1 });

/**
 * Clean up internal Mongoose fields from JSON output
 */
bookingSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

/**
 * Export status/urgency/payment enum arrays for reuse in controller
 */
const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
module.exports.BOOKING_STATUSES = BOOKING_STATUSES;
module.exports.PAYMENT_STATUSES = PAYMENT_STATUSES;
module.exports.URGENCY_TYPES = URGENCY_TYPES;

/**
 * ALLOWED_NEXT_STATUSES
 * Maps each status to the set of valid next statuses.
 * Used in the controller to enforce the transition policy.
 */
module.exports.ALLOWED_NEXT_STATUSES = {
  REQUESTED:           ['ACCEPTED', 'CANCELLED'],
  ACCEPTED:            ['TECHNICIAN_ASSIGNED', 'ON_THE_WAY', 'CANCELLED'],
  TECHNICIAN_ASSIGNED: ['ON_THE_WAY'],
  ON_THE_WAY:          ['ARRIVED'],
  ARRIVED:             ['SERVICE_STARTED'],
  SERVICE_STARTED:     ['COMPLETED'],
  COMPLETED:           [],
  CANCELLED:           [],
};

/**
 * ACTIVE_TRACKING_STATUSES
 * Statuses during which active technician GPS location sharing is permitted.
 */
module.exports.ACTIVE_TRACKING_STATUSES = [
  'ACCEPTED',
  'TECHNICIAN_ASSIGNED',
  'ON_THE_WAY',
  'ARRIVED',
];

