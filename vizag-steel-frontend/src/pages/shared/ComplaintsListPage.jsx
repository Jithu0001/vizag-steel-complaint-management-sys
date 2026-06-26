import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { Search, Filter, Plus } from 'lucide-react';
import { complaintService } from '../../services/services';
import { Badge, Button, Card, Spinner, Table } from '../../components/common/UI';
import { format } from 'date-fns';
import { useAuth } from '../../context/AuthContext';

const STATUSES = ['', 'pending', 'assigned', 'in_progress', 'resolved', 'verified', 'closed', 'escalated', 'rejected'];
const CATEGORIES = ['', 'ELECTRICAL', 'SAFETY', 'CIVIL', 'MECHANICAL', 'ENVIRONMENTAL', 'HOUSEKEEPING', 'IT', 'OTHER'];

export default function ComplaintsListPage() {
  const navigate = useNavigate();
  const { canManage } = useAuth();
  const [filters, setFilters] = useState({ status: '', category: '', page: 1, limit: 20 });

  const { data, isLoading, isFetching } = useQuery(
    ['complaints', filters],
    () => complaintService.getAll(filters),
    { keepPreviousData: true }
  );

  const complaints = data?.data?.data?.complaints || [];
  const pagination = data?.data?.data?.pagination || {};

  const setFilter = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value, page: 1 }));

  const columns = [
    { key: 'complaintNumber', label: 'Number', render: (v) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-accent)' }}>{v}</span> },
    { key: 'title', label: 'Title', render: (v) => <span style={{ fontWeight: 500 }}>{v}</span> },
    { key: 'category', label: 'Category', render: (v) => <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{v}</span> },
    { key: 'assignedDept', label: 'Department' },
    { key: 'priority', label: 'Priority', render: (v) => <Badge priority={v} /> },
    { key: 'status', label: 'Status', render: (v) => <Badge status={v} /> },
    { key: 'createdAt', label: 'Date', render: (v) => <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{format(new Date(v), 'MMM d, yyyy')}</span> },
    { key: 'slaBreached', label: 'SLA', render: (v) => v ? <span style={{ color: 'var(--color-danger)', fontSize: '12px', fontWeight: 600 }}>BREACHED</span> : <span style={{ color: 'var(--color-success)', fontSize: '12px' }}>OK</span> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700 }}>{canManage ? 'All Complaints' : 'My Complaints'}</h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>
            {pagination.total || 0} total records
          </p>
        </div>
        <Button onClick={() => navigate('/complaints/new')}><Plus size={20} style={{ color: 'black',paddingBottom:'5px',borderRadius:'10px' }}/> <span style={{ color: 'black' }}>Raise Complaint</span></Button>
      </div>

      {/* Filters */}
      <Card style={{ padding: '14px 20px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <Filter size={16} color="var(--color-text-muted)" />
          <select
            value={filters.status} onChange={setFilter('status')}
            style={{ background: 'var(--color-bg-input)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '7px 12px', fontSize: '13px', color: 'var(--color-text-primary)', cursor: 'pointer' }}
          >
            <option value="">All Statuses</option>
            {STATUSES.filter(Boolean).map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
          <select
            value={filters.category} onChange={setFilter('category')}
            style={{ background: 'var(--color-bg-input)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '7px 12px', fontSize: '13px', color: 'var(--color-text-primary)', cursor: 'pointer' }}
          >
            <option value="">All Categories</option>
            {CATEGORIES.filter(Boolean).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {(filters.status || filters.category) && (
            <button onClick={() => setFilters({ status: '', category: '', page: 1, limit: 20 })} style={{ fontSize: '12px', color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
              Clear filters
            </button>
          )}
          {isFetching && <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Refreshing...</span>}
        </div>
      </Card>

      {/* Table */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><Spinner /></div>
        ) : (
          <>
            <Table columns={columns} data={complaints} onRowClick={(row) => navigate(`/complaints/${row._id}`)} />
            {/* Pagination */}
            {pagination.pages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '16px', borderTop: '1px solid var(--color-border)' }}>
                <Button variant="secondary" size="sm" disabled={filters.page <= 1} onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}>Previous</Button>
                <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Page {filters.page} of {pagination.pages}</span>
                <Button variant="secondary" size="sm" disabled={filters.page >= pagination.pages} onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}>Next</Button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
