const User = require('./user.model');
const AuditLog = require('../audit/auditLog.model');
const AppError = require('../../utils/AppError');
const catchAsync = require('../../utils/catchAsync');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  setTokenCookies,
  clearTokenCookies,
} = require('../../utils/tokenUtils');

// ─── Register ─────────────────────────────────────────────────────────────────
exports.register = catchAsync(async (req, res, next) => {
  const { employeeId, name, email, phone, password, department, designation, zone, role } = req.body;

  // Only super_admin can create admin/supervisor roles
  const assignedRole = role && req.user?.role === 'super_admin' ? role : 'employee';

  const user = await User.create({
    employeeId, name, email, phone, password, department, designation, zone,
    role: assignedRole,
  });

  await AuditLog.create({
    action: 'USER_CREATED',
    performedBy: req.user?._id || user._id,
    targetUser: user._id,
    details: { employeeId, name, email, role: assignedRole, department },
    ipAddress: req.ip,
  });

  const accessToken = signAccessToken(user._id);
  const refreshToken = signRefreshToken(user._id);

  // Store refresh token
  user.refreshTokens.push({
    token: refreshToken,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
  await user.save({ validateBeforeSave: false });

  setTokenCookies(res, accessToken, refreshToken);

  res.status(201).json({
    success: true,
    message: 'Registration successful',
    data: { user: user.toSafeObject(), accessToken },
  });
});

// ─── Login ────────────────────────────────────────────────────────────────────
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password +refreshTokens');
  if (!user || !(await user.comparePassword(password))) {
    return next(new AppError('Invalid email or password.', 401));
  }

  if (!user.isActive) {
    return next(new AppError('Your account has been deactivated. Contact admin.', 401));
  }

  const accessToken = signAccessToken(user._id);
  const refreshToken = signRefreshToken(user._id);

  // Clean expired refresh tokens and add new one
  user.refreshTokens = user.refreshTokens.filter((rt) => rt.expiresAt > Date.now());
  user.refreshTokens.push({
    token: refreshToken,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  await AuditLog.create({
    action: 'LOGIN',
    performedBy: user._id,
    details: { email },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  setTokenCookies(res, accessToken, refreshToken);

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: { user: user.toSafeObject(), accessToken },
  });
});

// ─── Refresh Token ────────────────────────────────────────────────────────────
exports.refreshToken = catchAsync(async (req, res, next) => {
  const token = req.cookies?.refreshToken || req.body?.refreshToken;

  if (!token) return next(new AppError('Refresh token required.', 401));

  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch {
    return next(new AppError('Invalid or expired refresh token.', 401));
  }

  const user = await User.findById(decoded.id).select('+refreshTokens');
  if (!user) return next(new AppError('User not found.', 401));

  const storedToken = user.refreshTokens.find((rt) => rt.token === token && rt.expiresAt > Date.now());
  if (!storedToken) return next(new AppError('Refresh token has been revoked.', 401));

  // Rotate: remove old, add new (refresh token rotation)
  user.refreshTokens = user.refreshTokens.filter((rt) => rt.token !== token);
  const newRefreshToken = signRefreshToken(user._id);
  user.refreshTokens.push({
    token: newRefreshToken,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
  await user.save({ validateBeforeSave: false });

  const newAccessToken = signAccessToken(user._id);
  setTokenCookies(res, newAccessToken, newRefreshToken);

  res.status(200).json({
    success: true,
    data: { accessToken: newAccessToken },
  });
});

// ─── Logout ───────────────────────────────────────────────────────────────────
exports.logout = catchAsync(async (req, res, next) => {
  const token = req.cookies?.refreshToken || req.body?.refreshToken;

  if (token) {
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { refreshTokens: { token } },
    });
  }

  await AuditLog.create({
    action: 'LOGOUT',
    performedBy: req.user._id,
    ipAddress: req.ip,
  });

  clearTokenCookies(res);

  res.status(200).json({ success: true, message: 'Logged out successfully' });
});

// ─── Get Me ───────────────────────────────────────────────────────────────────
exports.getMe = catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id);
  res.status(200).json({ success: true, data: { user: user.toSafeObject() } });
});

// ─── Update FCM Token ─────────────────────────────────────────────────────────
exports.updateFcmToken = catchAsync(async (req, res) => {
  const { fcmToken } = req.body;
  await User.findByIdAndUpdate(req.user._id, { fcmToken });
  res.status(200).json({ success: true, message: 'FCM token updated' });
});

// ─── Change Password ──────────────────────────────────────────────────────────
exports.changePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(currentPassword))) {
    return next(new AppError('Current password is incorrect.', 401));
  }

  user.password = newPassword;
  await user.save();

  const accessToken = signAccessToken(user._id);
  const refreshToken = signRefreshToken(user._id);
  setTokenCookies(res, accessToken, refreshToken);

  res.status(200).json({ success: true, message: 'Password changed successfully' });
});
