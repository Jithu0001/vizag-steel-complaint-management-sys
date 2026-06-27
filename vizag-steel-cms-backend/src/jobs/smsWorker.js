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
    messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
    to,
  });
};

const startWorker = () => {
  try {
    const worker = new Worker(
      'sms',
      async (job) => {
        logger.info(`Processing SMS job ID ${job.id}...`);
        const { to, message } = job.data; 
        
        if (!to || !message) {
          throw new Error('Missing target "to" phone number or "message" text body inside job data payload');
        }

        await sendSms(to, message);
      },
      { connection: getRedisClient() }
    );

    worker.on('active', (job) => logger.info(`📱 SMS job ${job.id} is now active!`));
    worker.on('completed', (job) => logger.info(`✅ SMS job ${job.id} sent successfully!`));
    worker.on('failed', (job, err) => logger.error(`❌ SMS job ${job?.id} failed:`, err.message));

    logger.info('SMS worker started');
    return worker;
  } catch (err) {
    logger.warn('Failed to start SMS worker:', err.message);
  }
};

module.exports = { sendSms, startWorker };