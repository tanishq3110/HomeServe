/**
 * server/sockets/index.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Socket.IO Real-Time Server Configuration for HomeServe Phase 7.
 *
 * Architecture & Event Protocol:
 * ─────────────────────────────────────────────────────────────────────────────
 * Rooms:
 *   • booking:<bookingId>    — Dedicated room for an active booking.
 *                              Joined ONLY by authorized customer, assigned technician, or admin.
 *   • user:<userId>          — Private user notification room.
 *   • customer:<userId>      — Customer private room.
 *   • technician:<techId>    — Verified technician profile room for new assigned requests.
 *   • admin:bookings         — Administrative broadcast room for all bookings.
 *
 * Client -> Server Events:
 *   • booking:join   { bookingId }  — Request to join a specific booking room (authorized on server)
 *   • booking:leave  { bookingId }  — Request to leave a specific booking room
 *
 * Server -> Client Events:
 *   • booking:joined          { bookingId }
 *   • booking:left            { bookingId }
 *   • booking:error           { message }
 *   • booking:status_updated  { bookingId, previousStatus, status, updatedAt, booking }
 *   • booking:new_request     { bookingId, booking }  (emitted to technician:<techId>)
 *   • booking:created         { bookingId, booking }  (emitted to admin:bookings & customer)
 *   • booking:removed         { bookingId }           (emitted to technician on reject)
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/user.model');
const Technician = require('../models/technician.model');
const Booking = require('../models/booking.model');
const { ACTIVE_TRACKING_STATUSES } = require('../models/booking.model');

let ioInstance = null;

// Phase 8: Active GPS tracking sessions and throttle management
// activeTrackingSessions: Map<socketId, { bookingId, technicianId, startedAt }>
const activeTrackingSessions = new Map();
// lastLocationUpdateMap: Map<socketId, timestamp>
const lastLocationUpdateMap = new Map();
const LOCATION_UPDATE_THROTTLE_MS = 1500; // 1.5 seconds throttle between updates per technician

/**
 * Validates coordinate pair.
 * Must be finite numbers with -90 <= lat <= 90 and -180 <= lng <= 180.
 */
function isValidCoordinate(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat < -90 || lat > 90) return false;
  if (lng < -180 || lng > 180) return false;
  return true;
}

/**
 * Safely parses optional number with finite bounds
 */
function sanitizeNumber(val, defaultVal = null, min = -Infinity, max = Infinity) {
  if (val === undefined || val === null || val === '') return defaultVal;
  const num = Number(val);
  if (!Number.isFinite(num) || num < min || num > max) return defaultVal;
  return num;
}

/**
 * Build a safe, minimal booking snapshot for real-time broadcasts.
 * Excludes sensitive user data, internal secrets, or full payment configurations.
 */
function safeBookingSummary(booking) {
  if (!booking) return null;

  const b = typeof booking.toObject === 'function' ? booking.toObject() : booking;

  return {
    _id: b._id?.toString() || b._id,
    serviceName: b.serviceName,
    serviceId: b.serviceId?._id ? b.serviceId._id.toString() : b.serviceId?.toString() || b.serviceId,
    status: b.status,
    previousStatus: b.previousStatus || undefined,
    urgency: b.urgency,
    scheduledDate: b.scheduledDate,
    scheduledTime: b.scheduledTime,
    pricing: b.pricing
      ? {
          basePrice: b.pricing.basePrice,
          urgencyCharge: b.pricing.urgencyCharge,
          distanceCharge: b.pricing.distanceCharge,
          totalPrice: b.pricing.totalPrice,
          currency: b.pricing.currency || 'INR',
        }
      : undefined,
    customerId: b.customerId?._id
      ? {
          _id: b.customerId._id.toString(),
          name: b.customerId.name,
        }
      : b.customerId?.toString() || b.customerId,
    technicianId: b.technicianId?._id
      ? {
          _id: b.technicianId._id.toString(),
          userId: b.technicianId.userId
            ? {
                name: b.technicianId.userId.name,
                phone: b.technicianId.userId.phone,
                profileImage: b.technicianId.userId.profileImage,
              }
            : undefined,
          rating: b.technicianId.rating,
        }
      : b.technicianId
      ? b.technicianId.toString()
      : null,
    cancellationReason: b.cancellationReason || '',
    cancelledBy: b.cancelledBy?.toString() || b.cancelledBy || null,
    updatedAt: b.updatedAt,
    createdAt: b.createdAt,
  };
}

