const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const { protect } = require('../../middleware/auth');
const { validate, registerSchema, loginSchema } = require('../../utils/validators');

// Public routes
router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh-token', authController.refreshToken);

// Protected routes
router.use(protect);
router.post('/logout', authController.logout);
router.get('/me', authController.getMe);
router.patch('/fcm-token', authController.updateFcmToken);
router.patch('/change-password', authController.changePassword);

module.exports = router;
