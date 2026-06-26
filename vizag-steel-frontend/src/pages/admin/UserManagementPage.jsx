import React, { useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { Search, UserX, Users } from 'lucide-react';
import { userService } from '../../services/services';
import { Badge, Button, Card, Modal, Input, Select, Spinner, Table } from '../../components/common/UI';
import { toast } from 'react-toastify';

const DEPT_OPTIONS = ['Electrical', 'Safety', 'Civil', 'Mechanical', 'Environmental', 'Housekeeping', 'IT', 'General'].map((d) => ({ value: d, label: d }));
const ROLE_OPTIONS = ['employee', 'supervisor', 'department_admin', 'super_admin'].map((r) => ({ value: r, label: r.replace('_', ' ') }));

export default function UserManagementPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState({});

  const { data, isLoading } = useQuery(
    ['users', search],
    () => userService.getAll({ search, limit: 50 }),
    { staleTime: 30000 }
  );
  const users = data?.data?.data?.users || [];

  const openEdit = (user) => { setSelectedUser(user); setEditForm({ name: user.name, role: user.role, department: user.department, designation: user.designation || '', phone: user.phone }); setEditModal(true); };

  const handleUpdate = async () => {
    try {
      await userService.update(selectedUser._id, editForm);
      qc.invalidateQueries('users');
      toast.success('User updated');
      setEditModal(false);
    } catch {}
  };

  const handleDeactivate = async (userId) => {
    if (!window.confirm('Deactivate this user? They will lose access.')) return;
    try {
      await userService.deactivate(userId);
      qc.invalidateQueries('users');
      toast.success('User deactivated');
    } catch {}
  };

  const columns = [
    { key: 'employeeId', label: 'ID', render: (v) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-accent)' }}>{v}</span> },
    { key: 'name', label: 'Name', render: (v) => <span style={{ fontWeight: 500 }}>{v}</span> },
    { key: 'email', label: 'Email', render: (v) => <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{v}</span> },
    { key: 'role', label: 'Role', render: (v) => <Badge>{v.replace('_', ' ')}</Badge> },
    { key: 'department', label: 'Department' },
    { key: 'isActive', label: 'Status', render: (v) => v ? <span style={{ color: 'var(--color-success)', fontSize: '12px', fontWeight: 600 }}>Active</span> : <span style={{ color: 'var(--color-danger)', fontSize: '12px', fontWeight: 600 }}>Inactive</span> },
    {
      key: '_id', label: 'Actions', render: (id, row) => (
        <div style={{ display: 'flex', gap: '6px' }}>
          <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); openEdit(row); }} style= {{border:'none', borderRadius:'10px'}}>Edit</Button>
          {row.isActive && <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); handleDeactivate(id); }} style= {{border:'none', borderRadius:'10px'}}><span style={{color:'black'}}><UserX size={12} /></span></Button>}
        </div>
      )
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700 }}>User Management</h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>{users.length} users</p>
        </div>
      </div>

      <Card style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Search size={15} color="var(--color-text-muted)" />
          <input
            placeholder="Search by name, ID, or email..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--color-text-primary)', fontSize: '14px', flex: 1 }}
          />
        </div>
      </Card>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><Spinner /></div> : <Table columns={columns} data={users} />}
      </Card>

      <Modal open={editModal} onClose={() => setEditModal(false)} title="Edit User">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Input label="Name" value={editForm.name || ''} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
          <Input label="Phone" value={editForm.phone || ''} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} />
          <Input label="Designation" value={editForm.designation || ''} onChange={(e) => setEditForm((f) => ({ ...f, designation: e.target.value }))} />
          <Select label="Role" options={ROLE_OPTIONS} value={editForm.role || ''} onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))} />
          <Select label="Department" options={DEPT_OPTIONS} value={editForm.department || ''} onChange={(e) => setEditForm((f) => ({ ...f, department: e.target.value }))} />
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
            <Button variant="secondary" onClick={() => setEditModal(false)}>Cancel</Button>
            <Button onClick={handleUpdate}>Save Changes</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