/**
 * Socket.IO Authentication Middleware
 * Validates JWT token from socket.handshake.auth.token or headers.authorization.
 * Attaches verified User model instance and technician profile ID to socket.
 */
async function socketAuthMiddleware(socket, next) {
  try {
    let token = socket.handshake.auth?.token;

    // Check authorization header fallback
    if (!token && socket.handshake.headers?.authorization) {
      const parts = socket.handshake.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        token = parts[1];
      } else {
        token = socket.handshake.headers.authorization;
      }
    }

    if (!token) {
      return next(new Error('Authentication error: No authentication token provided.'));
    }

    if (token.startsWith('Bearer ')) {
      token = token.slice(7).trim();
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return next(new Error('Server configuration error: JWT_SECRET missing.'));
    }

    // Verify token
    const decoded = jwt.verify(token, secret);
    if (!decoded || !decoded.id) {
      return next(new Error('Authentication error: Malformed token.'));
    }

    // Load active user from MongoDB (reject credentials if user deleted)
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return next(new Error('Authentication error: User session does not exist.'));
    }

    // Attach user
    socket.user = user;

    // If technician, lookup and attach technician profile ID and approval status
    if (user.role === 'TECHNICIAN') {
      const techProfile = await Technician.findOne({ userId: user._id }).select('_id isVerified verificationStatus');
      socket.technicianId = techProfile ? techProfile._id.toString() : null;
      socket.technicianApproved = Boolean(
        techProfile && techProfile.isVerified && techProfile.verificationStatus === 'APPROVED'
      );
    } else {
      socket.technicianId = null;
      socket.technicianApproved = false;
    }

    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new Error('Authentication error: Token expired. Please log in again.'));
    }
    return next(new Error('Authentication error: Invalid authentication token.'));
  }
}

/**
 * Configure and initialize Socket.IO server
 *
 * @param {import('http').Server} httpServer
 * @param {string} allowedOrigin
 * @returns {Server}
 */
