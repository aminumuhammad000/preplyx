import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Eye, EyeOff, ShieldAlert, CheckCircle2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

import { API_BASE_URL } from '../config/api';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Notification alert state
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Pre-fill remembered credentials if previously saved
  useEffect(() => {
    const savedEmail = localStorage.getItem('preplyx_remembered_email');
    const savedPassword = localStorage.getItem('preplyx_remembered_password');
    const savedRemember = localStorage.getItem('preplyx_remember_me') === 'true';
    if (savedRemember && savedEmail) {
      setEmail(savedEmail);
      if (savedPassword) setPassword(savedPassword);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAlert(null);
    
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Invalid email or password');
      }
      
      // Save or clear remembered credentials
      if (rememberMe) {
        localStorage.setItem('preplyx_remembered_email', email);
        localStorage.setItem('preplyx_remembered_password', password);
        localStorage.setItem('preplyx_remember_me', 'true');
      } else {
        localStorage.removeItem('preplyx_remembered_email');
        localStorage.removeItem('preplyx_remembered_password');
        localStorage.removeItem('preplyx_remember_me');
      }

      // Success Alert
      setAlert({
        type: 'success',
        message: `Welcome back, ${data.name || 'Student'}! Redirecting to your dashboard...`
      });

      login(data, data.token, rememberMe);

      // Brief delay to allow the user to see the success toast
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
    } catch (error: any) {
      setAlert({
        type: 'error',
        message: error.message || 'Invalid login credentials. Please check and try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ 
      height: '100vh', 
      minHeight: '100vh',
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: '#F8F8FC',
      padding: '16px',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* Top Floating Modern Toast Banner */}
      {alert && (
        <div style={{
          position: 'fixed',
          top: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 20px',
          borderRadius: '16px',
          backgroundColor: alert.type === 'success' ? '#10B981' : '#EF4444',
          color: '#ffffff',
          boxShadow: alert.type === 'success' 
            ? '0 12px 30px rgba(16, 185, 129, 0.35)' 
            : '0 12px 30px rgba(239, 68, 68, 0.35)',
          animation: 'slideDown 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
          maxWidth: '440px',
          width: '90%'
        }}>
          {alert.type === 'success' ? (
            <CheckCircle2 size={22} color="#fff" style={{ flexShrink: 0 }} />
          ) : (
            <ShieldAlert size={22} color="#fff" style={{ flexShrink: 0 }} />
          )}

          <div style={{ flex: 1, fontSize: '13px', fontWeight: 600, lineHeight: 1.4 }}>
            {alert.message}
          </div>

          <button 
            onClick={() => setAlert(null)} 
            style={{ 
              background: 'rgba(255,255,255,0.2)', 
              border: 'none', 
              borderRadius: '50%', 
              width: '24px', 
              height: '24px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              cursor: 'pointer',
              color: '#fff',
              flexShrink: 0
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Background Orbs */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        right: '-10%',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'rgba(75, 15, 163, 0.05)',
        filter: 'blur(80px)',
        pointerEvents: 'none'
      }} />

      <div style={{
        width: '100%',
        maxWidth: '400px',
        backgroundColor: '#fff',
        borderRadius: '20px',
        padding: '32px 28px',
        boxShadow: '0 16px 40px rgba(0,0,0,0.06)',
        border: '1px solid rgba(0,0,0,0.08)',
        position: 'relative',
        zIndex: 1
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
            Welcome Back
          </h1>
          <p style={{ fontSize: '13px', color: '#64748b' }}>
            Sign in to continue your exam preparation
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
                  color: '#0f172a',
                  transition: 'all 0.2s ease'
                }}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#334155' }}>
                Password
              </label>
              <Link 
                to="/forgot-password"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#7B2FF7',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textDecoration: 'none'
                }}
              >
                Forgot Password?
              </Link>
            </div>
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
                  color: '#0f172a',
                  transition: 'all 0.2s ease'
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

          {/* Remember Me Checkbox */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '2px 0 0' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#475569', fontWeight: 500, userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{
                  width: '16px',
                  height: '16px',
                  accentColor: '#7B2FF7',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              />
              Remember me
            </label>
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
              transition: 'all 0.2s ease',
              opacity: isLoading ? 0.7 : 1,
              marginTop: '4px'
            }}
          >
            {isLoading ? 'Signing in...' : (
              <>
                Sign In <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Sign Up Link */}
        <div style={{ textAlign: 'center', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
            Don't have an account?{' '}
            <Link
              to="/register"
              style={{
                background: 'none',
                border: 'none',
                color: '#7B2FF7',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Sign Up
            </Link>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes slideDown {
          from {
            transform: translate(-50%, -20px);
            opacity: 0;
          }
          to {
            transform: translate(-50%, 0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
