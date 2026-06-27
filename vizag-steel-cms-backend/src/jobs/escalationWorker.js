const { Worker, Queue } = require('bullmq');
const { getRedisClient } = require('../config/redis');
const Complaint = require('../modules/complaints/complaint.model');
const User = require('../modules/auth/user.model');
const { createNotification } = require('../modules/notifications/notification.service');
const { emitToRoom } = require('../sockets/socketManager');
const { getQueues } = require('./queueManager');
const { COMPLAINT_STATUS, ROLES } = require('../config/constants');
const logger = require('../utils/logger');

// Map: complaintId → jobId (for cancellation)
const jobMap = new Map();

/**
 * Schedule a 2-level escalation for a complaint:
 * Level 1 @ delayMs: notify supervisor
 * Level 2 @ delayMs * 2: notify super_admin
 */
const scheduleEscalation = async (complaintId, department, delayMs = 24 * 60 * 60 * 1000) => {
  try {
    const { escalationQueue } = getQueues();
    if (!escalationQueue) return;

    const job1 = await escalationQueue.add(
      'escalate-level-1',
      { complaintId, department, level: 1 },
      { delay: delayMs, jobId: `esc-l1-${complaintId}` }
    );

    const job2 = await escalationQueue.add(
      'escalate-level-2',
      { complaintId, department, level: 2 },
      { delay: delayMs * 2, jobId: `esc-l2-${complaintId}` }
    );

    jobMap.set(complaintId, [job1.id, job2.id]);
    logger.info(`Escalation scheduled for complaint ${complaintId}`);
  } catch (err) {
    logger.error('Failed to schedule escalation:', err.message);
  }
};

/**
 * Cancel escalation jobs when a complaint is resolved
 */
const cancelEscalation = async (complaintId) => {
  try {
    const { escalationQueue } = getQueues();
    if (!escalationQueue) return;

    await escalationQueue.remove(`esc-l1-${complaintId}`);
    await escalationQueue.remove(`esc-l2-${complaintId}`);
    jobMap.delete(complaintId);
    logger.info(`Escalation cancelled for complaint ${complaintId}`);
  } catch (err) {
    logger.warn('Failed to cancel escalation:', err.message);
  }
};

const startWorker = () => {
  try {
    const worker = new Worker(
      'escalation',
      async (job) => {
        const { complaintId, department, level } = job.data;

        const complaint = await Complaint.findById(complaintId).populate('raisedBy', 'name');
        if (!complaint) return;

        // Only escalate if still unresolved
        const resolved = [COMPLAINT_STATUS.RESOLVED, COMPLAINT_STATUS.VERIFIED, COMPLAINT_STATUS.CLOSED];
        if (resolved.includes(complaint.status)) {
          logger.info(`Complaint ${complaintId} already resolved. Skipping escalation.`);
          return;
        }

        // Mark as escalated
        complaint.status = COMPLAINT_STATUS.ESCALATED;
        complaint.escalationLevel = level;
        complaint.slaBreached = true;
        complaint.statusHistory.push({
          status: COMPLAINT_STATUS.ESCALATED,
          remark: `Auto-escalated at Level ${level} — SLA breached`,
        });
        await complaint.save();

        // Find who to notify
        const targetRole = level === 1 ? ROLES.SUPERVISOR : ROLES.SUPER_ADMIN;
        const targetFilter = level === 1
          ? { role: targetRole, department, isActive: true }
          : { role: targetRole, isActive: true };

        const targets = await User.find(targetFilter);

        for (const target of targets) {
          await createNotification({
            recipient: target._id,
            title: `⚠️ Complaint Escalated (Level ${level})`,
            body: `Complaint #${complaint.complaintNumber} has been escalated. SLA breached.`,
            type: 'ESCALATION',
            relatedComplaint: complaint._id,
            channels: { inApp: true, email: true, sms: true, push: true },
          });
        }

        // Real-time alert
        emitToRoom('admin:broadcast', 'complaint:escalated', {
          complaintId: complaint._id,
          complaintNumber: complaint.complaintNumber,
          level,
          department,
        });

        emitToRoom(`dept:${department}`, 'complaint:escalated', {
          complaintId: complaint._id,
          complaintNumber: complaint.complaintNumber,
          level,
        });

        logger.info(`Complaint ${complaintId} escalated to Level ${level}`);
      },
      { connection: getRedisClient() }
    );

    worker.on('failed', (job, err) => {
      logger.error(`Escalation job ${job?.id} failed:`, err.message);
    });

    logger.info('Escalation worker started');
    return worker;
  } catch (err) {
    logger.warn('Failed to start escalation worker:', err.message);
  }
};

module.exports = { scheduleEscalation, cancelEscalation, startWorker };
