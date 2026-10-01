import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Bookmark, BookOpen, Clock, Lock, Unlock, ArrowRight, Trophy, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { getCompletedSessions } from '../lib/storage';

export default function Review() {
  const navigate = useNavigate();
  const { token } = useAuth();

  const [activeTab, setActiveTab] = useState<'sessions' | 'questions'>('sessions');
  const [sessionFilter, setSessionFilter] = useState<'all' | 'completed' | 'timed_out' | 'in_progress' | 'abandoned_0_answers'>('all');
  const [filter, setFilter] = useState<'all' | 'correct' | 'incorrect' | 'bookmarked'>('all');
  const [reviewedQuestions, setReviewedQuestions] = useState<any[]>([]);
  const [sessionsList, setSessionsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadReviewData = async () => {
      setLoading(true);
      
      // 1. Fetch completed sessions (from server or local storage)
      let localSessions = getCompletedSessions() || [];
      if (token) {
        try {
          const serverSessions = await api.getReviewedQuestions(token).catch(() => []);
          if (Array.isArray(serverSessions) && serverSessions.length > 0) {
            setReviewedQuestions(serverSessions);
          }
        } catch (e) {
          console.warn('Could not fetch server sessions:', e);
        }
      }

      setSessionsList(localSessions);
      setLoading(false);
    };

    loadReviewData();
  }, [token]);

  const isSessionUnlocked = (sessId: string) => {
    if (!sessId) return false;
    return localStorage.getItem(`preplyx_unlocked_result_${sessId}`) === 'true';
  };

  const filteredSessions = sessionsList.filter((sess: any) => {
    if (sessionFilter === 'all') return true;
    const st = sess.status || (sess.pct !== undefined ? 'completed' : 'in_progress');
    if (sessionFilter === 'abandoned_0_answers') {
      return st === 'abandoned_0_answers' || sess.answeredCount === 0;
    }
    return st === sessionFilter;
  });

  const sessionCounts = {
    all: sessionsList.length,
    completed: sessionsList.filter((s: any) => (s.status || 'completed') === 'completed').length,
    timed_out: sessionsList.filter((s: any) => s.status === 'timed_out').length,
    in_progress: sessionsList.filter((s: any) => s.status === 'in_progress').length,
    abandoned_0_answers: sessionsList.filter((s: any) => s.status === 'abandoned_0_answers' || s.answeredCount === 0).length
  };

  const filteredQuestions = (reviewedQuestions || []).filter((q) => {
    if (filter === 'all') return true;
    if (filter === 'correct') return q.isCorrect;
    if (filter === 'incorrect') return !q.isCorrect;
    if (filter === 'bookmarked') return q.bookmarked;
    return true;
  });

  const stats = {
    total: (reviewedQuestions || []).length,
    correct: (reviewedQuestions || []).filter(q => q.isCorrect).length,
    incorrect: (reviewedQuestions || []).filter(q => !q.isCorrect).length,
    bookmarked: (reviewedQuestions || []).filter(q => q.bookmarked).length
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: '16px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <BookOpen size={20} color="#fff" />
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '4px' }}>
            Loading Answered Questions & Past Sessions...
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
            Retrieving history from server and local storage
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.35s ease-out', maxWidth: '1000px', margin: '0 auto', paddingBottom: '40px' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '4px' }}>
          Answered Questions & Exam History
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
          Review your past practice test sessions, timed out exams, and unlocked detailed question solutions.
        </p>
      </div>

      {/* Main Mode Navigation Tabs */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
        <button
          onClick={() => setActiveTab('sessions')}
          style={{
            padding: '10px 20px', borderRadius: '12px',
            backgroundColor: activeTab === 'sessions' ? '#7B2FF7' : '#f1f5f9',
            color: activeTab === 'sessions' ? '#ffffff' : '#475569',
            border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          <Trophy size={16} /> Past Exam Sessions ({sessionsList.length})
        </button>

        <button
          onClick={() => setActiveTab('questions')}
          style={{
            padding: '10px 20px', borderRadius: '12px',
            backgroundColor: activeTab === 'questions' ? '#7B2FF7' : '#f1f5f9',
            color: activeTab === 'questions' ? '#ffffff' : '#475569',
            border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          <BookOpen size={16} /> Answered Questions Bank
        </button>
      </div>

      {/* TAB 1: Past Exam Sessions List */}
      {activeTab === 'sessions' && (
        <div>
          {/* Sub Filter Pills for Session Statuses */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
            {[
              { id: 'all', label: `📌 All (${sessionCounts.all})` },
              { id: 'completed', label: `🏁 Completed (${sessionCounts.completed})` },
              { id: 'timed_out', label: `⏱️ Timed Out (${sessionCounts.timed_out})` },
              { id: 'in_progress', label: `⏳ In-Progress (${sessionCounts.in_progress})` },
              { id: 'abandoned_0_answers', label: `🚪 Exited 0 Answers (${sessionCounts.abandoned_0_answers})` }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setSessionFilter(f.id as any)}
                style={{
                  padding: '6px 14px', borderRadius: '20px',
                  backgroundColor: sessionFilter === f.id ? '#7B2FF7' : '#f8fafc',
                  color: sessionFilter === f.id ? '#ffffff' : '#475569',
                  border: sessionFilter === f.id ? 'none' : '1px solid #e2e8f0',
                  fontSize: '12px', fontWeight: 700, cursor: 'pointer'
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {filteredSessions.length === 0 ? (
            <div style={{
              padding: '60px 20px', textAlign: 'center', backgroundColor: '#ffffff',
              borderRadius: '20px', border: '1px solid #e2e8f0'
            }}>
              <BookOpen size={40} color="#7B2FF7" style={{ margin: '0 auto 12px', opacity: 0.6 }} />
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', marginBottom: '6px' }}>
                No Exam Sessions Found
              </h3>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
                No exam sessions match your selected filter ({sessionFilter}).
              </p>
              <button
                onClick={() => navigate('/dashboard/practice')}
                style={{
                  padding: '12px 24px', borderRadius: '12px',
                  background: 'var(--gradient-primary)', color: '#fff',
                  border: 'none', fontWeight: 700, fontSize: '13px', cursor: 'pointer'
                }}
              >
                Launch CBT Practice
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {filteredSessions.map((sess: any, idx: number) => {
                const sessId = sess.id || `sess_${idx}`;
                const unlocked = isSessionUnlocked(sessId);
                const st = sess.status || (sess.pct !== undefined ? 'completed' : 'in_progress');

                return (
                  <div
                    key={sessId}
                    style={{
                      padding: '20px 24px', borderRadius: '16px', backgroundColor: '#ffffff',
                      border: '1px solid var(--glass-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      flexWrap: 'wrap', gap: '16px'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>
                          {sess.exam || 'JAMB'} • {sess.subject || 'General'}
                        </span>
                        
                        {/* Status Badge */}
                        <span style={{
                          fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '6px',
                          backgroundColor: st === 'completed' ? '#dcfce7' : st === 'timed_out' ? '#fee2e2' : st === 'abandoned_0_answers' ? '#f3f4f6' : '#fef3c7',
                          color: st === 'completed' ? '#15803d' : st === 'timed_out' ? '#b91c1c' : st === 'abandoned_0_answers' ? '#4b5563' : '#b45309'
                        }}>
                          {st === 'completed' ? '🏁 FINISHED' : st === 'timed_out' ? '⏱️ TIMED OUT' : st === 'abandoned_0_answers' ? '🚪 EXITED (0 ANS)' : '⏳ IN PROGRESS'}
                        </span>

                        <span style={{
                          fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px',
                          backgroundColor: unlocked ? '#dcfce7' : '#f3e8ff',
                          color: unlocked ? '#15803d' : '#6b21a8',
                          display: 'inline-flex', alignItems: 'center', gap: '4px'
                        }}>
                          {unlocked ? <Unlock size={12} /> : <Lock size={12} />}
                          {unlocked ? 'UNLOCKED' : 'LOCKED (10 Credits)'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: '#64748b' }}>
                        <span>Completed: {sess.date ? new Date(sess.date).toLocaleDateString() : 'Recent'}</span>
                        <span>•</span>
                        <span>Score: <strong style={{ color: '#7B2FF7' }}>{sess.score}/{sess.total} ({sess.pct}%)</strong></span>
                      </div>
                    </div>

                    <button
                      onClick={() => navigate(`/dashboard/result?id=${sessId}`)}
                      style={{
                        padding: '10px 20px', borderRadius: '12px',
                        background: unlocked ? 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)' : 'linear-gradient(135deg, #7B2FF7 0%, #4B0FA3 100%)',
                        color: '#ffffff', border: 'none', fontWeight: 700, fontSize: '13px',
                        cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px',
                        boxShadow: unlocked ? '0 4px 12px rgba(22, 163, 74, 0.25)' : '0 4px 12px rgba(123, 47, 247, 0.25)'
                      }}
                    >
                      {unlocked ? 'View Answers & Breakdown' : 'Unlock Answers (10 Credits)'}
                      <ArrowRight size={15} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Answered Questions Bank */}
      {activeTab === 'questions' && (
        <div>
          {/* Stats Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', marginBottom: '24px' }}>
            <div style={{ padding: '16px', borderRadius: '14px', backgroundColor: '#fff', border: '1px solid var(--glass-border)' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '2px' }}>Total Questions</p>
              <p style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', margin: 0 }}>{stats.total}</p>
            </div>
            <div style={{ padding: '16px', borderRadius: '14px', backgroundColor: '#fff', border: '1px solid var(--glass-border)' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', marginBottom: '2px' }}>Correct</p>
              <p style={{ fontSize: '17px', fontWeight: 700, color: '#16a34a', margin: 0 }}>{stats.correct}</p>
            </div>
            <div style={{ padding: '16px', borderRadius: '14px', backgroundColor: '#fff', border: '1px solid var(--glass-border)' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', marginBottom: '2px' }}>Incorrect</p>
              <p style={{ fontSize: '17px', fontWeight: 700, color: '#dc2626', margin: 0 }}>{stats.incorrect}</p>
            </div>
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
            {(['all', 'correct', 'incorrect', 'bookmarked'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '7px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 700,
                  border: filter === f ? '1px solid #7B2FF7' : '1px solid var(--glass-border)',
                  backgroundColor: filter === f ? '#7B2FF7' : '#fff',
                  color: filter === f ? '#fff' : '#64748b',
                  cursor: 'pointer', textTransform: 'capitalize'
                }}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Questions List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filteredQuestions.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', backgroundColor: '#fff', borderRadius: '16px' }}>
                No questions found under this filter.
              </div>
            ) : (
              filteredQuestions.map((q, idx) => (
                <div
                  key={q.id || idx}
                  style={{
                    padding: '22px', borderRadius: '16px', backgroundColor: '#fff',
                    border: '1px solid var(--glass-border)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>
                      {q.exam || 'CBT'} · {q.subject || 'Practice'}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {q.isCorrect ? <CheckCircle size={18} color="#16a34a" /> : <XCircle size={18} color="#dc2626" />}
                      {q.bookmarked && <Bookmark size={18} color="#d97706" fill="#d97706" />}
                    </div>
                  </div>

                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', marginBottom: '16px', lineHeight: 1.5 }}>
                    {q.question}
                  </p>

                  {q.explanation && (
                    <div style={{ padding: '12px 16px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid var(--glass-border)', fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
                      <strong style={{ color: '#0f172a' }}>Explanation: </strong>
                      {q.explanation}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

    </div>
  );
}
