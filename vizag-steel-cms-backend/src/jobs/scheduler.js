const Complaint = require('../modules/complaints/complaint.model');
const User = require('../modules/auth/user.model');
const { createNotification } = require('../modules/notifications/notification.service');
const { emitToRoom } = require('../sockets/socketManager');
const logger = require('../utils/logger');

/**
 * Check all active complaints for SLA breaches and send warnings.
 * Run this every 30–60 minutes via a setInterval or node-cron.
 */
const checkSlaBreaches = async () => {
  try {
    const now = new Date();

    // Find complaints approaching SLA (within 2 hours) but not yet breached
    const approaching = await Complaint.find({
      slaBreached: false,
      slaDeadline: { $lte: new Date(now.getTime() + 2 * 60 * 60 * 1000), $gt: now },
      status: { $nin: ['resolved', 'verified', 'closed', 'rejected'] },
      isArchived: false,
    });

    for (const complaint of approaching) {
      const hoursLeft = Math.round((complaint.slaDeadline - now) / (1000 * 60 * 60));
      const supervisors = await User.find({
        role: 'supervisor',
        department: complaint.assignedDept,
        isActive: true,
      });

      for (const supervisor of supervisors) {
        await createNotification({
          recipient: supervisor._id,
          title: '⏰ SLA Warning',
          body: `Complaint #${complaint.complaintNumber} will breach SLA in ${hoursLeft} hour(s).`,
          type: 'SLA_WARNING',
          relatedComplaint: complaint._id,
          channels: { inApp: true, push: true },
        });
      }
    }

    // Find newly breached complaints (past deadline, not yet marked)
    const breached = await Complaint.find({
      slaBreached: false,
      slaDeadline: { $lt: now },
      status: { $nin: ['resolved', 'verified', 'closed', 'rejected'] },
      isArchived: false,
    });

    if (breached.length > 0) {
      await Complaint.updateMany(
        { _id: { $in: breached.map((c) => c._id) } },
        { $set: { slaBreached: true } }
      );

      emitToRoom('admin:broadcast', 'sla:breached', {
        count: breached.length,
        complaintIds: breached.map((c) => c._id),
      });

      logger.info(`SLA check: ${approaching.length} approaching, ${breached.length} newly breached`);
    }
  } catch (err) {
    logger.error('SLA check failed:', err.message);
  }
};

// Auto-archive closed complaints older than 30 days
const archiveOldComplaints = async () => {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);

    const result = await Complaint.updateMany(
      {
        status: 'closed',
        closedAt: { $lt: cutoff },
        isArchived: false,
      },
      { $set: { isArchived: true, archivedAt: new Date() } }
    );

    if (result.modifiedCount > 0) {
      logger.info(`Archived ${result.modifiedCount} old closed complaints`);
    }
  } catch (err) {
    logger.error('Archive job failed:', err.message);
  }
};

const startScheduler = () => {
  // SLA check every 30 minutes
  setInterval(checkSlaBreaches, 30 * 60 * 1000);

  // Archive job once daily (24h)
  setInterval(archiveOldComplaints, 24 * 60 * 60 * 1000);

  // Run immediately on start
  checkSlaBreaches();
  archiveOldComplaints();

  logger.info('Scheduler started: SLA checks every 30min, archive daily');
};

module.exports = { startScheduler, checkSlaBreaches, archiveOldComplaints };
