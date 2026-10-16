/**
 * wallet.routes.js
 * ─────────────────────────────────────────────────────────────────────────────
 * HomeServe Phase 14 — Wallet & Ledger Routes
 *
 * Route summary:
 *   Customer (requires auth + role CUSTOMER):
 *     GET    /api/wallet                          — get current user's wallet
 *     GET    /api/wallet/transactions             — get own transaction ledger
 *     POST   /api/wallet/payments                 — pay for an eligible booking
 *     POST   /api/wallet/refunds                  — process refund for cancelled booking
 *
 *   Admin (requires auth + role ADMIN):
 *     GET    /api/wallet/admin/:userId            — inspect customer's wallet
 *     GET    /api/wallet/admin/:userId/transactions — inspect customer's transactions
 *     POST   /api/wallet/admin/:userId/adjustments  — manual balance credit/debit
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const { validateObjectIdParams } = require('../middleware/security.middleware');
const {
  getWallet,
  getTransactions,
  payForBooking,
  refundBooking,
  adminGetAllWallets,
  adminGetWallet,
  adminGetTransactions,
  adminAdjustBalance,
} = require('../controllers/wallet.controller');

// All wallet endpoints require authentication
router.use(protect);

// ── Customer Routes ──────────────────────────────────────────────────────────
router.get('/', authorize('CUSTOMER'), getWallet);
router.get('/transactions', authorize('CUSTOMER'), getTransactions);
router.post('/payments', authorize('CUSTOMER'), payForBooking);
router.post('/refunds', authorize('CUSTOMER'), refundBooking);

// ── Admin Routes ─────────────────────────────────────────────────────────────
router.get('/admin', authorize('ADMIN'), adminGetAllWallets);
router.get('/admin/:userId', authorize('ADMIN'), validateObjectIdParams('userId'), adminGetWallet);
router.get(
  '/admin/:userId/transactions',
  authorize('ADMIN'),
  validateObjectIdParams('userId'),
  adminGetTransactions
);
router.post(
  '/admin/:userId/adjustments',
  authorize('ADMIN'),
  validateObjectIdParams('userId'),
  adminAdjustBalance
);

module.exports = router;
