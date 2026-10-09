const mongoose = require('mongoose');

/**
 * Connect to MongoDB database
 * Uses MONGODB_URI from environment variables
 */
const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/homeserve';

  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of hanging indefinitely
    });

    console.log(`[MongoDB] Connected successfully: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    console.error(`[MongoDB] Connection error: ${error.message}`);
    console.warn('[MongoDB] Server will continue running, but database features will be unavailable until connected.');
  }
};

/**
 * Helper to check current database status
 * @returns {'connected' | 'connecting' | 'disconnected' | 'disconnecting' | 'unknown'}
 */
const getDatabaseStatus = () => {
  const stateMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  return stateMap[mongoose.connection.readyState] || 'unknown';
};

module.exports = {
  connectDB,
  getDatabaseStatus,
};

