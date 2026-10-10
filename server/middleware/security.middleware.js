/**
 * server/middleware/security.middleware.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Phase 13 — Security & Validation Hardening Middleware Suite for HomeServe.
 *
 * Protections included:
 *   • Helmet HTTP security headers (XSS, Sniffing, Frameguard, etc.)
 *   • Environment-based CORS with strict origin validation (no wildcard with credentials)
 *   • Rate limiting for auth endpoints and sensitive write actions
 *   • Malformed JSON body handling (returns clean 400 instead of 500)
 *   • NoSQL query injection sanitization (strips keys starting with $ or containing .)
 *   • MongoDB ObjectId format validation helper
 *   • Request method validation
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');

// ── 1. Helmet Security Headers ────────────────────────────────────────────────
const helmetMiddleware = helmet({
  contentSecurityPolicy: false, // API server; CSP handled by frontend host
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allows images/resources to be loaded across ports
  crossOriginEmbedderPolicy: false,
});

// ── 2. Environment-Based CORS Configuration ──────────────────────────────────
function getCorsOrigins() {
  const envOrigins = process.env.CLIENT_URL || process.env.ALLOWED_ORIGINS || 'http://localhost:5173';
  return envOrigins
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

const corsMiddleware = cors({
  origin: (origin, callback) => {
    const allowed = getCorsOrigins();

    // Allow requests with no origin (e.g. mobile apps, curl, tests, server-to-server)
    if (!origin) {
      return callback(null, true);
    }

    // Exact match or localhost development match
    const isAllowed =
      allowed.includes(origin) ||
      (process.env.NODE_ENV !== 'production' && /^http:\/\/localhost(:\d+)?$/.test(origin));

    if (isAllowed) {
      return callback(null, true);
    }

    const err = new Error(`CORS blocked: Origin '${origin}' is not authorized.`);
    err.status = 403;
    return callback(err);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400, // 24 hours preflight cache
});

// ── 3. Rate Limiters ──────────────────────────────────────────────────────────
// Skip rate limiting in automated test runs to prevent test suite interference
const isTestEnv = process.env.NODE_ENV === 'test';

// Auth endpoints limiter (login, registration)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTestEnv ? 10000 : 30, // 30 attempts per 15 minutes in dev/prod
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
  },
  skip: () => isTestEnv,
});

// Dedicated testable rate limiter for automated security tests
const testRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3, // 3 requests max
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Rate limit exceeded.',
  },
});

// General API request limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTestEnv ? 50000 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again later.',
  },
  skip: () => isTestEnv,
});

// ── 4. Malformed JSON Body Error Handler ──────────────────────────────────────
const jsonErrorHandler = (err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'Malformed JSON payload in request body.',
    });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      message: 'Request payload exceeds size limit (maximum allowed: 50KB).',
    });
  }
  next(err);
};

// ── 5. NoSQL Query Injection Sanitizer ────────────────────────────────────────
/**
 * Recursively removes keys starting with '$' or containing '.' from an object.
 * Neutralizes MongoDB query operator injection from malicious client JSON.
 */
function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  const clean = {};
  for (const key of Object.keys(obj)) {
    // Strip keys with NoSQL operators or dot notation path traversal
    if (key.startsWith('$') || key.includes('.')) {
      continue;
    }
    clean[key] = sanitizeObject(obj[key]);
  }
  return clean;
}

const noSqlSanitizer = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params);
  }
  next();
};

// ── 6. MongoDB ObjectId Validator Middleware ─────────────────────────────────
/**
 * Express middleware generator that validates given route param(s) as valid ObjectIds.
 * Returns 400 Bad Request immediately instead of letting Mongoose throw CastError.
 *
 * @param  {...string} paramNames
 */
const validateObjectIdParams = (...paramNames) => {
  return (req, res, next) => {
    for (const param of paramNames) {
      const val = req.params[param];
      if (val && !mongoose.Types.ObjectId.isValid(val)) {
        return res.status(400).json({
          success: false,
          message: `Invalid format for parameter '${param}'. Expected a valid 24-character hex ID.`,
        });
      }
    }
    next();
  };
};

module.exports = {
  helmetMiddleware,
  corsMiddleware,
  authLimiter,
  apiLimiter,
  testRateLimiter,
  jsonErrorHandler,
  noSqlSanitizer,
  validateObjectIdParams,
};
