import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button, Input } from '../../components/common/UI';
import { toast } from 'react-toastify';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--color-bg-primary)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            width: 56, height: 56, background: 'var(--color-accent)', borderRadius: '16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
            boxShadow: 'var(--shadow-glow)',
          }}>
            <Shield size={26} color="#fff" />
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, marginBottom: '6px' }}>VSP CMS</h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
            Vizag Steel Plant · Complaint Management
          </p>
        </div>

        {/* Form */}
        <div style={{
          background: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)', padding: '32px',
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '24px' }}>Sign in to your account</h2>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <Input
              label="Email address"
              type="email" placeholder="you@vizagsteel.com"
              value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
            <div>
              <Input
                label="Password"
                type={showPw ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
              <button
                type="button" onClick={() => setShowPw((s) => !s)}
                style={{ marginTop: '6px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                {showPw ? <EyeOff size={12} /> : <Eye size={12} />} {showPw ? 'Hide' : 'Show'} password
              </button>
            </div>
            <Button type="submit" loading={loading} size="lg" style={{ width: '100%', marginTop: '4px',  borderRadius: '10px',border:'none'}}>
              <span className="text-black rounded" style={{ color: 'black',fontWeight:'bold' }}>Sign in</span>
            </Button>
          </form>
          <p style={{ textAlign: 'center', fontSize: '13px', marginTop: '20px', color: 'var(--color-text-muted)' }}>
            New employee?{' '}
            <Link to="/register" style={{ color: 'var(--color-accent)', textDecoration: 'none', fontWeight: 500 }}>
              Create account
            </Link>
          </p>
        </div>

        <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '24px' }}>
          Vizag Steel Plant · Internal Portal · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
