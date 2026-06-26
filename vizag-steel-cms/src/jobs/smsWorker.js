const { Worker } = require('bullmq');
const { getRedisClient } = require('../config/redis');
const logger = require('../utils/logger');

let twilioClient;

const getTwilioClient = () => {
  if (!twilioClient) {
    const twilio = require('twilio');
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return twilioClient;
};

const sendSms = async (to, body) => {
  const client = getTwilioClient();
  await client.messages.create({
    body,
    from: process.env.TWILIO_PHONE,
    to,
  });
};

const startWorker = () => {
  try {
    const worker = new Worker(
      'sms',
      async (job) => {
        const { phone, message } = job.data;
        await sendSms(phone, message);
        logger.info(`SMS sent to ${phone}`);
      },
      { connection: getRedisClient() }
    );

    worker.on('failed', (job, err) => {
      logger.error(`SMS job ${job?.id} failed:`, err.message);
    });

    logger.info('SMS worker started');
    return worker;
  } catch (err) {
    logger.warn('Failed to start SMS worker:', err.message);
  }
};

module.exports = { sendSms, startWorker };
