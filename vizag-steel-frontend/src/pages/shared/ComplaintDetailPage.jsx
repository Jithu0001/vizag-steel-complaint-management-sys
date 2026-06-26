import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from 'react-query';
import { MapPin, Camera, Clock, User, ChevronLeft, Star } from 'lucide-react';
import { complaintService } from '../../services/services';
import { Badge, Button, Card, Modal, Select, Spinner } from '../../components/common/UI';
import { format } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import { joinComplaintRoom, leaveComplaintRoom, onSocketEvent } from '../../services/socket';
import { toast } from 'react-toastify';

const STATUS_OPTIONS = {
  supervisor: ['assigned', 'in_progress', 'resolved', 'verified', 'rejected'],
  department_admin: ['assigned', 'in_progress', 'resolved', 'verified', 'closed', 'rejected'],
  super_admin: ['assigned', 'in_progress', 'resolved', 'verified', 'closed', 'escalated', 'rejected'],
};

export default function ComplaintDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, canManage, isEmployee } = useAuth();
  const queryClient = useQueryClient();
  const [statusModal, setStatusModal] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState(false);
  const [statusForm, setStatusForm] = useState({ status: '', remark: '', resolutionNote: '' });
  const [feedback, setFeedback] = useState({ rating: 5, comment: '' });
  const [updating, setUpdating] = useState(false);

  const { data, isLoading } = useQuery(['complaint', id], () => complaintService.getById(id));
  const complaint = data?.data?.data?.complaint;

  // Join socket room for live updates
  useEffect(() => {
    if (!id) return;
    joinComplaintRoom(id);
    const cleanup = onSocketEvent('status:changed', (payload) => {
      if (payload.complaintId === id) {
        queryClient.invalidateQueries(['complaint', id]);
        toast.info(`Status updated to: ${payload.newStatus.replace('_', ' ').toUpperCase()}`);
      }
    });
    return () => { leaveComplaintRoom(id); cleanup(); };
  }, [id, queryClient]);

  const handleStatusUpdate = async () => {
    setUpdating(true);
    try {
      await complaintService.updateStatus(id, statusForm);
      queryClient.invalidateQueries(['complaint', id]);
      queryClient.invalidateQueries('complaints');
      toast.success('Status updated!');
      setStatusModal(false);
    } catch {
    } finally {
      setUpdating(false);
    }
  };

  const handleFeedback = async () => {
    setUpdating(true);
    try {
      await complaintService.submitFeedback(id, feedback);
      queryClient.invalidateQueries(['complaint', id]);
      toast.success('Feedback submitted. Thank you!');
      setFeedbackModal(false);
    } catch {
    } finally {
      setUpdating(false);
    }
  };

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}><Spinner size={32} /></div>;
  if (!complaint) return <div>Complaint not found.</div>;

  const canFeedback = isEmployee &&
    ['resolved', 'closed'].includes(complaint.status) &&
    !complaint.feedback?.rating &&
    complaint.raisedBy?._id === user?._id;

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
          <ChevronLeft size={16} /> Back
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-accent)', display: 'block', marginBottom: '4px' }}>{complaint.complaintNumber}</span>
            <h1 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>{complaint.title}</h1>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <Badge status={complaint.status} />
              <Badge priority={complaint.priority} />
              {complaint.slaBreached && <span className="badge" style={{ background: 'var(--color-danger-muted)', color: 'var(--color-danger)' }}>SLA Breached</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {canManage && <Button onClick={() => { setStatusForm({ status: complaint.status, remark: '', resolutionNote: '' }); setStatusModal(true); }}><span style={{color:'black', fontWeight:'bold'}}>Update Status</span></Button>}
            {canFeedback && <Button variant="success" onClick={() => setFeedbackModal(true)}><Star size={14} /> Give Feedback</Button>}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px', alignItems: 'start' }}>
        {/* Main */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Card>
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Description</h3>
            <p style={{ fontSize: '14px', lineHeight: 1.7 }}>{complaint.description}</p>
          </Card>

          {/* Photos */}
          {complaint.photos?.length > 0 && (
            <Card>
              <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                <Camera size={14} style={{ marginRight: '6px' }} />Photos
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' }}>
                {complaint.photos.map((p, i) => (
                  <a key={i} href={p.url} target="_blank" rel="noreferrer">
                    <img src={p.url} alt={`Photo ${i + 1}`} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} />
                  </a>
                ))}
              </div>
            </Card>
          )}

          {/* Status History */}
          <Card>
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Status Timeline</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {(complaint.statusHistory || []).map((h, i) => (
                <div key={i} style={{ display: 'flex', gap: '14px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: i === 0 ? 'var(--color-accent)' : 'var(--color-border)', flexShrink: 0, marginTop: 4 }} />
                    {i < complaint.statusHistory.length - 1 && <div style={{ width: 2, flex: 1, background: 'var(--color-border)', margin: '4px 0' }} />}
                  </div>
                  <div style={{ paddingBottom: i < complaint.statusHistory.length - 1 ? '16px' : 0 }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '2px' }}>
                      <Badge status={h.status} />
                      <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{format(new Date(h.changedAt || Date.now()), 'MMM d, h:mm a')}</span>
                    </div>
                    {h.remark && <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{h.remark}</p>}
                    {h.changedBy?.name && <p style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>by {h.changedBy.name}</p>}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Feedback */}
          {complaint.feedback?.rating && (
            <Card>
              <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Employee Feedback</h3>
              <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                {[1,2,3,4,5].map((s) => <Star key={s} size={18} fill={s <= complaint.feedback.rating ? 'var(--color-warning)' : 'none'} color="var(--color-warning)" />)}
              </div>
              {complaint.feedback.comment && <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>{complaint.feedback.comment}</p>}
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Card>
            <h3 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '14px' }}>Details</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              <Row label="Category" value={complaint.category} />
              <Row label="Department" value={complaint.assignedDept} />
              <Row label="Raised by" value={`${complaint.raisedBy?.name} (${complaint.raisedBy?.employeeId})`} />
              {complaint.assignedTo && <Row label="Assigned to" value={complaint.assignedTo?.name} />}
              <Row label="Submitted" value={format(new Date(complaint.createdAt), 'MMM d, yyyy h:mm a')} />
              {complaint.resolvedAt && <Row label="Resolved" value={format(new Date(complaint.resolvedAt), 'MMM d, yyyy h:mm a')} />}
              {complaint.slaDeadline && (
                <Row
                  label="SLA Deadline"
                  value={format(new Date(complaint.slaDeadline), 'MMM d, h:mm a')}
                  valueStyle={{ color: complaint.slaBreached ? 'var(--color-danger)' : 'var(--color-text-primary)' }}
                />
              )}
            </div>
          </Card>

          {complaint.location && (
            <Card>
              <h3 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
                <MapPin size={12} style={{ marginRight: '4px' }} />Location
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '6px', fontFamily: 'var(--font-mono)' }}>
                {complaint.location.coordinates[1].toFixed(5)}, {complaint.location.coordinates[0].toFixed(5)}
              </p>
              {complaint.location.zone && <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Zone: {complaint.location.zone}</p>}
              {complaint.location.building && <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Building: {complaint.location.building}</p>}
              <a
                href={`https://www.google.com/maps?q=${complaint.location.coordinates[1]},${complaint.location.coordinates[0]}`}
                target="_blank" rel="noreferrer"
                style={{ display: 'block', marginTop: '10px', fontSize: '12px', color: 'var(--color-accent)', textDecoration: 'none' }}
              >
                Open in Maps →
              </a>
            </Card>
          )}

          {complaint.resolutionNote && (
            <Card>
              <h3 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Resolution Note</h3>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>{complaint.resolutionNote}</p>
            </Card>
          )}
        </div>
      </div>

      {/* Status Update Modal */}
      <Modal open={statusModal} onClose={() => setStatusModal(false)} title="Update Status">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Select
            label="New Status"
            options={(STATUS_OPTIONS[user?.role] || []).map((s) => ({ value: s, label: s.replace('_', ' ').toUpperCase() }))}
            value={statusForm.status}
            onChange={(e) => setStatusForm((f) => ({ ...f, status: e.target.value }))}
          />
          <div>
            <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px' }}>Remark</label>
            <textarea
              value={statusForm.remark} onChange={(e) => setStatusForm((f) => ({ ...f, remark: e.target.value }))}
              placeholder="Brief note about this status change..."
              rows={3}
              style={{ width: '100%', background: 'var(--color-bg-input)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: '14px', color: 'var(--color-text-primary)', outline: 'none', resize: 'vertical', fontFamily: 'var(--font-sans)' }}
            />
          </div>
          
            <div>
              <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px' }}>Resolution Note</label>
              <textarea
                value={statusForm.resolutionNote} onChange={(e) => setStatusForm((f) => ({ ...f, resolutionNote: e.target.value }))}
                placeholder="Describe how the issue was resolved..."
                rows={3}
                style={{ width: '100%', background: 'var(--color-bg-input)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: '14px', color: 'var(--color-text-primary)', outline: 'none', resize: 'vertical', fontFamily: 'var(--font-sans)' }}
              />
            </div>
          
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setStatusModal(false)}>Cancel</Button>
            <Button loading={updating} onClick={handleStatusUpdate} disabled={!statusForm.status}><span style={{color:'black'}}>Update</span></Button>
          </div>
        </div>
      </Modal>

      {/* Feedback Modal */}
      <Modal open={feedbackModal} onClose={() => setFeedbackModal(false)} title="Rate the Resolution">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '10px' }}>How satisfied are you with the resolution?</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[1,2,3,4,5].map((s) => (
                <button key={s} onClick={() => setFeedback((f) => ({ ...f, rating: s }))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  <Star size={28} fill={s <= feedback.rating ? 'var(--color-warning)' : 'none'} color="var(--color-warning)" />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px' }}>Comments (optional)</label>
            <textarea
              value={feedback.comment} onChange={(e) => setFeedback((f) => ({ ...f, comment: e.target.value }))}
              placeholder="Any comments about the resolution..."
              rows={3}
              style={{ width: '100%', background: 'var(--color-bg-input)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: '14px', color: 'var(--color-text-primary)', outline: 'none', resize: 'vertical', fontFamily: 'var(--font-sans)' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setFeedbackModal(false)}>Cancel</Button>
            <Button loading={updating} onClick={handleFeedback} variant="success">Submit Feedback</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

const Row = ({ label, value, valueStyle = {} }) => (
  <div>
    <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '2px' }}>{label}</p>
    <p style={{ fontWeight: 500, ...valueStyle }}>{value || '—'}</p>
  </div>
);
