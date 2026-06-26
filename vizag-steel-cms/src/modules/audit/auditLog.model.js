const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      enum: [
        'COMPLAINT_CREATED',
        'COMPLAINT_ASSIGNED',
        'COMPLAINT_REASSIGNED',
        'STATUS_CHANGED',
        'COMPLAINT_ESCALATED',
        'COMPLAINT_RESOLVED',
        'COMPLAINT_VERIFIED',
        'COMPLAINT_CLOSED',
        'COMPLAINT_REJECTED',
        'PHOTO_UPLOADED',
        'USER_CREATED',
        'USER_UPDATED',
        'USER_DEACTIVATED',
        'LOGIN',
        'LOGOUT',
        'FEEDBACK_SUBMITTED',
        'REPORT_GENERATED',
      ],
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    targetComplaint: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Complaint',
      default: null,
    },
    targetUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    details: {
      type: mongoose.Schema.Types.Mixed, // flexible payload
      default: {},
    },
    ipAddress: String,
    userAgent: String,
  },
  {
    timestamps: true,
    // Prevent updates — audit logs are immutable
  }
);

// Disable updates on this collection
auditLogSchema.pre(['updateOne', 'updateMany', 'findOneAndUpdate'], function () {
  throw new Error('AuditLog records are immutable');
});

auditLogSchema.index({ targetComplaint: 1, createdAt: -1 });
auditLogSchema.index({ performedBy: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
