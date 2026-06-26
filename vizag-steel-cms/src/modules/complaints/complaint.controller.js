const Complaint = require('./complaint.model');
const User = require('../auth/user.model');
const AuditLog = require('../audit/auditLog.model');
const { handlePhotoUpload } = require('../../middleware/upload');
const { emitToRoom, emitToUser } = require('../../sockets/socketManager');
const { scheduleEscalation, cancelEscalation } = require('../../jobs/escalationWorker');
const { createNotification } = require('../notifications/notification.service');
const cloudinary = require('../../config/cloudinary');
const AppError = require('../../utils/AppError');
const catchAsync = require('../../utils/catchAsync');
const { COMPLAINT_STATUS, ROLES } = require('../../config/constants');

// ─── Submit Complaint ─────────────────────────────────────────────────────────
exports.createComplaint = catchAsync(async (req, res, next) => {
  // Handle photo uploads first
  await handlePhotoUpload(req, res);

  const { title, description, category, longitude, latitude, address, zone, building } = req.body;

  // Build photos array from uploaded files
  const photos = (req.files || []).map((file) => ({
    url: file.path,
    publicId: file.filename,
  }));

  const complaint = await Complaint.create({
    title,
    description,
    category: category.toUpperCase(),
    location: {
      type: 'Point',
      coordinates: [parseFloat(longitude), parseFloat(latitude)],
      address,
      zone,
      building,
    },
    photos,
    raisedBy: req.user._id,
  });

  await complaint.populate('raisedBy', 'name employeeId department');

  // Audit log
  await AuditLog.create({
    action: 'COMPLAINT_CREATED',
    performedBy: req.user._id,
    targetComplaint: complaint._id,
    details: { complaintNumber: complaint.complaintNumber, category, title },
    ipAddress: req.ip,
  });

  // Schedule escalation job (24h if unresolved)
  await scheduleEscalation(complaint._id.toString(), complaint.assignedDept, 24 * 60 * 60 * 1000);

  // Real-time: notify department room
  emitToRoom(`dept:${complaint.assignedDept}`, 'complaint:new', {
    complaintId: complaint._id,
    complaintNumber: complaint.complaintNumber,
    title: complaint.title,
    category: complaint.category,
    priority: complaint.priority,
    location: complaint.location,
  });

  // Broadcast to admin room
  emitToRoom('admin:broadcast', 'complaint:new', {
    complaintId: complaint._id,
    complaintNumber: complaint.complaintNumber,
  });

  res.status(201).json({
    success: true,
    message: 'Complaint submitted successfully',
    data: { complaint },
  });
});

// ─── Get All Complaints (with filters) ───────────────────────────────────────
exports.getAllComplaints = catchAsync(async (req, res) => {
  const {
    status, category, priority, assignedDept,
    page = 1, limit = 20, sortBy = 'createdAt', order = 'desc',
    startDate, endDate, slaBreached,
  } = req.query;

  // Build filter
  let filter = { isArchived: false };

  // Role-based scoping
  if (req.user.role === ROLES.EMPLOYEE) {
    filter.raisedBy = req.user._id;
  } else if ([ROLES.SUPERVISOR, ROLES.DEPARTMENT_ADMIN].includes(req.user.role)) {
    filter.assignedDept = req.user.department;
  }

  if (status) filter.status = status;
  if (category) filter.category = category.toUpperCase();
  if (priority) filter.priority = priority;
  if (assignedDept && req.user.role === ROLES.SUPER_ADMIN) filter.assignedDept = assignedDept;
  if (slaBreached !== undefined) filter.slaBreached = slaBreached === 'true';

  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const sortOrder = order === 'asc' ? 1 : -1;

  const [complaints, total] = await Promise.all([
    Complaint.find(filter)
      .populate('raisedBy', 'name employeeId department')
      .populate('assignedTo', 'name employeeId')
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Complaint.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: {
      complaints,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    },
  });
});

// ─── Get Single Complaint ─────────────────────────────────────────────────────
exports.getComplaint = catchAsync(async (req, res, next) => {
  const complaint = await Complaint.findById(req.params.id)
    .populate('raisedBy', 'name employeeId department phone email')
    .populate('assignedTo', 'name employeeId email phone')
    .populate('verifiedBy', 'name employeeId')
    .populate('statusHistory.changedBy', 'name role');

  if (!complaint) return next(new AppError('Complaint not found.', 404));

  // Access control: employee can only see their own
  if (req.user.role === ROLES.EMPLOYEE && complaint.raisedBy._id.toString() !== req.user._id.toString()) {
    return next(new AppError('Access denied.', 403));
  }

  // Dept scoping for supervisor
  if ([ROLES.SUPERVISOR, ROLES.DEPARTMENT_ADMIN].includes(req.user.role)) {
    if (complaint.assignedDept !== req.user.department) {
      return next(new AppError('Access denied.', 403));
    }
  }

  res.status(200).json({ success: true, data: { complaint } });
});

