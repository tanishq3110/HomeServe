/**
 * booking.controller.js
 * ─────────────────────────────────────────────────────────────────────────────
 * All booking operations for HomeServe Phase 6.
 *
 * Security invariants (enforced throughout):
 *   • customerId, technicianId, basePrice, urgencyCharge, distanceCharge,
 *     totalPrice, status, paymentStatus are NEVER trusted from the client.
 *   • Every mutation verifies ownership + current status before proceeding.
 *   • Technician assignment uses atomic findOneAndUpdate with conditions to
 *     prevent concurrent double-acceptance.
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const mongoose = require('mongoose');
const Booking = require('../models/booking.model');
const {
  BOOKING_STATUSES,
  URGENCY_TYPES,
  ALLOWED_NEXT_STATUSES,
} = require('../models/booking.model');
const Service = require('../models/service.model');
const Technician = require('../models/technician.model');
const { calculateBookingPrice } = require('../services/pricing.service');
const {
  emitBookingStatusUpdated,
  emitBookingCreated,
  emitBookingRemovedFromTech,
} = require('../sockets');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a safe booking response that populates service, customer, and technician.
 */
async function populateAndRespond(res, statusCode, booking, extraFields = {}) {
  const populated = await Booking.findById(booking._id)
    .populate('customerId', 'name email phone')
    .populate('serviceId', 'name category startingPrice iconName image')
    .populate({
      path: 'technicianId',
      populate: { path: 'userId', select: 'name email phone profileImage' },
    })
    .lean();

  return res.status(statusCode).json({
    success: true,
    data: populated,
    ...extraFields,
  });
}

/**
 * Generate a short, human-readable booking reference, e.g. HS-A3F2B1
 */
function generateBookingRef(id) {
  return 'HS-' + id.toString().slice(-6).toUpperCase();
}

/**
 * Validate address fields; returns error message or null.
 */
function validateAddress(address) {
  if (!address || typeof address !== 'object') return 'address is required.';
  const required = ['fullName', 'phone', 'addressLine', 'city', 'state', 'postalCode'];
  for (const field of required) {
    if (!address[field] || String(address[field]).trim() === '') {
      return `address.${field} is required.`;
    }
  }
  return null;
}

/**
 * Find the best eligible technician for a service.
 * Strategy: verified, approved, online technicians whose skills include
 * the service name or category (case-insensitive match). Sort by rating DESC,
 * then by _id ASC for determinism.
 *
 * Limitation: This is a simple skill-name string match. No geo-routing or
 * sophisticated matching is performed in Phase 6.
 *
 * @param {object} service - Service document
 * @returns {Promise<Technician|null>}
 */
async function findEligibleTechnician(service) {
  const serviceKeywords = [
    service.name.toLowerCase(),
    service.category.toLowerCase(),
  ];

  // Build a regex that matches any keyword in the technician's skills array
  const keywordRegex = new RegExp(
    serviceKeywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'),
    'i'
  );

  const technician = await Technician.findOne({
    isVerified: true,
    verificationStatus: 'APPROVED',
    isAvailable: true,
    skills: { $elemMatch: { $regex: keywordRegex } },
  })
    .sort({ rating: -1, _id: 1 })
    .select('_id userId skills rating');

  return technician || null;
}

// ─── Customer: Create Booking ─────────────────────────────────────────────────

/**
 * @desc    Create a new booking
 * @route   POST /api/bookings
 * @access  Private — CUSTOMER only
 */
