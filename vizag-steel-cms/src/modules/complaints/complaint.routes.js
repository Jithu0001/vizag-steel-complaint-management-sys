const express = require('express');
const router = express.Router();
const complaintController = require('./complaint.controller');
const { protect } = require('../../middleware/auth');
const { restrictTo, supervisorGuard } = require('../../middleware/rbac');
const { validate, updateStatusSchema, feedbackSchema } = require('../../utils/validators');
const { ROLES } = require('../../config/constants');

// All complaint routes require authentication
router.use(protect);

// Employee routes
router.post('/', complaintController.createComplaint);
router.get('/nearby', complaintController.getNearbyComplaints);
router.get('/', supervisorGuard, complaintController.getAllComplaints);
router.get('/heatmap', restrictTo(ROLES.SUPERVISOR, ROLES.DEPARTMENT_ADMIN, ROLES.SUPER_ADMIN), complaintController.getHeatmapData);
router.get('/:id', complaintController.getComplaint);

// Feedback (employee only, on own complaints)
router.post('/:id/feedback', validate(feedbackSchema), complaintController.submitFeedback);

// Supervisor+ routes
router.patch(
  '/:id/status',
  restrictTo(ROLES.SUPERVISOR, ROLES.DEPARTMENT_ADMIN, ROLES.SUPER_ADMIN),
  validate(updateStatusSchema),
  complaintController.updateComplaintStatus
);

router.patch(
  '/:id/assign',
  restrictTo(ROLES.SUPERVISOR, ROLES.DEPARTMENT_ADMIN, ROLES.SUPER_ADMIN),
  complaintController.assignComplaint
);

module.exports = router;
