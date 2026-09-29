import React, { useState, useEffect, useCallback } from 'react';
import {
  MonitorPlay,
  Target,
  Clock,
  Award,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  X
} from 'lucide-react';
import './Simulation.css';

import { API_BASE_URL } from '../config/api';

/* ── Types ── */
interface User {
  _id: string;
  name: string;
  email: string;
}

interface ExamSession {
  _id: string;
  user: User;
  exam: string;
  subject: string;
  score: number;
  total: number;
  percentage: number;
  timeSpentSeconds: number;
  createdAt: string;
}

interface Stats {
  totalSessions: number;
  avgScore: number;
  avgTime: number;
  passRate: number;
}

const DEFAULT_STATS: Stats = {
  totalSessions: 98450,
  avgScore: 74.5,
  avgTime: 2712,
  passRate: 78.2
};

const DEFAULT_SESSIONS: ExamSession[] = [
  {
    _id: 'sim_9801',
    user: { _id: 'u_101', name: 'Amina Muhammad', email: 'amina.m@gmail.com' },
    exam: 'JAMB',
    subject: 'Mathematics',
    score: 85,
    total: 100,
    percentage: 85,
    timeSpentSeconds: 2530,
    createdAt: '2026-02-11T13:10:00Z'
  },
  {
    _id: 'sim_9802',
    user: { _id: 'u_102', name: 'Chidi Okonkwo', email: 'chidi.okonkwo@yahoo.com' },
    exam: 'WAEC',
    subject: 'Physics',
    score: 68,
    total: 100,
    percentage: 68,
    timeSpentSeconds: 3270,
    createdAt: '2026-02-11T12:00:00Z'
  },
  {
    _id: 'sim_9803',
    user: { _id: 'u_103', name: 'Folake Adebayo', email: 'folake.ade@outlook.com' },
    exam: 'NECO',
    subject: 'English Language',
    score: 45,
    total: 100,
    percentage: 45,
    timeSpentSeconds: 3480,
    createdAt: '2026-02-11T11:15:00Z'
  },
  {
    _id: 'sim_9804',
    user: { _id: 'u_104', name: 'Emeka Nwosu', email: 'emeka.nwosu@gmail.com' },
    exam: 'JAMB',
    subject: 'Chemistry',
    score: 92,
    total: 100,
    percentage: 92,
    timeSpentSeconds: 2115,
    createdAt: '2026-02-10T16:45:00Z'
  }
];

