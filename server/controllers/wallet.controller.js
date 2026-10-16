/**
 * wallet.controller.js
 * ─────────────────────────────────────────────────────────────────────────────
 * HomeServe Phase 14 — Wallet & Transaction Ledger Controller.
 *
 * Concurrency & integrity strategy
 * ─────────────────────────────────────────────────────────────────────────────
 * This deployment runs on a STANDALONE MongoDB instance (no replica set).
 * Multi-document ACID transactions (mongoose.startSession / session.withTransaction)
 * require a replica set and are therefore NOT available here.
 *
 * Instead, every balance mutation uses:
 *   1. Atomic conditional findOneAndUpdate with $inc + a balance floor guard
 *      ($gte check in the query filter) to atomically debit ONLY when balance
 *      is sufficient and never drive it negative.
 *   2. A unique idempotencyKey index on WalletTransaction to prevent a second
 *      write from succeeding if the same request is retried (duplicate-key error
 *      is caught and returns 409 Conflict to the caller).
 *   3. After a successful balance update the transaction record is persisted.
 *      If that second write fails the balance will be incorrect (credit lost /
 *      excess debit recorded).  See KNOWN LIMITATION below.
 *
 * KNOWN LIMITATION (documented, not hidden):
 *   Because MongoDB multi-document transactions require a replica set and this
 *   environment does not have one, there is a small window between the atomic
 *   balance update and the transaction ledger write where a process crash could
 *   leave the balance and ledger out of sync.  In a production system this
 *   would be resolved by running with a replica set, or by a reconciliation job
 *   that detects balance deltas without corresponding ledger entries.
 *   For this phase the risk is documented and acceptable for a development
 *   deployment.
 *
 * Security invariants (enforced throughout):
 *   • ownerId is ALWAYS derived from req.user._id — never from client body.
 *   • Customers cannot credit themselves; credits require ADMIN role.
 *   • Customers cannot view another user's wallet.
 *   • Customers cannot create, edit, or delete ledger records.
 *   • amountPaise is validated: must be a positive integer, ≤ MAX_TRANSACTION_PAISE.
 *   • Booking ownership and payment eligibility are verified server-side.
 *   • totalPrice is re-read from the booking document — client-supplied amounts
 *     are ignored.
 *   • Idempotency keys prevent charging twice for the same booking.
 *   • Refunds cannot exceed the original debit amount for a booking.
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const mongoose = require('mongoose');
const Wallet = require('../models/wallet.model');
const WalletTransaction = require('../models/walletTransaction.model');
const Booking = require('../models/booking.model');

/** Maximum single transaction limit: ₹1,00,000 = 10,000,000 paise */
const MAX_TRANSACTION_PAISE = 10_000_000;

