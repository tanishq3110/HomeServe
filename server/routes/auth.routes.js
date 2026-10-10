const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');
const { authLimiter } = require('../middleware/security.middleware');

/**
 * @route   POST /api/auth/register
 * @desc    Register a new customer or technician
 * @access  Public
 */
router.post('/register', authLimiter, register);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user & get JWT token
 * @access  Public
 */
router.post('/login', authLimiter, login);

/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user profile
 * @access  Private
 */
router.get('/me', protect, getMe);

module.exports = router;

