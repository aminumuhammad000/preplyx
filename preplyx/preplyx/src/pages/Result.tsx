import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, CheckCircle2, XCircle, MinusCircle, Clock, Trophy, Target, 
  Award, RefreshCw, Eye, Sparkles, Brain, AlertTriangle, ChevronDown, 
  ChevronUp, ArrowRight, ShieldCheck, HelpCircle, BookOpen, Loader2 
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import VictoryCelebration from '../components/VictoryCelebration';
import { getCompletedSessionById } from '../lib/storage';

export default function Result() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('id');
  const { token } = useAuth();
  
  const [session, setSession] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [filter, setFilter] = useState<'all' | 'correct' | 'incorrect' | 'skipped'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);

  // "Why was my answer wrong?" deep-dive analysis state
  const [whyWrongLoading, setWhyWrongLoading] = useState<Record<string, boolean>>({});
  const [whyWrongAnswers, setWhyWrongAnswers] = useState<Record<string, string>>({});
  const [whyWrongErrors, setWhyWrongErrors] = useState<Record<string, string>>({});
  const [expandedWhyWrong, setExpandedWhyWrong] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setMounted(true);

    const fetchSession = async () => {
      try {
        setLoading(true);
        setError(null);
        let data: any = null;

        // Try backend if token exists and ID is not a local client ID
        if (token && sessionId && !sessionId.startsWith('result_')) {
          try {
            data = await api.getSession(token, sessionId);
          } catch (serverErr) {
            console.warn('Could not retrieve session from server:', serverErr);
          }
        }

        // Search local session storage
        if (!data) {
          data = getCompletedSessionById(sessionId);
        }

        if (data) {
          setSession(data);
          const pctVal = data.pct !== undefined ? data.pct : (data.score && data.total ? Math.round((data.score / data.total) * 100) : 0);
          if (pctVal >= 50) {
            setShowCelebration(true);
          }
        } else {
          setError('No practice exam session results found on server.');
        }
      } catch (err) {
        console.error('Error loading session result:', err);
        setError('Failed to load session result.');
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [sessionId, token]);

  const handleFetchWhyWrong = async (q: any, userAns: string) => {
    if (whyWrongAnswers[q.id]) {
      setExpandedWhyWrong(prev => ({ ...prev, [q.id]: !prev[q.id] }));
      return;
    }

    try {
      setWhyWrongLoading(prev => ({ ...prev, [q.id]: true }));
      setExpandedWhyWrong(prev => ({ ...prev, [q.id]: true }));
      setWhyWrongErrors(prev => ({ ...prev, [q.id]: '' }));

      const res = await api.explainWhyWrong({
        questionId: q.id || q._id,
        questionText: q.question || q.text,
        selectedAnswer: userAns,
        correctAnswer: q.correctAnswer,
        subject: session?.subject || q.subject || 'General',
        topic: q.topic || 'General',
        options: q.options?.map((o: any) => (typeof o === 'string' ? o : o.text || o.id))
      }, token || undefined);

      const d = res?.data;
      if (d) {
        const formatted = (
          `${d.whySelectedIsIncorrect ? `• ${d.whySelectedIsIncorrect}\n\n` : ''}` +
          `${d.whySelectedIsTempting ? `• Cognitive Distractor Trap: ${d.whySelectedIsTempting}\n\n` : ''}` +
          `${d.relevantConcept ? `• Key Concept: ${d.relevantConcept}\n\n` : ''}` +
          `${d.correctReasoning ? `• Step-by-Step Solution: ${d.correctReasoning}` : ''}`
        ).trim() || d.simpleExplanation || 'Explanation available in Mistake Center.';

        setWhyWrongAnswers(prev => ({ ...prev, [q.id]: formatted }));
      } else {
        setWhyWrongErrors(prev => ({ ...prev, [q.id]: 'Unable to generate explanation. Please try again.' }));
      }
    } catch (err: any) {
      console.warn('Could not fetch why wrong explanation:', err);
      setWhyWrongErrors(prev => ({ ...prev, [q.id]: 'Unable to generate explanation. Try again.' }));
    } finally {
      setWhyWrongLoading(prev => ({ ...prev, [q.id]: false }));
    }
  };

  if (!mounted || loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading results...</div>;
  }

  if (error || !session) {
    return (
      <div style={{
        padding: '60px 20px',
        textAlign: 'center',
        backgroundColor: '#ffffff',
        borderRadius: '20px',
        border: '1px solid #E2E8F0',
        maxWidth: '520px',
        margin: '40px auto'
      }}>
        <div style={{
          width: '56px', height: '56px', borderRadius: '16px',
          backgroundColor: '#F3E8FF', color: 'var(--color-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px'
        }}>
          <Award size={28} />
        </div>
        <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '8px' }}>
          No Server Session Results Found
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '24px', lineHeight: 1.5 }}>
          {error || 'Start a practice CBT exam to generate real performance results.'}
        </p>
        <button
          onClick={() => navigate('/dashboard/practice')}
          style={{
            padding: '12px 24px', borderRadius: '12px',
            background: 'var(--gradient-primary)', color: '#fff',
            border: 'none', fontWeight: 700, cursor: 'pointer',
            fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '8px'
          }}
        >
          <RefreshCw size={15} /> Launch Practice CBT
        </button>
      </div>
    );
  }

  const { exam, subject, score, total, pct, answers = {}, questions = [], timeSpentSeconds, subjectResults } = session;
  const correctCount = score;
  const skippedCount = questions.filter((q: any) => !answers[q.id]).length;
  const incorrectCount = total - correctCount - skippedCount;

  const filteredQuestions = questions.filter((q: any) => {
    const userAns = answers[q.id];
    if (filter === 'correct') return userAns === q.correctAnswer;
    if (filter === 'incorrect') return userAns && userAns !== q.correctAnswer;
    if (filter === 'skipped') return !userAns;
    return true;
  });

  const getPerformanceBadge = () => {
    if (pct >= 80) return { label: 'Excellent!', color: '#16a34a', bg: '#dcfce7', icon: Trophy };
    if (pct >= 60) return { label: 'Good Job!', color: '#d97706', bg: '#fef3c7', icon: Target };
    return { label: 'Keep Practicing', color: '#dc2626', bg: '#fee2e2', icon: Award };
  };

  const badge = getPerformanceBadge();
  const BadgeIcon = badge.icon;

  const formatTimeSpent = (sec?: number) => {
    if (!sec) return 'N/A';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out', maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
        <button
          onClick={() => navigate('/dashboard/practice')}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 14px', borderRadius: '10px',
            backgroundColor: '#fff', border: '1px solid var(--glass-border)',
            color: 'var(--color-text-main)', fontSize: '13px', fontWeight: 600, cursor: 'pointer'
          }}
        >
          <ArrowLeft size={16} /> Back to Practice
        </button>
        <div>
          <h1 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--color-text-main)', margin: 0 }}>
            {exam} Exam Performance Breakdown
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: 0 }}>
            {subject ? `${subject} • ` : ''}Detailed CBT Score Card & Analysis
          </p>
        </div>
      </div>

      {/* Main Score Hero Card */}
      <div style={{
        backgroundColor: '#fff', borderRadius: '20px', padding: '32px',
        border: '1px solid var(--glass-border)', boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
        marginBottom: '28px'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', alignItems: 'center' }}>
          
          {/* Big Score Ring */}
          <div style={{ textAlign: 'center', paddingRight: '20px', borderRight: '1px solid #f1f5f9' }}>
            <div style={{
              width: '120px', height: '120px', borderRadius: '50%',
              background: `conic-gradient(#7B2FF7 ${pct}%, #f1f5f9 0)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px', position: 'relative'
            }}>
              <div style={{
                width: '96px', height: '96px', borderRadius: '50%',
                backgroundColor: '#fff', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center'
              }}>
                <span style={{ fontSize: '17px', fontWeight: 700, color: '#7B2FF7', lineHeight: 1 }}>
                  {pct}%
                </span>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>
                  Overall Score
                </span>
              </div>
            </div>

            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '6px 14px', borderRadius: '20px',
              backgroundColor: badge.bg, color: badge.color,
              fontSize: '13px', fontWeight: 700
            }}>
              <BadgeIcon size={16} />
              <span>{badge.label}</span>
            </div>
          </div>

          {/* Stat Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
            <div style={{ padding: '14px', borderRadius: '12px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#16a34a', marginBottom: '4px' }}>
                <CheckCircle2 size={16} />
                <span style={{ fontSize: '12px', fontWeight: 700 }}>Correct Answers</span>
              </div>
              <div style={{ fontSize: '17px', fontWeight: 600, color: '#15803d' }}>
                {correctCount} <span style={{ fontSize: '13px', fontWeight: 500, color: '#475569' }}>/ {total}</span>
              </div>
            </div>

            <div style={{ padding: '14px', borderRadius: '12px', backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626', marginBottom: '4px' }}>
                <XCircle size={16} />
                <span style={{ fontSize: '12px', fontWeight: 700 }}>Incorrect Answers</span>
              </div>
              <div style={{ fontSize: '17px', fontWeight: 600, color: '#b91c1c' }}>
                {incorrectCount} <span style={{ fontSize: '13px', fontWeight: 500, color: '#475569' }}>/ {total}</span>
              </div>
            </div>

            <div style={{ padding: '14px', borderRadius: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', marginBottom: '4px' }}>
                <MinusCircle size={16} />
                <span style={{ fontSize: '12px', fontWeight: 700 }}>Skipped Questions</span>
              </div>
              <div style={{ fontSize: '17px', fontWeight: 600, color: '#334155' }}>
                {skippedCount} <span style={{ fontSize: '13px', fontWeight: 500, color: '#475569' }}>/ {total}</span>
              </div>
            </div>

            <div style={{ padding: '14px', borderRadius: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#7B2FF7', marginBottom: '4px' }}>
                <Clock size={16} />
                <span style={{ fontSize: '12px', fontWeight: 700 }}>Time Spent</span>
              </div>
              <div style={{ fontSize: '17px', fontWeight: 600, color: '#4c1d95' }}>
                {formatTimeSpent(timeSpentSeconds)}
              </div>
            </div>
          </div>

        </div>

        {/* Multi-Subject breakdown if applicable */}
        {subjectResults && Object.keys(subjectResults).length > 0 && (
          <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '12px' }}>
              Subject Performance Summary
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
              {Object.entries(subjectResults).map(([subjName, res]: [string, any]) => (
                <div key={subjName} style={{ padding: '10px 14px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: '2px' }}>{subjName}</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#7B2FF7' }}>
                    {res.score}/{res.total} ({res.pct}%)
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Preplyx Mistake Intelligence Sync Banner ── */}
      {incorrectCount > 0 && (
        <div style={{
          padding: '20px 24px', borderRadius: '16px',
          background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)',
          color: '#fff', marginBottom: '28px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: '16px',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 4px 20px rgba(15, 23, 42, 0.08)'
        }}>
          <div style={{ maxWidth: '640px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, marginBottom: '8px' }}>
              <Brain size={13} /> {incorrectCount} MISTAKES LOGGED FOR SPACED RETESTING
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px', color: '#fff' }}>
              Review Cognitive Traps & Why Your Answers Were Wrong
            </h3>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', margin: 0, lineHeight: 1.5 }}>
              Mistakes are your greatest learning asset. Every wrong pick below includes cognitive trap identification and step-by-step correction to guarantee you never fall for the same trap in official exams.
            </p>
          </div>
          <Link
            to="/dashboard/mistakes"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '10px 18px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
              color: '#fff', fontSize: '13px', fontWeight: 700, textDecoration: 'none'
            }}
            className="header-hover-card"
          >
            Go to Mistake Center <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {/* ── Full Question Breakdown (Accessible to all students) ── */}
      <div style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '28px', border: '1px solid var(--glass-border)', marginBottom: '40px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Eye size={17} color="#16a34a" />
              Full Question Breakdown & Explanations
            </h3>
            <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
              All correct answers, option breakdowns, and cognitive trap analyses are shown below.
            </p>
          </div>

          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: `All (${questions.length})` },
              { id: 'correct', label: `Correct (${correctCount})` },
              { id: 'incorrect', label: `Incorrect (${incorrectCount})` },
              { id: 'skipped', label: `Skipped (${skippedCount})` },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id as any)}
                style={{
                  padding: '6px 12px', borderRadius: '8px',
                  backgroundColor: filter === f.id ? '#7B2FF7' : '#f1f5f9',
                  color: filter === f.id ? '#fff' : '#475569',
                  border: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Colour Legend */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap',
          padding: '10px 14px', borderRadius: '10px', backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0', marginBottom: '20px'
        }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>Legend:</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 600, color: '#15803d' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#dcfce7', border: '1.5px solid #16a34a', display: 'inline-block' }} />
            Correct Answer
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 600, color: '#b91c1c' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#fee2e2', border: '1.5px solid #dc2626', display: 'inline-block' }} />
            Your Wrong Pick
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 600, color: '#475569' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#f1f5f9', border: '1.5px solid #cbd5e1', display: 'inline-block' }} />
            Not Selected
          </span>
        </div>

        {/* Questions List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredQuestions.map((q: any, idx: number) => {
            const userAns = answers[q.id];
            const isCorrect = userAns === q.correctAnswer;
            const isSkipped = !userAns;
            const confidence = session.confidences?.[q.id];

            // Card border & background
            const cardBorderColor = isSkipped ? '#e2e8f0' : isCorrect ? '#86efac' : '#fca5a5';
            const cardBgColor = isSkipped ? '#ffffff' : isCorrect ? '#f0fdf4' : '#fff9f9';

            const opts: any[] = Array.isArray(q.options)
              ? q.options
              : Object.entries(q.options || {}).map(([id, text]) => ({
                  id,
                  text: typeof text === 'string' ? text : (text as any)?.text || String(text)
                }));

            return (
              <div
                key={q.id || idx}
                style={{
                  padding: '20px 22px',
                  borderRadius: '16px',
                  backgroundColor: cardBgColor,
                  border: `1px solid ${cardBorderColor}`,
                  transition: 'all 0.2s ease'
                }}
              >
                {/* Question header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#7B2FF7' }}>Q{idx + 1}</span>
                    {isSkipped ? (
                      <span style={{ fontSize: '10px', fontWeight: 700, backgroundColor: '#f1f5f9', color: '#64748b', padding: '2px 8px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <MinusCircle size={10} /> Skipped
                      </span>
                    ) : isCorrect ? (
                      <span style={{ fontSize: '10px', fontWeight: 700, backgroundColor: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <CheckCircle2 size={10} /> Correct
                      </span>
                    ) : (
                      <span style={{ fontSize: '10px', fontWeight: 700, backgroundColor: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <XCircle size={10} /> Missed
                      </span>
                    )}

                    {/* Cognitive trap pill for missed question */}
                    {!isCorrect && !isSkipped && (
                      <span style={{
                        fontSize: '10px', fontWeight: 700,
                        backgroundColor: '#fef3c7', color: '#b45309',
                        padding: '2px 8px', borderRadius: '6px',
                        display: 'inline-flex', alignItems: 'center', gap: '3px'
                      }}>
                        <AlertTriangle size={10} /> Trap: {q.cognitiveTrap || 'Conceptual Distractor'}
                      </span>
                    )}

                    {/* Confidence tag if recorded */}
                    {confidence && (
                      <span style={{
                        fontSize: '10px', fontWeight: 600,
                        color: confidence === 'high' ? (!isCorrect ? '#dc2626' : '#16a34a') : '#64748b',
                        backgroundColor: '#f8fafc', border: '1px solid #e2e8f0',
                        padding: '2px 8px', borderRadius: '6px'
                      }}>
                        Confidence: {confidence === 'high' ? 'Very Sure' : confidence === 'medium' ? 'Somewhat Sure' : 'Guessing'}
                        {!isCorrect && confidence === 'high' && ' (Blindspot)'}
                      </span>
                    )}
                  </div>

                  {/* Correct answer key badge — always visible */}
                  <span style={{
                    fontSize: '11px', fontWeight: 700, color: '#15803d',
                    backgroundColor: '#dcfce7', padding: '3px 10px', borderRadius: '20px',
                    border: '1px solid #86efac', display: 'inline-flex', alignItems: 'center', gap: '4px'
                  }}>
                    <CheckCircle2 size={11} /> Correct Answer: {q.correctAnswer}
                  </span>
                </div>

                {/* Question text */}
                <p style={{ fontSize: '14px', fontWeight: 500, color: '#0f172a', marginBottom: '14px', lineHeight: 1.6 }}>
                  {q.question}
                </p>

                {/* Options — all shown, colour-coded */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', marginBottom: '14px' }}>
                  {opts.map((opt: any) => {
                    const isUserChoice = userAns === opt.id;
                    const isRightChoice = q.correctAnswer === opt.id;

                    let bg = '#ffffff';
                    let border = '#e2e8f0';
                    let color = '#64748b';
                    let weight = 400;
                    let icon: React.ReactNode = null;

                    if (isRightChoice) {
                      bg = '#dcfce7';
                      border = '#16a34a';
                      color = '#15803d';
                      weight = 600;
                      icon = <CheckCircle2 size={13} style={{ flexShrink: 0 }} />;
                    } else if (isUserChoice && !isRightChoice) {
                      bg = '#fee2e2';
                      border = '#dc2626';
                      color = '#b91c1c';
                      weight = 600;
                      icon = <XCircle size={13} style={{ flexShrink: 0 }} />;
                    }

                    return (
                      <div
                        key={opt.id}
                        style={{
                          padding: '10px 14px', borderRadius: '10px',
                          backgroundColor: bg, border: `1.5px solid ${border}`,
                          color, fontSize: '13px', fontWeight: weight,
                          display: 'flex', alignItems: 'center', gap: '8px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span style={{ fontWeight: 700, flexShrink: 0, fontSize: '12px' }}>{opt.id}.</span>
                        <span style={{ flex: 1 }}>{opt.text}</span>
                        {icon}
                        {isUserChoice && isRightChoice && (
                          <span style={{ fontSize: '10px', fontWeight: 600, color: '#15803d', marginLeft: 'auto', whiteSpace: 'nowrap' }}>✓ Your Pick</span>
                        )}
                        {isUserChoice && !isRightChoice && (
                          <span style={{ fontSize: '10px', fontWeight: 600, color: '#b91c1c', marginLeft: 'auto', whiteSpace: 'nowrap' }}>Your Pick</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Explanation — always visible */}
                {q.explanation && (
                  <div style={{
                    marginTop: '8px', padding: '12px 16px', borderRadius: '10px',
                    backgroundColor: '#fffbeb', border: '1px solid #fde68a',
                    fontSize: '12.5px', color: '#78350f', lineHeight: 1.6
                  }}>
                    <span style={{ fontWeight: 700, color: '#92400e', marginRight: '4px' }}>💡 Concept Explanation:</span>
                    {q.explanation}
                  </div>
                )}

                {/* "Why was my answer wrong?" deep-dive toggle for missed questions */}
                {!isCorrect && !isSkipped && (
                  <div style={{ marginTop: '10px' }}>
                    <button
                      type="button"
                      onClick={() => handleFetchWhyWrong(q, userAns)}
                      style={{
                        padding: '6px 14px', borderRadius: '8px',
                        backgroundColor: expandedWhyWrong[q.id] ? '#ede9fe' : '#f5f3ff',
                        color: '#6d28d9', border: '1px solid #ddd6fe',
                        fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {whyWrongLoading[q.id] ? (
                        <>
                          <Loader2 size={13} className="animate-spin" /> Analyzing Cognitive Trap...
                        </>
                      ) : (
                        <>
                          <Sparkles size={13} color="#7c3aed" />
                          Why was my answer ({userAns}) wrong?
                          {expandedWhyWrong[q.id] ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        </>
                      )}
                    </button>

                    {expandedWhyWrong[q.id] && whyWrongAnswers[q.id] && (
                      <div style={{
                        marginTop: '8px', padding: '14px 16px', borderRadius: '12px',
                        backgroundColor: '#faf5ff', border: '1px solid #e9d5ff',
                        color: '#4c1d95', fontSize: '12.5px', lineHeight: 1.6,
                        whiteSpace: 'pre-line'
                      }}>
                        <div style={{ fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Brain size={14} color="#7c3aed" /> Preplyx Cognitive Breakdown:
                        </div>
                        {whyWrongAnswers[q.id]}
                      </div>
                    )}

                    {expandedWhyWrong[q.id] && whyWrongErrors[q.id] && (
                      <div style={{
                        marginTop: '8px', padding: '12px 16px', borderRadius: '12px',
                        backgroundColor: '#fef2f2', border: '1px solid #fecaca',
                        color: '#991b1b', fontSize: '12.5px', display: 'flex',
                        alignItems: 'center', justifyContent: 'space-between', gap: '12px'
                      }}>
                        <span>{whyWrongErrors[q.id]}</span>
                        <button
                          type="button"
                          onClick={() => handleFetchWhyWrong(q, userAns)}
                          style={{
                            padding: '4px 10px', borderRadius: '6px',
                            backgroundColor: '#dc2626', color: '#fff',
                            border: 'none', fontSize: '11.5px', fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          Retry
                        </button>
                      </div>
                    )}
                  </div>
                )}

              </div>
            );
          })}
        </div>
      </div>


      {/* Floating Balloons & Confetti Victory Celebration Overlay */}
      {showCelebration && session && (
        <VictoryCelebration
          score={session.score || 0}
          total={session.total || 0}
          pct={session.pct !== undefined ? session.pct : (session.score && session.total ? Math.round((session.score / session.total) * 100) : 0)}
          onClose={() => setShowCelebration(false)}
        />
      )}
    </div>
  );
}
