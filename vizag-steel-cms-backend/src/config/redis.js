const Redis = require('ioredis');
const logger = require('../utils/logger');

let redisClient = null;

const getRedisClient = () => {
  if (!redisClient) {
    // Check if password exists and is not an empty string/placeholder
    const redisPassword = process.env.REDIS_PASSWORD && process.env.REDIS_PASSWORD !== 'undefined' 
      ? process.env.REDIS_PASSWORD 
      : undefined;

    redisClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: redisPassword, // Will be completely skipped if not configured
      
      // Fixes the BullMQ deprecation warning
      maxRetriesPerRequest: null, 

      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    redisClient.on('connect', () => logger.info('Redis connected'));
    redisClient.on('error', (err) => logger.error('Redis error:', err));
  }
  return redisClient;
};

module.exports = { getRedisClient };