// ─── Update Status ────────────────────────────────────────────────────────────
exports.updateComplaintStatus = catchAsync(async (req, res, next) => {
  const { status, remark, assignedTo, resolutionNote } = req.body;

  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) return next(new AppError('Complaint not found.', 404));

  // Role-based status transition checks
  const allowedTransitions = getAllowedTransitions(req.user.role, complaint.status);
  if (!allowedTransitions.includes(status)) {
    return next(new AppError(`Cannot transition from '${complaint.status}' to '${status}'.`, 400));
  }

  const oldStatus = complaint.status;
  complaint.status = status;

  complaint.statusHistory.push({
    status,
    changedBy: req.user._id,
    remark: remark || '',
    changedAt: new Date(),
  });

  if (assignedTo) {
    complaint.assignedTo = assignedTo;
  }

  if (status === COMPLAINT_STATUS.RESOLVED) {
    complaint.resolvedAt = new Date();
    complaint.resolutionNote = resolutionNote;
    // Check SLA
    if (new Date() > complaint.slaDeadline) {
      complaint.slaBreached = true;
    }
    await cancelEscalation(complaint._id.toString());
  }

  if (status === COMPLAINT_STATUS.VERIFIED) {
    complaint.verifiedBy = req.user._id;
  }

  if (status === COMPLAINT_STATUS.CLOSED) {
    complaint.closedAt = new Date();
  }

  await complaint.save();

  await AuditLog.create({
    action: 'STATUS_CHANGED',
    performedBy: req.user._id,
    targetComplaint: complaint._id,
    details: { from: oldStatus, to: status, remark, assignedTo },
    ipAddress: req.ip,
  });

  // Real-time notification
  const eventPayload = {
    complaintId: complaint._id,
    complaintNumber: complaint.complaintNumber,
    oldStatus,
    newStatus: status,
    updatedBy: req.user.name,
    updatedAt: new Date(),
  };

  emitToRoom(`complaint:${complaint._id}`, 'status:changed', eventPayload);
  emitToRoom(`dept:${complaint.assignedDept}`, 'status:changed', eventPayload);
  emitToRoom('admin:broadcast', 'status:changed', eventPayload);

  // Notify the employee who raised it
  await createNotification({
    recipient: complaint.raisedBy,
    title: 'Complaint Status Updated',
    body: `Your complaint #${complaint.complaintNumber} status changed to: ${status.toUpperCase()}`,
    type: 'STATUS_UPDATE',
    relatedComplaint: complaint._id,
  });

  res.status(200).json({
    success: true,
    message: 'Status updated successfully',
    data: { complaint },
  });
});

// ─── Assign Complaint ─────────────────────────────────────────────────────────
exports.assignComplaint = catchAsync(async (req, res, next) => {
  const { assignedTo, assignedDept } = req.body;

  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) return next(new AppError('Complaint not found.', 404));

  // Supervisor can only assign within their dept
  if (req.user.role === ROLES.SUPERVISOR && assignedDept && assignedDept !== req.user.department) {
    return next(new AppError('You can only assign within your department.', 403));
  }

  const oldAssignment = { assignedTo: complaint.assignedTo, assignedDept: complaint.assignedDept };

  if (assignedTo) complaint.assignedTo = assignedTo;
  if (assignedDept && [ROLES.DEPARTMENT_ADMIN, ROLES.SUPER_ADMIN].includes(req.user.role)) {
    complaint.assignedDept = assignedDept;
  }

  complaint.status = COMPLAINT_STATUS.ASSIGNED;
  complaint.statusHistory.push({
    status: COMPLAINT_STATUS.ASSIGNED,
    changedBy: req.user._id,
    remark: `Assigned to ${assignedTo || assignedDept}`,
  });

  await complaint.save();

  await AuditLog.create({
    action: oldAssignment.assignedTo ? 'COMPLAINT_REASSIGNED' : 'COMPLAINT_ASSIGNED',
    performedBy: req.user._id,
    targetComplaint: complaint._id,
    details: { old: oldAssignment, new: { assignedTo, assignedDept } },
    ipAddress: req.ip,
  });

  // Notify assignee
  if (assignedTo) {
    await createNotification({
      recipient: assignedTo,
      title: 'New Complaint Assigned',
      body: `Complaint #${complaint.complaintNumber} has been assigned to you.`,
      type: 'COMPLAINT_ASSIGNED',
      relatedComplaint: complaint._id,
      channels: { inApp: true, email: true, push: true },
    });

    emitToUser(assignedTo.toString(), 'complaint:assigned', {
      complaintId: complaint._id,
      complaintNumber: complaint.complaintNumber,
    });
  }

  res.status(200).json({ success: true, message: 'Complaint assigned', data: { complaint } });
});

