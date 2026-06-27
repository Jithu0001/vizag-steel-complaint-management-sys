const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { getRedisClient } = require('../config/redis');
const jwt = require('jsonwebtoken');
const User = require('../modules/auth/user.model');
const logger = require('../utils/logger');

let io;

const initSocket = (server) => {  
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true,
    },
    pingTimeout: 60000,
  });

  // Redis adapter for horizontal scaling
  try {
    const pubClient = getRedisClient();
    const subClient = pubClient.duplicate();
    io.adapter(createAdapter(pubClient, subClient));
    logger.info('Socket.IO Redis adapter connected');
  } catch (err) {
    logger.warn('Socket.IO Redis adapter failed, using in-memory:', err.message);
  }

  // ─── Auth Middleware for Sockets ───────────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      const user = await User.findById(decoded.id);
      if (!user || !user.isActive) return next(new Error('Invalid user'));

      socket.user = user;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  // ─── Connection Handler ────────────────────────────────────────────────────
  io.on('connection', (socket) => {
    const user = socket.user;
    logger.info(`Socket connected: ${user.name} (${user.role}) [${socket.id}]`);

    // Auto-join rooms based on role
    socket.join(`user:${user._id}`);               // Personal room
    socket.join(`dept:${user.department}`);         // Department room

    if (['supervisor', 'department_admin', 'super_admin'].includes(user.role)) {
      socket.join('admin:broadcast');               // Admin broadcast room
    }

    // Employee joins own complaint room dynamically
    socket.on('join:complaint', (complaintId) => {
      socket.join(`complaint:${complaintId}`);
      logger.debug(`${user.name} joined complaint room: ${complaintId}`);
    });

    socket.on('leave:complaint', (complaintId) => {
      socket.leave(`complaint:${complaintId}`);
    });

    // Emit current user count to admin room
    const adminCount = io.sockets.adapter.rooms.get('admin:broadcast')?.size || 0;
    io.to('admin:broadcast').emit('admin:online_count', { count: adminCount });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${user.name} [${socket.id}]`);
    });
  });

  logger.info('Socket.IO initialized');
  return io;
};

// ─── Emit Helpers ──────────────────────────────────────────────────────────────
const emitToRoom = (room, event, data) => {
  if (!io) return;
  io.to(room).emit(event, { ...data, timestamp: new Date().toISOString() });
};

const emitToUser = (userId, event, data) => {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, { ...data, timestamp: new Date().toISOString() });
};

const getIO = () => io;

module.exports = { initSocket, emitToRoom, emitToUser, getIO };
