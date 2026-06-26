import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authService, userService } from '../../services/services';
import { Button, Input, Card } from '../../components/common/UI';
import { toast } from 'react-toastify';
import { User, Lock, Shield } from 'lucide-react';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '', designation: user?.designation || '', zone: user?.zone || '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const [changingPw, setChangingPw] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setPw = (k) => (e) => setPwForm((f) => ({ ...f, [k]: e.target.value }));

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await userService.update(user._id, form);
      updateUser(data.data.user);
      toast.success('Profile updated');
    } catch {
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) { toast.error('Passwords do not match'); return; }
    if (pwForm.newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setChangingPw(true);
    try {
      await authService.changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      toast.success('Password changed successfully');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch {
    } finally {
      setChangingPw(false);
    }
  };

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 700 }}>My Profile</h1>

      {/* Read-only info */}
      <Card>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 700, flexShrink: 0 }}>
            {user?.name?.charAt(0)}
          </div>
          <div>
            <p style={{ fontWeight: 700, fontSize: '16px' }}>{user?.name}</p>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>{user?.employeeId} · {user?.department}</p>
            <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
              <span style={{ fontSize: '11px', background: 'var(--color-accent-muted)', color: 'var(--color-accent)', padding: '2px 8px', borderRadius: '100px', fontWeight: 600 }}>
                {user?.role?.replace('_', ' ').toUpperCase()}
              </span>
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px', padding: '14px', background: 'var(--color-bg-elevated)', borderRadius: 'var(--radius-md)' }}>
          <div><p style={{ color: 'var(--color-text-muted)', marginBottom: '2px', fontSize: '11px' }}>Email</p><p>{user?.email}</p></div>
          <div><p style={{ color: 'var(--color-text-muted)', marginBottom: '2px', fontSize: '11px' }}>Employee ID</p><p style={{ fontFamily: 'var(--font-mono)' }}>{user?.employeeId}</p></div>
          <div><p style={{ color: 'var(--color-text-muted)', marginBottom: '2px', fontSize: '11px' }}>Department</p><p>{user?.department}</p></div>
          <div><p style={{ color: 'var(--color-text-muted)', marginBottom: '2px', fontSize: '11px' }}>Role</p><p style={{ textTransform: 'capitalize' }}>{user?.role?.replace('_', ' ')}</p></div>
        </div>
      </Card>

      {/* Editable Info */}
      <Card>
        <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <User size={16} /> Edit Information
        </h2>
        <form onSubmit={handleProfileSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input label="Full Name" value={form.name} onChange={set('name')} required />
            <Input label="Phone" value={form.phone} onChange={set('phone')} />
            <Input label="Designation" value={form.designation} onChange={set('designation')} placeholder="e.g. Senior Engineer" />
            <Input label="Zone / Area" value={form.zone} onChange={set('zone')} placeholder="e.g. Zone-B" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button type="submit" loading={saving}>Save Changes</Button>
          </div>
        </form>
      </Card>

      {/* Change Password */}
      <Card>
        <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Lock size={16} /> Change Password
        </h2>
        <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Input label="Current Password" type="password" value={pwForm.currentPassword} onChange={setPw('currentPassword')} required />
          <Input label="New Password" type="password" value={pwForm.newPassword} onChange={setPw('newPassword')} required />
          <Input label="Confirm New Password" type="password" value={pwForm.confirmPassword} onChange={setPw('confirmPassword')} required />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button type="submit" loading={changingPw}>Update Password</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
