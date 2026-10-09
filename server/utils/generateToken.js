const jwt = require('jsonwebtoken');

/**
 * Generate a signed JWT for an authenticated user
 * @param {string} id - MongoDB ObjectId of user
 * @param {'CUSTOMER' | 'TECHNICIAN' | 'ADMIN'} role - User role
 * @returns {string} - Signed JWT
 */
const generateToken = (id, role) => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('FATAL: JWT_SECRET environment variable is not defined. Authentication cannot proceed safely.');
  }

  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  return jwt.sign(
    {
      id,
      role,
    },
    secret,
    {
      expiresIn,
    }
  );
};

module.exports = generateToken;

