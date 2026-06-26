import React from 'react';
import { Loader2 } from 'lucide-react';
import clsx from 'clsx';

/* ── Button ──────────────────────────────────────────────────────────────── */
const VARIANT_STYLES = {
  primary: {
    background: 'var(--color-accent)',
    color: '#fff',
    border: '1px solid transparent',
  },
  secondary: {
    background: 'var(--color-bg-elevated)',
    color: 'var(--color-text-primary)',
    border: '1px solid var(--color-border)',
  },
  danger: {
    background: '#DC2626',
    color: '#fff',
    border: '1px solid transparent',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--color-text-secondary)',
    border: '1px solid transparent',
  },
  success: {
    background: '#059669',
    color: '#fff',
    border: '1px solid transparent',
  },
};

const SIZE_STYLES = {
  sm: { fontSize: '12px', padding: '6px 12px' },
  md: { fontSize: '14px', padding: '8px 16px' },
  lg: { fontSize: '15px', padding: '12px 24px' },
};

export const Button = ({
  children, variant = 'primary', size = 'md',
  loading = false, disabled = false, style = {}, ...props
}) => {
  const [hovered, setHovered] = React.useState(false);

  const hoverMap = {
    primary:   { background: 'var(--color-accent-hover)' },
    secondary: { background: 'var(--color-bg-card)', borderColor: 'var(--color-border-focus)' },
    danger:    { background: '#B91C1C' },
    ghost:     { background: 'var(--color-bg-elevated)', color: 'var(--color-text-primary)' },
    success:   { background: '#047857' },
  };

  return (
    <button
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      disabled={disabled || loading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        fontWeight: 500,
        borderRadius: 'var(--radius-lg)',
        transition: 'var(--transition)',
        outline: 'none',
        cursor: loading || disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        fontFamily: 'var(--font-sans)',
        ...VARIANT_STYLES[variant],
        ...SIZE_STYLES[size],
        ...(hovered && !disabled && !loading ? hoverMap[variant] : {}),
        ...style,
      }}
      {...props}
    >
      {loading && (
        <Loader2
          size={14}
          className="spin"
          style={{ animation: 'spin 0.8s linear infinite' }}
        />
      )}
      {children}
    </button>
  );
};


/* ── Input ───────────────────────────────────────────────────────────────── */
export const Input = React.forwardRef(({ label, error, className = '', ...props }, ref) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
    {label && <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-secondary)' }}>{label}</label>}
    <input
      ref={ref}
      className={clsx(className)}
      style={{
        background: 'var(--color-bg-input)', border: `1px solid ${error ? 'var(--color-danger)' : 'var(--color-border)'}`,
        borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: '14px',
        color: 'var(--color-text-primary)', outline: 'none', transition: 'var(--transition)',
        width: '100%',
      }}
      onFocus={(e) => { e.target.style.borderColor = 'var(--color-border-focus)'; }}
      onBlur={(e) => { e.target.style.borderColor = error ? 'var(--color-danger)' : 'var(--color-border)'; }}
      {...props}
    />
    {error && <span style={{ fontSize: '12px', color: 'var(--color-danger)' }}>{error}</span>}
  </div>
));

/* ── Select ──────────────────────────────────────────────────────────────── */
export const Select = React.forwardRef(({ label, error, options = [], className = '', ...props }, ref) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
    {label && <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-secondary)' }}>{label}</label>}
    <select
      ref={ref}
      style={{
        background: 'var(--color-bg-input)', border: `1px solid ${error ? 'var(--color-danger)' : 'var(--color-border)'}`,
        borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: '14px',
        color: 'var(--color-text-primary)', outline: 'none', width: '100%',
      }}
      {...props}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} style={{ background: 'var(--color-bg-secondary)' }}>
          {o.label}
        </option>
      ))}
    </select>
    {error && <span style={{ fontSize: '12px', color: 'var(--color-danger)' }}>{error}</span>}
  </div>
));

