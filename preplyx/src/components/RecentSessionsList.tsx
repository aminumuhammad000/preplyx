import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BookOpen, Calendar, Clock, ChevronRight, CheckCircle2, XCircle, FileSpreadsheet } from 'lucide-react';

export interface CompletedSession {
  id: string;
  exam: string;
  subject: string;
  score: number;
  total: number;
  pct: number;
  date: number;
  timeSpentSeconds?: number;
}

import { API_BASE_URL } from '../config/api';

export default function RecentSessionsList() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<CompletedSession[] | null>(null);
  const [mounted, setMounted] = useState(false);
  const { token } = useAuth();

  useEffect(() => {
    setMounted(true);
    if (token) {
      fetch(`${API_BASE_URL}/data/sessions`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => setSessions(data))
      .catch(err => console.error(err));
    }
  }, [token]);

  if (!mounted || !sessions) {
    return (
      <div style={{
        backgroundColor: '#ffffff', borderRadius: '16px', padding: '32px',
        border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
        textAlign: 'center', color: '#64748b', fontSize: '13px', fontWeight: 600
      }}>
        Loading recent sessions...
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div style={{
        backgroundColor: '#ffffff', borderRadius: '16px', padding: '36px 24px',
        border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
        textAlign: 'center'
      }}>
        <div style={{
          width: '44px', height: '44px', borderRadius: '12px',
          backgroundColor: '#f3e8ff', color: '#7c3aed',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 12px'
        }}>
          <FileSpreadsheet size={22} />
        </div>
        <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>No Recent Practice Sessions</div>
        <p style={{ fontSize: '13px', color: '#64748b' }}>Start a practice exam to track your historical CBT results here.</p>
      </div>
    );
  }

  const getGradeBadge = (pct: number) => {
    if (pct >= 75) {
      return {
        bg: '#dcfce7',
        text: '#15803d',
        border: 'rgba(34, 197, 94, 0.2)',
        label: 'Excellent'
      };
    }
    if (pct >= 50) {
      return {
        bg: '#fef3c7',
        text: '#b45309',
        border: 'rgba(245, 158, 11, 0.2)',
        label: 'Passed'
      };
    }
    return {
      bg: '#ffe4e6',
      text: '#be123c',
      border: 'rgba(244, 63, 94, 0.2)',
      label: 'Needs Practice'
    };
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTimeSpent = (seconds: number | undefined) => {
    if (!seconds) return '10m 00s';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  return (
    <div style={{
      backgroundColor: '#ffffff',
      borderRadius: '16px',
      border: '1px solid #e2e8f0',
      boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
      overflow: 'hidden'
    }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          textAlign: 'left',
          fontSize: '13px'
        }}>
          <thead>
            <tr style={{
              backgroundColor: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              color: '#64748b',
              fontSize: '11px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.8px'
            }}>
              <th style={{ padding: '14px 20px' }}>Exam & Subject</th>
              <th style={{ padding: '14px 16px' }}>Date & Duration</th>
              <th style={{ padding: '14px 16px' }}>Correct / Total</th>
              <th style={{ padding: '14px 16px' }}>Accuracy</th>
              <th style={{ padding: '14px 20px', textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {sessions.slice(0, 10).map((row, idx) => {
              const badge = getGradeBadge(row.pct);
              const wrongCount = row.total - row.score;
              const isEven = idx % 2 === 0;

              return (
                <tr
                  key={row.id || idx}
                  onClick={() => navigate(`/dashboard/result?id=${row.id}`)}
                  style={{
                    borderBottom: idx === sessions.length - 1 ? 'none' : '1px solid #f1f5f9',
                    backgroundColor: isEven ? '#ffffff' : '#fafafa',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f4f0ff')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = isEven ? '#ffffff' : '#fafafa')}
                >
                  {/* Exam & Subject */}
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '10px',
                        background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                        color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 800, fontSize: '12px', flexShrink: 0,
                        boxShadow: '0 2px 6px rgba(109, 40, 217, 0.18)'
                      }}>
                        <BookOpen size={16} />
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', textTransform: 'capitalize', letterSpacing: '-0.2px' }}>
                          {row.subject}
                        </div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                          <span style={{
                            fontSize: '10px', fontWeight: 800, color: '#7c3aed',
                            backgroundColor: '#f3e8ff', padding: '1px 6px', borderRadius: '4px'
                          }}>
                            {row.exam?.toUpperCase() || 'CBT'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Date & Duration */}
                  <td style={{ padding: '16px 16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#334155', fontWeight: 600 }}>
                        <Calendar size={13} color="#64748b" />
                        <span>{formatDate(row.date)}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '11px', fontWeight: 500 }}>
                        <Clock size={12} color="#94a3b8" />
                        <span>{formatTimeSpent(row.timeSpentSeconds)}</span>
                      </div>
                    </div>
                  </td>

                  {/* Correct / Total */}
                  <td style={{ padding: '16px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle2 size={15} color="#16a34a" />
                        <span style={{ fontSize: '14px', fontWeight: 800, color: '#16a34a' }}>{row.score}</span>
                      </div>
                      <span style={{ color: '#cbd5e1' }}>/</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <XCircle size={15} color="#ef4444" />
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748b' }}>{wrongCount}</span>
                      </div>
                    </div>
                  </td>

                  {/* Accuracy Badge */}
                  <td style={{ padding: '16px 16px' }}>
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      padding: '4px 10px', borderRadius: '999px',
                      backgroundColor: badge.bg, color: badge.text,
                      border: `1px solid ${badge.border}`
                    }}>
                      <span style={{ fontSize: '13px', fontWeight: 900 }}>{row.pct}%</span>
                      <span style={{ fontSize: '10px', fontWeight: 700, opacity: 0.9 }}>{badge.label}</span>
                    </div>
                  </td>

                  {/* Action */}
                  <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                    <button style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      padding: '6px 12px', borderRadius: '8px',
                      backgroundColor: '#f3e8ff', color: '#7c3aed',
                      border: '1px solid rgba(124, 58, 237, 0.15)',
                      fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}>
                      Review <ChevronRight size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
