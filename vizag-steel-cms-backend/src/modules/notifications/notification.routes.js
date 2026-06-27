const Notification = require('./notification.model');
const catchAsync = require('../../utils/catchAsync');

// ─── Controller ───────────────────────────────────────────────────────────────
const getMyNotifications = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, unreadOnly } = req.query;
  const filter = { recipient: req.user._id };
  if (unreadOnly === 'true') filter.isRead = false;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .populate('relatedComplaint', 'complaintNumber title status')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ recipient: req.user._id, isRead: false }),
  ]);

  res.status(200).json({
    success: true,
    data: {
      notifications,
      unreadCount,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) },
    },
  });
});

const markAsRead = catchAsync(async (req, res) => {
  const { ids } = req.body; // array of notification IDs, or omit to mark all

  const filter = { recipient: req.user._id, isRead: false };
  if (ids?.length) filter._id = { $in: ids };

  const result = await Notification.updateMany(filter, {
    $set: { isRead: true, readAt: new Date() },
  });

  res.status(200).json({
    success: true,
    message: `${result.modifiedCount} notification(s) marked as read`,
  });
});

const deleteNotification = catchAsync(async (req, res) => {
  await Notification.findOneAndDelete({ _id: req.params.id, recipient: req.user._id });
  res.status(200).json({ success: true, message: 'Notification deleted' });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');

router.use(protect);
router.get('/', getMyNotifications);
router.patch('/read', markAsRead);
router.delete('/:id', deleteNotification);

module.exports = router;
