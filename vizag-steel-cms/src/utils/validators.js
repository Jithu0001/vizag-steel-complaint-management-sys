const Joi = require('joi');
const { DEPARTMENTS, ROLES } = require('../config/constants');
const { SLA_CONFIG } = require('../config/constants');

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const message = error.details.map((d) => d.message).join('. ');
    return res.status(400).json({ success: false, message });
  }
  next();
};

// ─── Auth ──────────────────────────────────────────────────────────────────────
const registerSchema = Joi.object({
  employeeId: Joi.string().required(),
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().pattern(/^\+?[1-9]\d{9,14}$/).required(),
  password: Joi.string().min(8).required(),
  department: Joi.string().valid(...DEPARTMENTS).required(),
  designation: Joi.string().optional(),
  zone: Joi.string().optional(),
  role: Joi.string().valid(...Object.values(ROLES)).optional(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

// ─── Complaint ─────────────────────────────────────────────────────────────────
const createComplaintSchema = Joi.object({
  title: Joi.string().min(5).max(150).required(),
  description: Joi.string().min(10).max(2000).required(),
  category: Joi.string().valid(...Object.keys(SLA_CONFIG)).required(),
  longitude: Joi.number().min(-180).max(180).required(),
  latitude: Joi.number().min(-90).max(90).required(),
  address: Joi.string().optional(),
  zone: Joi.string().optional(),
  building: Joi.string().optional(),
});

const updateStatusSchema = Joi.object({
  status: Joi.string().valid(
    'assigned', 'in_progress', 'resolved', 'verified', 'closed', 'escalated', 'rejected'
  ).required(),
  remark: Joi.string().max(500).optional(),
  assignedTo: Joi.string().optional(), // User ID
  resolutionNote: Joi.string().max(1000).optional(),
});

const feedbackSchema = Joi.object({
  rating: Joi.number().min(1).max(5).required(),
  comment: Joi.string().max(500).optional(),
});

module.exports = {
  validate,
  registerSchema,
  loginSchema,
  createComplaintSchema,
  updateStatusSchema,
  feedbackSchema,
};
