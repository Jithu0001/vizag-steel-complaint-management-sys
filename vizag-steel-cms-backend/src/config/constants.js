// SLA hours per complaint category
const SLA_CONFIG = {
  ELECTRICAL: {
    hours: parseInt(process.env.SLA_ELECTRICAL) || 24,
    department: 'Electrical',
    priority: 'high',
  },
  SAFETY: {
    hours: parseInt(process.env.SLA_SAFETY) || 12,
    department: 'Safety',
    priority: 'critical',
  },
  CIVIL: {
    hours: parseInt(process.env.SLA_CIVIL) || 48,
    department: 'Civil',
    priority: 'medium',
  },
  MECHANICAL: {
    hours: parseInt(process.env.SLA_MECHANICAL) || 24,
    department: 'Mechanical',
    priority: 'high',
  },
  ENVIRONMENTAL: {
    hours: parseInt(process.env.SLA_ENVIRONMENTAL) || 36,
    department: 'Environmental',
    priority: 'high',
  },
  HOUSEKEEPING: {
    hours: 48,
    department: 'Housekeeping',
    priority: 'low',
  },
  IT: {
    hours: 24,
    department: 'IT',
    priority: 'medium',
  },
  OTHER: {
    hours: 48,
    department: 'General',
    priority: 'low',
  },
};

const ROLES = {
  EMPLOYEE: 'employee',
  SUPERVISOR: 'supervisor',
  DEPARTMENT_ADMIN: 'department_admin',
  SUPER_ADMIN: 'super_admin',
};

const COMPLAINT_STATUS = {
  PENDING: 'pending',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  VERIFIED: 'verified',
  CLOSED: 'closed',
  ESCALATED: 'escalated',
  REJECTED: 'rejected',
};

const DEPARTMENTS = [
  'Electrical', 'Safety', 'Civil', 'Mechanical',
  'Environmental', 'Housekeeping', 'IT', 'General',
];

module.exports = { SLA_CONFIG, ROLES, COMPLAINT_STATUS, DEPARTMENTS };