function initSocket(httpServer, allowedOrigin = 'http://localhost:5173') {
  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigin,
      credentials: true,
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 20000,
    pingInterval: 25000,
  });

  // Apply authentication middleware
  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    const user = socket.user;
    const userId = user._id.toString();

    // Join private user and role rooms
    socket.join(`user:${userId}`);

    if (user.role === 'ADMIN') {
      socket.join('admin:bookings');
    } else if (user.role === 'TECHNICIAN' && socket.technicianId) {
      socket.join(`technician:${socket.technicianId}`);
    } else if (user.role === 'CUSTOMER') {
      socket.join(`customer:${userId}`);
    }

    /**
     * Event: booking:join
     * Client requests to join a booking-specific room.
     * Server validates ownership/assignment before granting access.
     */
    socket.on('booking:join', async (payload, ack) => {
      try {
        const bookingId = payload?.bookingId;

        if (!bookingId || !mongoose.Types.ObjectId.isValid(bookingId)) {
          const errPayload = { message: 'Invalid or missing booking ID.' };
          if (typeof ack === 'function') ack({ success: false, error: errPayload.message });
          socket.emit('booking:error', errPayload);
          return;
        }

        // Fetch booking from MongoDB to verify permissions
        const booking = await Booking.findById(bookingId).select('customerId technicianId status');
        if (!booking) {
          const errPayload = { message: 'Booking not found.' };
          if (typeof ack === 'function') ack({ success: false, error: errPayload.message });
          socket.emit('booking:error', errPayload);
          return;
        }

        // Authorization rules:
        // 1. ADMIN may join any booking room
        // 2. CUSTOMER may join ONLY their own booking room
        // 3. TECHNICIAN may join ONLY if assigned to their technician profile
        let isAuthorized = false;

        if (user.role === 'ADMIN') {
          isAuthorized = true;
        } else if (user.role === 'CUSTOMER') {
          isAuthorized = booking.customerId && booking.customerId.toString() === userId;
        } else if (user.role === 'TECHNICIAN') {
          isAuthorized =
            Boolean(socket.technicianId) &&
            Boolean(booking.technicianId) &&
            booking.technicianId.toString() === socket.technicianId;
        }

        if (!isAuthorized) {
          const errPayload = {
            message: 'Forbidden: You are not authorized to subscribe to this booking room.',
          };
          if (typeof ack === 'function') ack({ success: false, error: errPayload.message });
          socket.emit('booking:error', errPayload);
          return;
        }

        const roomName = `booking:${bookingId}`;
        socket.join(roomName);

        if (typeof ack === 'function') {
          ack({ success: true, bookingId });
        }
        socket.emit('booking:joined', { bookingId });
      } catch (err) {
        console.error('[Socket booking:join Error]', err);
        const errPayload = { message: 'Internal error joining booking room.' };
        if (typeof ack === 'function') ack({ success: false, error: errPayload.message });
        socket.emit('booking:error', errPayload);
      }
    });

    /**
     * Event: booking:leave
     * Client requests to leave a booking-specific room.
     */
    socket.on('booking:leave', (payload, ack) => {
      try {
        const bookingId = payload?.bookingId;
        if (bookingId) {
          const roomName = `booking:${bookingId}`;
          socket.leave(roomName);
          if (typeof ack === 'function') ack({ success: true, bookingId });
          socket.emit('booking:left', { bookingId });
        }
      } catch (err) {
        console.error('[Socket booking:leave Error]', err);
      }
    });

    /**
     * ── Phase 8: Real-Time Technician GPS Location Events ──────────────────────────
     */

    /**
     * Event: location:share_start
     * Technician begins streaming GPS location for an active, assigned booking.
     */
    socket.on('location:share_start', async (payload, ack) => {
      try {
        // 1. Must be authenticated TECHNICIAN
        if (user.role !== 'TECHNICIAN' || !socket.technicianId) {
          const msg = 'Forbidden: Only authenticated technicians can share location.';
          if (typeof ack === 'function') ack({ success: false, error: msg });
          socket.emit('location:error', { message: msg });
          return;
        }

        // 2. Technician profile must be verified and approved
        const techProfile = await Technician.findById(socket.technicianId).select('isVerified verificationStatus');
        if (!techProfile || !techProfile.isVerified || techProfile.verificationStatus !== 'APPROVED') {
          const msg = 'Forbidden: Technician profile must be verified and approved to share location.';
          if (typeof ack === 'function') ack({ success: false, error: msg });
          socket.emit('location:error', { message: msg });
          return;
        }

        const bookingId = payload?.bookingId;
        if (!bookingId || !mongoose.Types.ObjectId.isValid(bookingId)) {
          const msg = 'Invalid or missing booking ID.';
          if (typeof ack === 'function') ack({ success: false, error: msg });
          socket.emit('location:error', { message: msg });
          return;
        }

        // 3. Booking must exist and be assigned to this technician
        const booking = await Booking.findById(bookingId).select('technicianId status');
        if (!booking) {
          const msg = 'Booking not found.';
          if (typeof ack === 'function') ack({ success: false, error: msg });
          socket.emit('location:error', { message: msg });
          return;
        }

        if (!booking.technicianId || booking.technicianId.toString() !== socket.technicianId) {
          const msg = 'Forbidden: This booking is not assigned to you.';
          if (typeof ack === 'function') ack({ success: false, error: msg });
          socket.emit('location:error', { message: msg });
          return;
        }

        // 4. Booking must be in an eligible tracking status
        if (!ACTIVE_TRACKING_STATUSES.includes(booking.status)) {
          const msg = `Location sharing is not allowed for booking status: ${booking.status}.`;
          if (typeof ack === 'function') ack({ success: false, error: msg });
          socket.emit('location:error', { message: msg });
          return;
        }

        // Record tracking session
        activeTrackingSessions.set(socket.id, {
          bookingId: booking._id.toString(),
          technicianId: socket.technicianId,
          startedAt: new Date(),
        });

        // Update MongoDB persistence
        await Promise.all([
          Technician.findByIdAndUpdate(socket.technicianId, {
            $set: {
              'currentLocation.isSharing': true,
              'currentLocation.activeBookingId': booking._id,
            },
          }),
          Booking.findByIdAndUpdate(booking._id, {
            $set: { 'lastLocation.isSharing': true },
          }),
        ]);

        socket.join(`booking:${booking._id.toString()}`);

        const startPayload = {
          bookingId: booking._id.toString(),
          isSharing: true,
          startedAt: new Date().toISOString(),
        };

        io.to(`booking:${booking._id.toString()}`).emit('location:sharing_started', startPayload);

        if (typeof ack === 'function') {
          ack({ success: true, ...startPayload });
        }
      } catch (err) {
        console.error('[Socket location:share_start Error]', err);
        const msg = 'Internal error starting location sharing.';
        if (typeof ack === 'function') ack({ success: false, error: msg });
        socket.emit('location:error', { message: msg });
      }
    });

    /**
     * Event: location:update
     * Technician transmits live GPS coordinates for an active, assigned booking.
     */
    socket.on('location:update', async (payload, ack) => {
      try {
        // 1. Authentication & Role check
        if (user.role !== 'TECHNICIAN' || !socket.technicianId) {
          const msg = 'Forbidden: Only authenticated technicians can broadcast location.';
          if (typeof ack === 'function') ack({ success: false, error: msg });
          socket.emit('location:error', { message: msg });
          return;
        }

        const bookingId = payload?.bookingId;
        if (!bookingId || !mongoose.Types.ObjectId.isValid(bookingId)) {
          const msg = 'Invalid or missing booking ID.';
          if (typeof ack === 'function') ack({ success: false, error: msg });
          socket.emit('location:error', { message: msg });
          return;
        }

        // 2. Validate coordinates strictly
        const { latitude, longitude, accuracy, heading, speed, timestamp } = payload || {};
        if (!isValidCoordinate(latitude, longitude)) {
          const msg = 'Invalid coordinates. Latitude must be between -90 and 90, longitude between -180 and 180.';
          if (typeof ack === 'function') ack({ success: false, error: msg });
          socket.emit('location:error', { message: msg });
          return;
        }

        // 3. Throttling check (default 1.5s interval)
        const now = Date.now();
        const lastUpdate = lastLocationUpdateMap.get(socket.id) || 0;
        if (now - lastUpdate < LOCATION_UPDATE_THROTTLE_MS) {
          if (typeof ack === 'function') {
            ack({ success: false, throttled: true, error: 'Update throttled. Minimum interval is 1.5s.' });
          }
          return;
        }

        // 4. Booking verification
        const booking = await Booking.findById(bookingId).select('technicianId status');
        if (!booking) {
          const msg = 'Booking not found.';
          if (typeof ack === 'function') ack({ success: false, error: msg });
          socket.emit('location:error', { message: msg });
          return;
        }

        if (!booking.technicianId || booking.technicianId.toString() !== socket.technicianId) {
          const msg = 'Forbidden: This booking is not assigned to you.';
          if (typeof ack === 'function') ack({ success: false, error: msg });
          socket.emit('location:error', { message: msg });
          return;
        }

        if (!ACTIVE_TRACKING_STATUSES.includes(booking.status)) {
          const msg = `Cannot update location. Booking status is ${booking.status}.`;
          if (typeof ack === 'function') ack({ success: false, error: msg });
          socket.emit('location:error', { message: msg });
          return;
        }

        // Register last update timestamp
        lastLocationUpdateMap.set(socket.id, now);

        const cleanAccuracy = sanitizeNumber(accuracy, null, 0);
        const cleanHeading = sanitizeNumber(heading, null, 0, 360);
        const cleanSpeed = sanitizeNumber(speed, null, 0);
        const updateTime = timestamp ? new Date(timestamp) : new Date();

        const locationData = {
          latitude: Number(latitude),
          longitude: Number(longitude),
          accuracy: cleanAccuracy,
          heading: cleanHeading,
          speed: cleanSpeed,
          updatedAt: updateTime,
          isSharing: true,
        };

        // Persist latest location to MongoDB
        await Promise.all([
          Technician.findByIdAndUpdate(socket.technicianId, {
            $set: {
              'currentLocation.latitude': locationData.latitude,
              'currentLocation.longitude': locationData.longitude,
              'currentLocation.accuracy': locationData.accuracy,
              'currentLocation.heading': locationData.heading,
              'currentLocation.speed': locationData.speed,
              'currentLocation.updatedAt': locationData.updatedAt,
              'currentLocation.activeBookingId': booking._id,
              'currentLocation.isSharing': true,
            },
          }),
          Booking.findByIdAndUpdate(booking._id, {
            $set: {
              'lastLocation.latitude': locationData.latitude,
              'lastLocation.longitude': locationData.longitude,
              'lastLocation.accuracy': locationData.accuracy,
              'lastLocation.heading': locationData.heading,
              'lastLocation.speed': locationData.speed,
              'lastLocation.updatedAt': locationData.updatedAt,
              'lastLocation.isSharing': true,
            },
          }),
        ]);

        socket.join(`booking:${booking._id.toString()}`);

        const broadcastPayload = {
          bookingId: booking._id.toString(),
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          accuracy: locationData.accuracy,
          heading: locationData.heading,
          speed: locationData.speed,
          timestamp: locationData.updatedAt.toISOString(),
        };

        // Stream authorized coordinates strictly to the booking room
        io.to(`booking:${booking._id.toString()}`).emit('location:updated', broadcastPayload);

        if (typeof ack === 'function') {
          ack({ success: true, location: broadcastPayload });
        }
      } catch (err) {
        console.error('[Socket location:update Error]', err);
        const msg = 'Internal error updating location.';
        if (typeof ack === 'function') ack({ success: false, error: msg });
        socket.emit('location:error', { message: msg });
      }
    });

    /**
     * Event: location:share_stop
     * Technician explicitly stops sharing GPS location.
     */
    socket.on('location:share_stop', async (payload, ack) => {
      try {
        const bookingId = payload?.bookingId;
        if (!bookingId || !mongoose.Types.ObjectId.isValid(bookingId)) {
          const msg = 'Invalid or missing booking ID.';
          if (typeof ack === 'function') ack({ success: false, error: msg });
          return;
        }

        activeTrackingSessions.delete(socket.id);

        if (socket.technicianId) {
          await Promise.all([
            Technician.findByIdAndUpdate(socket.technicianId, {
              $set: {
                'currentLocation.isSharing': false,
                'currentLocation.activeBookingId': null,
              },
            }),
            Booking.findByIdAndUpdate(bookingId, {
              $set: { 'lastLocation.isSharing': false },
            }),
          ]);
        }

        const stopPayload = {
          bookingId: bookingId.toString(),
          isSharing: false,
          reason: 'technician_stopped',
        };

        io.to(`booking:${bookingId.toString()}`).emit('location:sharing_stopped', stopPayload);

        if (typeof ack === 'function') {
          ack({ success: true, ...stopPayload });
        }
      } catch (err) {
        console.error('[Socket location:share_stop Error]', err);
      }
    });

    socket.on('disconnect', async () => {
      lastLocationUpdateMap.delete(socket.id);

      const session = activeTrackingSessions.get(socket.id);
      if (session) {
        activeTrackingSessions.delete(socket.id);
        try {
          if (session.technicianId) {
            await Promise.all([
              Technician.findByIdAndUpdate(session.technicianId, {
                $set: {
                  'currentLocation.isSharing': false,
                  'currentLocation.activeBookingId': null,
                },
              }),
              Booking.findByIdAndUpdate(session.bookingId, {
                $set: { 'lastLocation.isSharing': false },
              }),
            ]);
          }

          io.to(`booking:${session.bookingId}`).emit('location:sharing_stopped', {
            bookingId: session.bookingId,
            isSharing: false,
            reason: 'technician_disconnected',
          });
        } catch (err) {
          console.error('[Socket Disconnect Location Cleanup Error]', err);
        }
      }
    });
  });

  ioInstance = io;
  return io;
}

