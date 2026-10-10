/**
 * adminAnalytics.controller.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Controller for HomeServe Admin Analytics & Reporting (Phase 12).
 *
 * Responsibilities:
 *   • Overview KPIs (total customers, technicians, bookings, services, reviews, avg rating)
 *   • Time-series booking trends for ranges (7, 30, 90 days) with continuous zero-filled daily records
 *   • Distribution breakdowns (booking status, technician verification status)
 *   • Recent activity feeds (bookings and reviews) with safe field projections (no PII exposure)
 *   • Strictly protected by ADMIN role authentication
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const User = require('../models/user.model');
const Technician = require('../models/technician.model');
const Booking = require('../models/booking.model');
const Service = require('../models/service.model');
const Review = require('../models/review.model');
const { BOOKING_STATUSES } = require('../models/booking.model');

/**
 * Helper to compute continuous daily trends within a UTC range.
 * Guarantees every day in the range is present with 0 values if no bookings occurred.
 *
 * @param {number} days
 * @returns {Promise<{dailyTrends: Array, start: Date, end: Date}>}
 */
async function computeDailyBookingTrends(days = 30) {
  const validDays = [7, 30, 90].includes(Number(days)) ? Number(days) : 30;

  const now = new Date();
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999)
  );
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (validDays - 1), 0, 0, 0, 0)
  );

  const trendsAgg = await Booking.aggregate([
    {
      $match: {
        createdAt: { $gte: start, $lte: end },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        total: { $sum: 1 },
        completed: {
          $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] },
        },
        cancelled: {
          $sum: { $cond: [{ $eq: ['$status', 'CANCELLED'] }, 1, 0] },
        },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const dateMap = {};
  trendsAgg.forEach((item) => {
    if (item._id) {
      dateMap[item._id] = item;
    }
  });

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  const dailyTrends = [];
  const curr = new Date(start);

  while (curr <= end) {
    const y = curr.getUTCFullYear();
    const m = String(curr.getUTCMonth() + 1).padStart(2, '0');
    const d = String(curr.getUTCDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    const label = `${monthNames[curr.getUTCMonth()]} ${curr.getUTCDate()}`;

    const existing = dateMap[dateStr];
    dailyTrends.push({
      date: dateStr,
      label,
      total: existing ? existing.total : 0,
      completed: existing ? existing.completed : 0,
      cancelled: existing ? existing.cancelled : 0,
    });

    curr.setUTCDate(curr.getUTCDate() + 1);
  }

  return { dailyTrends, start, end, days: validDays };
}

/**
 * GET /api/admin/analytics/overview
 * Comprehensive dashboard analytics including KPIs, distributions, trends, and recent activity.
 */
const getAnalyticsOverview = async (req, res) => {
  try {
    const days = parseInt(req.query.days, 10) || 30;

    // Parallel aggregate queries for speed and efficiency
    const [
      totalCustomers,
      totalTechnicians,
      pendingApprovals,
      approvedTechnicians,
      rejectedTechnicians,
      totalBookings,
      statusAgg,
      totalServices,
      activeServices,
      totalReviews,
      ratingAgg,
      trendData,
      recentBookingsDocs,
      recentReviewsDocs,
    ] = await Promise.all([
      User.countDocuments({ role: 'CUSTOMER' }),
      Technician.countDocuments(),
      Technician.countDocuments({ verificationStatus: 'PENDING' }),
      Technician.countDocuments({ verificationStatus: 'APPROVED' }),
      Technician.countDocuments({ verificationStatus: 'REJECTED' }),
      Booking.countDocuments(),
      Booking.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Service.countDocuments(),
      Service.countDocuments({ isActive: true }),
      Review.countDocuments(),
      Review.aggregate([
        { $group: { _id: null, avgRating: { $avg: '$rating' } } },
      ]),
      computeDailyBookingTrends(days),
      Booking.find()
        .sort({ createdAt: -1 })
        .limit(6)
        .populate('customerId', 'name')
        .populate('serviceId', 'name')
        .select('serviceName status scheduledDate scheduledTime urgency createdAt customerId serviceId')
        .lean(),
      Review.find()
        .sort({ createdAt: -1 })
        .limit(6)
        .populate('customerId', 'name')
        .populate({
          path: 'technicianId',
          populate: { path: 'userId', select: 'name' },
        })
        .select('rating comment createdAt customerId technicianId')
        .lean(),
    ]);

    // Format booking status distribution
    const statusMap = {};
    (BOOKING_STATUSES || []).forEach((status) => {
      statusMap[status] = 0;
    });
    statusAgg.forEach((item) => {
      if (item._id) {
        statusMap[item._id] = item.count;
      }
    });

    const bookingStatusDistribution = (BOOKING_STATUSES || []).map((status) => ({
      status,
      count: statusMap[status] || 0,
    }));

    // Technician verification status distribution
    const technicianStatusDistribution = [
      { status: 'APPROVED', label: 'Approved', count: approvedTechnicians },
      { status: 'PENDING', label: 'Pending Approval', count: pendingApprovals },
      { status: 'REJECTED', label: 'Rejected', count: rejectedTechnicians },
    ];

    // Compute average rating safely (handles 0 reviews)
    const avgRating =
      ratingAgg.length > 0 && ratingAgg[0].avgRating != null
        ? Math.round(ratingAgg[0].avgRating * 10) / 10
        : 0;

    // Safe formatting for recent bookings (strict no-PII exposure)
    const recentBookings = recentBookingsDocs.map((b) => ({
      id: b._id,
      serviceName: b.serviceName || b.serviceId?.name || 'Service',
      customerName: b.customerId?.name || 'Customer',
      status: b.status,
      scheduledDate: b.scheduledDate,
      scheduledTime: b.scheduledTime,
      urgency: b.urgency,
      createdAt: b.createdAt,
    }));

    // Safe formatting for recent reviews (strict no-PII exposure)
    const recentReviews = recentReviewsDocs.map((r) => ({
      id: r._id,
      rating: r.rating,
      comment: r.comment || '',
      customerName: r.customerId?.name || 'Anonymous Customer',
      technicianName: r.technicianId?.userId?.name || 'Technician',
      createdAt: r.createdAt,
    }));

    return res.status(200).json({
      success: true,
      data: {
        overview: {
          totalCustomers,
          totalTechnicians,
          pendingApprovals,
          approvedTechnicians,
          rejectedTechnicians,
          totalBookings,
          completedBookings: statusMap.COMPLETED || 0,
          cancelledBookings: statusMap.CANCELLED || 0,
          totalServices,
          activeServices,
          totalReviews,
          averageRating: avgRating,
        },
        bookingStatusDistribution,
        technicianStatusDistribution,
        trends: trendData.dailyTrends,
        recentActivity: {
          bookings: recentBookings,
          reviews: recentReviews,
        },
        range: {
          days: trendData.days,
          startDate: trendData.start.toISOString(),
          endDate: trendData.end.toISOString(),
        },
      },
    });
  } catch (error) {
    console.error('[AdminAnalytics] getAnalyticsOverview error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve analytics overview.',
      error: error.message,
    });
  }
};

/**
 * GET /api/admin/analytics/trends
 * Filterable booking trends endpoint by date range (7, 30, 90 days).
 */
const getBookingTrends = async (req, res) => {
  try {
    const days = parseInt(req.query.days, 10) || 30;
    const trendData = await computeDailyBookingTrends(days);

    return res.status(200).json({
      success: true,
      data: {
        days: trendData.days,
        startDate: trendData.start.toISOString(),
        endDate: trendData.end.toISOString(),
        trends: trendData.dailyTrends,
      },
    });
  } catch (error) {
    console.error('[AdminAnalytics] getBookingTrends error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve booking trends.',
      error: error.message,
    });
  }
};

