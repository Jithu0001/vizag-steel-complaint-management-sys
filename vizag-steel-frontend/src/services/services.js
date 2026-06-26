import api from './api';

// ═══════════════════════════════════════════════════════════
//  AUTH SERVICES
// ═══════════════════════════════════════════════════════════
export const authService = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  changePassword: (data) => api.patch('/auth/change-password', data),
  updateFcmToken: (fcmToken) => api.patch('/auth/fcm-token', { fcmToken }),
  refreshToken: () => api.post('/auth/refresh-token'),
};

// ═══════════════════════════════════════════════════════════
//  COMPLAINT SERVICES
// ═══════════════════════════════════════════════════════════
export const complaintService = {
  // Submit with photos (multipart)
  create: (formData) =>
    api.post('/complaints', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),

  // Fetch list with optional query params
  getAll: (params) => api.get('/complaints', { params }),

  // Single complaint
  getById: (id) => api.get(`/complaints/${id}`),

  // Update status
  updateStatus: (id, data) => api.patch(`/complaints/${id}/status`, data),

  // Assign
  assign: (id, data) => api.patch(`/complaints/${id}/assign`, data),

  // Feedback
  submitFeedback: (id, data) => api.post(`/complaints/${id}/feedback`, data),

  // Geo queries
  getNearby: (params) => api.get('/complaints/nearby', { params }),
  getHeatmap: (params) => api.get('/complaints/heatmap', { params }),
};

// ═══════════════════════════════════════════════════════════
//  NOTIFICATION SERVICES
// ═══════════════════════════════════════════════════════════
export const notificationService = {
  getAll: (params) => api.get('/notifications', { params }),
  markRead: (ids) => api.patch('/notifications/read', { ids }),
  markAllRead: () => api.patch('/notifications/read', {}),
  delete: (id) => api.delete(`/notifications/${id}`),
};

// ═══════════════════════════════════════════════════════════
//  ANALYTICS SERVICES
// ═══════════════════════════════════════════════════════════
export const analyticsService = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getByDepartment: () => api.get('/analytics/by-department'),
  getOverTime: (params) => api.get('/analytics/over-time', { params }),
  getResolutionTime: () => api.get('/analytics/resolution-time'),
  getCategories: () => api.get('/analytics/categories'),
  getSla: (params) => api.get('/analytics/sla', { params }),
  getEmployeeStats: () => api.get('/analytics/employees'),
  downloadPdfReport: (params) =>
    api.get('/analytics/report/pdf', { params, responseType: 'blob' }),
};

// ═══════════════════════════════════════════════════════════
//  USER SERVICES
// ═══════════════════════════════════════════════════════════
export const userService = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  update: (id, data) => api.patch(`/users/${id}`, data),
  deactivate: (id) => api.patch(`/users/${id}/deactivate`),
};

// ═══════════════════════════════════════════════════════════
//  MEDIA SERVICES
// ═══════════════════════════════════════════════════════════
export const mediaService = {
  addPhotos: (complaintId, formData) =>
    api.post(`/media/complaint/${complaintId}/photos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deletePhoto: (complaintId, publicId) =>
    api.delete(`/media/complaint/${complaintId}/photos/${publicId}`),
};

// ═══════════════════════════════════════════════════════════
//  AUDIT SERVICES
// ═══════════════════════════════════════════════════════════
export const auditService = {
  getForComplaint: (complaintId) => api.get(`/audit/complaint/${complaintId}`),
  getAll: (params) => api.get('/audit', { params }),
};
