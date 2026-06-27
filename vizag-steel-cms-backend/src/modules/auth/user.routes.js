const express = require('express');
const router = express.Router();
const User = require('../auth/user.model');
const AuditLog = require('../audit/auditLog.model');
const { protect } = require('../../middleware/auth');
const { restrictTo, selfOrAdmin } = require('../../middleware/rbac');
const { ROLES, DEPARTMENTS } = require('../../config/constants');
const AppError = require('../../utils/AppError');
const catchAsync = require('../../utils/catchAsync');

router.use(protect);

// Get all users (admin only)
router.get('/', restrictTo(ROLES.DEPARTMENT_ADMIN, ROLES.SUPER_ADMIN), catchAsync(async (req, res) => {
  const { department, role, page = 1, limit = 20, search } = req.query;
  const filter = {};

  // Dept admin can only see their dept
  if (req.user.role === ROLES.DEPARTMENT_ADMIN) filter.department = req.user.department;
  if (department && req.user.role === ROLES.SUPER_ADMIN) filter.department = department;
  if (role) filter.role = role;
  if (search) filter.$or = [
    { name: { $regex: search, $options: 'i' } },
    { employeeId: { $regex: search, $options: 'i' } },
    { email: { $regex: search, $options: 'i' } },
  ];

  const [users, total] = await Promise.all([
    User.find(filter).sort({ name: 1 }).skip((page - 1) * limit).limit(parseInt(limit)).lean(),
    User.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: { users, pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) } },
  });
}));

// Get single user
router.get('/:userId', selfOrAdmin, catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.userId);
  if (!user) return next(new AppError('User not found.', 404));
  res.status(200).json({ success: true, data: { user: user.toSafeObject() } });
}));

// Update user (admin or self for non-role fields)
router.patch('/:userId', selfOrAdmin, catchAsync(async (req, res, next) => {
  const { name, phone, designation, zone, department, role, isActive } = req.body;
  const isAdmin = [ROLES.DEPARTMENT_ADMIN, ROLES.SUPER_ADMIN].includes(req.user.role);

  const updates = { name, phone, designation, zone };
  if (isAdmin) {
    if (department) updates.department = department;
    if (role) updates.role = role;
    if (isActive !== undefined) updates.isActive = isActive;
  }

  // Remove undefined keys
  Object.keys(updates).forEach((k) => updates[k] === undefined && delete updates[k]);

  const user = await User.findByIdAndUpdate(req.params.userId, updates, { new: true, runValidators: true });
  if (!user) return next(new AppError('User not found.', 404));

  await AuditLog.create({
    action: 'USER_UPDATED',
    performedBy: req.user._id,
    targetUser: user._id,
    details: updates,
    ipAddress: req.ip,
  });

  res.status(200).json({ success: true, message: 'User updated', data: { user: user.toSafeObject() } });
}));

// Deactivate user
router.patch('/:userId/deactivate', restrictTo(ROLES.SUPER_ADMIN), catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(req.params.userId, { isActive: false }, { new: true });
  if (!user) return next(new AppError('User not found.', 404));

  await AuditLog.create({
    action: 'USER_DEACTIVATED',
    performedBy: req.user._id,
    targetUser: user._id,
    ipAddress: req.ip,
  });

  res.status(200).json({ success: true, message: 'User deactivated' });
}));

module.exports = router;
