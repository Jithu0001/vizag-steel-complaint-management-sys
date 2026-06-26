import React from 'react';
import { Bell, Trash2, CheckCheck } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { notificationService } from '../../services/services';
import { Button, Card, EmptyState } from '../../components/common/UI';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const TYPE_COLOR = { ESCALATION: 'var(--color-danger)', STATUS_UPDATE: 'var(--color-accent)', COMPLAINT_ASSIGNED: 'var(--color-warning)', SLA_WARNING: 'var(--color-critical)', SYSTEM: 'var(--color-text-muted)' };

export default function NotificationsPage() {
  const { notifications, markAllRead } = useNotifications();
  const navigate = useNavigate();

  const del = async (id, e) => {
    e.stopPropagation();
    await notificationService.delete(id);
    toast.success('Notification removed');
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700 }}>Notifications</h1>
        {notifications.some((n) => !n.isRead) && (
          <Button variant="secondary" size="sm" onClick={markAllRead}><CheckCheck size={14} /> Mark all read</Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications" description="You're all caught up!" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {notifications.map((n) => (
            <div
              key={n._id}
              onClick={() => n.relatedComplaint && navigate(`/complaints/${n.relatedComplaint._id || n.relatedComplaint}`)}
              style={{
                display: 'flex', gap: '14px', padding: '16px',
                background: n.isRead ? 'var(--color-bg-card)' : 'var(--color-bg-elevated)',
                border: `1px solid ${n.isRead ? 'var(--color-border)' : 'var(--color-accent)'}`,
                borderRadius: 'var(--radius-md)', cursor: n.relatedComplaint ? 'pointer' : 'default',
                transition: 'var(--transition)',
              }}
            >
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: TYPE_COLOR[n.type] || 'var(--color-accent)', flexShrink: 0, marginTop: 5 }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: n.isRead ? 400 : 600, marginBottom: '2px', fontSize: '14px' }}>{n.title}</p>
                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>{n.body}</p>
                <p style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{format(new Date(n.createdAt || Date.now()), 'MMM d, yyyy · h:mm a')}</p>
              </div>
              <button onClick={(e) => del(n._id, e)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '4px' }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
