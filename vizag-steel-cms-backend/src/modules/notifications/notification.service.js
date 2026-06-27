const Notification = require('./notification.model');
const User = require('../auth/user.model');
const { emitToUser } = require('../../sockets/socketManager');
const { getQueues } = require('../../jobs/queueManager');
const logger = require('../../utils/logger');

/**
 * Create a notification and dispatch to requested channels
 */
const createNotification = async ({
  recipient,
  title,
  body,
  type,
  relatedComplaint = null,
  channels = { inApp: true, email: false, sms: false, push: false },
}) => {
  try {
    const notification = await Notification.create({
      recipient,
      title,
      body,
      type,
      relatedComplaint,
      channels,
    });

    // In-app: real-time via Socket.IO
    if (channels.inApp) {
      emitToUser(recipient.toString(), 'notification:new', {
        id: notification._id,
        title,
        body,
        type,
        relatedComplaint,
      });
    }

    // Email / SMS / Push via queues
    const { emailQueue, smsQueue, pushQueue } = getQueues();

    if (channels.email || channels.sms || channels.push) {
      const user = await User.findById(recipient);
      if (!user) return notification;

      if (channels.email && emailQueue) {
        await emailQueue.add('send-email', {
          to: user.email,
          templateName: getEmailTemplate(type),
          templateData: { recipientName: user.name, title, body },
        });
      }

      if (channels.sms && smsQueue) {
        await smsQueue.add('send-sms', {
          phone: user.phone,
          message: `[VSP-CMS] ${title}: ${body}`,
        });
      }

      if (channels.push && pushQueue && user.fcmToken) {
        await pushQueue.add('send-push', {
          fcmToken: user.fcmToken,
          title,
          body,
          data: { type, complaintId: relatedComplaint?.toString() || '' },
        });
      }
    }

    return notification;
  } catch (err) {
    logger.error('Failed to create notification:', err.message);
  }
};

const getEmailTemplate = (type) => {
  const map = {
    COMPLAINT_ASSIGNED: 'complaintAssigned',
    ESCALATION: 'escalation',
    STATUS_UPDATE: 'statusUpdate',
  };
  return map[type] || 'statusUpdate';
};

module.exports = { createNotification };
