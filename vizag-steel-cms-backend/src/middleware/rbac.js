const AppError = require('../utils/AppError');
const { ROLES } = require('../config/constants');

/**
 * Restrict access to specific roles
 * Usage: restrictTo('super_admin', 'department_admin')
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action.', 403));
    }
    next();
  };
};

/**
 * Supervisor guard: injects department filter so they only see their own dept
 */
const supervisorGuard = (req, res, next) => {
  if (req.user.role === ROLES.SUPERVISOR || req.user.role === ROLES.DEPARTMENT_ADMIN) {
    req.departmentFilter = { assignedDept: req.user.department };
  }
  // super_admin sees everything (no filter)
  next();
};

/**
 * Employee guard: employees can only access their own complaints
 */
const employeeGuard = (req, res, next) => {
  if (req.user.role === ROLES.EMPLOYEE) {
    req.ownerFilter = { raisedBy: req.user._id };
  }
  next();
};

/**
 * Ensure a user can only modify their own resources (or admin can)
 */
const selfOrAdmin = (req, res, next) => {
  const isAdmin = [ROLES.DEPARTMENT_ADMIN, ROLES.SUPER_ADMIN].includes(req.user.role);
  const isSelf = req.params.userId && req.params.userId === req.user._id.toString();

  if (!isAdmin && !isSelf) {
    return next(new AppError('You can only modify your own resources.', 403));
  }
  next();
};

module.exports = { restrictTo, supervisorGuard, employeeGuard, selfOrAdmin };
