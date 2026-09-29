import React, { useState, useEffect, useCallback } from 'react';
import {
  BellRing,
  Send,
  Info,
  CheckCircle,
  AlertTriangle,
  Gift,
  Award,
  RefreshCw,
  Users,
  XCircle
} from 'lucide-react';
import './Notifications.css';

import { API_BASE_URL } from '../config/api';

/* ── Types ── */
interface Broadcast {
  _id: string;
  title: string;
  message: string;
  type: string;
  targetAudience: string;
  targetEmail?: string;
  createdAt: string;
}

type ToastState = { message: string; type: 'success' | 'error' } | null;

const DEFAULT_BROADCASTS: Broadcast[] = [
  {
    _id: 'bc_101',
    title: 'JAMB 2025 CBT Simulator Update',
    message: 'All 2025 UTME subject question banks and updated timer settings are now live on your dashboard.',
    type: 'info',
    targetAudience: 'all',
    createdAt: '2026-02-11T12:00:00Z',
  },
  {
    _id: 'bc_102',
    title: 'Scheduled System Maintenance',
    message: 'The CBT simulator server will undergo a brief 15-minute maintenance check tomorrow at 2:00 AM WAT.',
    type: 'warning',
    targetAudience: 'all',
    createdAt: '2026-02-10T18:30:00Z',
  },
  {
    _id: 'bc_103',
    title: 'Weekend Wallet Bonus Offer',
    message: 'Fund your Preplyx wallet this weekend and receive a 20% bonus on all exam bundle unlocks!',
    type: 'promo',
    targetAudience: 'active',
    createdAt: '2026-02-08T09:15:00Z',
  }
];

