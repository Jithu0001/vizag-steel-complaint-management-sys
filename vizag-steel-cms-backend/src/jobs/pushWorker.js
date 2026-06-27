const { Worker } = require('bullmq');
const { getRedisClient } = require('../config/redis');
const logger = require('../utils/logger');

let firebaseApp;

const getFirebaseApp = () => {
  if (!firebaseApp) {
    const admin = require('firebase-admin');
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
    });
  }
  return firebaseApp;
};

const sendPushNotification = async (fcmToken, title, body, data = {}) => {
  const admin = require('firebase-admin');
  getFirebaseApp();

  await admin.messaging().send({
    token: fcmToken,
    notification: { title, body },
    data: { ...data, timestamp: new Date().toISOString() },
    android: { priority: 'high' },
    apns: { payload: { aps: { sound: 'default' } } },
  });
};

const startWorker = () => {
  try {
    const worker = new Worker(
      'push',
      async (job) => {
        const { fcmToken, title, body, data } = job.data;
        if (!fcmToken) return; // User hasn't registered FCM token
        await sendPushNotification(fcmToken, title, body, data);
        logger.info(`Push notification sent [${title}]`);
      },
      { connection: getRedisClient() }
    );

    worker.on('failed', (job, err) => {
      logger.error(`Push job ${job?.id} failed:`, err.message);
    });

    logger.info('Push notification worker started');
    return worker;
  } catch (err) {
    logger.warn('Failed to start push worker:', err.message);
  }
};

module.exports = { sendPushNotification, startWorker };
