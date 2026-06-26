import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { notificationService } from '../services/services';
import { onSocketEvent } from '../services/socket';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load notifications on login
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const { data } = await notificationService.getAll({ limit: 30 });
        setNotifications(data.data.notifications);
        setUnreadCount(data.data.unreadCount);
      } catch {}
    };
    load();
  }, [user]);

  // Real-time new notification via socket
  useEffect(() => {
    if (!user) return;
    const cleanup = onSocketEvent('notification:new', (notif) => {
      setNotifications((prev) => [notif, ...prev]);
      setUnreadCount((c) => c + 1);
      toast.info(notif.title, {
        toastId: notif.id,
        position: 'top-right',
        autoClose: 5000,
      });
    });
    return cleanup;
  }, [user]);

  const markRead = async (ids) => {
    await notificationService.markRead(ids);
    setNotifications((prev) =>
      prev.map((n) => ids.includes(n._id) ? { ...n, isRead: true } : n)
    );
    setUnreadCount((c) => Math.max(0, c - ids.length));
  };

  const markAllRead = async () => {
    await notificationService.markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markRead, markAllRead }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
