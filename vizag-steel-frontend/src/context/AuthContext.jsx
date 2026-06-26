import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/services';
import { connectSocket, disconnectSocket } from '../services/socket';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on app load
  useEffect(() => {
    const restore = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) { setLoading(false); return; }
      try {
        const { data } = await authService.getMe();
        setUser(data.data.user);
        connectSocket(token);
      } catch {
        localStorage.removeItem('accessToken');
      } finally {
        setLoading(false);
      }
    };
    restore();
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await authService.login({ email, password });
    const { user: u, accessToken } = data.data;
    localStorage.setItem('accessToken', accessToken);
    setUser(u);
    connectSocket(accessToken);
    return u;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout().catch(() => {});
    localStorage.removeItem('accessToken');
    disconnectSocket();
    setUser(null);
  }, []);

  const updateUser = useCallback((updates) => {
    setUser((prev) => ({ ...prev, ...updates }));
  }, []);

  // Role helpers
  const isEmployee = user?.role === 'employee';
  const isSupervisor = user?.role === 'supervisor';
  const isDeptAdmin = user?.role === 'department_admin';
  const isSuperAdmin = user?.role === 'super_admin';
  const isAdmin = isDeptAdmin || isSuperAdmin;
  const canManage = isSupervisor || isDeptAdmin || isSuperAdmin;

  return (
    <AuthContext.Provider value={{
      user, loading, login, logout, updateUser,
      isEmployee, isSupervisor, isDeptAdmin, isSuperAdmin, isAdmin, canManage,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
