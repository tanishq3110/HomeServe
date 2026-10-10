const http = require('http');
const express = require('express');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

// Startup validation of critical environment variables
const { validateEnv } = require('./config/validateEnv');
validateEnv();

const { connectDB } = require('./config/db');
const { initSocket } = require('./sockets');
const {
  helmetMiddleware,
  corsMiddleware,
  apiLimiter,
  jsonErrorHandler,
  noSqlSanitizer,
} = require('./middleware/security.middleware');

// Initialize Express application and HTTP server
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// 1. Helmet HTTP Security Headers
app.use(helmetMiddleware);

// 2. Cross-Origin Resource Sharing (CORS) with explicit allowlist
app.use(corsMiddleware);

// Initialize Socket.IO with HTTP server
const allowedOrigin = process.env.CLIENT_URL || 'http://localhost:5173';
const io = initSocket(server, allowedOrigin);
app.set('io', io);

// 3. Request Body Parser with payload size limit (50KB) to prevent memory exhaustion DoS
app.use(express.json({ limit: '50kb' }));

// 4. Malformed JSON and Payload Size Error Handling
app.use(jsonErrorHandler);

// 5. NoSQL Query Injection Sanitization
app.use(noSqlSanitizer);

// 6. Rate Limiting for General API routes
app.use('/api', apiLimiter);

// Routes
const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const serviceRoutes = require('./routes/service.routes');
const technicianRoutes = require('./routes/technician.routes');
const adminTechnicianRoutes = require('./routes/adminTechnician.routes');
const adminAnalyticsRoutes = require('./routes/adminAnalytics.routes');
const bookingRoutes = require('./routes/booking.routes');
const reviewRoutes = require('./routes/review.routes');

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/technicians', technicianRoutes);
app.use('/api/admin/analytics', adminAnalyticsRoutes);
app.use('/api/admin', adminTechnicianRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/reviews', reviewRoutes);

// Root route for quick verification
app.get('/', (req, res) => {
  res.json({
    name: 'HomeServe API',
    version: '1.0.0',
    status: 'active',
    healthCheck: '/api/health',
  });
});

// 404 Handler for unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl} - Route not found`,
  });
});

// Global error handling middleware (Never leaks stack traces, secrets or DB internals)
app.use((err, req, res, next) => {
  const safeMessage = err.message || 'Internal server error';

  if (process.env.NODE_ENV !== 'test') {
    console.error('[ServerError]', safeMessage);
  }

  // Handle Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid resource ID format.',
    });
  }

  // Handle Mongoose ValidationError
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors || {}).map((e) => e.message);
    return res.status(400).json({
      success: false,
      message: messages.join('. ') || 'Database validation failed.',
    });
  }

  // Handle CORS rejection
  if (err.message && err.message.startsWith('CORS blocked')) {
    return res.status(403).json({
      success: false,
      message: err.message,
    });
  }

  const statusCode = err.status || err.statusCode || 500;
  return res.status(statusCode).json({
    success: false,
    message:
      statusCode === 500 && process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : safeMessage,
  });
});

// Start the server (both Express and Socket.IO on same port)
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`========================================`);
    console.log(` HomeServe API Server running on port ${PORT}`);
    console.log(` Health check URL: http://localhost:${PORT}/api/health`);
    console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`========================================`);
  });
}

app.server = server;
module.exports = app;