const createBooking = async (req, res) => {
  try {
    const { serviceId, address, scheduledDate, scheduledTime, urgency, customerNotes } = req.body;

    // 1. Validate serviceId
    if (!serviceId || !mongoose.Types.ObjectId.isValid(serviceId)) {
      return res.status(400).json({ success: false, message: 'A valid serviceId is required.' });
    }

    // 2. Verify service exists and is active
    const service = await Service.findOne({ _id: serviceId, isActive: true });
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found or is currently inactive.',
      });
    }

    // 3. Validate address
    const addressError = validateAddress(address);
    if (addressError) {
      return res.status(400).json({ success: false, message: addressError });
    }

    // 4. Validate scheduledDate
    if (!scheduledDate) {
      return res.status(400).json({ success: false, message: 'scheduledDate is required.' });
    }
    const parsedDate = new Date(scheduledDate);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ success: false, message: 'scheduledDate is not a valid date.' });
    }
    // Reject dates in the past (compare calendar date only, not exact time)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (parsedDate < today) {
      return res.status(400).json({
        success: false,
        message: 'scheduledDate cannot be in the past.',
      });
    }

    // 5. Validate scheduledTime (HH:MM)
    if (!scheduledTime || !/^\d{2}:\d{2}$/.test(scheduledTime)) {
      return res.status(400).json({
        success: false,
        message: 'scheduledTime is required and must be in HH:MM format.',
      });
    }

    // 6. Validate urgency
    if (!urgency || !URGENCY_TYPES.includes(urgency)) {
      return res.status(400).json({
        success: false,
        message: `urgency must be one of: ${URGENCY_TYPES.join(', ')}.`,
      });
    }

    // 7. Server-side pricing — never trust client prices
    const basePrice = Number(service.startingPrice);
    const pricing = calculateBookingPrice({ basePrice, urgency });

    // 8. Try to find an eligible technician
    const technician = await findEligibleTechnician(service);

    // 9. Build clean address snapshot
    const addressSnapshot = {
      label: String(address.label || '').trim(),
      fullName: String(address.fullName).trim(),
      phone: String(address.phone).trim(),
      addressLine: String(address.addressLine).trim(),
      landmark: String(address.landmark || '').trim(),
      city: String(address.city).trim(),
      state: String(address.state).trim(),
      postalCode: String(address.postalCode).trim(),
      latitude: address.latitude ? Number(address.latitude) : null,
      longitude: address.longitude ? Number(address.longitude) : null,
    };

    // 10. Create booking
    const booking = await Booking.create({
      customerId: req.user._id,
      technicianId: technician ? technician._id : null,
      serviceId: service._id,
      serviceName: service.name,
      address: addressSnapshot,
      scheduledDate: parsedDate,
      scheduledTime: scheduledTime.trim(),
      urgency,
      basePrice: pricing.basePrice,
      urgencyCharge: pricing.urgencyCharge,
      distanceCharge: pricing.distanceCharge,
      totalPrice: pricing.totalPrice,
      status: 'REQUESTED',
      paymentStatus: 'PENDING',
      customerNotes: customerNotes ? String(customerNotes).trim().slice(0, 500) : '',
    });

    const populated = await Booking.findById(booking._id)
      .populate('customerId', 'name email phone')
      .populate('serviceId', 'name category startingPrice iconName image')
      .populate({
        path: 'technicianId',
        populate: { path: 'userId', select: 'name email phone profileImage' },
      })
      .lean();

    // Phase 7: Real-time broadcast after successful database creation
    emitBookingCreated({
      booking: populated,
      technicianId: technician ? technician._id : null,
      customerId: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: technician
        ? 'Booking created successfully. A technician has been assigned and will confirm shortly.'
        : 'Booking created. No technician is currently available — we will assign one shortly.',
      bookingRef: generateBookingRef(booking._id),
      technicianAssigned: !!technician,
      pricing: {
        basePrice: pricing.basePrice,
        urgencyCharge: pricing.urgencyCharge,
        distanceCharge: pricing.distanceCharge,
        totalPrice: pricing.totalPrice,
        currency: 'INR',
      },
      data: populated,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join('. ') });
    }
    console.error('[Booking.createBooking]', error);
    return res.status(500).json({ success: false, message: 'Internal server error creating booking.' });
  }
};

// ─── Customer: List Own Bookings ──────────────────────────────────────────────

/**
 * @desc    List authenticated customer's bookings
 * @route   GET /api/bookings/my
 * @access  Private — CUSTOMER only
 */
const getMyBookings = async (req, res) => {
  try {
    const { status } = req.query;
    const query = { customerId: req.user._id };
    if (status && BOOKING_STATUSES.includes(status)) {
      query.status = status;
    }

    const bookings = await Booking.find(query)
      .populate('serviceId', 'name category startingPrice iconName image')
      .populate({
        path: 'technicianId',
        populate: { path: 'userId', select: 'name email phone profileImage' },
      })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    console.error('[Booking.getMyBookings]', error);
    return res.status(500).json({ success: false, message: 'Internal server error fetching bookings.' });
  }
};

