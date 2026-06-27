const express = require('express');
const router = express.Router();
const AuditLog = require('./auditLog.model');
const { protect } = require('../../middleware/auth');
const { restrictTo } = require('../../middleware/rbac');
const { ROLES } = require('../../config/constants');
const catchAsync = require('../../utils/catchAsync');

router.use(protect);
router.use(restrictTo(ROLES.DEPARTMENT_ADMIN, ROLES.SUPER_ADMIN));

// Get audit logs for a specific complaint
router.get('/complaint/:complaintId', catchAsync(async (req, res) => {
  const logs = await AuditLog.find({ targetComplaint: req.params.complaintId })
    .populate('performedBy', 'name employeeId role')
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json({ success: true, data: { logs } });
}));

// Get audit logs by action type
router.get('/', catchAsync(async (req, res) => {
  const { action, userId, page = 1, limit = 50, startDate, endDate } = req.query;
  const filter = {};

  if (action) filter.action = action;
  if (userId) filter.performedBy = userId;
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .populate('performedBy', 'name employeeId role')
      .populate('targetComplaint', 'complaintNumber title')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: { logs, pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) } },
  });
}));

module.exports = router;
