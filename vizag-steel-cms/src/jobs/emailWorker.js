const { Worker } = require('bullmq');
const nodemailer = require('nodemailer');
const { getRedisClient } = require('../config/redis');
const logger = require('../utils/logger');

let transporter;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
};

const sendEmail = async ({ to, subject, html, text }) => {
  const t = getTransporter();
  await t.sendMail({
    from: `"Vizag Steel CMS" <${process.env.EMAIL_FROM}>`,
    to,
    subject,
    html,
    text,
  });
};

// Email templates
const templates = {
  complaintAssigned: ({ complaintNumber, title, assigneeName, department }) => ({
    subject: `[VSP-CMS] Complaint Assigned: #${complaintNumber}`,
    html: `
      <h2>Complaint Assigned</h2>
      <p>Dear ${assigneeName},</p>
      <p>Complaint <strong>#${complaintNumber}</strong> has been assigned to you.</p>
      <p><strong>Title:</strong> ${title}</p>
      <p><strong>Department:</strong> ${department}</p>
      <p>Please log in to the CMS portal to view details and take action.</p>
      <br>
      <p>Vizag Steel Plant - Complaint Management System</p>
    `,
  }),

  escalation: ({ complaintNumber, title, level, department }) => ({
    subject: `[URGENT] Complaint Escalated - Level ${level}: #${complaintNumber}`,
    html: `
      <h2 style="color:red;">⚠️ Complaint Escalated - Level ${level}</h2>
      <p>Complaint <strong>#${complaintNumber}</strong> has breached SLA and requires immediate attention.</p>
      <p><strong>Title:</strong> ${title}</p>
      <p><strong>Department:</strong> ${department}</p>
      <p><strong>Escalation Level:</strong> ${level}</p>
      <p>Please take immediate action via the CMS portal.</p>
      <br>
      <p>Vizag Steel Plant - Complaint Management System</p>
    `,
  }),

  statusUpdate: ({ complaintNumber, newStatus, raisedByName }) => ({
    subject: `[VSP-CMS] Complaint Update: #${complaintNumber}`,
    html: `
      <h2>Complaint Status Updated</h2>
      <p>Dear ${raisedByName},</p>
      <p>Your complaint <strong>#${complaintNumber}</strong> has been updated.</p>
      <p><strong>New Status:</strong> ${newStatus.toUpperCase()}</p>
      <p>Log in to the CMS portal to view full details.</p>
      <br>
      <p>Vizag Steel Plant - Complaint Management System</p>
    `,
  }),
};

const startWorker = () => {
  try {
    const worker = new Worker(
      'email',
      async (job) => {
        const { to, templateName, templateData } = job.data;
        const template = templates[templateName]?.(templateData);
        if (!template) throw new Error(`Unknown email template: ${templateName}`);

        await sendEmail({ to, ...template });
        logger.info(`Email sent to ${to} [${templateName}]`);
      },
      { connection: getRedisClient() }
    );

    worker.on('failed', (job, err) => {
      logger.error(`Email job ${job?.id} failed:`, err.message);
    });

    logger.info('Email worker started');
    return worker;
  } catch (err) {
    logger.warn('Failed to start email worker:', err.message);
  }
};

module.exports = { sendEmail, templates, startWorker };