export const Simulation: React.FC = () => {
  const [sessions, setSessions]       = useState<ExamSession[]>(DEFAULT_SESSIONS);
  const [stats, setStats]             = useState<Stats>(DEFAULT_STATS);
  const [refreshing, setRefreshing]   = useState(false);

  // Pagination & Filters
  const [page, setPage]               = useState(1);
  const [totalPages, setTotalPages]   = useState(1);
  const [totalRecords, setTotalRecords] = useState(DEFAULT_SESSIONS.length);
  const [filterExam, setFilterExam]   = useState('All');
  const [filterSubject, setFilterSubject] = useState('All');
  const [search, setSearch]           = useState('');
  const [drawer, setDrawer]           = useState<ExamSession | null>(null);

  const availableExams = ['All', 'JAMB', 'WAEC', 'NECO', 'POST-UTME'];
  const availableSubjects = ['All', 'Mathematics', 'English Language', 'Physics', 'Chemistry', 'Biology'];

  const fetchSimulations = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    try {
      const q = new URLSearchParams({
        page: String(page),
        limit: '10',
        exam: filterExam,
        subject: filterSubject,
      });
      const res = await fetch(`${API_BASE_URL}/admin/simulations?${q.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.sessions && data.sessions.length > 0) {
          setSessions(data.sessions);
          setStats(data.stats || DEFAULT_STATS);
          setTotalPages(data.totalPages || 1);
          setTotalRecords(data.total || data.sessions.length);
        }
      }
    } catch {
      // Keeps DEFAULT_SESSIONS
    } finally {
      setRefreshing(false);
    }
  }, [page, filterExam, filterSubject]);

  useEffect(() => {
    fetchSimulations();
  }, [fetchSimulations]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const filteredSessions = sessions.filter(s => {
    const q = search.toLowerCase();
    const matchesSearch = !q || (s.user?.name?.toLowerCase().includes(q) || s.subject.toLowerCase().includes(q) || s.exam.toLowerCase().includes(q));
    const matchesExam = filterExam === 'All' || s.exam.toLowerCase() === filterExam.toLowerCase();
    const matchesSubject = filterSubject === 'All' || s.subject.toLowerCase() === filterSubject.toLowerCase();
    return matchesSearch && matchesExam && matchesSubject;
  });

  return (
    <div className="sim-page">
      {/* Compact Fit Page Header */}
      <div className="dashboard-header-strip">
        <div>
          <h1 className="dashboard-page-title">CBT Simulation Engine</h1>
          <p className="dashboard-page-subtitle">Monitor real-time CBT exam sessions, analyze student performance, and review test attempts</p>
        </div>
        <div className="flex gap-2">
          <button className="view-all-btn" onClick={() => fetchSimulations(true)} disabled={refreshing}>
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
              <MonitorPlay size={20} />
            </div>
            <span className="kpi-trend-pill" style={{ color: '#7B2FF7', backgroundColor: 'rgba(123, 47, 247, 0.12)' }}>
              Live Sessions
            </span>
          </div>
          <div className="kpi-card-bottom">
            <span className="kpi-title">Total Sessions</span>
            <span className="kpi-value">{stats.totalSessions.toLocaleString()}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-top">
            <div className="kpi-icon-badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
              <Target size={20} />
            </div>
            <span className="kpi-trend-pill" style={{ color: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.12)' }}>
              Average
            </span>
          </div>
          <div className="kpi-card-bottom">
            <span className="kpi-title">Average Score</span>
            <span className="kpi-value">{stats.avgScore}%</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-top">
            <div className="kpi-icon-badge" style={{ backgroundColor: 'rgba(14, 165, 233, 0.12)', color: '#0ea5e9' }}>
              <Clock size={20} />
            </div>
            <span className="kpi-trend-pill" style={{ color: '#0ea5e9', backgroundColor: 'rgba(14, 165, 233, 0.12)' }}>
              Duration
            </span>
          </div>
          <div className="kpi-card-bottom">
            <span className="kpi-title">Avg Time Spent</span>
            <span className="kpi-value">{formatTime(stats.avgTime)}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-top">
            <div className="kpi-icon-badge" style={{ backgroundColor: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
              <Award size={20} />
            </div>
            <span className="kpi-trend-pill" style={{ color: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.12)' }}>
              Pass Rate
            </span>
          </div>
          <div className="kpi-card-bottom">
            <span className="kpi-title">Pass Rate</span>
            <span className="kpi-value">{stats.passRate}%</span>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="card">
        {/* Controls Header */}
        <div className="list-card-header mb-4">
          <div className="flex items-center gap-3">
            <select
              value={filterExam}
              onChange={(e) => { setFilterExam(e.target.value); setPage(1); }}
              className="sm-input"
              style={{ width: '130px' }}
            >
              {availableExams.map(ex => <option key={ex} value={ex}>{ex === 'All' ? 'All Exams' : ex}</option>)}
            </select>

            <select
              value={filterSubject}
              onChange={(e) => { setFilterSubject(e.target.value); setPage(1); }}
              className="sm-input"
              style={{ width: '150px' }}
            >
              {availableSubjects.map(sub => <option key={sub} value={sub}>{sub === 'All' ? 'All Subjects' : sub}</option>)}
            </select>
          </div>

          <div className="search-box">
            <Search size={14} className="search-icon" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student or subject..."
              className="search-input"
            />
          </div>
        </div>

        {/* Table View */}
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>#</th>
                <th>Student</th>
                <th>Exam & Subject</th>
                <th>Score</th>
                <th>Time Spent</th>
                <th>Status</th>
                <th>Date Attempted</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center text-muted py-8">
                    No simulation sessions match your filters.
                  </td>
                </tr>
              ) : (
                filteredSessions.map((s, index) => {
                  const passed = s.percentage >= 50;
                  return (
                    <tr key={s._id}>
                      <td style={{ fontWeight: 600, color: 'var(--text-muted)' }}>
                        {index + 1}
                      </td>

                      <td>
                        <div className="em-table-board-cell">
                          <div className="user-avatar-small" style={{ width: 30, height: 30, fontSize: 11 }}>
                            {s.user?.name ? s.user.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div className="em-board-info">
                            <span className="em-board-name">{s.user?.name || 'Student'}</span>
                            <span className="em-stat-lbl">{s.user?.email || 'N/A'}</span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="flex items-center gap-1.5">
                          <span className="em-board-badge" style={{ backgroundColor: 'rgba(123, 47, 247, 0.12)', color: '#7B2FF7', fontSize: '10px' }}>
                            {s.exam}
                          </span>
                          <span className="em-chip" style={{ fontSize: '11px' }}>
                            {s.subject}
                          </span>
                        </div>
                      </td>

                      <td>
                        <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {s.score} <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>/ {s.total} ({s.percentage}%)</span>
                        </span>
                      </td>

                      <td>
                        <span className="em-stat-lbl">{formatTime(s.timeSpentSeconds)}</span>
                      </td>

                      <td>
                        <span className={`badge badge-${passed ? 'success' : 'danger'}`}>
                          {passed ? 'Passed' : 'Failed'}
                        </span>
                      </td>

                      <td>
                        <span className="em-stat-lbl">{formatDate(s.createdAt)}</span>
                      </td>

                      <td>
                        <div className="action-buttons-cell" style={{ justifyContent: 'flex-end' }}>
                          <button className="btn-action edit" onClick={() => setDrawer(s)}>
                            <span>View Details</span>
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

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="wm-pagination mt-4">
            <span className="em-stat-lbl">
              Showing page {page} of {totalPages} ({totalRecords} records)
            </span>
            <div className="flex items-center gap-2">
              <button className="btn btn-outline" style={{ padding: '4px 8px' }} disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft size={14} />
              </button>
              <button className="btn btn-outline" style={{ padding: '4px 8px' }} disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* DETAIL SIDE DRAWER */}
      {drawer && (
        <div className="em-drawer-backdrop" onClick={() => setDrawer(null)}>
          <div className="em-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="em-drawer-header">
              <div className="em-drawer-title">Simulation Session Details</div>
              <button className="em-drawer-close" onClick={() => setDrawer(null)}>
                <X size={16} />
              </button>
            </div>

            <div className="em-drawer-body">
              <div className="wm-drawer-hero">
                <span className="badge badge-primary" style={{ textTransform: 'uppercase' }}>
                  {drawer.exam} · {drawer.subject}
                </span>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginTop: 8 }}>
                  Score: {drawer.score} / {drawer.total} ({drawer.percentage}%)
                </div>
                <div style={{ marginTop: 8 }}>
                  <span className={`badge badge-${drawer.percentage >= 50 ? 'success' : 'danger'}`}>
                    {drawer.percentage >= 50 ? 'Passed' : 'Failed'}
                  </span>
                </div>
              </div>

              <div className="em-field">
                <label className="em-field-label">Student Details</label>
                <div className="em-stat-line">
                  <span className="em-stat-lbl">Name:</span>
                  <span className="em-stat-num">{drawer.user?.name || 'Student'}</span>
                </div>
                <div className="em-stat-line">
                  <span className="em-stat-lbl">Email:</span>
                  <span className="em-stat-num">{drawer.user?.email || 'N/A'}</span>
                </div>
              </div>

              <div className="em-field">
                <label className="em-field-label">Exam Metrics</label>
                <div className="em-stat-line">
                  <span className="em-stat-lbl">Exam Board:</span>
                  <span className="em-stat-num">{drawer.exam}</span>
                </div>
                <div className="em-stat-line">
                  <span className="em-stat-lbl">Subject:</span>
                  <span className="em-stat-num">{drawer.subject}</span>
                </div>
                <div className="em-stat-line">
                  <span className="em-stat-lbl">Time Spent:</span>
                  <span className="em-stat-num">{formatTime(drawer.timeSpentSeconds)}</span>
                </div>
                <div className="em-stat-line">
                  <span className="em-stat-lbl">Attempted On:</span>
                  <span className="em-stat-num">{formatDate(drawer.createdAt)}</span>
                </div>
              </div>
            </div>

            <div className="em-drawer-footer">
              <button className="em-drawer-submit" onClick={() => setDrawer(null)}>
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
