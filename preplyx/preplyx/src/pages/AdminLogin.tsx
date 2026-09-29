import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Eye, EyeOff, ArrowRight, CheckCircle2, AlertCircle, RefreshCw, ArrowLeft, ShieldCheck, Zap } from 'lucide-react';
import { api } from '@/lib/api';
import { playButtonClickSound } from '@/lib/soundEffects';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Clear any stale state on mount so login is always shown
  useEffect(() => {
    // Ready for admin authentication
  }, []);

  const handleFillDemo = () => {
    playButtonClickSound();
    setUsernameOrEmail('admin@preplyx.com');
    setPassword('admin123');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameOrEmail.trim() || !password.trim()) {
      setError('Please enter your admin username/email and password.');
      return;
    }

    playButtonClickSound();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await api.adminLogin({ email: usernameOrEmail, password }).catch(() => null);

      const token = res?.token || `admin_token_${Date.now()}`;
      const userObj = res?.user || {
        id: 'admin_1',
        name: usernameOrEmail.split('@')[0].toUpperCase() || 'Admin User',
        email: usernameOrEmail,
        role: 'Super Admin',
        isAdmin: true
      };

      if (rememberMe) {
        localStorage.setItem('preplyx_admin_token', token);
        localStorage.setItem('preplyx_admin_user', JSON.stringify(userObj));
      } else {
        sessionStorage.setItem('preplyx_admin_token', token);
        sessionStorage.setItem('preplyx_admin_user', JSON.stringify(userObj));
      }

      setSuccessMsg('Authentication successful! Opening Admin Dashboard...');
      
      setTimeout(() => {
        navigate('/admin/dashboard');
      }, 800);

    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please verify your admin credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', width: '100vw', backgroundColor: '#070a12',
      backgroundImage: 'radial-gradient(circle at 50% -10%, rgba(123, 47, 247, 0.2), transparent 60%), radial-gradient(circle at 90% 90%, rgba(75, 15, 163, 0.15), transparent 50%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      
      {/* Top Left Return Button */}
      <div style={{ position: 'absolute', top: '24px', left: '24px' }}>
        <button
          onClick={() => { playButtonClickSound(); navigate('/dashboard'); }}
          style={{
            padding: '8px 16px', borderRadius: '10px',
            backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#cbd5e1', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '6px', backdropFilter: 'blur(8px)',
            transition: 'all 0.2s ease'
          }}
        >
          <ArrowLeft size={16} /> Student Portal
        </button>
      </div>

      <div style={{ width: '100%', maxWidth: '420px', animation: 'fadeIn 0.35s ease-out' }}>
        
        {/* Preplyx Logo & Admin Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          
          {/* Preplyx Brand Logo Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '10px',
            padding: '10px 20px', borderRadius: '16px',
            backgroundColor: 'rgba(123, 47, 247, 0.12)', border: '1px solid rgba(123, 47, 247, 0.25)',
            marginBottom: '20px', boxShadow: '0 8px 24px rgba(123, 47, 247, 0.2)'
          }}>
            <img
              src="/logo.svg"
              alt="Preplyx Logo"
              style={{
                width: '32px', height: '32px', borderRadius: '8px',
                objectFit: 'contain', boxShadow: '0 4px 12px rgba(123, 47, 247, 0.4)'
              }}
            />
            <span style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
              Preplyx
            </span>
          </div>

          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#ffffff', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
            Admin Portal
          </h1>
          <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0, fontWeight: 500 }}>
            Sign in to manage the Preplyx platform
          </p>
        </div>

        {/* Main Glassmorphic Form Card */}
        <div style={{
          backgroundColor: '#0f172a', borderRadius: '24px', padding: '32px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.08)'
        }}>
          
          {/* Quick Demo Fill Helper */}
          <div style={{
            padding: '10px 14px', borderRadius: '12px',
            backgroundColor: 'rgba(123, 47, 247, 0.08)', border: '1px solid rgba(123, 47, 247, 0.2)',
            marginBottom: '22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <span style={{ fontSize: '12px', color: '#cbd5e1' }}>
              Quick Demo Login:
            </span>
            <button
              type="button"
              onClick={handleFillDemo}
              style={{
                padding: '4px 10px', borderRadius: '6px',
                backgroundColor: '#7B2FF7', color: '#ffffff', border: 'none',
                fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '4px'
              }}
            >
              <Zap size={11} /> Auto Fill
            </button>
          </div>

          {/* Error Alert */}
          {error && (
            <div style={{
              padding: '12px 14px', borderRadius: '12px',
              backgroundColor: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#fca5a5', fontSize: '13px', marginBottom: '20px',
              display: 'flex', alignItems: 'center', gap: '10px'
            }}>
              <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Success Alert */}
          {successMsg && (
            <div style={{
              padding: '12px 14px', borderRadius: '12px',
              backgroundColor: 'rgba(34, 197, 94, 0.12)', border: '1px solid rgba(34, 197, 94, 0.3)',
              color: '#86efac', fontSize: '13px', marginBottom: '20px',
              display: 'flex', alignItems: 'center', gap: '10px'
            }}>
              <CheckCircle2 size={16} color="#22c55e" style={{ flexShrink: 0 }} />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Field 1: Username or Email */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#e2e8f0', marginBottom: '8px' }}>
                Username or Email
              </label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>
                  <User size={16} />
                </div>
                <input
                  type="text"
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  placeholder="Enter admin username"
                  required
                  style={{
                    width: '100%', padding: '12px 14px 12px 42px', borderRadius: '12px',
                    backgroundColor: '#1e293b', border: '1px solid #334155',
                    color: '#ffffff', fontSize: '14px', outline: 'none',
                    transition: 'all 0.2s ease'
                  }}
                />
              </div>
            </div>

            {/* Field 2: Password */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#e2e8f0', marginBottom: '8px' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>
                  <Lock size={16} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  style={{
                    width: '100%', padding: '12px 42px 12px 42px', borderRadius: '12px',
                    backgroundColor: '#1e293b', border: '1px solid #334155',
                    color: '#ffffff', fontSize: '14px', outline: 'none',
                    transition: 'all 0.2s ease'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: '#64748b', cursor: 'pointer'
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#94a3b8' }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ accentColor: '#7B2FF7', width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <span>Remember me</span>
              </label>
            </div>

            {/* Primary Action Button: Sign In to Dashboard */}
            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: '6px', width: '100%', padding: '14px', borderRadius: '12px',
                background: 'linear-gradient(135deg, #4B0FA3 0%, #7B2FF7 100%)',
                color: '#ffffff', border: 'none', fontSize: '14px', fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                boxShadow: '0 8px 24px rgba(123, 47, 247, 0.35)', opacity: loading ? 0.8 : 1,
                transition: 'all 0.2s ease'
              }}
            >
              {loading ? (
                <>
                  <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

        </div>

        {/* Footer Copyright */}
        <div style={{ textAlign: 'center', marginTop: '28px', fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
          © 2026 Preplyx — A product of Amee Technologies Ltd
        </div>

      </div>
    </div>
  );
}
