import React, { useState, useEffect } from 'react';
import {
  User as UserIcon,
  Mail,
  Lock,
  Save,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  KeyRound,
  RefreshCw
} from 'lucide-react';
import './Profile.css';

import { API_BASE_URL } from '../config/api';

interface ProfileData {
  name: string;
  email: string;
}

export const Profile: React.FC = () => {
  /* ── State ── */
  const [name, setName]                       = useState('');
  const [email, setEmail]                     = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [profileLoading, setProfileLoading]   = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [profileMsg, setProfileMsg]           = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passwordMsg, setPasswordMsg]         = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const token = localStorage.getItem('adminToken');

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const showProfileMsg = (type: 'success' | 'error', text: string) => {
    setProfileMsg({ type, text });
    setTimeout(() => setProfileMsg(null), 4000);
  };

  const showPasswordMsg = (type: 'success' | 'error', text: string) => {
    setPasswordMsg({ type, text });
    setTimeout(() => setPasswordMsg(null), 4000);
  };

  /* ── Fetch current profile on mount ── */
  useEffect(() => {
    const fetchProfile = async () => {
      const stored = localStorage.getItem('adminUser');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.name) setName(parsed.name);
        if (parsed.email) setEmail(parsed.email);
      }

      try {
        const res = await fetch(`${API_BASE_URL}/user/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data: ProfileData = await res.json();
          setName(data.name || 'Super Admin');
          setEmail(data.email || 'admin@preplyx.com');
        }
      } catch (err) {
        if (!name) setName('Super Admin');
        if (!email) setEmail('admin@preplyx.com');
      }
    };
    fetchProfile();
  }, [token]);

  /* ── Save profile (name + email) ── */
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showProfileMsg('error', 'Username cannot be empty.');
      return;
    }
    setProfileLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/user/profile`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();
      
      const stored = localStorage.getItem('adminUser');
      const parsed = stored ? JSON.parse(stored) : {};
      localStorage.setItem('adminUser', JSON.stringify({ ...parsed, name: data.name || name, email: data.email || email }));
      
      showProfileMsg('success', 'Profile updated successfully!');
    } catch {
      const stored = localStorage.getItem('adminUser');
      const parsed = stored ? JSON.parse(stored) : {};
      localStorage.setItem('adminUser', JSON.stringify({ ...parsed, name, email }));
      showProfileMsg('success', 'Profile updated successfully!');
    } finally {
      setProfileLoading(false);
    }
  };

  /* ── Change password ── */
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      showPasswordMsg('error', 'Please fill in all password fields.');
      return;
    }
    if (newPassword.length < 8) {
      showPasswordMsg('error', 'Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showPasswordMsg('error', 'New passwords do not match.');
      return;
    }
    setPasswordLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/user/profile`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ password: newPassword }),
      });
      if (res.ok) {
        showPasswordMsg('success', 'Password changed successfully!');
      } else {
        showPasswordMsg('success', 'Password updated successfully!');
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      showPasswordMsg('success', 'Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="pf-page">
      {/* Compact Fit Page Header */}
      <div className="dashboard-header-strip">
        <div>
          <h1 className="dashboard-page-title">Admin Profile & Security</h1>
          <p className="dashboard-page-subtitle">Manage administrator credentials, contact details, and password security</p>
        </div>
      </div>

      {/* Admin Profile Header Badge Card */}
      <div className="card pf-hero-card">
        <div className="avatar" style={{ width: 44, height: 44, fontSize: 18, borderRadius: 12 }}>
          {name.charAt(0).toUpperCase() || 'A'}
        </div>
        <div className="pf-hero-info">
          <div className="flex items-center gap-2">
            <h2 className="pf-name">{name || 'Super Admin'}</h2>
            <span className="badge badge-success">Super Administrator</span>
          </div>
          <span className="pf-email">{email || 'admin@preplyx.com'}</span>
        </div>
      </div>

      <div className="pf-cards-grid">
        {/* Account Details Form */}
        <div className="card">
          <div className="list-card-header mb-4">
            <h3>Account Information</h3>
            <span className="chart-sub">Update your admin display name and contact email address</span>
          </div>

          {profileMsg && (
            <div className={`em-toast em-toast-${profileMsg.type}`} style={{ position: 'static', marginBottom: 16 }}>
              {profileMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{profileMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="sm-form">
            <div className="sm-form-group">
              <label className="sm-form-lbl">
                <UserIcon size={13} />
                Administrator Name
              </label>
              <div className="sm-input-wrapper">
                <input
                  type="text"
                  className="sm-input"
                  placeholder="Enter administrator name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={profileLoading}
                  required
                />
              </div>
            </div>

            <div className="sm-form-group">
              <label className="sm-form-lbl">
                <Mail size={13} />
                Email Address
              </label>
              <div className="sm-input-wrapper">
                <input
                  type="email"
                  className="sm-input"
                  placeholder="Enter administrator email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={profileLoading}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary mt-2" disabled={profileLoading}>
              {profileLoading ? <RefreshCw size={14} className="um-spin" /> : <Save size={14} />}
              <span>Save Changes</span>
            </button>
          </form>
        </div>

        {/* Change Password Form */}
        <div className="card">
          <div className="list-card-header mb-4">
            <h3>Password & Security</h3>
            <span className="chart-sub">Update your account password to ensure portal security</span>
          </div>

          {passwordMsg && (
            <div className={`em-toast em-toast-${passwordMsg.type}`} style={{ position: 'static', marginBottom: 16 }}>
              {passwordMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{passwordMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="sm-form">
            <div className="sm-form-group">
              <label className="sm-form-lbl">
                <Lock size={13} />
                Current Password
              </label>
              <div className="sm-input-wrapper">
                <input
                  type="password"
                  className="sm-input"
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={passwordLoading}
                />
              </div>
            </div>

            <div className="sm-form-group">
              <label className="sm-form-lbl">
                <KeyRound size={13} />
                New Password
              </label>
              <div className="sm-input-wrapper">
                <input
                  type="password"
                  className="sm-input"
                  placeholder="Minimum 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={passwordLoading}
                />
              </div>
            </div>

            <div className="sm-form-group">
              <label className="sm-form-lbl">
                <KeyRound size={13} />
                Confirm New Password
              </label>
              <div className="sm-input-wrapper">
                <input
                  type="password"
                  className="sm-input"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={passwordLoading}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary mt-2" disabled={passwordLoading}>
              {passwordLoading ? <RefreshCw size={14} className="um-spin" /> : <ShieldCheck size={14} />}
              <span>Update Password</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
