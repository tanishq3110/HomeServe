/**
 * wallet.model.js
 * ─────────────────────────────────────────────────────────────────────────────
 * HomeServe Phase 14 — Internal Wallet Model.
 *
 * Design decisions:
 *   • One wallet per CUSTOMER user (enforced by unique index on ownerId).
 *   • All monetary values are stored as INTEGER PAISE to avoid floating-point
 *     rounding errors (₹1.00 = 100 paise).
 *   • balance is NEVER modified directly by the customer via API; it is only
 *     updated by authorised server-side ledger operations.
 *   • balancePaise must never go below zero (enforced by min:0 + atomic
 *     conditional updates in the controller).
 *   • No payment card, UPI PIN, bank account, or external payment data is
 *     stored here.
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema(
  {
    /** Reference to the owning User document (CUSTOMER role only) */
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Wallet owner reference is required'],
      unique: true,   // exactly one wallet per customer
      index: true,
    },

    /** Current available balance in integer PAISE (₹1 = 100 paise) */
    balancePaise: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Wallet balance cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'balancePaise must be an integer',
      },
    },

    /** ISO 4217 currency code — always INR for Phase 14 */
    currency: {
      type: String,
      default: 'INR',
      enum: { values: ['INR'], message: 'Only INR is supported in Phase 14' },
      immutable: true,
    },
  },
  {
    timestamps: true,
  }
);

/** Never expose internal Mongoose fields */
walletSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

const Wallet = mongoose.model('Wallet', walletSchema);
module.exports = Wallet;
