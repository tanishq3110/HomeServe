/**
 * pricing.service.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Authoritative server-side pricing logic for HomeServe bookings.
 *
 * Formula:
 *   totalPrice = basePrice + urgencyCharge + distanceCharge
 *
 * Policy:
 *   - basePrice   → service.startingPrice from MongoDB (never trusted from client)
 *   - urgencyCharge → URGENT_SURCHARGE_INR for URGENT, 0 for NORMAL
 *   - distanceCharge → 0 (no GPS/maps integration in Phase 6)
 *
 * Configuration lives here; update constants below to change pricing policy.
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

/** Configurable pricing constants (all amounts in INR) */
const PRICING_CONFIG = {
  /** Flat surcharge added when urgency === 'URGENT' */
  URGENT_SURCHARGE_INR: 150,

  /**
   * Distance charge — zero until live GPS / Maps integration is available.
   * Set to 0 to be honest about Phase 6 limitations.
   */
  DISTANCE_CHARGE_INR: 0,
};

/**
 * Calculate the full price breakdown for a booking.
 *
 * @param {object} params
 * @param {number} params.basePrice   - Service startingPrice from MongoDB
 * @param {string} params.urgency     - 'NORMAL' | 'URGENT'
 * @returns {{ basePrice: number, urgencyCharge: number, distanceCharge: number, totalPrice: number }}
 */
function calculateBookingPrice({ basePrice, urgency }) {
  if (typeof basePrice !== 'number' || basePrice < 0) {
    throw new Error('basePrice must be a non-negative number.');
  }

  const validUrgencies = ['NORMAL', 'URGENT'];
  if (!validUrgencies.includes(urgency)) {
    throw new Error(`urgency must be one of: ${validUrgencies.join(', ')}.`);
  }

  const urgencyCharge = urgency === 'URGENT' ? PRICING_CONFIG.URGENT_SURCHARGE_INR : 0;
  const distanceCharge = PRICING_CONFIG.DISTANCE_CHARGE_INR; // always 0 in Phase 6
  const totalPrice = basePrice + urgencyCharge + distanceCharge;

  return {
    basePrice,
    urgencyCharge,
    distanceCharge,
    totalPrice,
  };
}

/**
 * Format an INR amount as a readable string, e.g. ₹1,500.
 * @param {number} amount
 * @returns {string}
 */
function formatINR(amount) {
  return `₹${Number(amount).toLocaleString('en-IN')}`;
}

module.exports = {
  calculateBookingPrice,
  formatINR,
  PRICING_CONFIG,
};