// ─── Customer: Cancel Booking ─────────────────────────────────────────────────

/**
 * @desc    Customer cancels their own booking (only while REQUESTED or ACCEPTED)
 * @route   PATCH /api/bookings/:id/cancel
 * @access  Private — CUSTOMER only
 */
const cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid booking ID.' });
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    // Ownership check
    if (booking.customerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You are not authorized to cancel this booking.' });
    }

    // Cancellation is only allowed while REQUESTED or ACCEPTED
    const cancellableStatuses = ['REQUESTED', 'ACCEPTED'];
    if (!cancellableStatuses.includes(booking.status)) {
      return res.status(409).json({
        success: false,
        message: `Booking cannot be cancelled in its current status: ${booking.status}. Cancellation is only allowed while the booking is REQUESTED or ACCEPTED.`,
      });
    }

    const previousStatus = booking.status;
    const { cancellationReason } = req.body;

    booking.status = 'CANCELLED';
    booking.cancellationReason = cancellationReason ? String(cancellationReason).trim().slice(0, 500) : '';
    booking.cancelledBy = req.user._id;
    await booking.save();

    const populated = await Booking.findById(booking._id)
      .populate('customerId', 'name email phone')
      .populate('serviceId', 'name category startingPrice iconName image')
      .populate({
        path: 'technicianId',
        populate: { path: 'userId', select: 'name email phone profileImage' },
      })
      .lean();

    // Phase 7: Real-time broadcast after successful database cancellation
    emitBookingStatusUpdated({
      bookingId: booking._id,
      previousStatus,
      status: 'CANCELLED',
      booking: populated,
      technicianId: booking.technicianId,
      customerId: booking.customerId,
    });

    return res.status(200).json({
      success: true,
      data: populated,
      message: 'Booking cancelled successfully.',
    });
  } catch (error) {
    console.error('[Booking.cancelBooking]', error);
    return res.status(500).json({ success: false, message: 'Internal server error cancelling booking.' });
  }
};

// ─── Shared: Get Booking By ID ────────────────────────────────────────────────

/**
 * @desc    Get booking by ID (customer sees own, technician sees assigned, admin sees all)
 * @route   GET /api/bookings/:id
 * @access  Private — CUSTOMER | TECHNICIAN | ADMIN
 */
const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid booking ID.' });
    }

    const booking = await Booking.findById(id)
      .populate('customerId', 'name email phone')
      .populate('serviceId', 'name category startingPrice iconName image')
      .populate({
        path: 'technicianId',
        populate: { path: 'userId', select: 'name email phone profileImage' },
      })
      .lean();

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const role = req.user.role;
    const userId = req.user._id.toString();

    // Authorization: customer sees only own bookings
    if (role === 'CUSTOMER') {
      if (booking.customerId?._id?.toString() !== userId) {
        return res.status(403).json({ success: false, message: 'Access denied. This booking does not belong to you.' });
      }
    }

    // Authorization: technician sees only assigned bookings
    if (role === 'TECHNICIAN') {
      const techProfile = await Technician.findOne({ userId: req.user._id }).select('_id');
      if (!techProfile || booking.technicianId?._id?.toString() !== techProfile._id.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied. This booking is not assigned to you.' });
      }
    }

    return res.status(200).json({ success: true, data: booking });
  } catch (error) {
    console.error('[Booking.getBookingById]', error);
    return res.status(500).json({ success: false, message: 'Internal server error fetching booking.' });
  }
};

// ─── Technician: List Requests ────────────────────────────────────────────────

/**
 * @desc    List pending requests assigned to the authenticated technician
 * @route   GET /api/bookings/technician/requests
 * @access  Private — TECHNICIAN only
 */
