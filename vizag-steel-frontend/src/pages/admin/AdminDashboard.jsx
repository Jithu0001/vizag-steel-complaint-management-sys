import React from 'react';
import { useQuery } from 'react-query';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
} from 'recharts';
import { FileText, Clock, CheckCircle, AlertTriangle, TrendingUp, Download, XCircle } from 'lucide-react';
import { analyticsService } from '../../services/services';
import { StatCard, Card, Button, Spinner, Badge } from '../../components/common/UI';
import { format } from 'date-fns';
import { toast } from 'react-toastify';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316', '#EC4899', '#06B6D4'];

const TT = {
  contentStyle: { background: '#1A2235', border: '1px solid #1E2D45', borderRadius: 8, fontSize: 12 },
  labelStyle: { color: '#F1F5F9' },
  itemStyle: { color: '#94A3B8' },
};

/* Placeholder shown when a chart has no data yet */
const ChartEmpty = ({ height = 220 }) => (
  <div style={{
    height, display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'var(--color-text-muted)', fontSize: '13px', flexDirection: 'column', gap: 8,
  }}>
    <div style={{ fontSize: 28, opacity: 0.3 }}>📊</div>
    No data yet
  </div>
);

export default function AdminDashboard() {
  const { data: summary, isLoading: sumLoading } = useQuery('dashboard', analyticsService.getDashboard, { staleTime: 60000 });
  const { data: deptData }  = useQuery('byDept', analyticsService.getComplaintsByDepartment, { staleTime: 60000 });
  const { data: timeData }  = useQuery('overTime', () => analyticsService.getOverTime({ days: 30, period: 'daily' }), { staleTime: 60000 });
  const { data: catData }   = useQuery('categories', analyticsService.getCategoryBreakdown, { staleTime: 60000 });
  const { data: slaData }   = useQuery('sla', analyticsService.getSlaReport, { staleTime: 60000 });

  const s          = summary?.data?.data  || {};
  const depts      = deptData?.data?.data?.departments || [];
  const timeline   = timeData?.data?.data?.timeline    || [];
  const categories = catData?.data?.data?.categories   || [];
  const sla        = slaData?.data?.data?.sla          || [];

  const downloadReport = async () => {
    try {
      const res = await analyticsService.downloadPdfReport({ month: new Date().getMonth() + 1, year: new Date().getFullYear() });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url; a.download = `VSP-Report-${format(new Date(), 'yyyy-MM')}.pdf`; a.click();
      toast.success('Report downloaded!');
    } catch { toast.error('Failed to generate report'); }
  };

  if (sumLoading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}>
      <Spinner size={32} />
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>Admin Dashboard</h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <Button variant="secondary" onClick={downloadReport}>
          <Download size={16} /> Download Report
        </Button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
        <StatCard label="Total Complaints" value={s.total}      icon={FileText}      color="var(--color-accent)"   />
        <StatCard label="Pending"          value={s.pending}    icon={Clock}         color="var(--color-warning)"  />
        <StatCard label="In Progress"      value={s.inProgress} icon={TrendingUp}    color="var(--color-critical)" />
        <StatCard label="Resolved"         value={s.resolved}   icon={CheckCircle}   color="var(--color-success)"  />
        <StatCard label="SLA Breached"     value={s.slaBreached}icon={XCircle}       color="var(--color-danger)"   />
        <StatCard label="Escalated"        value={s.escalated}  icon={AlertTriangle} color="var(--color-danger)"   />
      </div>

      {/* Charts row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>

        {/* Timeline Line Chart */}
        <Card>
          <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>Complaints Over Time (30d)</h3>
          {/* ✅ FIX: explicit pixel height div wrapping ResponsiveContainer */}
          <div style={{ width: '100%', height: 220 }}>
            {timeline.length === 0 ? <ChartEmpty height={220} /> : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E2D45" />
                  <XAxis dataKey="_id" tick={{ fill: '#475569', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#475569', fontSize: 11 }} />
                  <Tooltip {...TT} />
                  <Line type="monotone" dataKey="count"    stroke="#3B82F6" strokeWidth={2} dot={false} name="Raised"   />
                  <Line type="monotone" dataKey="resolved" stroke="#10B981" strokeWidth={2} dot={false} name="Resolved" />
                  <Legend wrapperStyle={{ fontSize: 12, color: '#94A3B8' }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Category Pie */}
        <Card>
          <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>By Category</h3>
          {categories.length === 0 ? <ChartEmpty height={200} /> : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {/* ✅ FIX: explicit pixel height div */}
              <div style={{ width: '55%', height: 200, flexShrink: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categories} dataKey="count" nameKey="_id"
                      cx="50%" cy="50%" outerRadius={80} innerRadius={50}
                    >
                      {categories.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip {...TT} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', overflow: 'hidden' }}>
                {categories.map((c, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                      <span style={{ color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c._id}</span>
                    </div>
                    <span style={{ fontWeight: 600, marginLeft: 8, flexShrink: 0 }}>{c.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Charts row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>

        {/* By Department Bar Chart */}
        <Card>
          <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>By Department</h3>
          {/* ✅ FIX: explicit pixel height div */}
          <div style={{ width: '100%', height: 220 }}>
            {depts.length === 0 ? <ChartEmpty height={220} /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={depts} layout="vertical">
                  <XAxis type="number" tick={{ fill: '#475569', fontSize: 11 }} />
                  <YAxis dataKey="_id" type="category" tick={{ fill: '#94A3B8', fontSize: 11 }} width={90} />
                  <Tooltip {...TT} />
                  <Bar dataKey="total"    fill="#3B82F6" radius={[0, 4, 4, 0]} name="Total"    />
                  <Bar dataKey="resolved" fill="#10B981" radius={[0, 4, 4, 0]} name="Resolved" />
                  <Legend wrapperStyle={{ fontSize: 12, color: '#94A3B8' }} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* SLA Table */}
        <Card>
          <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>SLA Performance</h3>
          {sla.length === 0 ? (
            <ChartEmpty height={180} />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                    {['Department', 'Total', 'Breached', 'Breach %'].map((h) => (
                      <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sla.map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '10px' }}>{row._id}</td>
                      <td style={{ padding: '10px' }}>{row.total}</td>
                      <td style={{ padding: '10px', color: 'var(--color-danger)' }}>{row.breached}</td>
                      <td style={{ padding: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ flex: 1, height: 6, background: 'var(--color-border)', borderRadius: 3 }}>
                            <div style={{
                              height: '100%',
                              width: `${Math.min(row.breachRate ?? 0, 100)}%`,
                              background: (row.breachRate > 50) ? 'var(--color-danger)' : (row.breachRate > 25) ? 'var(--color-warning)' : 'var(--color-success)',
                              borderRadius: 3,
                            }} />
                          </div>
                          <span style={{ fontSize: '12px', minWidth: 36, color: row.breachRate > 50 ? 'var(--color-danger)' : 'var(--color-text-secondary)' }}>
                            {row.breachRate?.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}