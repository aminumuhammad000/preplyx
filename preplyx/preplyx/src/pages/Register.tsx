import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, Eye, EyeOff, ShieldAlert, Phone, CheckCircle2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

import { API_BASE_URL } from '../config/api';

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Notification alert state
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAlert(null);
    
    try {
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, phone })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to register');
      
      setAlert({
        type: 'success',
        message: `Account created successfully! Welcome to Preplyx, ${data.name || 'Student'}!`
      });

      login(data, data.token);

      setTimeout(() => {
        navigate('/dashboard');
      }, 1200);
    } catch (error: any) {
      setAlert({
        type: 'error',
        message: error.message || 'Registration failed. Please check your details and try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: '#F8F8FC',
      padding: '16px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        backgroundColor: '#fff',
        borderRadius: '20px',
        padding: '32px 28px',
        boxShadow: '0 16px 40px rgba(0,0,0,0.06)',
        border: '1px solid rgba(0,0,0,0.08)'
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '20px' }}>
          <img
            src="/logo.svg"
            alt="Preplyx Logo"
            style={{
              width: '36px', height: '36px', borderRadius: '10px',
              objectFit: 'contain', boxShadow: '0 4px 12px rgba(123, 47, 247, 0.3)',
              flexShrink: 0
            }}
          />
          <span style={{ fontSize: '22px', fontWeight: 800, color: '#1e293b' }}>
            Preplyx
          </span>
        </div>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
            Create Account
          </h1>
          <p style={{ fontSize: '13px', color: '#64748b' }}>
            Sign up to start your CBT exam preparation
          </p>
        </div>

        {/* In-Card Dynamic Modern Alert */}
        {alert && (
          <div style={{
            marginBottom: '20px',
            padding: '12px 14px',
            borderRadius: '12px',
            backgroundColor: alert.type === 'success' ? '#ecfdf5' : '#fef2f2',
            border: alert.type === 'success' ? '1px solid #a7f3d0' : '1px solid #fecaca',
            color: alert.type === 'success' ? '#065f46' : '#991b1b',
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            animation: 'fadeIn 0.3s ease'
          }}>
            {alert.type === 'success' ? (
              <CheckCircle2 size={18} color="#10B981" style={{ flexShrink: 0 }} />
            ) : (
              <ShieldAlert size={18} color="#EF4444" style={{ flexShrink: 0 }} />
            )}
            <span style={{ flex: 1, lineHeight: 1.4 }}>{alert.message}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Name */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#334155', marginBottom: '6px' }}>
              Full Name
            </label>
            <div style={{ position: 'relative' }}>
              <User size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                required
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 38px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  fontSize: '13px',
                  outline: 'none',
                  backgroundColor: '#f8fafc',
                  color: '#0f172a'
                }}
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#334155', marginBottom: '6px' }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 38px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  fontSize: '13px',
                  outline: 'none',
                  backgroundColor: '#f8fafc',
                  color: '#0f172a'
                }}
              />
            </div>
          </div>

          {/* Phone (Optional) */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#334155' }}>
                Phone Number
              </label>
              <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Optional</span>
            </div>
            <div style={{ position: 'relative' }}>
              <Phone size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+234 800 000 0000"
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 38px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  fontSize: '13px',
                  outline: 'none',
                  backgroundColor: '#f8fafc',
                  color: '#0f172a'
                }}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#334155', marginBottom: '6px' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: '100%',
                  padding: '10px 38px 10px 38px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  fontSize: '13px',
                  outline: 'none',
                  backgroundColor: '#f8fafc',
                  color: '#0f172a'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                {showPassword ? <EyeOff size={16} color="#94a3b8" /> : <Eye size={16} color="#94a3b8" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #4B0FA3 0%, #7B2FF7 100%)',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 700,
              border: 'none',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              opacity: isLoading ? 0.7 : 1,
              marginTop: '4px'
            }}
          >
            {isLoading ? 'Creating account...' : (
              <>
                Sign Up <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Login Link */}
        <div style={{ textAlign: 'center', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
            Already have an account?{' '}
            <Link
              to="/login"
              style={{
                color: '#7B2FF7',
                fontSize: '13px',
                fontWeight: 700,
                textDecoration: 'underline'
              }}
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