const getTechnicianRequests = async (req, res) => {
  try {
    const techProfile = await Technician.findOne({ userId: req.user._id }).select('_id');
    if (!techProfile) {
      return res.status(404).json({ success: false, message: 'Technician profile not found.' });
    }

    const bookings = await Booking.find({
      technicianId: techProfile._id,
      status: 'REQUESTED',
    })
      .populate('customerId', 'name email phone')
      .populate('serviceId', 'name category startingPrice iconName image')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({ success: true, count: bookings.length, data: bookings });
  } catch (error) {
    console.error('[Booking.getTechnicianRequests]', error);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

/**
 * @desc    List all bookings for the authenticated technician (active + history)
 * @route   GET /api/bookings/technician/my
 * @access  Private — TECHNICIAN only
 */
const getTechnicianBookings = async (req, res) => {
  try {
    const techProfile = await Technician.findOne({ userId: req.user._id }).select('_id');
    if (!techProfile) {
      return res.status(404).json({ success: false, message: 'Technician profile not found.' });
    }

    const { status } = req.query;
    const query = { technicianId: techProfile._id };
    if (status && BOOKING_STATUSES.includes(status)) {
      query.status = status;
    }

    const bookings = await Booking.find(query)
      .populate('customerId', 'name email phone')
      .populate('serviceId', 'name category startingPrice iconName image')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({ success: true, count: bookings.length, data: bookings });
  } catch (error) {
    console.error('[Booking.getTechnicianBookings]', error);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// ─── Technician: Accept Booking ───────────────────────────────────────────────

/**
 * @desc    Technician accepts an assigned booking request
 * @route   PATCH /api/bookings/:id/accept
 * @access  Private — TECHNICIAN only
 *
 * Uses atomic conditional update to prevent concurrent double-acceptance.
 * Only a REQUESTED booking assigned to this specific technician can be accepted.
 */
const acceptBooking = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid booking ID.' });
    }

    const techProfile = await Technician.findOne({ userId: req.user._id });
    if (!techProfile) {
      return res.status(404).json({ success: false, message: 'Technician profile not found.' });
    }

    // Verify the technician is still approved and available
    if (!techProfile.isVerified || techProfile.verificationStatus !== 'APPROVED') {
      return res.status(403).json({
        success: false,
        message: 'Your account must be approved before accepting bookings.',
      });
    }

    // Atomic conditional update: only succeed if booking is REQUESTED and assigned to this technician
    const updated = await Booking.findOneAndUpdate(
      {
        _id: id,
        technicianId: techProfile._id,
        status: 'REQUESTED',
      },
      { $set: { status: 'ACCEPTED' } },
      { new: true }
    );

    if (!updated) {
      // Could be: wrong technician, wrong status, or concurrent acceptance already happened
      const booking = await Booking.findById(id);
      if (!booking) {
        return res.status(404).json({ success: false, message: 'Booking not found.' });
      }
      if (booking.technicianId?.toString() !== techProfile._id.toString()) {
        return res.status(403).json({ success: false, message: 'This booking is not assigned to you.' });
      }
      return res.status(409).json({
        success: false,
        message: `Booking cannot be accepted in its current status: ${booking.status}.`,
      });
    }

    const populated = await Booking.findById(updated._id)
      .populate('customerId', 'name email phone')
      .populate('serviceId', 'name category startingPrice iconName image')
      .populate({
        path: 'technicianId',
        populate: { path: 'userId', select: 'name email phone profileImage' },
      })
      .lean();

    // Phase 7: Real-time broadcast after successful database acceptance
    emitBookingStatusUpdated({
      bookingId: updated._id,
      previousStatus: 'REQUESTED',
      status: 'ACCEPTED',
      booking: populated,
      technicianId: techProfile._id,
      customerId: populated?.customerId?._id,
    });

    return res.status(200).json({
      success: true,
      data: populated,
      message: 'Booking accepted successfully.',
    });
  } catch (error) {
    console.error('[Booking.acceptBooking]', error);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// ─── Technician: Reject Booking ───────────────────────────────────────────────

/**
 * @desc    Technician rejects an assigned booking request
 * @route   PATCH /api/bookings/:id/reject
 * @access  Private — TECHNICIAN only
 *
 * Rejection does NOT cancel the booking. The booking reverts to REQUESTED
 * with technicianId cleared so it can be re-assigned.
 */
const rejectBooking = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid booking ID.' });
    }

    const techProfile = await Technician.findOne({ userId: req.user._id }).select('_id');
    if (!techProfile) {
      return res.status(404).json({ success: false, message: 'Technician profile not found.' });
    }

    // Atomic: only reject if REQUESTED and assigned to this technician
    const updated = await Booking.findOneAndUpdate(
      {
        _id: id,
        technicianId: techProfile._id,
        status: 'REQUESTED',
      },
      { $set: { technicianId: null } },
      { new: true }
    );

    if (!updated) {
      const booking = await Booking.findById(id);
      if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
      if (booking.technicianId?.toString() !== techProfile._id.toString()) {
        return res.status(403).json({ success: false, message: 'This booking is not assigned to you.' });
      }
      return res.status(409).json({
        success: false,
        message: `Booking cannot be rejected in its current status: ${booking.status}.`,
      });
    }

    // Phase 7: Notify technician private room that this booking is removed from their active requests
    emitBookingRemovedFromTech({
      technicianId: techProfile._id,
      bookingId: updated._id,
    });

    const populated = await Booking.findById(updated._id)
      .populate('customerId', 'name email phone')
      .populate('serviceId', 'name category startingPrice iconName image')
      .lean();

    // Broadcast to booking room and admin that booking reverted to REQUESTED with no technician
    emitBookingStatusUpdated({
      bookingId: updated._id,
      previousStatus: 'REQUESTED',
      status: 'REQUESTED',
      booking: populated,
      technicianId: null,
      customerId: populated?.customerId?._id,
    });

    return res.status(200).json({
      success: true,
      message: 'Booking request rejected. The booking remains in REQUESTED state and will be re-assigned.',
      data: populated,
    });
  } catch (error) {
    console.error('[Booking.rejectBooking]', error);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// ─── Technician: Update Job Status ───────────────────────────────────────────

/**
 * @desc    Technician moves an accepted booking through permitted job statuses
 * @route   PATCH /api/bookings/:id/status
 * @access  Private — TECHNICIAN only
 *
 * Permitted technician transitions (after REQUESTED stage):
 *   ACCEPTED / TECHNICIAN_ASSIGNED → ON_THE_WAY → ARRIVED → SERVICE_STARTED → COMPLETED
 * These must align with ALLOWED_NEXT_STATUSES in the model.
 */
const updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status: newStatus } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid booking ID.' });
    }

    if (!newStatus || !BOOKING_STATUSES.includes(newStatus)) {
      return res.status(400).json({
        success: false,
        message: `status must be one of: ${BOOKING_STATUSES.join(', ')}.`,
      });
    }

    const techProfile = await Technician.findOne({ userId: req.user._id }).select('_id');
    if (!techProfile) {
      return res.status(404).json({ success: false, message: 'Technician profile not found.' });
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    // Ownership check
    if (!booking.technicianId || booking.technicianId.toString() !== techProfile._id.toString()) {
      return res.status(403).json({ success: false, message: 'This booking is not assigned to you.' });
    }

    // Technicians may not cancel bookings via this endpoint (customers cancel via /cancel)
    if (newStatus === 'CANCELLED') {
      return res.status(403).json({ success: false, message: 'Technicians cannot cancel customer bookings.' });
    }

    // Validate status transition
    const allowedNext = ALLOWED_NEXT_STATUSES[booking.status] || [];
    if (!allowedNext.includes(newStatus)) {
      return res.status(409).json({
        success: false,
        message: `Invalid transition: ${booking.status} → ${newStatus}. Allowed next statuses: ${allowedNext.join(', ') || 'none'}.`,
      });
    }

    const previousStatus = booking.status;
    booking.status = newStatus;
    await booking.save();

    const populated = await Booking.findById(booking._id)
      .populate('customerId', 'name email phone')
      .populate('serviceId', 'name category startingPrice iconName image')
      .populate({
        path: 'technicianId',
        populate: { path: 'userId', select: 'name email phone profileImage' },
      })
      .lean();

    // Phase 7: Real-time broadcast after successful database update
    emitBookingStatusUpdated({
      bookingId: booking._id,
      previousStatus,
      status: newStatus,
      booking: populated,
      technicianId: booking.technicianId,
      customerId: populated?.customerId?._id,
    });

    return res.status(200).json({
      success: true,
      data: populated,
      message: `Booking status updated to ${newStatus}.`,
    });
  } catch (error) {
    console.error('[Booking.updateBookingStatus]', error);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// ─── Admin: List All Bookings ─────────────────────────────────────────────────

/**
 * @desc    Admin lists all bookings with optional status filter
 * @route   GET /api/bookings
 * @access  Private — ADMIN only
 */
const adminGetAllBookings = async (req, res) => {
  try {
    const { status, customerId, technicianId } = req.query;
    const query = {};

    if (status && BOOKING_STATUSES.includes(status)) query.status = status;
    if (customerId && mongoose.Types.ObjectId.isValid(customerId)) query.customerId = customerId;
    if (technicianId && mongoose.Types.ObjectId.isValid(technicianId)) query.technicianId = technicianId;

    const bookings = await Booking.find(query)
      .populate('customerId', 'name email phone')
      .populate('serviceId', 'name category startingPrice')
      .populate({
        path: 'technicianId',
        populate: { path: 'userId', select: 'name email phone' },
      })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    console.error('[Booking.adminGetAllBookings]', error);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// ─── Phase 8: Get Booking Location ───────────────────────────────────────────

/**
 * @desc    Get latest GPS location for an active booking
 * @route   GET /api/bookings/:id/location
 * @access  Private — CUSTOMER (own), TECHNICIAN (assigned), ADMIN (all)
 */
const getBookingLocation = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid booking ID.' });
    }

    const booking = await Booking.findById(id)
      .select('customerId technicianId status lastLocation address')
      .populate({
        path: 'technicianId',
        select: 'userId isVerified verificationStatus currentLocation',
        populate: { path: 'userId', select: 'name phone profileImage' },
      });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const role = req.user.role;
    const userId = req.user._id.toString();

    // Authorization: Customer sees only own booking
    if (role === 'CUSTOMER') {
      if (booking.customerId?.toString() !== userId) {
        return res.status(403).json({ success: false, message: 'Access denied. This booking does not belong to you.' });
      }
    }

    // Authorization: Technician sees only assigned booking
    if (role === 'TECHNICIAN') {
      const techProfile = await Technician.findOne({ userId: req.user._id }).select('_id');
      if (!techProfile || booking.technicianId?._id?.toString() !== techProfile._id.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied. This booking is not assigned to you.' });
      }
    }

    const ACTIVE_TRACKING_STATUSES = ['ACCEPTED', 'TECHNICIAN_ASSIGNED', 'ON_THE_WAY', 'ARRIVED'];
    const isEligible = ACTIVE_TRACKING_STATUSES.includes(booking.status);

    // Prefer booking.lastLocation or technician's currentLocation
    const loc =
      booking.lastLocation?.latitude !== null && booking.lastLocation?.latitude !== undefined
        ? booking.lastLocation
        : booking.technicianId?.currentLocation?.latitude !== null &&
          booking.technicianId?.currentLocation?.latitude !== undefined
        ? booking.technicianId.currentLocation
        : null;

    const isSharing = Boolean(
      isEligible && (booking.lastLocation?.isSharing || booking.technicianId?.currentLocation?.isSharing)
    );

    return res.status(200).json({
      success: true,
      data: {
        bookingId: booking._id,
        status: booking.status,
        isEligible,
        isSharing,
        location:
          loc && loc.latitude !== null && loc.latitude !== undefined
            ? {
                latitude: loc.latitude,
                longitude: loc.longitude,
                accuracy: loc.accuracy || null,
                heading: loc.heading || null,
                speed: loc.speed || null,
                updatedAt: loc.updatedAt || null,
              }
            : null,
      },
    });
  } catch (error) {
    console.error('[Booking.getBookingLocation]', error);
    return res.status(500).json({ success: false, message: 'Internal server error fetching booking location.' });
  }
};

module.exports = {
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
};

