const { Queue } = require('bullmq');
const { getRedisClient } = require('../config/redis');
const logger = require('../utils/logger');

let escalationQueue;
let emailQueue;
let smsQueue;
let pushQueue;

const getQueueOptions = () => ({
  connection: getRedisClient(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

const initQueues = async () => {
  try {
    const opts = getQueueOptions();

    escalationQueue = new Queue('escalation', opts);
    emailQueue = new Queue('email', opts);
    smsQueue = new Queue('sms', opts);
    pushQueue = new Queue('push', opts);

    // Start workers
    require('./escalationWorker').startWorker();
    require('./emailWorker').startWorker();
    require('./smsWorker').startWorker();
    require('./pushWorker').startWorker();

    logger.info('BullMQ queues and workers initialized');
  } catch (err) {
    logger.warn('BullMQ init failed (Redis unavailable):', err.message);
  }
};

const getQueues = () => ({ escalationQueue, emailQueue, smsQueue, pushQueue });

module.exports = { initQueues, getQueues };
