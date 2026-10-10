/**
 * server/config/validateEnv.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Validates critical environment variables at server startup.
 * Prevents insecure defaults, missing JWT secrets, or unconfigured databases.
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

function validateEnv() {
  const errors = [];

  // 1. JWT Secret validation
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    errors.push('JWT_SECRET is required but not defined in environment variables.');
  } else if (jwtSecret.length < 16) {
    errors.push('JWT_SECRET is too short. It must be at least 16 characters for security.');
  }

  // 2. Database connection URI validation
  const mongoUri =
    process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGODB_TEST_URI;
  if (!mongoUri) {
    errors.push('MONGODB_URI or MONGO_URI is required to connect to the database.');
  }

  if (errors.length > 0) {
    console.error('====================================================');
    console.error(' [FATAL] Environment Configuration Security Error:');
    errors.forEach((err) => console.error(`  - ${err}`));
    console.error('====================================================');

    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
  }

  return {
    jwtSecretValid: Boolean(jwtSecret && jwtSecret.length >= 16),
    mongoUriConfigured: Boolean(mongoUri),
  };
}

module.exports = { validateEnv };
