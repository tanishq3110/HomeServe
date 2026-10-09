const { getDatabaseStatus } = require('../config/db');

/**
 * Health check controller
 * GET /api/health
 * Reports the API operational status and MongoDB connection status
 */
const getHealthStatus = (req, res) => {
  const dbStatus = getDatabaseStatus();

  return res.status(200).json({
    success: true,
    message: 'HomeServe API is running',
    database: dbStatus,
  });
};

module.exports = {
  getHealthStatus,
};

