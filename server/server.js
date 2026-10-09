const http = require('http');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { connectDB } = require('./config/db');
const { initSocket } = require('./sockets');

// Load environment variables from .env file
dotenv.config();

// Initialize Express application and HTTP server
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware: Cross-Origin Resource Sharing (CORS)
const allowedOrigin = process.env.CLIENT_URL || 'http://localhost:5173';
app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
  })
);

// Initialize Socket.IO with HTTP server
const io = initSocket(server, allowedOrigin);
app.set('io', io);

// Middleware: JSON Body Parser
app.use(express.json());

// Routes
const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const serviceRoutes = require('./routes/service.routes');
const technicianRoutes = require('./routes/technician.routes');
const adminTechnicianRoutes = require('./routes/adminTechnician.routes');
const bookingRoutes = require('./routes/booking.routes');

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/technicians', technicianRoutes);
app.use('/api/admin', adminTechnicianRoutes);
app.use('/api/bookings', bookingRoutes);

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

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('[ServerError]', err.stack || err.message);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Start the server (both Express and Socket.IO on same port)
server.listen(PORT, () => {
  console.log(`========================================`);
  console.log(` HomeServe API Server running on port ${PORT}`);
  console.log(` Health check URL: http://localhost:${PORT}/api/health`);
  console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`========================================`);
});

app.server = server;
module.exports = app;

