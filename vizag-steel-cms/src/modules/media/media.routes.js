const express = require('express');
const router = express.Router();
const cloudinary = require('../../config/cloudinary');
const Complaint = require('../complaints/complaint.model');
const AuditLog = require('../audit/auditLog.model');
const { protect } = require('../../middleware/auth');
const { restrictTo } = require('../../middleware/rbac');
const { handlePhotoUpload } = require('../../middleware/upload');
const { ROLES } = require('../../config/constants');
const AppError = require('../../utils/AppError');
const catchAsync = require('../../utils/catchAsync');

router.use(protect);

// Add photos to existing complaint
router.post('/complaint/:id/photos', catchAsync(async (req, res, next) => {
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) return next(new AppError('Complaint not found.', 404));

  // Only the creator or admin can add more photos
  const isOwner = complaint.raisedBy.toString() === req.user._id.toString();
  const isAdmin = [ROLES.DEPARTMENT_ADMIN, ROLES.SUPER_ADMIN].includes(req.user.role);
  if (!isOwner && !isAdmin) return next(new AppError('Access denied.', 403));

  if (complaint.photos.length >= 5) {
    return next(new AppError('Maximum 5 photos allowed per complaint.', 400));
  }

  await handlePhotoUpload(req, res);

  if (!req.files?.length) {
    return next(new AppError('No photos uploaded.', 400));
  }

  const newPhotos = req.files.map((f) => ({ url: f.path, publicId: f.filename }));
  complaint.photos.push(...newPhotos);
  await complaint.save();

  await AuditLog.create({
    action: 'PHOTO_UPLOADED',
    performedBy: req.user._id,
    targetComplaint: complaint._id,
    details: { count: newPhotos.length },
  });

  res.status(200).json({ success: true, message: 'Photos added', data: { photos: complaint.photos } });
}));

// Delete a photo from a complaint
router.delete('/complaint/:id/photos/:publicId', restrictTo(ROLES.DEPARTMENT_ADMIN, ROLES.SUPER_ADMIN), catchAsync(async (req, res, next) => {
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) return next(new AppError('Complaint not found.', 404));

  const photoIndex = complaint.photos.findIndex((p) => p.publicId === req.params.publicId);
  if (photoIndex === -1) return next(new AppError('Photo not found.', 404));

  // Delete from Cloudinary
  await cloudinary.uploader.destroy(req.params.publicId);

  complaint.photos.splice(photoIndex, 1);
  await complaint.save();

  res.status(200).json({ success: true, message: 'Photo deleted' });
}));

module.exports = router;