// ─── Submit Feedback ──────────────────────────────────────────────────────────
exports.submitFeedback = catchAsync(async (req, res, next) => {
  const { rating, comment } = req.body;
  const complaint = await Complaint.findById(req.params.id);

  if (!complaint) return next(new AppError('Complaint not found.', 404));
  if (complaint.raisedBy.toString() !== req.user._id.toString()) {
    return next(new AppError('You can only provide feedback on your own complaints.', 403));
  }
  if (complaint.status !== COMPLAINT_STATUS.RESOLVED && complaint.status !== COMPLAINT_STATUS.CLOSED) {
    return next(new AppError('Feedback can only be submitted on resolved/closed complaints.', 400));
  }
  if (complaint.feedback?.rating) {
    return next(new AppError('Feedback has already been submitted.', 400));
  }

  complaint.feedback = { rating, comment, submittedAt: new Date() };
  await complaint.save();

  await AuditLog.create({
    action: 'FEEDBACK_SUBMITTED',
    performedBy: req.user._id,
    targetComplaint: complaint._id,
    details: { rating, comment },
  });

  res.status(200).json({ success: true, message: 'Feedback submitted', data: { feedback: complaint.feedback } });
});

// ─── Nearby Complaints (geo query) ───────────────────────────────────────────
exports.getNearbyComplaints = catchAsync(async (req, res, next) => {
  const { longitude, latitude, radius = 500 } = req.query; // radius in meters

  if (!longitude || !latitude) {
    return next(new AppError('Longitude and latitude are required.', 400));
  }

  const complaints = await Complaint.find({
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates: [parseFloat(longitude), parseFloat(latitude)] },
        $maxDistance: parseInt(radius),
      },
    },
    isArchived: false,
  })
    .populate('raisedBy', 'name employeeId')
    .limit(50)
    .lean();

  res.status(200).json({ success: true, data: { complaints, count: complaints.length } });
});

// ─── Get Heatmap Data (GPS coordinates) ──────────────────────────────────────
exports.getHeatmapData = catchAsync(async (req, res) => {
  const { startDate, endDate } = req.query;
  const filter = { isArchived: false };
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  const points = await Complaint.find(filter, {
    'location.coordinates': 1, category: 1, status: 1, priority: 1,
  }).lean();

  const heatmapData = points.map((c) => ({
    lng: c.location.coordinates[0],
    lat: c.location.coordinates[1],
    category: c.category,
    status: c.status,
    priority: c.priority,
  }));

  res.status(200).json({ success: true, data: { points: heatmapData } });
});

// ─── Helper: Allowed Status Transitions ──────────────────────────────────────
const getAllowedTransitions = (role, currentStatus) => {
  const transitions = {
    [ROLES.EMPLOYEE]: [],
    [ROLES.SUPERVISOR]: {
      pending: ['assigned', 'rejected'],
      assigned: ['in_progress', 'rejected'],
      in_progress: ['resolved'],
      resolved: ['verified'],
      escalated: ['in_progress'],
    },
    [ROLES.DEPARTMENT_ADMIN]: {
      pending: ['assigned', 'rejected'],
      assigned: ['in_progress', 'rejected'],
      in_progress: ['resolved'],
      resolved: ['verified'],
      verified: ['closed'],
      escalated: ['in_progress', 'assigned'],
    },
    [ROLES.SUPER_ADMIN]: {
      pending: ['assigned', 'rejected', 'escalated'],
      assigned: ['in_progress', 'rejected', 'escalated'],
      in_progress: ['resolved', 'escalated'],
      resolved: ['verified', 'closed'],
      verified: ['closed'],
      escalated: ['assigned', 'in_progress'],
    },
  };

  const map = transitions[role];
  if (Array.isArray(map)) return map;
  return map?.[currentStatus] || [];
};