/**
 * Access the initialized Socket.IO instance
 */
function getIO() {
  return ioInstance;
}

/**
 * Broadcast booking status change after database commit
 */
function emitBookingStatusUpdated({ bookingId, previousStatus, status, booking, technicianId, customerId }) {
  if (!ioInstance) return;

  const payload = {
    bookingId: bookingId.toString(),
    previousStatus: previousStatus || undefined,
    status,
    updatedAt: new Date().toISOString(),
    booking: safeBookingSummary(booking),
  };

  // Chain rooms together: Socket.IO automatically deduplicates sockets present in multiple rooms
  let target = ioInstance.to(`booking:${bookingId}`).to('admin:bookings');
  if (customerId) {
    target = target.to(`customer:${customerId.toString()}`);
  }
  if (technicianId) {
    target = target.to(`technician:${technicianId.toString()}`);
  }

  target.emit('booking:status_updated', payload);

  // Phase 8: If status transitioned to an ineligible tracking status (e.g. SERVICE_STARTED, COMPLETED, CANCELLED),
  // automatically stop active location sharing for this booking
  if (!ACTIVE_TRACKING_STATUSES.includes(status)) {
    ioInstance.to(`booking:${bookingId}`).emit('location:sharing_stopped', {
      bookingId: bookingId.toString(),
      isSharing: false,
      reason: `booking_${status.toLowerCase()}`,
    });

    Booking.findByIdAndUpdate(bookingId, {
      $set: { 'lastLocation.isSharing': false },
    }).catch(() => {});

    if (technicianId) {
      Technician.findByIdAndUpdate(technicianId, {
        $set: { 'currentLocation.isSharing': false, 'currentLocation.activeBookingId': null },
      }).catch(() => {});
    }
  }
}

