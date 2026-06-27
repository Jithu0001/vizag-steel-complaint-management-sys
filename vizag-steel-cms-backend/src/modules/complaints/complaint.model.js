const mongoose = require('mongoose');
const { COMPLAINT_STATUS, DEPARTMENTS, SLA_CONFIG } = require('../../config/constants');

const photoSchema = new mongoose.Schema({
  url: { type: String, required: true },
  publicId: { type: String, required: true }, // Cloudinary public ID for deletion
  capturedAt: { type: Date, default: Date.now },
});

const statusHistorySchema = new mongoose.Schema({
  status: { type: String, enum: Object.values(COMPLAINT_STATUS) },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  changedAt: { type: Date, default: Date.now },
  remark: String,
});

const complaintSchema = new mongoose.Schema(
  {
    complaintNumber: {
      type: String,
      unique: true,
      // Auto-generated: VSP-2024-00001
    },
    title: {
      type: String,
      required: [true, 'Complaint title is required'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: Object.keys(SLA_CONFIG),
      uppercase: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },

    // ─── GPS Location ──────────────────────────────────────────────
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: [true, 'Location coordinates are required'],
      },
      address: String,      // Human-readable address (optional)
      zone: String,         // Plant zone/area name
      building: String,     // Building or section name
    },

    // ─── Media ────────────────────────────────────────────────────
    photos: [photoSchema],

    // ─── People ───────────────────────────────────────────────────
    raisedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    assignedDept: {
      type: String,
      enum: DEPARTMENTS,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // ─── Status ───────────────────────────────────────────────────
    status: {
      type: String,
      enum: Object.values(COMPLAINT_STATUS),
      default: COMPLAINT_STATUS.PENDING,
    },
    statusHistory: [statusHistorySchema],

    // ─── SLA ──────────────────────────────────────────────────────
    slaDeadline: Date,
    slaBreached: { type: Boolean, default: false },
    escalationLevel: { type: Number, default: 0 }, // 0=none, 1=supervisor, 2=super_admin

    // ─── Resolution ───────────────────────────────────────────────
    resolutionNote: String,
    resolvedAt: Date,
    closedAt: Date,

    // ─── Soft delete ──────────────────────────────────────────────
    isArchived: { type: Boolean, default: false },
    archivedAt: Date,

    // ─── Feedback (from the employee who raised) ──────────────────
    feedback: {
      rating: { type: Number, min: 1, max: 5 },
      comment: String,
      submittedAt: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
complaintSchema.index({ location: '2dsphere' });       // Geo queries
complaintSchema.index({ status: 1, assignedDept: 1 });
complaintSchema.index({ raisedBy: 1, createdAt: -1 });
complaintSchema.index({ assignedTo: 1, status: 1 });
complaintSchema.index({ slaDeadline: 1, slaBreached: 1 });
complaintSchema.index({ complaintNumber: 1 });
complaintSchema.index({ createdAt: -1 });

// ─── Auto-generate complaint number ───────────────────────────────────────────
complaintSchema.pre('save', async function (next) {
  if (!this.isNew) return next();

  const year = new Date().getFullYear();
  const count = await mongoose.model('Complaint').countDocuments();
  this.complaintNumber = `VSP-${year}-${String(count + 1).padStart(5, '0')}`;

  // Set SLA deadline based on category
  const sla = SLA_CONFIG[this.category];
  if (sla) {
    this.assignedDept = sla.department;
    this.priority = sla.priority;
    const deadline = new Date();
    deadline.setHours(deadline.getHours() + sla.hours);
    this.slaDeadline = deadline;
  }

  // Push initial status history
  this.statusHistory.push({
    status: this.status,
    changedBy: this.raisedBy,
    remark: 'Complaint submitted',
  });

  next();
});

// ─── Virtual: time elapsed ────────────────────────────────────────────────────
complaintSchema.virtual('timeElapsedHours').get(function () {
  return Math.round((Date.now() - this.createdAt) / (1000 * 60 * 60));
});

module.exports = mongoose.model('Complaint', complaintSchema);
