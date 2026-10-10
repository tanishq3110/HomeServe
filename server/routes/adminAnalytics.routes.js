/**
 * adminAnalytics.routes.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Routes for Admin Analytics & Reporting (Phase 12).
 * All endpoints require valid JWT authentication and role 'ADMIN'.
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const express = require('express');
const router = express.Router();
const {
  getAnalyticsOverview,
  getBookingTrends,
  getRecentActivity,
} = require('../controllers/adminAnalytics.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// Enforce authentication and ADMIN role on all analytics routes
router.use(protect);
router.use(authorize('ADMIN'));

/**
 * GET /api/admin/analytics/overview
 * Overview metrics, trends, status distribution, and recent activity
 */
router.get('/overview', getAnalyticsOverview);

/**
 * GET /api/admin/analytics/trends
 * Time-series booking counts by date range (?days=7|30|90)
 */
router.get('/trends', getBookingTrends);

/**
 * GET /api/admin/analytics/recent
 * Safe recent activity feeds (?limit=10)
 */
router.get('/recent', getRecentActivity);

module.exports = router;
