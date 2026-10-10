const User = require('../models/user.model');
const generateToken = require('../utils/generateToken');

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;

    // 1. Type and content validation
    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Full name is required and must be text.',
      });
    }

    if (name.trim().length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Name cannot exceed 100 characters.',
      });
    }

    if (typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required and must be text.',
      });
    }

    if (email.trim().length > 254) {
      return res.status(400).json({
        success: false,
        message: 'Email address cannot exceed 254 characters.',
      });
    }

    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.',
      });
    }

    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password is required and must be at least 6 characters long.',
      });
    }

    if (password.length > 128) {
      return res.status(400).json({
        success: false,
        message: 'Password cannot exceed 128 characters.',
      });
    }

    // 2. Security Check: Disallow public registration as ADMIN or invalid roles
    if (role) {
      if (typeof role !== 'string' || role.toUpperCase() === 'ADMIN') {
        return res.status(400).json({
          success: false,
          message: 'Self-registration as ADMIN is strictly prohibited.',
        });
      }
      if (!['CUSTOMER', 'TECHNICIAN'].includes(role.toUpperCase())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role specified. Permitted roles are CUSTOMER or TECHNICIAN.',
        });
      }
    }

    // 3. Determine role: CUSTOMER (default) or TECHNICIAN
    let assignedRole = 'CUSTOMER';
    if (role && role.toUpperCase() === 'TECHNICIAN') {
      assignedRole = 'TECHNICIAN';
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 4. Check for duplicate email
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists. Please log in instead.',
      });
    }

    // 5. Create user (password will be hashed by userSchema pre-save hook)
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      phone: phone ? phone.trim() : '',
      role: assignedRole,
    });

    // 6. Generate JWT
    const token = generateToken(user._id, user.role);

    // 7. Respond with safe user profile (password excluded by toJSON)
    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        profileImage: user.profileImage,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join('. '),
      });
    }

    // Handle MongoDB duplicate key error (code 11000)
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.',
      });
    }

    console.error('[Register Error]', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error during registration.',
    });
  }
};

/**
 * @desc    Authenticate user & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Validation
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.',
      });
    }

    if (email.length > 254 || password.length > 128) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email or password length.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 2. Check for user and explicitly select password field
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // 3. Compare password using bcrypt
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // 4. Generate JWT
    const token = generateToken(user._id, user.role);

    // 5. Return token and safe user profile (never password)
    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        profileImage: user.profileImage,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('[Login Error]', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error during login.',
    });
  }
};

/**
 * @desc    Get currently logged in user profile
 * @route   GET /api/auth/me
 * @access  Private (Requires Bearer Token)
 */
const getMe = async (req, res) => {
  try {
    // req.user was populated by protect middleware
    return res.status(200).json({
      success: true,
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        phone: req.user.phone,
        role: req.user.role,
        profileImage: req.user.profileImage,
        createdAt: req.user.createdAt,
        updatedAt: req.user.updatedAt,
      },
    });
  } catch (error) {
    console.error('[GetMe Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error fetching user profile.',
    });
  }
};

module.exports = {
  register,
  login,
  getMe,
};