/**
 * GET /api/admin/analytics/recent
 * Paginated or limited recent activity feed (bookings and reviews).
 */
const getRecentActivity = async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);

    const [recentBookingsDocs, recentReviewsDocs] = await Promise.all([
      Booking.find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('customerId', 'name')
        .populate('serviceId', 'name')
        .select('serviceName status scheduledDate scheduledTime urgency createdAt customerId serviceId')
        .lean(),
      Review.find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('customerId', 'name')
        .populate({
          path: 'technicianId',
          populate: { path: 'userId', select: 'name' },
        })
        .select('rating comment createdAt customerId technicianId')
        .lean(),
    ]);

    const bookings = recentBookingsDocs.map((b) => ({
      id: b._id,
      serviceName: b.serviceName || b.serviceId?.name || 'Service',
      customerName: b.customerId?.name || 'Customer',
      status: b.status,
      scheduledDate: b.scheduledDate,
      scheduledTime: b.scheduledTime,
      urgency: b.urgency,
      createdAt: b.createdAt,
    }));

    const reviews = recentReviewsDocs.map((r) => ({
      id: r._id,
      rating: r.rating,
      comment: r.comment || '',
      customerName: r.customerId?.name || 'Anonymous Customer',
      technicianName: r.technicianId?.userId?.name || 'Technician',
      createdAt: r.createdAt,
    }));

    return res.status(200).json({
      success: true,
      data: {
        bookings,
        reviews,
      },
    });
  } catch (error) {
    console.error('[AdminAnalytics] getRecentActivity error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve recent activity.',
      error: error.message,
    });
  }
};

module.exports = {
  getAnalyticsOverview,
  getBookingTrends,
  getRecentActivity,
};