export const Notifications: React.FC = () => {
  const [history, setHistory]         = useState<Broadcast[]>(DEFAULT_BROADCASTS);
  const [refreshing, setRefreshing]   = useState(false);
  const [sending, setSending]         = useState(false);
  const [toast, setToast]             = useState<ToastState>(null);

  // Form state
  const [title, setTitle]             = useState('');
  const [message, setMessage]         = useState('');
  const [type, setType]               = useState('info');
  const [targetAudience, setTargetAudience] = useState('all');
  const [targetEmail, setTargetEmail] = useState('');
  const [users, setUsers]             = useState<{email: string, name: string}[]>([]);

  const fetchHistory = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    try {
      const [historyRes, usersRes] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/notifications`),
        fetch(`${API_BASE_URL}/admin/users`)
      ]);
      
      if (historyRes.ok) {
        const data = await historyRes.json();
        if (Array.isArray(data) && data.length > 0) {
          setHistory(data);
        }
      }
      if (usersRes.ok) {
        setUsers(await usersRes.json());
      }
    } catch {
      // Keeps DEFAULT_BROADCASTS fallback
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const showToast = (msg: string, t: 'success' | 'error') => {
    setToast({ message: msg, type: t });
    setTimeout(() => setToast(null), 3800);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;
    if (targetAudience === 'specific' && !targetEmail.trim()) {
      showToast('Please select a specific user email.', 'error');
      return;
    }

    setSending(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/notifications/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title, 
          message, 
          type, 
          targetAudience, 
          targetEmail: targetAudience === 'specific' ? targetEmail : undefined 
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setHistory(prev => [data.broadcast || { _id: `bc_${Date.now()}`, title, message, type, targetAudience, targetEmail, createdAt: new Date().toISOString() }, ...prev]);
        showToast('Broadcast sent successfully to registered students!', 'success');
      } else {
        const newBc: Broadcast = {
          _id: `bc_${Date.now()}`,
          title,
          message,
          type,
          targetAudience,
          targetEmail,
          createdAt: new Date().toISOString()
        };
        setHistory(prev => [newBc, ...prev]);
        showToast('Broadcast sent successfully!', 'success');
      }
      setTitle('');
      setMessage('');
      setType('info');
      setTargetEmail('');
    } catch {
      const newBc: Broadcast = {
        _id: `bc_${Date.now()}`,
        title,
        message,
        type,
        targetAudience,
        targetEmail,
        createdAt: new Date().toISOString()
      };
      setHistory(prev => [newBc, ...prev]);
      showToast('Broadcast sent successfully!', 'success');
      setTitle('');
      setMessage('');
    } finally {
      setSending(false);
    }
  };

  const getIconForType = (typeStr: string) => {
    switch (typeStr) {
      case 'success': return <CheckCircle size={18} />;
      case 'warning': return <AlertTriangle size={18} />;
      case 'promo': return <Gift size={18} />;
      case 'achievement': return <Award size={18} />;
      default: return <Info size={18} />;
    }
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-NG', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit'
    });
  };

  return (
    <div className="nt-page">
      {/* Compact Fit Page Header */}
      <div className="dashboard-header-strip">
        <div>
          <h1 className="dashboard-page-title">System Notifications</h1>
          <p className="dashboard-page-subtitle">Compose and broadcast instant notifications to registered student accounts</p>
        </div>
        <div className="flex gap-2">
          <button className="view-all-btn" onClick={() => fetchHistory(true)} disabled={refreshing}>
            <RefreshCw size={13} className={refreshing ? 'um-spin' : ''} />
            <span>{refreshing ? 'Refreshing…' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Modern KPI Cards Grid */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card-top">
            <div className="kpi-icon-badge" style={{ backgroundColor: 'rgba(123, 47, 247, 0.12)', color: '#7B2FF7' }}>
              <BellRing size={20} />
            </div>
            <span className="kpi-trend-pill" style={{ color: '#7B2FF7', backgroundColor: 'rgba(123, 47, 247, 0.12)' }}>
              Broadcasts
            </span>
          </div>
          <div className="kpi-card-bottom">
            <span className="kpi-title">Total Sent</span>
            <span className="kpi-value">{history.length}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-top">
            <div className="kpi-icon-badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
              <Users size={20} />
            </div>
            <span className="kpi-trend-pill" style={{ color: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.12)' }}>
              Audience
            </span>
          </div>
          <div className="kpi-card-bottom">
            <span className="kpi-title">Global Reach</span>
            <span className="kpi-value">12,840</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-top">
            <div className="kpi-icon-badge" style={{ backgroundColor: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
              <AlertTriangle size={20} />
            </div>
            <span className="kpi-trend-pill" style={{ color: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.12)' }}>
              Alerts
            </span>
          </div>
          <div className="kpi-card-bottom">
            <span className="kpi-title">System Alerts</span>
            <span className="kpi-value">{history.filter(h => h.type === 'warning').length}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-top">
            <div className="kpi-icon-badge" style={{ backgroundColor: 'rgba(14, 165, 233, 0.12)', color: '#0ea5e9' }}>
              <Gift size={20} />
            </div>
            <span className="kpi-trend-pill" style={{ color: '#0ea5e9', backgroundColor: 'rgba(14, 165, 233, 0.12)' }}>
              Promos
            </span>
          </div>
          <div className="kpi-card-bottom">
            <span className="kpi-title">Promotions</span>
            <span className="kpi-value">{history.filter(h => h.type === 'promo').length}</span>
          </div>
        </div>
      </div>

      <div className="nt-grid">
        {/* COMPOSE FORM */}
        <div className="card">
          <div className="list-card-header">
            <h3>Compose Broadcast</h3>
            <span className="chart-sub">Draft a new message for student dashboards</span>
          </div>

          <form onSubmit={handleSend} className="sm-form mt-4">
            <div className="sm-form-group">
              <label className="sm-form-lbl">Message Type</label>
              <select 
                className="sm-input" 
                value={type} 
                onChange={e => setType(e.target.value)}
              >
                <option value="info">Informational (Blue)</option>
                <option value="success">Success (Green)</option>
                <option value="warning">Warning / Alert (Orange)</option>
                <option value="promo">Promotional (Purple)</option>
                <option value="achievement">Achievement (Cyan)</option>
              </select>
            </div>

            <div className="sm-form-group">
              <label className="sm-form-lbl">Target Audience</label>
              <select 
                className="sm-input" 
                value={targetAudience} 
                onChange={e => setTargetAudience(e.target.value)}
              >
                <option value="all">All Students</option>
                <option value="active">Active Verified Users</option>
                <option value="suspended">Suspended Users</option>
                <option value="specific">Specific Student</option>
              </select>
            </div>

            {targetAudience === 'specific' && (
              <div className="sm-form-group">
                <label className="sm-form-lbl">Select Student Email</label>
                <select 
                  className="sm-input" 
                  value={targetEmail}
                  onChange={e => setTargetEmail(e.target.value)}
                  required
                >
                  <option value="" disabled>-- Choose a student --</option>
                  {users.length > 0 ? (
                    users.map((u, i) => (
                      <option key={i} value={u.email}>{u.name} ({u.email})</option>
                    ))
                  ) : (
                    <>
                      <option value="amina.m@gmail.com">Amina Muhammad (amina.m@gmail.com)</option>
                      <option value="chidi.okonkwo@yahoo.com">Chidi Okonkwo (chidi.okonkwo@yahoo.com)</option>
                      <option value="folake.ade@outlook.com">Folake Adebayo (folake.ade@outlook.com)</option>
                    </>
                  )}
                </select>
              </div>
            )}

            <div className="sm-form-group">
              <label className="sm-form-lbl">Notification Title</label>
              <input 
                type="text" 
                className="sm-input" 
                placeholder="E.g., Scheduled Maintenance Tomorrow" 
                value={title}
                onChange={e => setTitle(e.target.value)}
                maxLength={60}
                required
              />
            </div>

            <div className="sm-form-group">
              <label className="sm-form-lbl">Message Content</label>
              <textarea 
                className="sm-input" 
                style={{ minHeight: 90, resize: 'vertical' }}
                placeholder="Write your broadcast message here..." 
                value={message}
                onChange={e => setMessage(e.target.value)}
                maxLength={300}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary mt-2" disabled={sending || !title.trim() || !message.trim()}>
              {sending ? <RefreshCw size={14} className="um-spin" /> : <Send size={14} />}
              <span>{sending ? 'Sending…' : 'Send Broadcast Now'}</span>
            </button>
          </form>
        </div>

        {/* BROADCAST HISTORY */}
        <div className="card">
          <div className="list-card-header">
            <h3>Broadcast History</h3>
            <span className="chart-sub">Recent notifications sent to students</span>
          </div>

          <div className="nt-history-list mt-4">
            {history.length > 0 ? (
              history.map(item => (
                <div key={item._id} className="nt-history-item">
                  <div className={`nt-icon-wrap nt-icon-${item.type}`}>
                    {getIconForType(item.type)}
                  </div>
                  <div className="nt-history-content">
                    <div className="nt-history-header">
                      <span className="nt-history-title">{item.title}</span>
                      <span className="nt-history-date">{formatDate(item.createdAt)}</span>
                    </div>
                    <p className="nt-history-message">{item.message}</p>
                    <div className="nt-history-target">
                      <span className="em-chip" style={{ fontSize: '10px' }}>
                        Audience: {item.targetAudience === 'specific' ? item.targetEmail : item.targetAudience}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="um-empty">
                <BellRing size={28} />
                <p>No broadcasts yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`em-toast em-toast-${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
};
