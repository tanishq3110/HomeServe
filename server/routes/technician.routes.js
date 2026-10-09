const express = require('express');
const router = express.Router();
const {
  getMyProfile,
  createProfile,
  updateProfile,
  toggleAvailability,
} = require('../controllers/technician.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// All routes require authentication and TECHNICIAN role
router.use(protect);
router.use(authorize('TECHNICIAN'));

/**
 * GET /api/technicians/me
 * Returns own technician profile. Returns 404 with profileExists: false if not yet created.
 */
router.get('/me', getMyProfile);

/**
 * POST /api/technicians/profile
 * Create technician profile (onboarding step)
 */
router.post('/profile', createProfile);

/**
 * PUT /api/technicians/profile
 * Update own technician profile fields
 */
router.put('/profile', updateProfile);

/**
 * PATCH /api/technicians/availability
 * Toggle online/offline status. Only APPROVED technicians may go ONLINE.
 */
router.patch('/availability', toggleAvailability);

module.exports = router;
