const Complaint = require('../complaints/complaint.model');
const User = require('../auth/user.model');
const catchAsync = require('../../utils/catchAsync');
const { ROLES, DEPARTMENTS } = require('../../config/constants');

// ─── Dashboard Summary ────────────────────────────────────────────────────────
exports.getDashboardSummary = catchAsync(async (req, res) => {
  const deptFilter = [ROLES.SUPERVISOR, ROLES.DEPARTMENT_ADMIN].includes(req.user.role)
    ? { assignedDept: req.user.department }
    : {};

  const [total, pending, inProgress, resolved, slaBreached, escalated] = await Promise.all([
    Complaint.countDocuments({ ...deptFilter, isArchived: false }),
    Complaint.countDocuments({ ...deptFilter, status: 'pending', isArchived: false }),
    Complaint.countDocuments({ ...deptFilter, status: 'in_progress', isArchived: false }),
    Complaint.countDocuments({ ...deptFilter, status: { $in: ['resolved', 'verified', 'closed'] }, isArchived: false }),
    Complaint.countDocuments({ ...deptFilter, slaBreached: true, isArchived: false }),
    Complaint.countDocuments({ ...deptFilter, status: 'escalated', isArchived: false }),
  ]);

  res.status(200).json({
    success: true,
    data: { total, pending, inProgress, resolved, slaBreached, escalated },
  });
});

// ─── Complaints by Department ─────────────────────────────────────────────────
exports.getComplaintsByDepartment = catchAsync(async (req, res) => {
  const result = await Complaint.aggregate([
    { $match: { isArchived: false } },
    {
      $group: {
        _id: '$assignedDept',
        total: { $sum: 1 },
        pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        resolved: { $sum: { $cond: [{ $in: ['$status', ['resolved', 'verified', 'closed']] }, 1, 0] } },
        slaBreached: { $sum: { $cond: ['$slaBreached', 1, 0] } },
      },
    },
    { $sort: { total: -1 } },
  ]);

  res.status(200).json({ success: true, data: { departments: result } });
});

// ─── Complaints Over Time (daily/weekly) ─────────────────────────────────────
exports.getComplaintsOverTime = catchAsync(async (req, res) => {
  const { period = 'daily', days = 30 } = req.query;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(days));

  const groupBy = period === 'weekly'
    ? { $week: '$createdAt' }
    : { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };

  const result = await Complaint.aggregate([
    { $match: { createdAt: { $gte: startDate }, isArchived: false } },
    {
      $group: {
        _id: groupBy,
        count: { $sum: 1 },
        resolved: { $sum: { $cond: [{ $in: ['$status', ['resolved', 'verified', 'closed']] }, 1, 0] } },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  res.status(200).json({ success: true, data: { timeline: result } });
});

// ─── Average Resolution Time ──────────────────────────────────────────────────
exports.getResolutionTime = catchAsync(async (req, res) => {
  const result = await Complaint.aggregate([
    { $match: { resolvedAt: { $exists: true }, createdAt: { $exists: true }, isArchived: false } },
    {
      $group: {
        _id: '$assignedDept',
        avgHours: {
          $avg: {
            $divide: [{ $subtract: ['$resolvedAt', '$createdAt'] }, 3600000],
          },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { avgHours: 1 } },
  ]);

  res.status(200).json({ success: true, data: { resolution: result } });
});

// ─── Category Breakdown ───────────────────────────────────────────────────────
exports.getCategoryBreakdown = catchAsync(async (req, res) => {
  const result = await Complaint.aggregate([
    { $match: { isArchived: false } },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        avgResolutionHours: {
          $avg: {
            $cond: [
              { $and: ['$resolvedAt', '$createdAt'] },
              { $divide: [{ $subtract: ['$resolvedAt', '$createdAt'] }, 3600000] },
              null,
            ],
          },
        },
      },
    },
    { $sort: { count: -1 } },
  ]);

  res.status(200).json({ success: true, data: { categories: result } });
});

// ─── SLA Report ───────────────────────────────────────────────────────────────
exports.getSlaReport = catchAsync(async (req, res) => {
  const { startDate, endDate } = req.query;
  const dateFilter = {};
  if (startDate) dateFilter.$gte = new Date(startDate);
  if (endDate) dateFilter.$lte = new Date(endDate);

  const match = { isArchived: false };
  if (Object.keys(dateFilter).length) match.createdAt = dateFilter;

  const result = await Complaint.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$assignedDept',
        total: { $sum: 1 },
        breached: { $sum: { $cond: ['$slaBreached', 1, 0] } },
        notBreached: { $sum: { $cond: ['$slaBreached', 0, 1] } },
      },
    },
    {
      $addFields: {
        breachRate: {
          $multiply: [{ $divide: ['$breached', '$total'] }, 100],
        },
      },
    },
    { $sort: { breachRate: -1 } },
  ]);

  res.status(200).json({ success: true, data: { sla: result } });
});

// ─── Employee Performance ─────────────────────────────────────────────────────
exports.getEmployeeStats = catchAsync(async (req, res) => {
  // Complaints raised per employee (top reporters)
  const result = await Complaint.aggregate([
    { $match: { isArchived: false } },
    {
      $group: {
        _id: '$raisedBy',
        totalRaised: { $sum: 1 },
        resolved: { $sum: { $cond: [{ $in: ['$status', ['resolved', 'verified', 'closed']] }, 1, 0] } },
      },
    },
    { $sort: { totalRaised: -1 } },
    { $limit: 20 },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: '$user' },
    {
      $project: {
        name: '$user.name',
        employeeId: '$user.employeeId',
        department: '$user.department',
        totalRaised: 1,
        resolved: 1,
      },
    },
  ]);

  res.status(200).json({ success: true, data: { employees: result } });
});
