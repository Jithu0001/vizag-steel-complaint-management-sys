import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Bell, BarChart3, Users,
  Settings, LogOut, Shield, MapPin, ChevronLeft, ChevronRight, AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';

const NAV_ITEMS = {
  employee: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/complaints', icon: FileText, label: 'My Complaints' },
    { to: '/complaints/new', icon: AlertTriangle, label: 'Raise Complaint' },
    { to: '/notifications', icon: Bell, label: 'Notifications' },
    { to: '/profile', icon: Settings, label: 'Profile' },
  ],
  supervisor: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/complaints', icon: FileText, label: 'Complaints' },
    { to: '/map', icon: MapPin, label: 'Location Map' },
    { to: '/notifications', icon: Bell, label: 'Notifications' },
    { to: '/profile', icon: Settings, label: 'Profile' },
  ],
  department_admin: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/complaints', icon: FileText, label: 'Complaints' },
    { to: '/map', icon: MapPin, label: 'Heatmap' },
    { to: '/analytics', icon: BarChart3, label: 'Analytics' },
    { to: '/users', icon: Users, label: 'Team' },
    { to: '/audit', icon: Shield, label: 'Audit Log' },
    { to: '/notifications', icon: Bell, label: 'Notifications' },
    { to: '/profile', icon: Settings, label: 'Profile' },
  ],
  super_admin: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/complaints', icon: FileText, label: 'All Complaints' },
    { to: '/map', icon: MapPin, label: 'Heatmap' },
    { to: '/analytics', icon: BarChart3, label: 'Analytics' },
    { to: '/users', icon: Users, label: 'User Management' },
    { to: '/audit', icon: Shield, label: 'Audit Log' },
    { to: '/notifications', icon: Bell, label: 'Notifications' },
    { to: '/profile', icon: Settings, label: 'Profile' },
  ],
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();

  const navItems = NAV_ITEMS[user?.role] || NAV_ITEMS.employee;
  const w = collapsed ? 64 : 240;

  return (
    <aside style={{
      width: w, minHeight: '100vh', background: 'var(--color-bg-secondary)',
      borderRight: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column',
      transition: 'width 0.22s ease', flexShrink: 0, position: 'relative',
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden', minHeight: 72 }}>
        <div style={{ width: 36, height: 36, background: 'var(--color-accent)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Shield size={18} color="#fff" />
        </div>
        {!collapsed && (
          <div style={{ overflow: 'hidden' }}>
            <p style={{ fontWeight: 700, fontSize: '14px', whiteSpace: 'nowrap' }}>VSP CMS</p>
            <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>Vizag Steel Plant</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to} to={to}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '10px 10px', borderRadius: 'var(--radius-md)',
              textDecoration: 'none', overflow: 'hidden', whiteSpace: 'nowrap',
              background: isActive ? 'var(--color-accent-muted)' : 'transparent',
              color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              fontSize: '13px', fontWeight: 500, transition: 'var(--transition)',
              borderLeft: isActive ? '2px solid var(--color-accent)' : '2px solid transparent',
            })}
          >
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <Icon size={18} />
              {label === 'Notifications' && unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: -6, right: -6, background: 'var(--color-danger)',
                  borderRadius: '50%', width: 16, height: 16, fontSize: '9px', fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User info + Logout */}
      <div style={{ padding: '12px 8px', borderTop: '1px solid var(--color-border)' }}>
        {!collapsed && (
          <div style={{ padding: '10px', marginBottom: '4px', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-card)' }}>
            <p style={{ fontSize: '13px', fontWeight: 600, marginBottom: '2px' }}>{user?.name}</p>
            <p style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{user?.role?.replace('_', ' ')} · {user?.department}</p>
          </div>
        )}
        <button
          onClick={() => logout().then(() => navigate('/login'))}
          style={{
            display: 'flex', alignItems: 'center', gap: '10px', padding: '10px',
            width: '100%', background: 'none', border: 'none', borderRadius: 'var(--radius-md)',
            color: 'var(--color-text-muted)', fontSize: '13px', cursor: 'pointer', transition: 'var(--transition)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-danger-muted)'; e.currentTarget.style.color = 'var(--color-danger)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}
        >
          <LogOut size={16} />
          {!collapsed && 'Sign out'}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        style={{
          position: 'absolute', right: -12, top: '50%', transform: 'translateY(-50%)',
          width: 24, height: 24, borderRadius: '50%', background: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border)', cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)',
          zIndex: 10,
        }}
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  );
}
