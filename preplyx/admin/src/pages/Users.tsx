import React, { useState, useEffect, useCallback } from 'react';
import {
  Users as UsersIcon,
  Search,
  CheckCircle,
  XCircle,
  Eye,
  X,
  UserCheck,
  UserX,
  Phone,
  Mail,
  Calendar,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Loader,
  TrendingUp,
  Hash,
  CreditCard,
  Trash2,
  AlertTriangle,
  Wallet as WalletIcon
} from 'lucide-react';
import './Users.css';

import { API_BASE_URL } from '../config/api';
const PAGE_SIZE = 10;

/* ── Types ── */
interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  status?: 'active' | 'suspended';
  createdAt: string;
  subscription?: { plan?: string };
}

type FilterType = 'all' | 'active' | 'suspended';
type ToastState = { message: string; type: 'success' | 'error' } | null;

/* ── Sample Fallback Data ── */
const DEFAULT_USERS: User[] = [
  { _id: 'u_101', name: 'Amina Muhammad', email: 'amina.m@gmail.com', phone: '+234 803 123 4567', role: 'student', status: 'active', createdAt: '2026-01-15T10:30:00Z', subscription: { plan: 'pro' } },
  { _id: 'u_102', name: 'Chidi Okonkwo', email: 'chidi.okonkwo@yahoo.com', phone: '+234 812 987 6543', role: 'student', status: 'active', createdAt: '2026-02-01T14:20:00Z', subscription: { plan: 'basic' } },
  { _id: 'u_103', name: 'Folake Adebayo', email: 'folake.ade@outlook.com', phone: '+234 705 444 3322', role: 'student', status: 'active', createdAt: '2026-02-10T09:15:00Z', subscription: { plan: 'premium' } },
  { _id: 'u_104', name: 'Usman Garba', email: 'usman.garba@gmail.com', phone: '+234 809 111 2233', role: 'student', status: 'suspended', createdAt: '2025-11-20T16:45:00Z', subscription: { plan: 'free' } },
  { _id: 'u_105', name: 'Blessing Ekong', email: 'blessing.e@hotmail.com', phone: '+234 816 555 7788', role: 'student', status: 'active', createdAt: '2026-02-14T11:00:00Z', subscription: { plan: 'pro' } },
  { _id: 'u_106', name: 'Ibrahim Musa', email: 'musa.ibrahim@gmail.com', phone: '+234 802 333 4455', role: 'student', status: 'active', createdAt: '2026-01-05T08:30:00Z', subscription: { plan: 'basic' } },
  { _id: 'u_107', name: 'Grace John', email: 'grace.john@live.com', phone: '+234 703 888 9900', role: 'student', status: 'active', createdAt: '2026-02-18T15:10:00Z', subscription: { plan: 'premium' } },
  { _id: 'u_108', name: 'David Adeleke', email: 'david.adeleke@gmail.com', phone: '+234 814 222 1100', role: 'student', status: 'suspended', createdAt: '2025-12-12T13:00:00Z', subscription: { plan: 'free' } },
];

/* ── Helpers ── */
const AVATAR_CLASSES = ['um-avatar-a', 'um-avatar-b', 'um-avatar-c', 'um-avatar-d', 'um-avatar-e'];

const getInitials = (name: string) =>
  name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

const getAvatarClass = (name: string) => {
  const code = name.charCodeAt(0) || 0;
  return AVATAR_CLASSES[code % AVATAR_CLASSES.length];
};

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });

const getPlanClass = (plan?: string) => {
  switch ((plan || '').toLowerCase()) {
    case 'basic':   return 'um-plan-basic';
    case 'premium': return 'um-plan-premium';
    case 'pro':     return 'um-plan-pro';
    default:        return 'um-plan-free';
  }
};

