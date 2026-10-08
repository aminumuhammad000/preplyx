import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, BookOpen, GraduationCap, FileText, Sparkles, 
  Target, CheckCircle2, Circle, Brain, AlertCircle, ShieldCheck, 
  Flame, TrendingUp, Compass, Clock, Award
} from 'lucide-react';
import ResumeCard from '../components/ResumeCard';
import RecentSessionsList from '../components/RecentSessionsList';
import DashboardStats from '../components/DashboardStats';
import DailyChallengeBadge from '../components/DailyChallengeBadge';
import PwaInstallPrompt from '../components/PwaInstallPrompt';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

export default function Dashboard() {
  const { user, token } = useAuth();
  const [mission, setMission] = useState<any>(null);
  const [readiness, setReadiness] = useState<any>(null);
  const [loadingMission, setLoadingMission] = useState(false);

  useEffect(() => {
    if (!token) return;

    const fetchMissionAndReadiness = async () => {
      try {
        setLoadingMission(true);
        const [missionRes, readinessRes] = await Promise.allSettled([
          api.getDailyMission(token),
          api.getReadinessScore(token)
        ]);

        if (missionRes.status === 'fulfilled' && missionRes.value) {
          const val: any = missionRes.value;
          setMission(val.mission || val);
        }
        if (readinessRes.status === 'fulfilled' && readinessRes.value) {
          const val: any = readinessRes.value;
          setReadiness(val.readiness || val);
        }
      } catch (err) {
        console.warn('Could not load daily mission or readiness:', err);
      } finally {
        setLoadingMission(false);
      }
    };

    fetchMissionAndReadiness();
  }, [token]);

  const targetExam = user?.targetExam || 'JAMB';
  const targetScore = user?.targetScore || 280;
  const isDiagnosticDone = user?.diagnosticCompleted || !!readiness?.overallScore;

  // Resolve checklist action URLs directly into the CBT exam portal
  const resolveMissionUrl = (task: any) => {
    if (!task) return `/dashboard/practice/${encodeURIComponent(targetExam)}/${encodeURIComponent(user?.subjects?.[0] || 'English Language')}`;
    
    const rawUrl = task.actionUrl || '';
    if (rawUrl.includes('/mistakes') || task.type === 'review_mistakes') return '/dashboard/mistakes';
    if (rawUrl.includes('/challenge') || task.type === 'mock_test') return '/dashboard/challenge';

    // If already in /dashboard/practice/:exam/:subject format
    if (rawUrl.startsWith('/dashboard/practice/') && rawUrl.split('/').length >= 4) {
      return rawUrl;
    }

    // Extract subject and exam from task object or query params
    let subj = task.subject;
    let ex = task.exam || targetExam;

    if (rawUrl.includes('?')) {
      const qParams = new URLSearchParams(rawUrl.split('?')[1]);
      if (qParams.get('subject')) subj = qParams.get('subject')!;
      if (qParams.get('exam')) ex = qParams.get('exam')!;
    }

    if (!subj) {
      subj = user?.subjects?.[0] || 'English Language';
    }

    return `/dashboard/practice/${encodeURIComponent(ex)}/${encodeURIComponent(subj)}`;
  };

  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
      <PwaInstallPrompt />

      {/* ── Diagnostic Onboarding Prompt (if not done) ── */}
      {!isDiagnosticDone && (
        <div style={{
          borderRadius: '16px',
          padding: '20px 24px',
          background: 'linear-gradient(135deg, #4c1d95 0%, #311068 100%)',
          color: '#fff',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 8px 24px rgba(76, 29, 149, 0.25)',
          border: '1px solid rgba(255, 255, 255, 0.15)'
        }}>
          <div style={{ maxWidth: '640px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(255, 255, 255, 0.15)', padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, marginBottom: '8px', letterSpacing: '0.5px' }}>
              <Compass size={13} color="#a78bfa" /> CALIBRATE YOUR PREPARATION
            </div>
            <h2 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 4px 0', color: '#fff' }}>
              Take the 15-Question Diagnostic Assessment
            </h2>
            <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.85)', margin: 0, lineHeight: 1.5 }}>
              Calibrate your starting readiness score, pinpoint cognitive traps, and establish your daily study mission for {targetExam} {targetScore ? `(Target: ${targetScore}+)` : ''}.
            </p>
          </div>
          <Link
            to="/dashboard/onboarding"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '10px',
              backgroundColor: '#fff',
              color: '#4c1d95',
              fontSize: '13px',
              fontWeight: 700,
              textDecoration: 'none',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              transition: 'transform 0.15s ease'
            }}
            className="header-hover-card"
          >
            Start Diagnostic <ArrowRight size={15} />
          </Link>
        </div>
      )}

      {/* ── Preplyx Study Mission & Readiness Score (Hero Dual-Column) ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))',
        gap: '20px',
        marginBottom: '24px'
      }}>
        {/* Card 1: Today's Personal Study Mission */}
        <div style={{
          borderRadius: '16px',
          padding: '22px 24px',
          backgroundColor: '#fff',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: '0 2px 10px rgba(15, 23, 42, 0.03)'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#7c3aed', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Target size={14} color="#7c3aed" /> TODAY'S STUDY MISSION
              </span>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', backgroundColor: '#f1f5f9', padding: '3px 8px', borderRadius: '6px' }}>
                {targetExam} Goal: {targetScore}+
              </span>
            </div>

            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px 0' }}>
              {mission?.title || "Daily Exam Readiness Checklist"}
            </h3>
            <p style={{ fontSize: '12.5px', color: '#64748b', margin: '0 0 16px 0', lineHeight: 1.4 }}>
              Execute these 3 targeted tasks to maximize your retention and eliminate traps.
            </p>

            {/* Checklist items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}>
              {(mission?.items || mission?.tasks || [
                {
                  id: 'task_mistakes',
                  title: 'Spaced Retest Review',
                  desc: 'Review mistakes due for spaced re-testing today',
                  actionUrl: '/dashboard/mistakes',
                  icon: 'Brain',
                  completed: false
                },
                {
                  id: 'task_practice',
                  title: 'Targeted Exam Practice',
                  desc: `Complete 1 timed 20-question session in ${targetExam}`,
                  actionUrl: `/dashboard/practice/${encodeURIComponent(targetExam)}/${encodeURIComponent(user?.subjects?.[0] || 'English Language')}`,
                  icon: 'BookOpen',
                  completed: false
                },
                {
                  id: 'task_concept',
                  title: 'Cognitive Trap Awareness',
                  desc: 'Inspect detailed step-by-step solutions for recent missed items',
                  actionUrl: '/dashboard/mistakes',
                  icon: 'Sparkles',
                  completed: false
                }
              ]).map((t: any, idx: number) => (
                <Link
                  key={t.id || idx}
                  to={resolveMissionUrl(t)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    backgroundColor: t.completed ? '#f0fdf4' : '#f8fafc',
                    border: t.completed ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                    textDecoration: 'none',
                    transition: 'all 0.15s ease'
                  }}
                  className="header-hover-card"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    {t.completed ? (
                      <CheckCircle2 size={16} color="#16a34a" style={{ flexShrink: 0 }} />
                    ) : (
                      <Circle size={16} color="#94a3b8" style={{ flexShrink: 0 }} />
                    )}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {t.title}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {t.desc || t.description}
                      </div>
                    </div>
                  </div>
                  <ArrowRight size={13} color="#7c3aed" style={{ flexShrink: 0, marginLeft: '8px' }} />
                </Link>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              Est. Study Time: <strong>{user?.dailyStudyMinutes || 45} mins</strong>
            </span>
            <Link
              to="/dashboard/mistakes"
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#7c3aed',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              Mistake Center <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        {/* Card 2: Preplyx Readiness Score Engine */}
        <div style={{
          borderRadius: '16px',
          padding: '22px 24px',
          backgroundColor: '#fff',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: '0 2px 10px rgba(15, 23, 42, 0.03)'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#059669', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <TrendingUp size={14} color="#059669" /> READINESS INDICATOR
              </span>
              <span style={{
                fontSize: '10px',
                fontWeight: 700,
                color: '#059669',
                backgroundColor: '#ecfdf5',
                border: '1px solid #a7f3d0',
                padding: '2px 8px',
                borderRadius: '999px',
                display: 'flex',
                alignItems: 'center',
                gap: '3px'
              }}>
                <ShieldCheck size={11} /> PREPLYX VERIFIED
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', letterSpacing: '-1px', lineHeight: 1 }}>
                {readiness?.overallScore ?? (user?.readinessScore || 45)}
              </span>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748b' }}>/ 100</span>
              <span style={{
                marginLeft: 'auto',
                fontSize: '12px',
                fontWeight: 700,
                color: (readiness?.overallScore ?? 45) >= 70 ? '#16a34a' : (readiness?.overallScore ?? 45) >= 50 ? '#d97706' : '#6366f1',
                backgroundColor: (readiness?.overallScore ?? 45) >= 70 ? '#dcfce7' : (readiness?.overallScore ?? 45) >= 50 ? '#fef3c7' : '#e0e7ff',
                padding: '3px 10px',
                borderRadius: '8px'
              }}>
                {(readiness?.overallScore ?? 45) >= 75 ? 'Exam Ready' : (readiness?.overallScore ?? 45) >= 55 ? 'On Track' : 'Building Foundations'}
              </span>
            </div>

            <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 16px 0', lineHeight: 1.4 }}>
              Multi-dimensional measurement of syllabus coverage, accuracy under time pressure, and spaced re-test retention.
            </p>

            {/* 4 Dimension Progress Bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {[
                { label: 'Syllabus Coverage', val: readiness?.breakdown?.syllabusCoverage ?? 52, color: '#7c3aed' },
                { label: 'Accuracy Under Pressure', val: readiness?.breakdown?.accuracyUnderPressure ?? 64, color: '#2563eb' },
                { label: 'Weak Subject Resilience', val: readiness?.breakdown?.weakSubjectResilience ?? 48, color: '#059669' },
                { label: 'Spaced Retest Mastery', val: readiness?.breakdown?.spacedRetestMastery ?? 40, color: '#d97706' },
              ].map((dim) => (
                <div key={dim.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                    <span>{dim.label}</span>
                    <span>{dim.val}%</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', backgroundColor: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${dim.val}%`, height: '100%', backgroundColor: dim.color, borderRadius: '3px', transition: 'width 0.4s ease' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <AlertCircle size={12} color="#94a3b8" /> Indicator only · Not an official exam score guarantee
            </span>
          </div>
        </div>
      </div>

      {/* Top row cards - Side-by-Side Grid for sleek compactness */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
        gap: '20px',
        marginBottom: '24px'
      }}>
        {/* Continue Practice */}
        <ResumeCard />

        {/* Daily Challenge */}
        <div style={{
          borderRadius: '16px',
          padding: '22px 24px',
          backgroundColor: '#fff',
          border: '1px solid #e2e8f0',
          boxShadow: 'none',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: '#7c3aed', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Sparkles size={13} color="#7c3aed" /> Daily Challenge
              </span>
              <DailyChallengeBadge />
            </div>
            <h2 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '6px', color: '#0f172a' }}>Today's 10-Question Quiz</h2>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '18px', lineHeight: 1.4 }}>
              Complete to earn 50 Preplyx coins and extend your streak.
            </p>
          </div>
          <div>
            <Link to="/dashboard/challenge" style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '9px 18px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)', color: '#fff',
              fontSize: '13px', fontWeight: 700, textDecoration: 'none',
              boxShadow: 'none',
              transition: 'transform 0.15s ease'
            }} className="header-hover-card">
              Start Challenge <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <p style={{ fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b', marginBottom: '12px' }}>Your Stats This Week</p>
      <DashboardStats />

      {/* Exam Selection */}
      <p style={{ fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b', marginBottom: '12px' }}>Select Exam Type</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '16px', marginBottom: '28px' }}>
        {[
          { name: 'JAMB', desc: '7 Subjects · 2004–2024', background: 'linear-gradient(135deg, #6d28d9 0%, #4c1d95 100%)', border: 'rgba(109, 40, 217, 0.3)', Icon: BookOpen },
          { name: 'WAEC', desc: '8 Subjects · 2000–2024', background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)', border: 'rgba(124, 58, 237, 0.3)', Icon: GraduationCap },
          { name: 'NECO', desc: '7 Subjects · 2003–2024', background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', border: 'rgba(5, 150, 105, 0.3)', Icon: FileText },
        ].map((exam) => (
          <Link key={exam.name} to={`/dashboard/practice?exam=${exam.name}`} className="exam-card-link header-hover-card" style={{
            borderRadius: '16px', padding: '20px',
            background: exam.background, boxShadow: 'none',
            border: `1px solid ${exam.border}`, textDecoration: 'none',
            display: 'flex', flexDirection: 'column', gap: '4px',
            position: 'relative', overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
              <span style={{ fontSize: '16px', fontWeight: 700, color: '#fff', letterSpacing: '-0.5px' }}>{exam.name}</span>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.18)', display: 'flex',
                alignItems: 'center', justifyContent: 'center'
              }}>
                <exam.Icon size={20} color="#fff" />
              </div>
            </div>
            <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.85)', marginTop: '8px', fontWeight: 600, position: 'relative', zIndex: 1 }}>{exam.desc}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '16px', fontSize: '12px', fontWeight: 600, color: '#fff', position: 'relative', zIndex: 1 }}>
              Practice Now <ArrowRight size={14} strokeWidth={2.5} />
            </span>
          </Link>
        ))}
      </div>

      {/* Recent Performance */}
      <p style={{ fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b', marginBottom: '12px' }}>Recent Sessions</p>
      <RecentSessionsList />

    </div>
  );
}
