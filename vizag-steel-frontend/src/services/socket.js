import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

let socket = null;

export const connectSocket = (token) => {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    auth: { token },
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    transports: ['websocket'],
  });

  socket.on('connect', () => console.log('[Socket] Connected:', socket.id));
  socket.on('disconnect', (reason) => console.log('[Socket] Disconnected:', reason));
  socket.on('connect_error', (err) => console.error('[Socket] Error:', err.message));

  return socket;
};

export const disconnectSocket = () => {
  socket?.disconnect();
  socket = null;
};

export const getSocket = () => socket;

export const joinComplaintRoom = (complaintId) => {
  socket?.emit('join:complaint', complaintId);
};

export const leaveComplaintRoom = (complaintId) => {
  socket?.emit('leave:complaint', complaintId);
};

// Subscribe to an event, returns cleanup function
export const onSocketEvent = (event, handler) => {
  socket?.on(event, handler);
  return () => socket?.off(event, handler);
};