/** Booking statuses that are eligible for wallet payment */
const PAYMENT_ELIGIBLE_STATUSES = ['REQUESTED', 'ACCEPTED', 'TECHNICIAN_ASSIGNED'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Validate that a value is a positive integer within the allowed range.
 * @param {*} val
 * @returns {{ valid: boolean, message?: string }}
 */
function validatePaiseAmount(val) {
  if (val === undefined || val === null) {
    return { valid: false, message: 'amountPaise is required.' };
  }
  if (!Number.isInteger(val)) {
    return { valid: false, message: 'amountPaise must be an integer (paise, not rupees).' };
  }
  if (val <= 0) {
    return { valid: false, message: 'amountPaise must be greater than zero.' };
  }
  if (val > MAX_TRANSACTION_PAISE) {
    return {
      valid: false,
      message: `amountPaise exceeds maximum allowed value (₹${MAX_TRANSACTION_PAISE / 100})`,
    };
  }
  return { valid: true };
}

/**
 * Lazily create a wallet for a customer if one does not already exist.
 * Starting balance is always 0 — no silent funding.
 * @param {mongoose.Types.ObjectId} ownerId
 * @returns {Promise<Wallet>}
 */
async function getOrCreateWallet(ownerId) {
  let wallet = await Wallet.findOne({ ownerId });
  if (!wallet) {
    wallet = await Wallet.create({ ownerId, balancePaise: 0 });
  }
  return wallet;
}

// ─── Customer: Get Wallet Balance ─────────────────────────────────────────────

/**
 * @desc    Get authenticated customer's wallet balance
 * @route   GET /api/wallet
 * @access  Private — CUSTOMER only
 */
const getWallet = async (req, res) => {
  try {
    const wallet = await getOrCreateWallet(req.user._id);

    return res.status(200).json({
      success: true,
      data: {
        walletId: wallet._id,
        balancePaise: wallet.balancePaise,
        balanceRupees: (wallet.balancePaise / 100).toFixed(2),
        currency: wallet.currency,
        updatedAt: wallet.updatedAt,
      },
    });
  } catch (error) {
    console.error('[Wallet.getWallet]', error);
    return res.status(500).json({ success: false, message: 'Internal server error fetching wallet.' });
  }
};

// ─── Customer: Get Transaction History ────────────────────────────────────────

/**
 * @desc    Get paginated transaction history for the authenticated customer
 * @route   GET /api/wallet/transactions
 * @access  Private — CUSTOMER only
 *
 * Query params:
 *   page  {number}  default 1
 *   limit {number}  default 20, max 100
 */
const getTransactions = async (req, res) => {
  try {
    let page = parseInt(req.query.page, 10);
    let limit = parseInt(req.query.limit, 10);

    if (!Number.isFinite(page) || page < 1) page = 1;
    if (!Number.isFinite(limit) || limit < 1) limit = 20;
    if (limit > 100) limit = 100;

    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      WalletTransaction.find({ ownerId: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('bookingId', 'serviceName status paymentStatus')
        .lean(),
      WalletTransaction.countDocuments({ ownerId: req.user._id }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        transactions,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('[Wallet.getTransactions]', error);
    return res.status(500).json({ success: false, message: 'Internal server error fetching transactions.' });
  }
};

// ─── Customer: Pay for a Booking ──────────────────────────────────────────────

/**
 * @desc    Debit wallet to pay for an eligible booking
 * @route   POST /api/wallet/payments
 * @access  Private — CUSTOMER only
 *
 * Body:
 *   bookingId {string}  — ObjectId of the booking to pay for
 *
 * Invariants enforced:
 *   1. Booking exists and is owned by this customer.
 *   2. Booking is in a payment-eligible status (REQUESTED/ACCEPTED/TECHNICIAN_ASSIGNED).
 *   3. Booking paymentStatus is PENDING (not already paid).
 *   4. Amount is server-calculated from booking.totalPrice (client amount is ignored).
 *   5. Wallet balance is sufficient (atomic check — cannot go negative).
 *   6. Idempotency key prevents double-charging if request is retried.
 */
const payForBooking = async (req, res) => {
  try {
    const { bookingId } = req.body;

    // 1. Validate bookingId
    if (!bookingId || !mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({ success: false, message: 'A valid bookingId is required.' });
    }

    // 2. Load booking — we NEVER trust client-supplied amounts
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    // 3. Ownership check
    if (booking.customerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You do not own this booking.' });
    }

    // 4. Payment eligibility — booking must be in an active (pre-completion) state
    if (!PAYMENT_ELIGIBLE_STATUSES.includes(booking.status)) {
      return res.status(409).json({
        success: false,
        message: `Booking is not eligible for payment in its current status: ${booking.status}. ` +
          `Payment is only allowed while the booking is ${PAYMENT_ELIGIBLE_STATUSES.join(', ')}.`,
      });
    }

    // 5. Already paid check
    if (booking.paymentStatus === 'PAID') {
      return res.status(409).json({ success: false, message: 'This booking has already been paid.' });
    }

    // 6. Server-calculated amount — totalPrice is in INR rupees, convert to paise
    const amountPaise = Math.round(booking.totalPrice * 100);
    if (!Number.isInteger(amountPaise) || amountPaise <= 0) {
      return res.status(422).json({
        success: false,
        message: 'Booking has an invalid or zero price and cannot be paid.',
      });
    }

    // 7. Ensure wallet exists (created with 0 balance if missing)
    const wallet = await getOrCreateWallet(req.user._id);

    // 8. Idempotency key — unique per booking payment attempt
    const idempotencyKey = `pay-${bookingId}`;

    // 9. Check if this idempotency key already exists (request already processed)
    const existingTx = await WalletTransaction.findOne({ idempotencyKey });
    if (existingTx) {
      if (existingTx.status === 'COMPLETED') {
        return res.status(409).json({
          success: false,
          message: 'This booking payment has already been processed.',
          transactionId: existingTx._id,
        });
      }
      // FAILED idempotency key — allow retry by not blocking (key was on a FAILED tx)
    }

    // 10. Check sufficient balance before attempting atomic update
    if (wallet.balancePaise < amountPaise) {
      return res.status(422).json({
        success: false,
        message: `Insufficient wallet balance. You need ₹${(amountPaise / 100).toFixed(2)} but your balance is ₹${(wallet.balancePaise / 100).toFixed(2)}.`,
        required: amountPaise,
        available: wallet.balancePaise,
      });
    }

    // 11. Atomic conditional debit — the $gte guard prevents going negative
    //     even under concurrent requests.
    const updatedWallet = await Wallet.findOneAndUpdate(
      {
        _id: wallet._id,
        ownerId: req.user._id,
        balancePaise: { $gte: amountPaise }, // atomic balance floor guard
      },
      { $inc: { balancePaise: -amountPaise } },
      { new: true }
    );

    if (!updatedWallet) {
      // Concurrent debit drained the balance between our check and the update
      return res.status(422).json({
        success: false,
        message: 'Insufficient wallet balance. Another concurrent transaction may have used your funds.',
      });
    }

    // 12. Record the ledger transaction
    //     KNOWN LIMITATION: if this write fails after the balance update,
    //     the balance and ledger will be momentarily out of sync.
    //     This is documented in the module header.
    let txRecord;
    try {
      txRecord = await WalletTransaction.create({
        walletId: wallet._id,
        ownerId: req.user._id,
        type: 'DEBIT',
        amountPaise,
        balanceAfterPaise: updatedWallet.balancePaise,
        status: 'COMPLETED',
        idempotencyKey,
        bookingId: booking._id,
        description: `Payment for booking: ${booking.serviceName || 'Service'}`,
      });
    } catch (ledgerErr) {
      // Idempotency key collision = request already processed by concurrent call
      if (ledgerErr.code === 11000 && ledgerErr.keyPattern?.idempotencyKey) {
        // Roll back the balance update to restore consistency
        await Wallet.findByIdAndUpdate(wallet._id, { $inc: { balancePaise: amountPaise } });
        return res.status(409).json({
          success: false,
          message: 'This booking payment was already processed by a concurrent request.',
        });
      }
      // For any other ledger write failure, roll back the balance debit
      await Wallet.findByIdAndUpdate(wallet._id, { $inc: { balancePaise: amountPaise } });
      console.error('[Wallet.payForBooking] Ledger write failed, balance rolled back:', ledgerErr);
      return res.status(500).json({
        success: false,
        message: 'Payment ledger write failed. Your balance has been restored.',
      });
    }

    // 13. Update booking paymentStatus to PAID
    try {
      await Booking.findByIdAndUpdate(bookingId, { paymentStatus: 'PAID' });
    } catch (bookingErr) {
      // Non-critical — wallet was debited and ledger recorded.  Log and continue.
      console.error('[Wallet.payForBooking] Booking paymentStatus update failed:', bookingErr);
    }

    return res.status(200).json({
      success: true,
      message: `Payment of ₹${(amountPaise / 100).toFixed(2)} processed successfully.`,
      data: {
        transactionId: txRecord._id,
        amountPaise,
        balancePaise: updatedWallet.balancePaise,
        balanceRupees: (updatedWallet.balancePaise / 100).toFixed(2),
        bookingId,
        idempotencyKey,
      },
    });
  } catch (error) {
    console.error('[Wallet.payForBooking]', error);
    return res.status(500).json({ success: false, message: 'Internal server error processing payment.' });
  }
};

// ─── Customer/Admin: Request Refund ───────────────────────────────────────────

/**
 * @desc    Credit a refund for an eligible cancelled/refunded booking
 * @route   POST /api/wallet/refunds
 * @access  Private — CUSTOMER only (for own booking)
 *
 * Rules:
 *   1. Booking must exist and be owned by this customer.
 *   2. Booking paymentStatus must be PAID (only paid bookings can be refunded).
 *   3. Booking must be in a CANCELLED state (refund is only for cancellations in Phase 14).
 *   4. A REFUND transaction for this booking must not already exist.
 *   5. Refund amount is re-read from the original DEBIT transaction — never trusted from client.
 *   6. Refund cannot exceed the original debit amount.
 */
const refundBooking = async (req, res) => {
  try {
    const { bookingId } = req.body;

    if (!bookingId || !mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({ success: false, message: 'A valid bookingId is required.' });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    // Ownership check
    if (booking.customerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You do not own this booking.' });
    }

    // Idempotency key for this refund
    const idempotencyKey = `refund-${bookingId}`;

    // Check for existing refund (prevent double refund)
    const existingRefund = await WalletTransaction.findOne({ idempotencyKey });
    if (existingRefund && existingRefund.status === 'COMPLETED') {
      return res.status(409).json({
        success: false,
        message: 'A refund for this booking has already been processed.',
        transactionId: existingRefund._id,
      });
    }

    if (booking.paymentStatus === 'REFUNDED') {
      return res.status(409).json({
        success: false,
        message: 'A refund for this booking has already been processed.',
      });
    }

    // Only PAID bookings can be refunded
    if (booking.paymentStatus !== 'PAID') {
      return res.status(409).json({
        success: false,
        message: `Booking has not been paid and cannot be refunded. Payment status: ${booking.paymentStatus}.`,
      });
    }

    // Only CANCELLED bookings qualify for a refund in Phase 14
    if (booking.status !== 'CANCELLED') {
      return res.status(409).json({
        success: false,
        message: `Refund is only available for CANCELLED bookings. Current status: ${booking.status}.`,
      });
    }

    // Find the original DEBIT transaction to determine the refund amount
    const originalDebit = await WalletTransaction.findOne({
      bookingId: booking._id,
      type: 'DEBIT',
      status: 'COMPLETED',
    });

    if (!originalDebit) {
      return res.status(409).json({
        success: false,
        message: 'No wallet payment was found for this booking. Only wallet payments can be refunded here. ' +
          'If you paid by another method, refund processing will be handled separately.',
      });
    }

    const refundAmountPaise = originalDebit.amountPaise;

    // Validate refund amount does not exceed original debit (safety check)
    if (refundAmountPaise <= 0 || refundAmountPaise > originalDebit.amountPaise) {
      return res.status(422).json({
        success: false,
        message: 'Invalid refund amount computed from original transaction.',
      });
    }

    // Ensure wallet exists
    const wallet = await getOrCreateWallet(req.user._id);

    // Atomic credit: simply increment (credits cannot cause negative balance)
    const updatedWallet = await Wallet.findOneAndUpdate(
      { _id: wallet._id, ownerId: req.user._id },
      { $inc: { balancePaise: refundAmountPaise } },
      { new: true }
    );

    if (!updatedWallet) {
      return res.status(500).json({ success: false, message: 'Wallet update failed during refund.' });
    }

    // Record the ledger entry
    let txRecord;
    try {
      txRecord = await WalletTransaction.create({
        walletId: wallet._id,
        ownerId: req.user._id,
        type: 'REFUND',
        amountPaise: refundAmountPaise,
        balanceAfterPaise: updatedWallet.balancePaise,
        status: 'COMPLETED',
        idempotencyKey,
        bookingId: booking._id,
        description: `Refund for cancelled booking: ${booking.serviceName || 'Service'}. This is an internal wallet credit only.`,
      });
    } catch (ledgerErr) {
      if (ledgerErr.code === 11000 && ledgerErr.keyPattern?.idempotencyKey) {
        // Roll back the credit
        await Wallet.findByIdAndUpdate(wallet._id, { $inc: { balancePaise: -refundAmountPaise } });
        return res.status(409).json({
          success: false,
          message: 'A refund for this booking was already processed by a concurrent request.',
        });
      }
      await Wallet.findByIdAndUpdate(wallet._id, { $inc: { balancePaise: -refundAmountPaise } });
      console.error('[Wallet.refundBooking] Ledger write failed, credit rolled back:', ledgerErr);
      return res.status(500).json({
        success: false,
        message: 'Refund ledger write failed. The credit has been reversed.',
      });
    }

    // Update booking paymentStatus to REFUNDED
    try {
      await Booking.findByIdAndUpdate(bookingId, { paymentStatus: 'REFUNDED' });
    } catch (bookingErr) {
      console.error('[Wallet.refundBooking] Booking paymentStatus update failed:', bookingErr);
    }

    return res.status(200).json({
      success: true,
      message: `Refund of ₹${(refundAmountPaise / 100).toFixed(2)} credited to your wallet. ` +
        'This is an internal wallet credit only — no money has been transferred to a bank account or UPI app.',
      data: {
        transactionId: txRecord._id,
        refundAmountPaise,
        balancePaise: updatedWallet.balancePaise,
        balanceRupees: (updatedWallet.balancePaise / 100).toFixed(2),
        bookingId,
      },
    });
  } catch (error) {
    console.error('[Wallet.refundBooking]', error);
    return res.status(500).json({ success: false, message: 'Internal server error processing refund.' });
  }
};

// ─── Admin: List All Customer Wallets & Aggregate Liability ───────────────────

/**
 * @desc    Admin lists all customer wallets with aggregate balance & search
 * @route   GET /api/wallet/admin
 * @access  Private — ADMIN only
 */
const adminGetAllWallets = async (req, res) => {
  try {
    let page = parseInt(req.query.page, 10);
    let limit = parseInt(req.query.limit, 10);
    if (!Number.isFinite(page) || page < 1) page = 1;
    if (!Number.isFinite(limit) || limit < 1) limit = 20;
    if (limit > 100) limit = 100;
    const skip = (page - 1) * limit;

    const searchQuery = req.query.search ? String(req.query.search).trim() : '';

    const User = require('../models/user.model');
    let userFilter = { role: 'CUSTOMER' };
    if (searchQuery) {
      userFilter.$or = [
        { name: { $regex: searchQuery, $options: 'i' } },
        { email: { $regex: searchQuery, $options: 'i' } },
      ];
    }

    const matchingUsers = await User.find(userFilter).select('_id').lean();
    const userIds = matchingUsers.map((u) => u._id);

    const [wallets, total, aggregateResult] = await Promise.all([
      Wallet.find({ ownerId: { $in: userIds } })
        .populate('ownerId', 'name email phone role')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Wallet.countDocuments({ ownerId: { $in: userIds } }),
      Wallet.aggregate([
        { $group: { _id: null, totalLiabilityPaise: { $sum: '$balancePaise' } } },
      ]),
    ]);

    const totalLiabilityPaise = aggregateResult[0]?.totalLiabilityPaise || 0;

    return res.status(200).json({
      success: true,
      data: {
        wallets: wallets.map((w) => ({
          walletId: w._id,
          owner: w.ownerId,
          balancePaise: w.balancePaise,
          balanceRupees: (w.balancePaise / 100).toFixed(2),
          currency: w.currency,
          updatedAt: w.updatedAt,
        })),
        stats: {
          totalWallets: total,
          totalLiabilityPaise,
          totalLiabilityRupees: (totalLiabilityPaise / 100).toFixed(2),
        },
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('[Wallet.adminGetAllWallets]', error);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// ─── Admin: Get Any Customer's Wallet ─────────────────────────────────────────

/**
 * @desc    Admin retrieves any customer's wallet by userId
 * @route   GET /api/wallet/admin/:userId
 * @access  Private — ADMIN only
 */
const adminGetWallet = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid userId.' });
    }

    const wallet = await Wallet.findOne({ ownerId: userId }).populate('ownerId', 'name email role');
    if (!wallet) {
      return res.status(404).json({ success: false, message: 'No wallet found for this user.' });
    }

    if (wallet.ownerId?.role && wallet.ownerId.role !== 'CUSTOMER') {
      return res.status(400).json({
        success: false,
        message: 'Wallets only exist for CUSTOMER accounts.',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        walletId: wallet._id,
        owner: { id: wallet.ownerId?._id, name: wallet.ownerId?.name, email: wallet.ownerId?.email },
        balancePaise: wallet.balancePaise,
        balanceRupees: (wallet.balancePaise / 100).toFixed(2),
        currency: wallet.currency,
        createdAt: wallet.createdAt,
        updatedAt: wallet.updatedAt,
      },
    });
  } catch (error) {
    console.error('[Wallet.adminGetWallet]', error);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// ─── Admin: Get Any Customer's Transaction History ────────────────────────────

/**
 * @desc    Admin retrieves paginated transaction history for any customer
 * @route   GET /api/wallet/admin/:userId/transactions
 * @access  Private — ADMIN only
 */
const adminGetTransactions = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid userId.' });
    }

    let page = parseInt(req.query.page, 10);
    let limit = parseInt(req.query.limit, 10);
    if (!Number.isFinite(page) || page < 1) page = 1;
    if (!Number.isFinite(limit) || limit < 1) limit = 20;
    if (limit > 100) limit = 100;

    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      WalletTransaction.find({ ownerId: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('bookingId', 'serviceName status paymentStatus')
        .populate('adminId', 'name email')
        .lean(),
      WalletTransaction.countDocuments({ ownerId: userId }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        transactions,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    console.error('[Wallet.adminGetTransactions]', error);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// ─── Admin: Manual Balance Adjustment ────────────────────────────────────────

/**
 * @desc    Admin performs an audited manual credit or debit on a customer wallet
 * @route   POST /api/wallet/admin/:userId/adjustments
 * @access  Private — ADMIN only
 *
 * Body:
 *   type        {string}  'CREDIT' | 'DEBIT'
 *   amountPaise {number}  positive integer paise
 *   reason      {string}  required, min 10 chars, max 500
 *
 * Security:
 *   • ADMIN role enforced by middleware (cannot be called by customer).
 *   • adminId recorded on every adjustment transaction.
 *   • reason is required and stored.
 *   • Balance floor still enforced on DEBIT (cannot go negative).
 *   • Idempotency key based on admin+timestamp to ensure uniqueness without
 *     blocking legitimate repeated adjustments.
 */
const adminAdjustBalance = async (req, res) => {
  try {
    const { userId } = req.params;
    const { type, amountPaise, reason } = req.body;

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid userId.' });
    }

    // Validate type
    if (!type || !['CREDIT', 'DEBIT'].includes(type)) {
      return res.status(400).json({ success: false, message: "type must be 'CREDIT' or 'DEBIT'." });
    }

    // Validate amount
    const paiseVal = Number(amountPaise);
    const amountValidation = validatePaiseAmount(Number.isInteger(paiseVal) ? paiseVal : null);
    if (!amountValidation.valid) {
      return res.status(400).json({ success: false, message: amountValidation.message });
    }

    // Validate reason
    if (!reason || typeof reason !== 'string' || reason.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'reason is required and must be at least 10 characters.',
      });
    }
    if (reason.trim().length > 500) {
      return res.status(400).json({ success: false, message: 'reason cannot exceed 500 characters.' });
    }

    // Ensure target wallet exists (admin lookup — any customer)
    let wallet = await Wallet.findOne({ ownerId: userId });
    if (!wallet) {
      // Only create wallets for existing customers
      const User = require('../models/user.model');
      const targetUser = await User.findById(userId);
      if (!targetUser) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }
      if (targetUser.role !== 'CUSTOMER') {
        return res.status(400).json({ success: false, message: 'Wallets only exist for CUSTOMER accounts.' });
      }
      wallet = await Wallet.create({ ownerId: userId, balancePaise: 0 });
    }

    // Build idempotency key (admin + iso timestamp to millisecond — unique per manual action)
    const idempotencyKey = `admin-${type.toLowerCase()}-${req.user._id}-${Date.now()}`;

    let updatedWallet;
    if (type === 'CREDIT') {
      updatedWallet = await Wallet.findOneAndUpdate(
        { _id: wallet._id },
        { $inc: { balancePaise: paiseVal } },
        { new: true }
      );
    } else {
      // DEBIT — enforce floor guard
      if (wallet.balancePaise < paiseVal) {
        return res.status(422).json({
          success: false,
          message: `Cannot debit ₹${(paiseVal / 100).toFixed(2)} — wallet balance is only ₹${(wallet.balancePaise / 100).toFixed(2)}.`,
        });
      }
      updatedWallet = await Wallet.findOneAndUpdate(
        { _id: wallet._id, balancePaise: { $gte: paiseVal } },
        { $inc: { balancePaise: -paiseVal } },
        { new: true }
      );
      if (!updatedWallet) {
        return res.status(422).json({
          success: false,
          message: 'Insufficient balance for admin debit (concurrent update may have occurred).',
        });
      }
    }

    // Record ledger entry
    let txRecord;
    try {
      txRecord = await WalletTransaction.create({
        walletId: wallet._id,
        ownerId: userId,
        type,
        amountPaise: paiseVal,
        balanceAfterPaise: updatedWallet.balancePaise,
        status: 'COMPLETED',
        idempotencyKey,
        description: `Admin manual ${type.toLowerCase()}: ${reason.trim().slice(0, 200)}`,
        adminId: req.user._id,
        adminReason: reason.trim(),
      });
    } catch (ledgerErr) {
      // Roll back balance on ledger failure
      const rollbackDelta = type === 'CREDIT' ? -paiseVal : paiseVal;
      await Wallet.findByIdAndUpdate(wallet._id, { $inc: { balancePaise: rollbackDelta } });
      console.error('[Wallet.adminAdjustBalance] Ledger write failed:', ledgerErr);
      return res.status(500).json({
        success: false,
        message: 'Ledger write failed. Balance has been rolled back.',
      });
    }

    return res.status(200).json({
      success: true,
      message: `Admin ${type} of ₹${(paiseVal / 100).toFixed(2)} applied successfully.`,
      data: {
        transactionId: txRecord._id,
        idempotencyKey,
        type,
        amountPaise: paiseVal,
        balancePaise: updatedWallet.balancePaise,
        balanceRupees: (updatedWallet.balancePaise / 100).toFixed(2),
        adminId: req.user._id,
        reason: reason.trim(),
      },
    });
  } catch (error) {
    console.error('[Wallet.adminAdjustBalance]', error);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

module.exports = {
  getWallet,
  getTransactions,
  payForBooking,
  refundBooking,
  adminGetAllWallets,
  adminGetWallet,
  adminGetTransactions,
  adminAdjustBalance,
};