/* ── Card ────────────────────────────────────────────────────────────────── */
export const Card = ({ children, className = '', style = {}, ...props }) => (
  <div
    style={{
      background: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)', padding: 'var(--space-6)',
      ...style,
    }}
    {...props}
  >
    {children}
  </div>
);

/* ── Badge ───────────────────────────────────────────────────────────────── */
export const Badge = ({ status, priority, children }) => {
  if (status) return <span className={`badge badge-${status}`}>{status.replace('_', ' ')}</span>;
  if (priority) return <span className={`badge`} style={{ background: 'rgba(59,130,246,0.12)', color: `var(--priority-${priority})` }}>{priority}</span>;
  return <span className="badge">{children}</span>;
};

/* ── Spinner ─────────────────────────────────────────────────────────────── */
export const Spinner = ({ size = 24, color = 'var(--color-accent)' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="spin">
    <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="3" strokeOpacity="0.25" />
    <path d="M12 2a10 10 0 0 1 10 10" stroke={color} strokeWidth="3" strokeLinecap="round" />
  </svg>
);

/* ── Modal ───────────────────────────────────────────────────────────────── */
export const Modal = ({ open, onClose, title, children, width = '520px' }) => {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: '16px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="fade-in"
        style={{
          background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)', padding: '28px', width: '100%', maxWidth: width,
          maxHeight: '90vh', overflowY: 'auto',
        }}
      >
        {title && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700 }}>{title}</h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '20px', lineHeight: 1 }}>✕</button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
};

/* ── Empty State ─────────────────────────────────────────────────────────── */
export const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div style={{ textAlign: 'center', padding: '60px 20px' }}>
    {Icon && <div style={{ marginBottom: '16px', opacity: 0.4 }}><Icon size={48} color="var(--color-text-muted)" /></div>}
    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>{title}</h3>
    <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginBottom: '20px' }}>{description}</p>
    {action}
  </div>
);

/* ── Stat Card ───────────────────────────────────────────────────────────── */
export const StatCard = ({ label, value, icon: Icon, color = 'var(--color-accent)', delta }) => (
  <Card style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
    <div style={{
      width: 48, height: 48, borderRadius: 'var(--radius-md)',
      background: `${color}1F`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      {Icon && <Icon size={22} color={color} />}
    </div>
    <div>
      <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '2px' }}>{label}</p>
      <p style={{ fontSize: '28px', fontWeight: 700, lineHeight: 1 }}>{value ?? '—'}</p>
      {delta !== undefined && (
        <p style={{ fontSize: '11px', color: delta >= 0 ? 'var(--color-success)' : 'var(--color-danger)', marginTop: '4px' }}>
          {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}% vs last month
        </p>
      )}
    </div>
  </Card>
);

/* ── Table ───────────────────────────────────────────────────────────────── */
export const Table = ({ columns, data, onRowClick, emptyMessage = 'No records found' }) => (
  <div style={{ overflowX: 'auto' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
      <thead>
        <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
          {columns.map((col) => (
            <th key={col.key} style={{
              padding: '10px 14px', textAlign: 'left', fontSize: '11px',
              fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em',
              whiteSpace: 'nowrap',
            }}>
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.length === 0 ? (
          <tr><td colSpan={columns.length} style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>{emptyMessage}</td></tr>
        ) : (
          data.map((row, i) => (
            <tr
              key={row._id || i}
              onClick={() => onRowClick?.(row)}
              style={{
                borderBottom: '1px solid var(--color-border)', transition: 'var(--transition)',
                cursor: onRowClick ? 'pointer' : 'default',
              }}
              onMouseEnter={(e) => onRowClick && (e.currentTarget.style.background = 'var(--color-bg-elevated)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {columns.map((col) => (
                <td key={col.key} style={{ padding: '12px 14px', color: 'var(--color-text-primary)' }}>
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);