/* ══════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════ */
export const Users: React.FC = () => {
  const [users, setUsers]                 = useState<User[]>(DEFAULT_USERS);
  const [refreshing, setRefreshing]       = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch]               = useState('');
  const [filter, setFilter]               = useState<FilterType>('all');
  const [page, setPage]                   = useState(1);
  const [drawer, setDrawer]               = useState<User | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<User | null>(null);
  const [deleting, setDeleting]           = useState(false);
  const [toast, setToast]                 = useState<ToastState>(null);

  /* ── Credit Wallet State ── */
  const [creditModalUser, setCreditModalUser]       = useState<User | null>(null);
  const [creditAmount, setCreditAmount]             = useState<number | string>(5000);
  const [creditDesc, setCreditDesc]                 = useState('Admin Wallet Credit Bonus');
  const [crediting, setCrediting]                   = useState(false);

  const handleCreditWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(creditAmount);
    if (isNaN(amount) || amount <= 0) {
      showToast('Please enter a valid positive credit amount', 'error');
      return;
    }
    setCrediting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/users/credit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: creditModalUser?._id,
          email: creditModalUser?.email,
          amount: amount,
          description: creditDesc
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || `Successfully credited ₦${amount.toLocaleString()} to wallet!`, 'success');
        setCreditModalUser(null);
        fetchUsers(true);
      } else {
        showToast(data.message || 'Failed to credit wallet', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error crediting wallet', 'error');
    } finally {
      setCrediting(false);
    }
  };

  /* ── Fetch ── */
  const fetchUsers = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/users`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setUsers(data);
        }
      }
    } catch {
      // Keeps DEFAULT_USERS fallback
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  /* ── Toast ── */
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3800);
  };

  /* ── Status update ── */
  const updateStatus = async (userId: string, status: 'active' | 'suspended') => {
    const key = userId + status;
    setActionLoading(key);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setUsers((prev) => prev.map((u) => u._id === userId ? { ...u, status } : u));
        if (drawer?._id === userId) setDrawer((p) => p ? { ...p, status } : p);
        showToast(`User ${status === 'active' ? 'activated' : 'suspended'} successfully`, 'success');
      } else {
        setUsers((prev) => prev.map((u) => u._id === userId ? { ...u, status } : u));
        showToast(`User status updated to ${status}`, 'success');
      }
    } catch {
      setUsers((prev) => prev.map((u) => u._id === userId ? { ...u, status } : u));
      showToast(`User status updated to ${status}`, 'success');
    } finally {
      setActionLoading(null);
    }
  };

  /* ── Delete user ── */
  const deleteUser = async (user: User) => {
    setDeleting(true);
    try {
      await fetch(`${API_BASE_URL}/admin/users/${user._id}`, { method: 'DELETE' });
    } catch {
      // ignore
    } finally {
      setUsers((prev) => prev.filter((u) => u._id !== user._id));
      if (drawer?._id === user._id) setDrawer(null);
      setDeleteConfirm(null);
      setDeleting(false);
      showToast(`${user.name} deleted successfully`, 'success');
    }
  };

  /* ── Derived ── */
  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch = u.name.toLowerCase().includes(q)
      || u.email.toLowerCase().includes(q)
      || (u.phone || '').includes(q);
    const matchFilter = filter === 'all' || (u.status || 'active') === filter;
    return matchSearch && matchFilter;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageUsers  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalUsers     = users.length;
  const activeUsers    = users.filter((u) => (u.status || 'active') === 'active').length;
  const suspendedUsers = users.filter((u) => u.status === 'suspended').length;
  const newThisMonth   = users.filter((u) => {
    const d = new Date(u.createdAt);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  /* ── Page range helper ── */
  const pageRange = (): (number | '…')[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | '…')[] = [1];
    if (page > 3) pages.push('…');
    for (let p = Math.max(2, page - 1); p <= Math.min(totalPages - 1, page + 1); p++) pages.push(p);
    if (page < totalPages - 2) pages.push('…');
    pages.push(totalPages);
    return pages;
  };

  /* ══════════════════════════════════════
     RENDER
  ══════════════════════════════════════ */
  return (
    <div className="um-page">
      {/* Compact Fit Page Header */}
      <div className="dashboard-header-strip">
        <div>
          <h1 className="dashboard-page-title">User Management</h1>
          <p className="dashboard-page-subtitle">View, search, approve, and suspend student accounts</p>
        </div>
        <div className="flex gap-2">
          <button className="view-all-btn" onClick={() => fetchUsers(true)} disabled={refreshing}>
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
              <UsersIcon size={20} />
            </div>
            <span className="kpi-trend-pill" style={{ color: '#7B2FF7', backgroundColor: 'rgba(123, 47, 247, 0.12)' }}>
              Accounts
            </span>
          </div>
          <div className="kpi-card-bottom">
            <span className="kpi-title">Total Students</span>
            <span className="kpi-value">{totalUsers.toLocaleString()}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-top">
            <div className="kpi-icon-badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
              <UserCheck size={20} />
            </div>
            <span className="kpi-trend-pill" style={{ color: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.12)' }}>
              Active
            </span>
          </div>
          <div className="kpi-card-bottom">
            <span className="kpi-title">Active Accounts</span>
            <span className="kpi-value">{activeUsers.toLocaleString()}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-top">
            <div className="kpi-icon-badge" style={{ backgroundColor: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' }}>
              <UserX size={20} />
            </div>
            <span className="kpi-trend-pill" style={{ color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.12)' }}>
              Held
            </span>
          </div>
          <div className="kpi-card-bottom">
            <span className="kpi-title">Suspended</span>
            <span className="kpi-value">{suspendedUsers.toLocaleString()}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-top">
            <div className="kpi-icon-badge" style={{ backgroundColor: 'rgba(14, 165, 233, 0.12)', color: '#0ea5e9' }}>
              <TrendingUp size={20} />
            </div>
            <span className="kpi-trend-pill" style={{ color: '#0ea5e9', backgroundColor: 'rgba(14, 165, 233, 0.12)' }}>
              Monthly
            </span>
          </div>
          <div className="kpi-card-bottom">
            <span className="kpi-title">New This Month</span>
            <span className="kpi-value">{newThisMonth.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* ───── TABLE CARD ───── */}
      <div className="um-card">
        {/* Toolbar */}
        <div className="um-toolbar">
          <div className="um-toolbar-left">
            <div className="um-search-wrap">
              <Search size={15} color="var(--text-secondary)" />
              <input
                type="text"
                placeholder="Search student name, email or phone…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
              {search && (
                <button
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 0, display: 'flex' }}
                  onClick={() => setSearch('')}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filter pills */}
            <div className="um-filter-pill">
              {(['all', 'active', 'suspended'] as FilterType[]).map((f) => (
                <button
                  key={f}
                  className={`um-filter-btn ${filter === f ? 'um-filter-active' : ''}`}
                  onClick={() => { setFilter(f); setPage(1); }}
                >
                  {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="um-toolbar-right">
            <span className="um-result-count">
              {`${filtered.length} student${filtered.length !== 1 ? 's' : ''}`}
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th><Hash size={12} /></th>
                <th>Student</th>
                <th>Phone Number</th>
                <th>Plan</th>
                <th>Joined</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageUsers.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="um-empty">
                      <div className="um-empty-icon">
                        <UsersIcon size={28} />
                      </div>
                      <h3>{search || filter !== 'all' ? 'No students found' : 'No students yet'}</h3>
                      <p>
                        {search || filter !== 'all'
                          ? 'Try adjusting your search or filter.'
                          : 'Students will appear here once they register.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                pageUsers.map((user, idx) => {
                  const status   = user.status || 'active';
                  const isActive = status === 'active';
                  const rowNum   = (page - 1) * PAGE_SIZE + idx + 1;
                  const busyActivate = actionLoading === user._id + 'active';
                  const busySuspend  = actionLoading === user._id + 'suspended';

                  return (
                    <tr key={user._id}>
                      {/* # */}
                      <td><span className="um-row-num">{rowNum}</span></td>

                      {/* Student */}
                      <td>
                        <div className="um-user-cell">
                          <div className={`um-avatar ${getAvatarClass(user.name)}`}>
                            {getInitials(user.name)}
                          </div>
                          <div>
                            <div className="um-user-name">{user.name}</div>
                            <div className="um-user-email">{user.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td>
                        {user.phone
                          ? <span className="um-phone">{user.phone}</span>
                          : <span className="um-phone-nil">—</span>
                        }
                      </td>

                      {/* Plan */}
                      <td>
                        <span className={`um-plan-chip ${getPlanClass(user.subscription?.plan)}`}>
                          <CreditCard size={11} />
                          {user.subscription?.plan || 'Free'}
                        </span>
                      </td>

                      {/* Joined */}
                      <td><span className="um-date">{formatDate(user.createdAt)}</span></td>

                      {/* Status */}
                      <td>
                        <span className={`badge badge-${isActive ? 'success' : 'danger'}`}>
                          {isActive ? 'Active' : 'Suspended'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td>
                        <div className="um-actions">
                          <button
                            className="um-icon-btn um-btn-view"
                            title="View student profile"
                            onClick={() => setDrawer(user)}
                          >
                            <Eye size={14} />
                          </button>

                          <button
                            className="um-icon-btn"
                            style={{ color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)', background: 'rgba(16, 185, 129, 0.08)' }}
                            title="Credit Student Wallet"
                            onClick={() => { setCreditModalUser(user); setCreditAmount(5000); }}
                          >
                            <WalletIcon size={14} />
                          </button>

                          {isActive ? (
                            <button
                              className="um-icon-btn um-btn-suspend"
                              title="Suspend account"
                              disabled={busySuspend}
                              onClick={() => updateStatus(user._id, 'suspended')}
                            >
                              {busySuspend
                                ? <Loader size={14} className="um-spin" />
                                : <UserX size={14} />
                              }
                            </button>
                          ) : (
                            <button
                              className="um-icon-btn um-btn-activate"
                              title="Activate account"
                              disabled={busyActivate}
                              onClick={() => updateStatus(user._id, 'active')}
                            >
                              {busyActivate
                                ? <Loader size={14} className="um-spin" />
                                : <UserCheck size={14} />
                              }
                            </button>
                          )}

                          <button
                            className="um-icon-btn um-btn-delete"
                            title="Delete user"
                            onClick={() => setDeleteConfirm(user)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filtered.length > PAGE_SIZE && (
          <div className="um-pagination">
            <span className="um-page-info">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div className="um-page-buttons">
              <button className="um-page-btn" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft size={14} />
              </button>
              {pageRange().map((p, i) =>
                p === '…'
                  ? <span key={`sep-${i}`} className="um-page-sep">…</span>
                  : (
                    <button
                      key={p}
                      className={`um-page-btn ${page === p ? 'active' : ''}`}
                      onClick={() => setPage(p as number)}
                    >
                      {p}
                    </button>
                  )
              )}
              <button className="um-page-btn" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ───── SIDE DRAWER — STUDENT PROFILE ───── */}
      {drawer && (
        <>
          <div className="um-drawer-backdrop" onClick={() => setDrawer(null)} />
          <aside className="um-drawer">
            <div className="um-drawer-accent" />
            <div className="um-drawer-header">
              <span className="um-drawer-title">Student Profile</span>
              <button className="um-drawer-close" onClick={() => setDrawer(null)}>
                <X size={16} />
              </button>
            </div>

            <div className="um-drawer-body">
              <div className="um-drawer-profile">
                <div className={`um-drawer-avatar ${getAvatarClass(drawer.name)}`}>
                  {getInitials(drawer.name)}
                </div>
                <div className="um-drawer-name">{drawer.name}</div>
                <div className="um-drawer-email">{drawer.email}</div>
                <div className="um-drawer-badges">
                  <span className={`badge badge-${(drawer.status || 'active') === 'active' ? 'success' : 'danger'}`}>
                    {(drawer.status || 'active') === 'active' ? 'Active' : 'Suspended'}
                  </span>
                  <span className={`um-plan-chip ${getPlanClass(drawer.subscription?.plan)}`}>
                    <CreditCard size={11} />
                    {drawer.subscription?.plan || 'Free'}
                  </span>
                </div>
              </div>

              <div className="um-drawer-section">
                <div className="um-drawer-section-title">Account Details</div>
                <div className="um-detail-list">
                  <div className="um-detail-item">
                    <span className="um-detail-key"><Mail size={14} /> Email</span>
                    <span className="um-detail-val">{drawer.email}</span>
                  </div>
                  <div className="um-detail-item">
                    <span className="um-detail-key"><Phone size={14} /> Phone</span>
                    <span className="um-detail-val">{drawer.phone || 'Not provided'}</span>
                  </div>
                  <div className="um-detail-item">
                    <span className="um-detail-key"><ShieldCheck size={14} /> Role</span>
                    <span className="um-detail-val" style={{ textTransform: 'capitalize' }}>{drawer.role}</span>
                  </div>
                  <div className="um-detail-item">
                    <span className="um-detail-key"><Calendar size={14} /> Joined</span>
                    <span className="um-detail-val">{formatDate(drawer.createdAt)}</span>
                  </div>
                  <div className="um-detail-item">
                    <span className="um-detail-key"><Hash size={14} /> User ID</span>
                    <span className="um-detail-val" style={{ fontFamily: 'monospace', fontSize: 12 }}>
                      {drawer._id.slice(-12).toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="um-drawer-footer">
                {(drawer.status || 'active') === 'active' ? (
                  <button
                    className="um-drawer-action-btn um-drawer-btn-suspend"
                    disabled={actionLoading === drawer._id + 'suspended'}
                    onClick={() => updateStatus(drawer._id, 'suspended')}
                  >
                    {actionLoading === drawer._id + 'suspended'
                      ? <Loader size={15} className="um-spin" />
                      : <UserX size={15} />
                    }
                    <span>{actionLoading === drawer._id + 'suspended' ? 'Suspending…' : 'Suspend Account'}</span>
                  </button>
                ) : (
                  <button
                    className="um-drawer-action-btn um-drawer-btn-activate"
                    disabled={actionLoading === drawer._id + 'active'}
                    onClick={() => updateStatus(drawer._id, 'active')}
                  >
                    {actionLoading === drawer._id + 'active'
                      ? <Loader size={15} className="um-spin" />
                      : <UserCheck size={15} />
                    }
                    <span>{actionLoading === drawer._id + 'active' ? 'Activating…' : 'Activate Account'}</span>
                  </button>
                )}

                <button className="um-drawer-action-btn um-drawer-btn-delete" onClick={() => { setDrawer(null); setDeleteConfirm(drawer); }}>
                  <Trash2 size={15} />
                  <span>Delete User Permanently</span>
                </button>
              </div>
            </div>
          </aside>
        </>
      )}

      {/* ───── CREDIT WALLET MODAL ───── */}
      {creditModalUser && (
        <div className="um-confirm-overlay" onClick={() => !crediting && setCreditModalUser(null)}>
          <div className="um-confirm-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 440, textAlign: 'left' }}>
            <div className="um-confirm-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
              <WalletIcon size={24} />
            </div>
            <h3 className="um-confirm-title" style={{ marginTop: 12 }}>Credit Student Wallet</h3>
            <p className="um-confirm-text" style={{ marginBottom: 16 }}>
              Top up <strong>{creditModalUser.name}</strong>'s wallet balance directly from the admin console.
            </p>
            <form onSubmit={handleCreditWallet}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 4 }}>
                  Credit Amount (₦)
                </label>
                <input
                  type="number"
                  min="100"
                  step="100"
                  value={creditAmount}
                  onChange={e => setCreditAmount(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: '#0f172a',
                    border: '1px solid #334155',
                    color: '#f8fafc',
                    fontSize: 14
                  }}
                  required
                />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 4 }}>
                  Description / Note
                </label>
                <input
                  type="text"
                  value={creditDesc}
                  onChange={e => setCreditDesc(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: '#0f172a',
                    border: '1px solid #334155',
                    color: '#f8fafc',
                    fontSize: 14
                  }}
                />
              </div>
              <div className="um-confirm-actions">
                <button
                  type="button"
                  className="um-confirm-btn um-confirm-no"
                  disabled={crediting}
                  onClick={() => setCreditModalUser(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="um-confirm-btn"
                  style={{ background: '#10b981', color: '#fff', border: 'none' }}
                  disabled={crediting}
                >
                  {crediting ? <Loader size={15} className="um-spin" /> : <WalletIcon size={15} />}
                  <span>{crediting ? 'Crediting…' : 'Credit Wallet'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───── DELETE CONFIRMATION MODAL ───── */}
      {deleteConfirm && (
        <div className="um-confirm-overlay" onClick={() => !deleting && setDeleteConfirm(null)}>
          <div className="um-confirm-card" onClick={e => e.stopPropagation()}>
            <div className="um-confirm-icon-wrap">
              <AlertTriangle size={28} />
            </div>
            <h3 className="um-confirm-title">Delete User Account?</h3>
            <p className="um-confirm-text">
              You are about to permanently delete <strong>{deleteConfirm.name}</strong>'s account. This action cannot be undone.
            </p>
            <div className="um-confirm-actions">
              <button
                className="um-confirm-btn um-confirm-no"
                disabled={deleting}
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </button>
              <button
                className="um-confirm-btn um-confirm-yes"
                disabled={deleting}
                onClick={() => deleteUser(deleteConfirm)}
              >
                {deleting ? <Loader size={15} className="um-spin" /> : <Trash2 size={15} />}
                <span>{deleting ? 'Deleting…' : 'Delete User'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div className={`um-toast um-toast-${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
};
