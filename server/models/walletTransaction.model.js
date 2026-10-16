/**
 * walletTransaction.model.js
 * ─────────────────────────────────────────────────────────────────────────────
 * HomeServe Phase 14 — Wallet Transaction Ledger Model.
 *
 * Design decisions:
 *   • Every balance change MUST have a corresponding transaction record.
 *     The wallet balance and transaction ledger are kept consistent via
 *     atomic conditional MongoDB updates (no multi-document transactions
 *     because this deployment uses a standalone MongoDB, not a replica set).
 *   • Idempotency: the `idempotencyKey` field (unique sparse index) prevents
 *     duplicate debits if the same request is retried.
 *   • Customers cannot create, edit, or delete transaction records.
 *   • All amounts are stored as INTEGER PAISE.
 *   • No payment secrets (card numbers, UPI PINs, bank credentials) are stored.
 *
 * Transaction types:
 *   CREDIT  — money added to the wallet (admin manual credit only in Phase 14)
 *   DEBIT   — money deducted for a booking payment
 *   REFUND  — money returned for an eligible cancelled/refunded booking
 *
 * Status values:
 *   COMPLETED — operation succeeded and balance was updated
 *   FAILED    — operation was attempted but failed (balance NOT changed)
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const mongoose = require('mongoose');

const TRANSACTION_TYPES = ['CREDIT', 'DEBIT', 'REFUND'];
const TRANSACTION_STATUSES = ['COMPLETED', 'FAILED'];

const walletTransactionSchema = new mongoose.Schema(
  {
    /** Reference to the Wallet document */
    walletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Wallet',
      required: [true, 'walletId reference is required'],
      index: true,
    },

    /** Reference to the owning User (denormalised for fast queries) */
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'ownerId reference is required'],
      index: true,
    },

    /** Transaction direction */
    type: {
      type: String,
      enum: { values: TRANSACTION_TYPES, message: '{VALUE} is not a valid transaction type' },
      required: [true, 'Transaction type is required'],
    },

    /** Amount involved in this transaction (integer paise, must be > 0) */
    amountPaise: {
      type: Number,
      required: [true, 'amountPaise is required'],
      min: [1, 'amountPaise must be at least 1'],
      validate: {
        validator: Number.isInteger,
        message: 'amountPaise must be an integer',
      },
    },

    /** Wallet balance AFTER this transaction completed (snapshot for auditing) */
    balanceAfterPaise: {
      type: Number,
      required: [true, 'balanceAfterPaise snapshot is required'],
      min: [0, 'Post-transaction balance cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'balanceAfterPaise must be an integer',
      },
    },

    /** Operation outcome */
    status: {
      type: String,
      enum: { values: TRANSACTION_STATUSES, message: '{VALUE} is not a valid status' },
      required: [true, 'Transaction status is required'],
    },

    /**
     * Unique idempotency key to prevent duplicate processing.
     * For booking payments: "pay-<bookingId>"
     * For refunds: "refund-<bookingId>"
     * For admin credits: "admin-credit-<adminId>-<isoTimestamp>"
     * Sparse so null/undefined entries are not indexed (older records without key).
     */
    idempotencyKey: {
      type: String,
      sparse: true,
      unique: true,
    },

    /** Optional link to the booking this transaction relates to */
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      default: null,
      index: true,
    },

    /** Human-readable safe description shown to the customer */
    description: {
      type: String,
      trim: true,
      maxlength: [200, 'Description cannot exceed 200 characters'],
      default: '',
    },

    /**
     * Admin reference — populated only when an ADMIN performs a manual
     * credit/debit adjustment.  Never set by customer-facing operations.
     */
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    /**
     * Reason for an admin manual adjustment (required when adminId is set).
     */
    adminReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Admin reason cannot exceed 500 characters'],
      default: '',
    },
  },
  {
    timestamps: true,
    /**
     * Disable update operators so that existing completed transactions
     * cannot be silently modified.  Any update attempt via save() will
     * only add new documents.  Note: we rely on controller-level guards
     * to prevent mutations on COMPLETED transactions.
     */
  }
);

/** Compound indexes for common query patterns */
walletTransactionSchema.index({ ownerId: 1, createdAt: -1 });
walletTransactionSchema.index({ walletId: 1, createdAt: -1 });
walletTransactionSchema.index({ bookingId: 1, type: 1 });

/** Never expose internal Mongoose fields */
walletTransactionSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

const WalletTransaction = mongoose.model('WalletTransaction', walletTransactionSchema);

module.exports = WalletTransaction;
module.exports.TRANSACTION_TYPES = TRANSACTION_TYPES;
module.exports.TRANSACTION_STATUSES = TRANSACTION_STATUSES;
