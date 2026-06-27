const Redis = require('ioredis');
const logger = require('../utils/logger');

let redisClient = null;

const getRedisClient = () => {
  if (!redisClient) {
    // 1. If REDIS_URL is provided (e.g., Upstash production)
    if (process.env.REDIS_URL) {
      // Upstash 'rediss://' URLs require an explicit TLS configuration block
      const isTls = process.env.REDIS_URL.startsWith('rediss://');

      redisClient = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: null, // Fixes BullMQ deprecation warning
        tls: isTls ? { rejectUnauthorized: false } : undefined,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
      });
    } 
    // 2. Fallback to individual variables (e.g., Local development or Render Redis)
    else {
      const redisPassword = process.env.REDIS_PASSWORD && process.env.REDIS_PASSWORD !== 'undefined' 
        ? process.env.REDIS_PASSWORD 
        : undefined;

      redisClient = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: redisPassword,
        maxRetriesPerRequest: null, // Fixes BullMQ deprecation warning
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
      });
    }

    // Attach listeners to the created instance
    redisClient.on('connect', () => logger.info('Redis connected successfully'));
    redisClient.on('error', (err) => logger.error('Redis error:', err));
  }
  return redisClient;
};

module.exports = { getRedisClient };