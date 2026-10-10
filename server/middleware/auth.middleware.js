const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

/**
 * Protect middleware:
 * Verifies Bearer JWT, loads the active user, and attaches to req.user
 */
const protect = async (req, res, next) => {
  let token;

  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  // Check if token exists
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No authentication token provided.',
    });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({
      success: false,
      message: 'Server security configuration error: JWT_SECRET is not configured.',
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, secret);

    if (!decoded || !decoded.id || !require('mongoose').Types.ObjectId.isValid(decoded.id)) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token claims.',
      });
    }

    // Find user by ID (exclude password)
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid session. The user belonging to this token no longer exists.',
      });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Authentication session expired. Please log in again.',
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid authentication token. Authorization failed.',
    });
  }
};

/**
 * Role-Based Access Control (RBAC) middleware:
 * Restricts access to users holding specific roles
 * @param  {...string} roles - Permitted roles (e.g. 'ADMIN', 'TECHNICIAN')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required before checking permissions.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden. Role '${req.user.role}' is not authorized to access this resource.`,
      });
    }

    next();
  };
};

module.exports = {
  protect,
  authorize,
};

