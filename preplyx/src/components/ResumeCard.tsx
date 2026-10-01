import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { getActiveSession, ActiveSession } from '@/lib/storage';

export default function ResumeCard() {
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setSession(getActiveSession());
  }, []);

  if (!mounted) {
    return (
      <div style={{ borderRadius: '16px', padding: '22px 24px', background: 'linear-gradient(135deg, #6d28d9 0%, #4c1d95 100%)', color: '#fff', opacity: 0.85 }}>
        <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.75, marginBottom: '8px' }}>Loading Session...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div style={{
        borderRadius: '16px', padding: '22px 24px',
        background: 'linear-gradient(135deg, #6d28d9 0%, #4c1d95 100%)',
        color: '#fff', boxShadow: 'none',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
      }}>
        <div>
          <p style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '8px' }}>Ready to Practice</p>
          <h2 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '6px' }}>Start a New Exam</h2>
          <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.85)', marginBottom: '18px', lineHeight: 1.4 }}>Select an exam category to begin practice CBT mode.</p>
        </div>
        <div>
          <Link to="/dashboard/practice" style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '9px 18px', borderRadius: '10px',
            backgroundColor: '#fff', color: '#6d28d9',
            fontSize: '13px', fontWeight: 800, textDecoration: 'none',
            boxShadow: 'none'
          }} className="header-hover-card">
            Start Now <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    );
  }

  const remainingPct = Math.round(((session.totalQ - session.currentQIndex) / session.totalQ) * 100);

  const resumeUrl = session.subjects && session.subjects.length > 0
    ? `/dashboard/multi-subject-exam?exam=${session.exam}&subjects=${encodeURIComponent(session.subjects.join(','))}`
    : `/dashboard/practice/${session.exam}/${session.subject}`;

  return (
    <div style={{
      borderRadius: '16px', padding: '22px 24px',
      background: 'linear-gradient(135deg, #6d28d9 0%, #4c1d95 100%)',
      color: '#fff', boxShadow: 'none',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
    }}>
      <div>
        <p style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '8px' }}>Continue Where You Stopped</p>
        <h2 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '6px', textTransform: 'capitalize' }}>
          {session.exam} {session.subjects ? session.subjects.join(', ') : session.subject}
        </h2>
        <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.85)', marginBottom: '18px' }}>
          Question {session.currentQIndex + 1} of {session.totalQ} &mdash; {remainingPct}% remaining
        </p>
      </div>
      <div>
        <Link to={resumeUrl} style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          padding: '9px 18px', borderRadius: '10px',
          backgroundColor: '#fff', color: '#6d28d9',
          fontSize: '13px', fontWeight: 800, textDecoration: 'none',
          boxShadow: 'none'
        }} className="header-hover-card">
          Resume <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
