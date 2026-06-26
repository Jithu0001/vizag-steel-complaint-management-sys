import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { authService } from '../../services/services';
import { Button, Input, Select, Card } from '../../components/common/UI';
import { toast } from 'react-toastify';

const DEPTS = ['Electrical','Safety','Civil','Mechanical','Environmental','Housekeeping','IT','General'].map((d) => ({ value: d, label: d }));

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ employeeId:'', name:'', email:'', phone:'', password:'', department:'Electrical', designation:'', zone:'' });
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authService.register(form);
      toast.success('Account created! Please log in.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:'100vh', background:'var(--color-bg-primary)', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
      <div style={{ width:'100%', maxWidth:520 }}>
        <div style={{ textAlign:'center', marginBottom:'32px' }}>
          <div style={{ width:52, height:52, background:'var(--color-accent)', borderRadius:'14px', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px', boxShadow:'var(--shadow-glow)' }}>
            <Shield size={24} color="#fff" />
          </div>
          <h1 style={{ fontSize:'24px', fontWeight:700 }}>Create Account</h1>
          <p style={{ color:'var(--color-text-secondary)', fontSize:'13px', marginTop:'4px' }}>Vizag Steel Plant · CMS Portal</p>
        </div>
        <Card>
          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
              <Input label="Employee ID *" placeholder="VSP001" value={form.employeeId} onChange={set('employeeId')} required />
              <Input label="Full Name *" placeholder="Ravi Kumar" value={form.name} onChange={set('name')} required />
            </div>
            <Input label="Email *" type="email" placeholder="you@vizagsteel.com" value={form.email} onChange={set('email')} required />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
              <Input label="Phone *" placeholder="+91 9876543210" value={form.phone} onChange={set('phone')} required />
              <Input label="Password *" type="password" placeholder="Min 8 chars" value={form.password} onChange={set('password')} required />
            </div>
            <Select label="Department *" options={DEPTS} value={form.department} onChange={set('department')} />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
              <Input label="Designation" placeholder="Senior Engineer" value={form.designation} onChange={set('designation')} />
              <Input label="Zone / Area" placeholder="Zone-A" value={form.zone} onChange={set('zone')} />
            </div>
            <Button type="submit" loading={loading} size="lg" style={{ width:'100%', marginTop:'4px',borderRadius:'10px',border:'none' }}><span style={{color:'black'}}>Create Account</span></Button>
          </form>
          <p style={{ textAlign:'center', fontSize:'13px', marginTop:'16px', color:'var(--color-text-muted)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color:'var(--color-accent)', textDecoration:'none', fontWeight:500 }}>Sign in</Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
