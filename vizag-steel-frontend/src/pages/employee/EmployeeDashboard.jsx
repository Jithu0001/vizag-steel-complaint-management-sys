import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { FileText, Clock, CheckCircle, AlertTriangle, Plus, ArrowRight } from 'lucide-react';
import { complaintService } from '../../services/services';
import { StatCard, Card, Badge, Button, Spinner } from '../../components/common/UI';
import { format } from 'date-fns';
import { useAuth } from '../../context/AuthContext';

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery(
    'myComplaints',
    () => complaintService.getAll({ limit: 5, sortBy: 'createdAt', order: 'desc' }),
    { staleTime: 30000 }
  );

  const complaints = data?.data?.data?.complaints || [];
  const total = data?.data?.data?.pagination?.total || 0;

  const counts = {
    pending: complaints.filter((c) => c.status === 'pending').length,
    inProgress: complaints.filter((c) => c.status === 'in_progress').length,
    resolved: complaints.filter((c) => ['resolved', 'verified', 'closed'].includes(c.status)).length,
  };

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}><Spinner size={32} /></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>My Dashboard</h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>
            {user?.department} · {format(new Date(), 'EEEE, MMMM d')}
          </p>
        </div>
        <Button onClick={() => navigate('/complaints/new')} size="md">
          <Plus size={16} /> Raise Complaint
        </Button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <StatCard label="Total Raised" value={total} icon={FileText} color="var(--color-accent)" />
        <StatCard label="Pending" value={counts.pending} icon={Clock} color="var(--color-warning)" />
        <StatCard label="In Progress" value={counts.inProgress} icon={AlertTriangle} color="var(--color-critical)" />
        <StatCard label="Resolved" value={counts.resolved} icon={CheckCircle} color="var(--color-success)" />
      </div>

      {/* Recent Complaints */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600 }}>Recent Complaints</h2>
          <button onClick={() => navigate('/complaints')} style={{ background: 'none', border: 'none', color: 'var(--color-accent)', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            View all <ArrowRight size={14} />
          </button>
        </div>

        {complaints.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>
            <FileText size={36} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <p style={{ fontWeight: 500, marginBottom: '4px' }}>No complaints yet</p>
            <p style={{ fontSize: '13px' }}>Raise your first complaint to get started</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {complaints.map((c) => (
              <div
                key={c._id}
                onClick={() => navigate(`/complaints/${c._id}`)}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '14px', background: 'var(--color-bg-elevated)', borderRadius: 'var(--radius-md)',
                  cursor: 'pointer', border: '1px solid var(--color-border)', transition: 'var(--transition)',
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--color-border-focus)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--color-border)'}
              >
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 600, marginBottom: '2px' }}>{c.title}</p>
                  <p style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                    {c.complaintNumber} · {format(new Date(c.createdAt), 'MMM d, yyyy')}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <Badge priority={c.priority} />
                  <Badge status={c.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
