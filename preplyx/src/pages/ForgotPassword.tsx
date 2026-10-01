import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Mail, ArrowRight, Lock, KeyRound, CheckCircle2, ShieldAlert, Eye, EyeOff } from 'lucide-react';

import { API_BASE_URL } from '../config/api';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1); // 1: Send OTP, 2: Enter OTP & New Password
  
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [demoOtpHint, setDemoOtpHint] = useState<string | null>(null);

  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Step 1: Send 6-Digit OTP to User Email
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAlert(null);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to send OTP. Please check your email.');
      }

      setAlert({
        type: 'success',
        message: `A 6-digit OTP code has been sent to ${email}.`
      });

      if (data.demoOtp) {
        setDemoOtpHint(data.demoOtp);
      }

      setStep(2);
    } catch (error: any) {
      setAlert({
        type: 'error',
        message: error.message || 'Failed to send OTP. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify OTP and Set New Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAlert(null);

    if (otp.length < 6) {
      setAlert({ type: 'error', message: 'Please enter a valid 6-digit OTP code.' });
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to reset password. Please verify your OTP code.');
      }

      setAlert({
        type: 'success',
        message: 'Password reset successful! Redirecting to login...'
      });

      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (error: any) {
      setAlert({
        type: 'error',
        message: error.message || 'Password reset failed. Check OTP code and try again.'
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
      padding: '20px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
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
            {step === 1 ? 'Forgot Password' : 'Enter OTP Code'}
          </h1>
          <p style={{ fontSize: '13px', color: '#64748b' }}>
            {step === 1 
              ? 'Enter your registered email address to receive a 6-digit verification OTP.' 
              : `We sent a 6-digit OTP code to ${email}`}
          </p>
        </div>

        {/* Alert Toast / Banner */}
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
            gap: '10px'
          }}>
            {alert.type === 'success' ? (
              <CheckCircle2 size={18} color="#10B981" style={{ flexShrink: 0 }} />
            ) : (
              <ShieldAlert size={18} color="#EF4444" style={{ flexShrink: 0 }} />
            )}
            <span style={{ flex: 1, lineHeight: 1.4 }}>{alert.message}</span>
          </div>
        )}

        {/* Demo OTP Hint Badge */}
        {demoOtpHint && step === 2 && (
          <div style={{
            marginBottom: '16px',
            padding: '10px 14px',
            borderRadius: '10px',
            backgroundColor: 'rgba(123, 47, 247, 0.08)',
            border: '1px border rgba(123, 47, 247, 0.2)',
            color: '#7B2FF7',
            fontSize: '12px',
            fontWeight: 600,
            textAlign: 'center'
          }}>
            🔑 Demo OTP Code: <strong style={{ letterSpacing: '2px', fontSize: '14px' }}>{demoOtpHint}</strong>
          </div>
        )}

        {/* STEP 1: Enter Email to Send OTP */}
        {step === 1 && (
          <form onSubmit={handleSendOTP} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                opacity: isLoading ? 0.7 : 1
              }}
            >
              {isLoading ? 'Sending OTP...' : (
                <>
                  Send OTP Code <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 2: Enter OTP & New Password */}
        {step === 2 && (
          <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* OTP Code */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#334155', marginBottom: '6px' }}>
                6-Digit OTP Code
              </label>
              <div style={{ position: 'relative' }}>
                <KeyRound size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 123456"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 38px',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    fontSize: '15px',
                    fontWeight: 700,
                    letterSpacing: '4px',
                    outline: 'none',
                    backgroundColor: '#f8fafc',
                    color: '#0f172a'
                  }}
                />
              </div>
            </div>

            {/* New Password */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#334155', marginBottom: '6px' }}>
                New Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
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
                opacity: isLoading ? 0.7 : 1
              }}
            >
              {isLoading ? 'Updating Password...' : (
                <>
                  Reset Password <ArrowRight size={16} />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => { setStep(1); setAlert(null); }}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Resend OTP code
            </button>
          </form>
        )}

        <div style={{ textAlign: 'center', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
          <Link
            to="/login"
            style={{
              color: '#7B2FF7',
              fontSize: '13px',
              fontWeight: 700,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <ArrowLeft size={16} /> Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