/**
 * Broadcast new booking creation after database commit
 */
function emitBookingCreated({ booking, technicianId, customerId }) {
  if (!ioInstance) return;

  const safe = safeBookingSummary(booking);
  const payload = {
    bookingId: booking._id.toString(),
    booking: safe,
    createdAt: new Date().toISOString(),
  };

  // Broadcast to admin stream and customer room with deduplication
  let target = ioInstance.to('admin:bookings');
  if (customerId) {
    target = target.to(`customer:${customerId.toString()}`);
  }
  target.emit('booking:created', payload);

  // If an eligible technician was assigned, dispatch request to their private room
  if (technicianId) {
    ioInstance.to(`technician:${technicianId.toString()}`).emit('booking:new_request', {
      bookingId: booking._id.toString(),
      booking: safe,
    });
  }
}

/**
 * Notify technician when a booking is removed from their assignment (e.g. on rejection)
 */
function emitBookingRemovedFromTech({ technicianId, bookingId }) {
  if (!ioInstance || !technicianId) return;

  ioInstance.to(`technician:${technicianId.toString()}`).emit('booking:removed', {
    bookingId: bookingId.toString(),
  });

  // Phase 8: Also notify booking room that location sharing is stopped due to reassignment
  ioInstance.to(`booking:${bookingId.toString()}`).emit('location:sharing_stopped', {
    bookingId: bookingId.toString(),
    isSharing: false,
    reason: 'technician_reassigned',
  });

  Booking.findByIdAndUpdate(bookingId, {
    $set: { 'lastLocation.isSharing': false },
  }).catch(() => {});
}

module.exports = {
  initSocket,
  getIO,
  safeBookingSummary,
  emitBookingStatusUpdated,
  emitBookingCreated,
  emitBookingRemovedFromTech,
};
