import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { Shield } from 'lucide-react';
import { auditService } from '../../services/services';
import { Card, Spinner, Table } from '../../components/common/UI';
import { format } from 'date-fns';

const ACTION_COLOR = {
  COMPLAINT_CREATED: 'var(--color-accent)', STATUS_CHANGED: 'var(--color-warning)',
  COMPLAINT_ESCALATED: 'var(--color-danger)', USER_CREATED: 'var(--color-success)',
  LOGIN: 'var(--color-text-muted)', LOGOUT: 'var(--color-text-muted)',
  REPORT_GENERATED: 'var(--color-success)',
};

export default function AuditLogPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery(['audit', page], () => auditService.getAll({ page, limit: 30 }), { keepPreviousData: true });
  const logs = data?.data?.data?.logs || [];
  const pagination = data?.data?.data?.pagination || {};

  const columns = [
    { key: 'action', label: 'Action', render: (v) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: ACTION_COLOR[v] || 'var(--color-accent)' }}>{v}</span> },
    { key: 'performedBy', label: 'By', render: (v) => <span style={{ fontSize: '13px' }}>{v?.name} <span style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>({v?.role})</span></span> },
    { key: 'targetComplaint', label: 'Complaint', render: (v) => v ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-accent)' }}>{v?.complaintNumber || v}</span> : '—' },
    { key: 'details', label: 'Details', render: (v) => <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{JSON.stringify(v)}</span> },
    { key: 'createdAt', label: 'Time', render: (v) => <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{format(new Date(v), 'MMM d, HH:mm:ss')}</span> },
    { key: 'ipAddress', label: 'IP', render: (v) => <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>{v || '—'}</span> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Shield size={20} /> Audit Log
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>Immutable record of all system actions</p>
      </div>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? <div style={{ display:'flex', justifyContent:'center', padding:'60px' }}><Spinner /></div> : (
          <>
            <Table columns={columns} data={logs} emptyMessage="No audit records found" />
            {pagination.pages > 1 && (
              <div style={{ display:'flex', justifyContent:'center', gap:'8px', padding:'14px', borderTop:'1px solid var(--color-border)' }}>
                <button onClick={() => setPage((p) => Math.max(1, p-1))} disabled={page<=1} style={{ fontSize:'13px', background:'none', border:'none', color:'var(--color-accent)', cursor:'pointer', padding:'4px 8px' }}>← Prev</button>
                <span style={{ fontSize:'13px', color:'var(--color-text-muted)', padding:'4px 8px' }}>Page {page} / {pagination.pages}</span>
                <button onClick={() => setPage((p) => p+1)} disabled={page>=pagination.pages} style={{ fontSize:'13px', background:'none', border:'none', color:'var(--color-accent)', cursor:'pointer', padding:'4px 8px' }}>Next →</button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
