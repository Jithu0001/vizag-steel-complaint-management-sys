import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { format } from 'date-fns';

export default function TopBar() {
  const { user } = useAuth();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [showNotifs, setShowNotifs] = useState(false);
  const notifRef = useRef(null);
  const navigate = useNavigate();

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleNotifClick = (n) => {
    if (!n.isRead) markRead([n._id]);
    if (n.relatedComplaint) navigate(`/complaints/${n.relatedComplaint._id || n.relatedComplaint}`);
    setShowNotifs(false);
  };

  const typeColor = { ESCALATION: 'var(--color-danger)', STATUS_UPDATE: 'var(--color-accent)', COMPLAINT_ASSIGNED: 'var(--color-warning)', SLA_WARNING: 'var(--color-critical)' };

  return (
    <header style={{
      height: 56, background: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px', flexShrink: 0,
    }}>
      {/* Greeting */}
      <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
        <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>
          {user?.name?.split(' ')[0]}
        </span>{' '}
        · {user?.employeeId}
      </p>

      {/* Right controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }} ref={notifRef}>
        {/* Notification Bell */}
        <button
          onClick={() => setShowNotifs((s) => !s)}
          style={{
            position: 'relative', background: 'none', border: 'none', cursor: 'pointer',
            padding: '8px', borderRadius: 'var(--radius-md)', color: 'var(--color-text-secondary)',
            display: 'flex',
          }}
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute', top: 4, right: 4, width: 8, height: 8,
              background: 'var(--color-danger)', borderRadius: '50%',
            }} />
          )}
        </button>

        {/* Notification Dropdown */}
        {showNotifs && (
          <div className="fade-in" style={{
            position: 'absolute', top: '100%', right: 0, marginTop: '8px',
            width: 360, background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', zIndex: 200,
            maxHeight: 480, overflow: 'hidden', display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, fontSize: '14px' }}>Notifications {unreadCount > 0 && `(${unreadCount})`}</span>
              {unreadCount > 0 && (
                <button onClick={markAllRead} style={{ fontSize: '12px', color: 'var(--color-accent)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  Mark all read
                </button>
              )}
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {notifications.length === 0 ? (
                <p style={{ padding: '30px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>No notifications</p>
              ) : (
                notifications.slice(0, 15).map((n) => (
                  <div
                    key={n._id}
                    onClick={() => handleNotifClick(n)}
                    style={{
                      padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid var(--color-border)',
                      background: n.isRead ? 'transparent' : 'var(--color-accent-muted)',
                      transition: 'var(--transition)',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-bg-card)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = n.isRead ? 'transparent' : 'var(--color-accent-muted)'}
                  >
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: typeColor[n.type] || 'var(--color-accent)', flexShrink: 0, marginTop: 5 }} />
                      <div>
                        <p style={{ fontSize: '13px', fontWeight: n.isRead ? 400 : 600, marginBottom: '2px' }}>{n.title}</p>
                        <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>{n.body}</p>
                        <p style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{format(new Date(n.createdAt || Date.now()), 'MMM d, h:mm a')}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div style={{ padding: '10px 16px', borderTop: '1px solid var(--color-border)' }}>
              <button onClick={() => { navigate('/notifications'); setShowNotifs(false); }} style={{ fontSize: '12px', color: 'var(--color-accent)', background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'center' }}>
                View all notifications
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
