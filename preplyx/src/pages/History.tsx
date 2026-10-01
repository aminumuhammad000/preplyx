import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config/api';
import { getCompletedSessions } from '../lib/storage';
import { 
  FileText, Clock, CheckCircle2, AlertTriangle, XCircle, 
  RotateCcw, Search, Filter, BookOpen, ChevronRight, Award
} from 'lucide-react';

export interface ExamHistoryItem {
  id: string;
  exam: string;
  subject: string;
  score: number;
  total: number;
  pct: number;
  date: number | string;
  status: 'completed' | 'timed_out' | 'abandoned' | 'abandoned_0_answers' | 'in_progress' | string;
  timeSpentSeconds: number;
  mode?: string;
  year?: string;
}

export default function History() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [history, setHistory] = useState<ExamHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'completed' | 'timed_out' | 'abandoned'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExamFilter, setSelectedExamFilter] = useState('All');

  useEffect(() => {
    const fetchExamHistory = async () => {
      let mergedHistory: ExamHistoryItem[] = [];

      // 1. Fetch local storage sessions
      const localSessions = getCompletedSessions().map((s: any) => ({
        id: s.id || s._id,
        exam: s.exam || 'JAMB',
        subject: s.subject || 'General',
        score: s.score || 0,
        total: s.total || 0,
        pct: typeof s.pct === 'number' ? s.pct : (s.percentage || 0),
        date: s.date || s.createdAt || Date.now(),
        status: s.status || 'completed',
        timeSpentSeconds: s.timeSpentSeconds || 0,
        mode: s.mode || 'practice',
        year: s.year || ''
      }));

      mergedHistory = [...localSessions];

      // 2. Fetch server sessions if logged in
      if (token) {
        try {
          const res = await fetch(`${API_BASE_URL}/sessions`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const serverSessions = await res.json();
            if (Array.isArray(serverSessions)) {
              serverSessions.forEach((srv: any) => {
                const srvId = srv._id || srv.id;
                const exists = mergedHistory.some(m => m.id === srvId);
                if (!exists) {
                  mergedHistory.push({
                    id: srvId,
                    exam: srv.exam,
                    subject: srv.subject,
                    score: srv.score,
                    total: srv.total,
                    pct: srv.percentage || srv.pct || 0,
                    date: srv.createdAt || Date.now(),
                    status: srv.status || 'completed',
                    timeSpentSeconds: srv.timeSpentSeconds || 0,
                    mode: srv.mode || 'practice',
                    year: srv.year || ''
                  });
                }
              });
            }
          }
        } catch (err) {
          console.warn('Failed to fetch remote exam history:', err);
        }
      }

      // Sort by newest date
      mergedHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setHistory(mergedHistory);
      setLoading(false);
    };

    fetchExamHistory();
  }, [token]);

  // Calculate metrics
  const totalAttempts = history.length;
  const completedCount = history.filter(h => h.status === 'completed').length;
  const timedOutCount = history.filter(h => h.status === 'timed_out').length;
  const abandonedCount = history.filter(h => h.status.includes('abandoned') || h.status === 'in_progress').length;
  
  const totalPctSum = history.reduce((acc, h) => acc + h.pct, 0);
  const avgAccuracy = totalAttempts > 0 ? Math.round(totalPctSum / totalAttempts) : 0;

  // Filter items
  const filteredHistory = history.filter(item => {
    // Tab filter
    if (activeTab === 'completed' && item.status !== 'completed') return false;
    if (activeTab === 'timed_out' && item.status !== 'timed_out') return false;
    if (activeTab === 'abandoned' && !item.status.includes('abandoned') && item.status !== 'in_progress') return false;

    // Exam type filter
    if (selectedExamFilter !== 'All' && item.exam.toUpperCase() !== selectedExamFilter.toUpperCase()) return false;

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSubject = item.subject.toLowerCase().includes(q);
      const matchExam = item.exam.toLowerCase().includes(q);
      return matchSubject || matchExam;
    }

    return true;
  });

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds <= 0) return '0m 0s';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const formatDate = (rawDate: string | number) => {
    try {
      const d = new Date(rawDate);
      return d.toLocaleDateString('en-NG', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return 'Recent';
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'completed') {
      return (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '5px',
          padding: '4px 10px', borderRadius: '999px',
          backgroundColor: '#dcfce7', color: '#15803d',
          fontSize: '11px', fontWeight: 700, border: '1px solid #bbf7d0'
        }}>
          <CheckCircle2 size={12} /> Finished & Submitted
        </span>
      );
    }
    if (status === 'timed_out') {
      return (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '5px',
          padding: '4px 10px', borderRadius: '999px',
          backgroundColor: '#fef3c7', color: '#b45309',
          fontSize: '11px', fontWeight: 700, border: '1px solid #fde68a'
        }}>
          <AlertTriangle size={12} /> Timed Out
        </span>
      );
    }
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: '5px',
        padding: '4px 10px', borderRadius: '999px',
        backgroundColor: '#fee2e2', color: '#b91c1c',
        fontSize: '11px', fontWeight: 700, border: '1px solid #fecaca'
      }}>
        <XCircle size={12} /> Exited Early
      </span>
    );
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      
      {/* Page Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '17px', fontWeight: 600, color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>
          Exam History & Log
        </h1>
        <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
          Comprehensive record of all practice tests you started, completed, or timed out.
        </p>
      </div>

      {/* Overview Stat Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))',
        gap: '16px',
        marginBottom: '28px'
      }}>
        <div style={{ padding: '18px', borderRadius: '16px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.5px' }}>Total Attempts</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', marginTop: '6px' }}>{totalAttempts}</div>
        </div>

        <div style={{ padding: '18px', borderRadius: '16px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#16a34a', letterSpacing: '0.5px' }}>Completed</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#16a34a', marginTop: '6px' }}>{completedCount}</div>
        </div>

        <div style={{ padding: '18px', borderRadius: '16px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#d97706', letterSpacing: '0.5px' }}>Timed Out</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#d97706', marginTop: '6px' }}>{timedOutCount}</div>
        </div>

        <div style={{ padding: '18px', borderRadius: '16px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#dc2626', letterSpacing: '0.5px' }}>Exited / Incomplete</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#dc2626', marginTop: '6px' }}>{abandonedCount}</div>
        </div>

        <div style={{ padding: '18px', borderRadius: '16px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#7c3aed', letterSpacing: '0.5px' }}>Average Accuracy</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#7c3aed', marginTop: '6px' }}>{avgAccuracy}%</div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '16px',
        marginBottom: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          
          {/* Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#f8fafc', padding: '4px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            {[
              { key: 'all', label: `All (${totalAttempts})` },
              { key: 'completed', label: `Completed (${completedCount})` },
              { key: 'timed_out', label: `Timed Out (${timedOutCount})` },
              { key: 'abandoned', label: `Exited (${abandonedCount})` }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                style={{
                  padding: '7px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: activeTab === tab.key ? '#ffffff' : 'transparent',
                  color: activeTab === tab.key ? '#7c3aed' : '#64748b',
                  boxShadow: activeTab === tab.key ? '0 1px 4px rgba(15,23,42,0.06)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Controls: Search & Exam Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '240px', justifyContent: 'flex-end' }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: '280px' }}>
              <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search subject or exam..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 34px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <select
              value={selectedExamFilter}
              onChange={e => setSelectedExamFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                fontWeight: 600,
                color: '#334155',
                outline: 'none',
                backgroundColor: '#ffffff',
                cursor: 'pointer'
              }}
            >
              <option value="All">All Exams</option>
              <option value="JAMB">JAMB</option>
              <option value="WAEC">WAEC</option>
              <option value="NECO">NECO</option>
              <option value="POST-UTME">POST-UTME</option>
            </select>
          </div>
        </div>
      </div>

      {/* History List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8', fontSize: '14px' }}>
          Loading your exam log history...
        </div>
      ) : filteredHistory.length === 0 ? (
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '48px 24px',
          textAlign: 'center'
        }}>
          <BookOpen size={44} color="#cbd5e1" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', margin: '0 0 6px 0' }}>
            No Exam Sessions Found
          </h3>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px 0' }}>
            {activeTab !== 'all' || searchQuery || selectedExamFilter !== 'All' 
              ? 'No sessions match your selected filter. Try switching tabs or clearing filters.'
              : 'You have not taken any practice exams yet. Start an exam to track your history!'}
          </p>
          <Link to="/dashboard/practice" style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '10px 20px', borderRadius: '10px',
            backgroundColor: '#7c3aed', color: '#ffffff',
            fontWeight: 700, fontSize: '13px', textDecoration: 'none'
          }}>
            Start Practice Test <ChevronRight size={16} />
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredHistory.map(session => (
            <div key={session.id} style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              padding: '18px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '14px',
              transition: 'box-shadow 0.15s ease'
            }} className="header-hover-card">
              
              {/* Left Info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '220px' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  backgroundColor: session.exam === 'JAMB' ? '#f3e8ff' : (session.exam === 'WAEC' ? '#dcfce7' : '#fef3c7'),
                  color: session.exam === 'JAMB' ? '#7c3aed' : (session.exam === 'WAEC' ? '#16a34a' : '#d97706'),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '13px',
                  flexShrink: 0
                }}>
                  {session.exam}
                </div>

                <div>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a' }}>
                    {session.subject} {session.year ? `(${session.year})` : ''}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} color="#94a3b8" /> {formatDate(session.date)}
                    </span>
                    <span>• {formatDuration(session.timeSpentSeconds)}</span>
                  </div>
                </div>
              </div>

              {/* Middle: Score & Status */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                {getStatusBadge(session.status)}

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a' }}>
                    {session.score} / {session.total}
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: session.pct >= 70 ? '#16a34a' : (session.pct >= 50 ? '#d97706' : '#dc2626') }}>
                    {session.pct}% Score
                  </div>
                </div>
              </div>

              {/* Right Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Link
                  to={`/dashboard/review?sessionId=${session.id}`}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    backgroundColor: '#f1f5f9',
                    color: '#334155',
                    fontSize: '12px',
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <FileText size={13} /> Review Answers
                </Link>

                <Link
                  to={`/dashboard/practice/${session.exam}/${encodeURIComponent(session.subject)}`}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    backgroundColor: '#7c3aed',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <RotateCcw size={13} /> Retake Test
                </Link>
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
}
