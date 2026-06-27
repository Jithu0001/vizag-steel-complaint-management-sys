const mongoose = require('mongoose');
const logger = require('../utils/logger');
require('dotenv').config({ path: '../.env.example' }); // Adjust path if needed
const connectDB = async () => {
  try {
    // 1. Temporary Debug Line: This will prove if your env variables are loaded
    logger.info(`Attempting connection with URI: ${process.env.MONGO_URI}`);

    // 2. Cleaned up connection (Removed deprecated options)
    const conn = await mongoose.connect(process.env.MONGO_URI);

    logger.info(`MongoDB connected: ${conn.connection.host}`);

    // Event listeners
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Attempting to reconnect...');
    });

  } catch (error) {
    logger.error('MongoDB connection failed:', error);
    process.exit(1);
  }
};

module.exports = connectDB;