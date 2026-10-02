import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, useBlocker } from 'react-router-dom';
import { 
  Timer, ArrowLeft, ArrowRight, Flag, CheckCheck, BookOpen, AlertCircle, 
  Calculator, Volume2, VolumeX, Save, Check, Sparkles, LogOut, FileText, 
  Info, ChevronDown, AlertTriangle, Send, X, Clock, RefreshCw, Loader2 
} from 'lucide-react';
import { saveActiveSession, getActiveSession, clearActiveSession, saveCompletedSession } from '@/lib/storage';
import { saveQuestionSet, getQuestionSet, savePendingAnswer } from '@/lib/offlineDB';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import ScientificCalculator from '@/components/ScientificCalculator';
import AiExamTutor from '@/components/AiExamTutor';
import FocusMusicWidget from '@/components/FocusMusicWidget';
import DynamicFocusBackground from '@/components/DynamicFocusBackground';
import { 
  playOptionSelectSound, playFlagSound, playTimerWarningSound, 
  playExamCompleteSound, playButtonClickSound, isSoundEnabled, setSoundEnabled 
} from '@/lib/soundEffects';

export default function CbtExamRunner() {
  const { exam = 'JAMB', subject = 'English' } = useParams<{ exam: string; subject: string }>();
  const [searchParams] = useSearchParams();
  const year = searchParams.get('year') || '2018';
  const navigate = useNavigate();
  const { token } = useAuth();
  
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [confidences, setConfidences] = useState<Record<string, 'high' | 'medium' | 'low'>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = useState(3600);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);

  // Question Reporting Modal State
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportIssueType, setReportIssueType] = useState('wrong_answer');
  const [reportDescription, setReportDescription] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  // Resume Session Modal State
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [pendingResumeSession, setPendingResumeSession] = useState<any>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmittingExam, setIsSubmittingExam] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showInsufficientBalance, setShowInsufficientBalance] = useState(false);
  const [tokenCharged, setTokenCharged] = useState<number | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Block in-app navigation (sidebar links, browser back, etc.) during active exam
  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    !isSubmitted && currentLocation.pathname !== nextLocation.pathname
  );

  // When the blocker fires, show the exit confirmation modal
  useEffect(() => {
    if (blocker.state === 'blocked') {
      setShowExitConfirm(true);
    }
  }, [blocker.state]);
  const [showAiTutor, setShowAiTutor] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [aiAction, setAiAction] = useState<string | undefined>(undefined);
  
  // Sound & Autosave state
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled());
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const timerWarnedRef = useRef<{ m5?: boolean; m1?: boolean }>({});

  const currentQ = questions[currentQIndex];

  useEffect(() => {
    const fetchQuestions = async () => {
      if (!token) {
        setError('Authentication required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Deduct token fee before starting if online
        const sessionPaidKey = `preplyx_paid_${exam}_${subject}_${year}`;
        const alreadyPaid = sessionStorage.getItem(sessionPaidKey) === 'true';

        if (!alreadyPaid && navigator.onLine && token) {
          try {
            const deductRes = await api.deductWallet(token, 20, `CBT Exam Token Fee: ${exam} - ${subject} (${year})`);
            if (deductRes) {
              sessionStorage.setItem(sessionPaidKey, 'true');
              setTokenCharged(20);
            }
          } catch (deductErr: any) {
            const errMsg = (deductErr?.message || '').toLowerCase();
            if (errMsg.includes('insufficient') || deductErr?.status === 400) {
              setShowInsufficientBalance(true);
              setLoading(false);
              return;
            }
            console.warn('[Wallet] Token deduction bypass on offline or network hiccup:', errMsg);
          }
        }

        const fetchedQuestions = await api.getQuestions({ exam, subject, year, limit: 100 }, token);
        
        const transformedQuestions = (fetchedQuestions || []).map((q: any) => ({
          id: q._id || q.id,
          question: q.text || q.question,
          options: Array.isArray(q.options) 
            ? [
                { id: 'A', text: q.options[0] },
                { id: 'B', text: q.options[1] },
                { id: 'C', text: q.options[2] },
                { id: 'D', text: q.options[3] }
              ]
            : Object.entries(q.options || {}).map(([key, val]) => ({ id: key.toUpperCase(), text: val })),
          correctAnswer: q.correctAnswer || q.correct_answer,
          explanation: q.explanation,
          topic: q.topic,
          subtopic: q.subtopic,
          source: q.source || (q.id && String(q.id).includes('-') ? 'ALOC_API' : 'Past Question Bank'),
          cognitiveTrap: q.cognitiveTrap,
          conceptSummary: q.conceptSummary
        }));
        
        setQuestions(transformedQuestions);

        // Save to IndexedDB for offline use
        const setId = `${exam}_${subject}_${year}`;
        await saveQuestionSet({
          setId,
          exam,
          subject,
          year,
          downloadedAt: Date.now(),
          questions: (fetchedQuestions || []).map((q: any) => ({
            id: q.id || q._id,
            text: q.text || q.question,
            options: Array.isArray(q.options) ? q.options : Object.values(q.options),
            correctAnswer: q.correctAnswer || q.correct_answer,
            explanation: q.explanation
          }))
        });
      } catch (err) {
        // Try loading from IndexedDB before showing an error
        try {
          const setId = `${exam}_${subject}_${year}`;
          const cached = await getQuestionSet(setId);
          if (cached && cached.questions.length > 0) {
            const transformedCached = cached.questions.map((q: any) => ({
              id: q.id,
              question: q.text,
              options: Array.isArray(q.options)
                ? [
                    { id: 'A', text: q.options[0] },
                    { id: 'B', text: q.options[1] },
                    { id: 'C', text: q.options[2] },
                    { id: 'D', text: q.options[3] }
                  ]
                : Object.entries(q.options || {}).map(([key, val]) => ({ id: key, text: val })),
              correctAnswer: q.correctAnswer,
              explanation: q.explanation
            }));
            setQuestions(transformedCached);
          } else {
            setError(err instanceof Error ? err.message : 'Failed to fetch questions');
          }
        } catch {
          setError(err instanceof Error ? err.message : 'Failed to fetch questions');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [exam, subject, token]);


  useEffect(() => {
    if (sessionLoaded || loading || questions.length === 0) return;
    
    const session = getActiveSession();
    if (session && session.exam === exam && session.subject === subject && Object.keys(session.answers || {}).length > 0) {
      setPendingResumeSession(session);
      setShowResumeModal(true);
    }
    setSessionLoaded(true);
  }, [exam, subject, sessionLoaded, loading, questions]);

  const handleConfirmResume = () => {
    if (pendingResumeSession) {
      setCurrentQIndex(pendingResumeSession.currentQIndex || 0);
      setAnswers(pendingResumeSession.answers || {});
      setFlagged(new Set(pendingResumeSession.flagged || []));
      if (pendingResumeSession.timeLeft) {
        setTimeLeft(pendingResumeSession.timeLeft);
      }
    }
    setShowResumeModal(false);
  };

  const handleStartFreshExam = () => {
    clearActiveSession();
    setAnswers({});
    setFlagged(new Set());
    setCurrentQIndex(0);
    setTimeLeft(3600);
    setShowResumeModal(false);
  };

  // Continuous Autosave session progress
  useEffect(() => {
    if (!sessionLoaded || isSubmitted || questions.length === 0) return;

    saveActiveSession({
      exam,
      subject,
      currentQIndex,
      answers,
      flagged: Array.from(flagged),
      totalQ: questions.length,
      timestamp: Date.now(),
      timeLeft
    });

    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLastSaved(nowStr);
  }, [exam, subject, currentQIndex, answers, flagged, questions, sessionLoaded, isSubmitted, timeLeft]);

  // Periodic autosave interval every 5s for smooth time tracking
  useEffect(() => {
    if (!sessionLoaded || isSubmitted || questions.length === 0) return;

    const interval = setInterval(() => {
      saveActiveSession({
        exam,
        subject,
        currentQIndex,
        answers,
        flagged: Array.from(flagged),
        totalQ: questions.length,
        timestamp: Date.now(),
        timeLeft
      });
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLastSaved(nowStr);
    }, 5000);

    return () => clearInterval(interval);
  }, [exam, subject, currentQIndex, answers, flagged, questions, sessionLoaded, isSubmitted, timeLeft]);

  // Exam timer countdown
  useEffect(() => {
    if (isSubmitted || loading || questions.length === 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitExam();
          return 0;
        }

        // Timer Warning Sounds (5 mins & 1 min)
        if (prev === 300 && !timerWarnedRef.current.m5) {
          timerWarnedRef.current.m5 = true;
          playTimerWarningSound();
        } else if (prev === 60 && !timerWarnedRef.current.m1) {
          timerWarnedRef.current.m1 = true;
          playTimerWarningSound();
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isSubmitted, loading, questions]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isSubmitted) {
        e.preventDefault();
        e.returnValue = 'Your active CBT test is running. Are you sure you want to exit?';
        return 'Your active CBT test is running. Are you sure you want to exit?';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isSubmitted]);

  const confirmExitExam = () => {
    const answeredCount = Object.keys(answers).length;
    saveCompletedSession({
      id: `result_${Date.now()}`,
      exam,
      subject,
      score: 0,
      total: questions.length,
      pct: 0,
      date: Date.now(),
      status: answeredCount === 0 ? 'abandoned_0_answers' : 'in_progress',
      answeredCount,
      answers,
      questions
    });
    navigate('/dashboard/practice');
  };

  const handleOptionSelect = (optionId: string) => {
    if (!currentQ || isSubmitted) return;

    playOptionSelectSound();

    setAnswers(prev => ({
      ...prev,
      [currentQ.id]: optionId
    }));

    // Default to medium confidence if student hasn't selected a level yet
    setConfidences(prev => {
      if (!prev[currentQ.id]) {
        return { ...prev, [currentQ.id]: 'medium' };
      }
      return prev;
    });

    // Persist answer to IndexedDB for offline sync
    savePendingAnswer({
      setId: `${exam}_${subject}_${year}`,
      questionId: currentQ.id,
      selectedAnswer: optionId,
      exam,
      subject,
      year
    }).catch(() => {/* silent fail */});
  };


  const handleReportQuestion = async () => {
    if (!token || !currentQ) return;
    try {
      setIsSubmittingReport(true);
      await api.submitQuestionReport(token, {
        questionId: currentQ.id,
        questionText: currentQ.question,
        exam,
        subject,
        reportType: reportIssueType,
        userNotes: reportDescription || `Flagged as ${reportIssueType} by student`
      });
      setReportSuccess(true);
      setTimeout(() => {
        setShowReportModal(false);
        setReportSuccess(false);
        setReportDescription('');
      }, 1500);
    } catch (err) {
      console.warn('Failed to submit question report:', err);
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const handleFlagQuestion = () => {
    if (!currentQ) return;

    playFlagSound();

    setFlagged(prev => {
      const next = new Set(prev);
      if (next.has(currentQ.id)) {
        next.delete(currentQ.id);
      } else {
        next.add(currentQ.id);
      }
      return next;
    });
  };

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    if (next) playOptionSelectSound();
  };

  const handleSubmitExam = async () => {
    setIsSubmittingExam(true);
    setSubmitError(null);
    playExamCompleteSound();

    const timeSpentSeconds = 3600 - timeLeft;
    const answeredCount = Object.keys(answers).length;
    const sessionStatus = timeLeft <= 0 ? 'timed_out' : (answeredCount === 0 ? 'abandoned_0_answers' : 'completed');
    const resultId = `result_${Date.now()}`;

    try {
      let serverResult: any = null;
      if (token) {
        // Authoritative server-side grading
        serverResult = await api.submitSession(token, {
          exam,
          subject,
          timeSpentSeconds,
          answers,
          confidences
        });
      }

      setIsSubmitted(true);
      // ONLY clear active session after confirmed successful grading
      clearActiveSession();

      const finalScore = serverResult?.score ?? 0;
      const finalTotal = serverResult?.total ?? questions.length;
      const finalPct = serverResult?.percentage ?? (finalTotal > 0 ? Math.round((finalScore / finalTotal) * 100) : 0);

      saveCompletedSession({
        id: resultId,
        exam,
        subject,
        score: finalScore,
        total: finalTotal,
        pct: finalPct,
        date: Date.now(),
        status: sessionStatus,
        answeredCount,
        answers,
        confidences,
        questions: serverResult?.details?.map((d: any) => ({
          id: d.questionId,
          question: d.questionText,
          correctAnswer: d.correctAnswer,
          explanation: d.explanation,
          isCorrect: d.isCorrect,
          userAnswer: d.userAnswer,
          options: questions.find(q => q.id === d.questionId)?.options || []
        })) || questions,
        timeSpentSeconds,
        details: serverResult?.details
      });

      navigate(`/dashboard/result?id=${resultId}`);
    } catch (err: any) {
      console.error('Submission failed:', err);
      setIsSubmittingExam(false);
      setSubmitError(
        'Submission failed due to a network error. Your answers are preserved locally. Please check your connection and retry.'
      );
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '16px' }}>
        <BookOpen size={40} color="#7B2FF7" />
        <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text-main)' }}>Loading Exam Questions...</p>
      </div>
    );
  }

  if (error || questions.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p style={{ fontSize: '15px', color: '#dc2626', marginBottom: '16px' }}>{error || 'No questions available for this exam/subject combination.'}</p>
        <button
          onClick={() => navigate('/dashboard/practice')}
          style={{ padding: '10px 20px', borderRadius: '10px', background: 'var(--gradient-primary)', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}
        >
          Back to Practice Selection
        </button>
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out', position: 'relative', zIndex: 1 }}>
      <DynamicFocusBackground />

      {/* Offline Indicator Banner */}
      {!isOnline && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
          background: '#f59e0b', color: '#000', textAlign: 'center',
          padding: '6px', fontSize: '13px', fontWeight: 600
        }}>
          📴 Offline — answers are being saved locally and will sync when you reconnect.
        </div>
      )}

      {/* Submission Failure Retry Banner */}
      {submitError && (
        <div style={{
          margin: '0 0 16px 0', padding: '14px 20px', borderRadius: '12px',
          backgroundColor: '#fef2f2', border: '1px solid #fecaca',
          color: '#991b1b', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap',
          boxShadow: '0 2px 8px rgba(220, 38, 38, 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle size={18} color="#dc2626" />
            <span style={{ fontSize: '13px', fontWeight: 600 }}>{submitError}</span>
          </div>
          <button
            type="button"
            onClick={handleSubmitExam}
            disabled={isSubmittingExam}
            style={{
              padding: '8px 16px', borderRadius: '8px',
              backgroundColor: '#dc2626', color: '#fff', border: 'none',
              fontSize: '12.5px', fontWeight: 700, cursor: isSubmittingExam ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            {isSubmittingExam ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            {isSubmittingExam ? 'Retrying...' : 'Retry Submission'}
          </button>
        </div>
      )}

      {/* Exam Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 24px', backgroundColor: '#fff', borderRadius: '16px',
        border: '1px solid var(--glass-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
        marginBottom: '20px', flexWrap: 'wrap', gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '12px',
            backgroundColor: 'rgba(123, 47, 247, 0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <BookOpen size={20} color="#7B2FF7" />
          </div>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-text-main)', margin: 0, textTransform: 'capitalize' }}>
              {exam} {subject} Practice
            </h1>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: 0 }}>
              Question {currentQIndex + 1} of {questions.length}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {tokenCharged && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '6px 12px', borderRadius: '20px',
              backgroundColor: 'rgba(123, 47, 247, 0.08)', color: '#7B2FF7',
              fontSize: '12px', fontWeight: 600, border: '1px solid rgba(123, 47, 247, 0.2)'
            }} title="Token session fee paid">
              <span>🪙 {tokenCharged} tokens</span>
            </div>
          )}

          {lastSaved && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '6px 12px', borderRadius: '20px',
              backgroundColor: '#ecfdf5', color: '#059669',
              fontSize: '12px', fontWeight: 600, border: '1px solid #a7f3d0'
            }} title={`Progress autosaved at ${lastSaved}`}>
              <Save size={13} />
              <span>Autosaved</span>
            </div>
          )}

          <button
            onClick={toggleSound}
            title={soundOn ? 'Sound Effects Enabled (Click to Mute)' : 'Sound Effects Muted (Click to Enable)'}
            style={{
              padding: '8px 12px', borderRadius: '10px',
              backgroundColor: soundOn ? '#ecfdf5' : '#f1f5f9',
              color: soundOn ? '#059669' : '#64748b',
              border: soundOn ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
              cursor: 'pointer', fontSize: '13px', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            {soundOn ? <Volume2 size={16} color="#059669" /> : <VolumeX size={16} color="#64748b" />}
            <span>{soundOn ? 'Audio On' : 'Muted'}</span>
          </button>

          <FocusMusicWidget />

          <button
            onClick={() => setShowCalculator(!showCalculator)}
            style={{
              padding: '8px 14px', borderRadius: '10px',
              backgroundColor: showCalculator ? '#7B2FF7' : 'rgba(123, 47, 247, 0.1)',
              color: showCalculator ? '#fff' : '#7B2FF7',
              border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            <Calculator size={16} /> Calculator
          </button>

          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 16px', borderRadius: '10px',
            backgroundColor: '#f1f5f9', color: 'var(--color-text-main)',
            fontWeight: 700, fontSize: '14px'
          }}>
            <Timer size={16} />
            <span>{formatTime(timeLeft)}</span>
          </div>

          <button
            onClick={() => setShowSubmitConfirm(true)}
            style={{
              padding: '10px 20px', borderRadius: '10px',
              backgroundColor: '#16a34a', color: '#fff',
              border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            <CheckCheck size={16} /> Submit Test
          </button>
        </div>
      </div>

      {/* Main Grid: Wider main question area and 250px sidebar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 250px', gap: '20px', alignItems: 'start' }}>
        {/* Question Panel */}
        <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '32px', border: '1px solid var(--glass-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          {currentQ && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#7B2FF7' }}>
                    Question {currentQIndex + 1} of {questions.length}
                  </span>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px',
                    backgroundColor: currentQ.source === 'ALOC_API' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(123, 47, 247, 0.1)',
                    color: currentQ.source === 'ALOC_API' ? '#059669' : '#7B2FF7',
                    border: currentQ.source === 'ALOC_API' ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(123, 47, 247, 0.2)'
                  }}>
                    {currentQ.source === 'ALOC_API' ? '⚡ ALOC Live API' : '📘 Past Questions Bank'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => { setShowReportModal(true); setReportSuccess(false); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '5px',
                      padding: '6px 12px', borderRadius: '8px',
                      border: '1px solid var(--glass-border)',
                      backgroundColor: '#fff',
                      color: 'var(--color-text-muted)',
                      fontSize: '12px', fontWeight: 600, cursor: 'pointer'
                    }}
                    title="Report error or typo in this question"
                  >
                    <AlertTriangle size={14} color="#f59e0b" /> Report
                  </button>
                  <button
                    onClick={handleFlagQuestion}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '6px 12px', borderRadius: '8px',
                      border: '1px solid var(--glass-border)',
                      backgroundColor: flagged.has(currentQ.id) ? '#fef3c7' : '#fff',
                      color: flagged.has(currentQ.id) ? '#D97706' : 'var(--color-text-muted)',
                      fontSize: '12px', fontWeight: 600, cursor: 'pointer'
                    }}
                  >
                    <Flag size={14} /> {flagged.has(currentQ.id) ? 'Flagged' : 'Flag Question'}
                  </button>
                </div>
              </div>
              {(currentQ.title || currentQ.description) && (
                <div style={{
                  marginBottom: '20px', borderRadius: '12px',
                  backgroundColor: '#f8fafc', border: '1px solid #e2e8f0',
                  overflow: 'hidden', transition: 'all 0.2s ease'
                }}>
                  <div 
                    onClick={() => setShowDescription(prev => !prev)}
                    style={{
                      padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      cursor: 'pointer', backgroundColor: showDescription ? 'rgba(123, 47, 247, 0.05)' : '#f8fafc',
                      borderBottom: showDescription ? '1px solid #e2e8f0' : 'none',
                      userSelect: 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileText size={16} color="#7B2FF7" />
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                        {currentQ.title || 'Question Description & Passage'}
                      </span>
                    </div>

                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '4px',
                      fontSize: '12px', fontWeight: 700, color: '#7B2FF7'
                    }}>
                      <span>{showDescription ? 'Hide Details' : 'View Description'}</span>
                      <ChevronDown 
                        size={14} 
                        style={{ 
                          transform: showDescription ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s ease' 
                        }} 
                      />
                    </div>
                  </div>

                  {showDescription && (currentQ.description || currentQ.title) && (
                    <div style={{
                      padding: '16px', fontSize: '13px', color: '#475569',
                      lineHeight: 1.6, backgroundColor: '#ffffff'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <Info size={16} color="#7B2FF7" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div>{currentQ.description || currentQ.title}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '16px', lineHeight: 1.5 }}>
                {currentQ.question}
              </div>

              {/* Compact AI Concept Action Pill */}
              <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => {
                    setAiAction('explain_concept');
                    setShowAiTutor(true);
                  }}
                  style={{
                    padding: '6px 14px', borderRadius: '20px',
                    background: 'linear-gradient(135deg, rgba(123, 47, 247, 0.08) 0%, rgba(75, 15, 163, 0.04) 100%)',
                    border: '1px solid rgba(123, 47, 247, 0.25)',
                    color: '#6b21a8', cursor: 'pointer',
                    fontSize: '12px', fontWeight: 700,
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                  title="Get in-depth theoretical concept breakdown without revealing correct answer"
                >
                  <Sparkles size={13} color="#7B2FF7" />
                  <span>Explain Topic with AI</span>
                  <span style={{ fontSize: '9px', backgroundColor: '#e9d5ff', color: '#581c87', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>
                    NO ANSWER REVEALED
                  </span>
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
                {currentQ.options?.map((opt: any) => {
                  const isSelected = answers[currentQ.id] === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => handleOptionSelect(opt.id)}
                      style={{
                        padding: '16px 20px', borderRadius: '12px',
                        border: isSelected ? '2px solid #7B2FF7' : '1px solid var(--glass-border)',
                        backgroundColor: isSelected ? 'rgba(123, 47, 247, 0.05)' : '#fff',
                        textAlign: 'left', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '14px'
                      }}
                    >
                      <div style={{
                        width: '24px', height: '24px', borderRadius: '50%',
                        border: isSelected ? '2px solid #7B2FF7' : '1px solid var(--glass-border)',
                        backgroundColor: isSelected ? '#7B2FF7' : '#fff',
                        color: isSelected ? '#fff' : 'var(--color-text-muted)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '12px', fontWeight: 700
                      }}>
                        {opt.id}
                      </div>
                      <span style={{ fontSize: '14px', color: 'var(--color-text-main)', fontWeight: isSelected ? 600 : 400 }}>
                        {opt.text}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Confidence Rating Pills */}
              <div style={{
                marginBottom: '28px', padding: '12px 16px', borderRadius: '12px',
                backgroundColor: '#f8fafc', border: '1px solid #e2e8f0',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexWrap: 'wrap', gap: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Confidence Level:</span>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>(Calibrates Mistake Intelligence)</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[
                    { level: 'high' as const, label: 'Very sure', color: '#16a34a', bg: '#dcfce7' },
                    { level: 'medium' as const, label: 'Somewhat sure', color: '#d97706', bg: '#fef3c7' },
                    { level: 'low' as const, label: 'Guessing', color: '#6366f1', bg: '#e0e7ff' },
                  ].map(c => {
                    const isSelected = confidences[currentQ.id] === c.level;
                    return (
                      <button
                        key={c.level}
                        type="button"
                        onClick={() => setConfidences(prev => ({ ...prev, [currentQ.id]: c.level }))}
                        style={{
                          padding: '5px 12px',
                          borderRadius: '20px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          border: isSelected ? `2px solid ${c.color}` : '1px solid #e2e8f0',
                          backgroundColor: isSelected ? c.bg : '#fff',
                          color: isSelected ? c.color : '#64748b',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {c.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  onClick={() => setCurrentQIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentQIndex === 0}
                  style={{
                    padding: '10px 20px', borderRadius: '10px',
                    border: '1px solid var(--glass-border)', backgroundColor: '#fff',
                    color: 'var(--color-text-main)', fontSize: '13px', fontWeight: 600,
                    cursor: currentQIndex === 0 ? 'not-allowed' : 'pointer', opacity: currentQIndex === 0 ? 0.5 : 1,
                    display: 'flex', alignItems: 'center', gap: '6px'
                  }}
                >
                  <ArrowLeft size={16} /> Previous
                </button>

                {currentQIndex === questions.length - 1 ? (
                  <button
                    onClick={() => {
                      playButtonClickSound();
                      setShowSubmitConfirm(true);
                    }}
                    style={{
                      padding: '10px 22px', borderRadius: '10px',
                      background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                      color: '#fff', border: 'none', fontSize: '13px', fontWeight: 700,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                      boxShadow: '0 4px 14px rgba(22, 163, 74, 0.35)'
                    }}
                  >
                    <CheckCheck size={16} /> Submit Exam
                  </button>
                ) : (
                  <button
                    onClick={() => setCurrentQIndex(prev => Math.min(questions.length - 1, prev + 1))}
                    style={{
                      padding: '10px 20px', borderRadius: '10px',
                      background: 'var(--gradient-primary)', color: '#fff',
                      border: 'none', fontSize: '13px', fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '6px'
                    }}
                  >
                    Next <ArrowRight size={16} />
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Navigator Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {showCalculator && (
            <ScientificCalculator onClose={() => setShowCalculator(false)} />
          )}

          <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '18px 20px', border: '1px solid var(--glass-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '4px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-main)', margin: 0, whiteSpace: 'nowrap' }}>Questions</h3>
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                {Object.keys(answers).length}/{questions.length} Answered
              </span>
            </div>

            <div className="question-navigator-scrollbar" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', maxHeight: '320px', overflowY: 'auto', paddingRight: '4px' }}>
              {questions.map((q, idx) => {
                const isAnswered = !!answers[q.id];
                const isCurrent = idx === currentQIndex;
                const isFlagged = flagged.has(q.id);

                return (
                  <button
                    key={q.id || idx}
                    onClick={() => setCurrentQIndex(idx)}
                    style={{
                      height: '36px', borderRadius: '8px',
                      border: isCurrent ? '2px solid #7B2FF7' : isFlagged ? '1px solid #D97706' : '1px solid var(--glass-border)',
                      backgroundColor: isCurrent ? '#7B2FF7' : isFlagged ? '#fef3c7' : isAnswered ? '#d1fae5' : '#f8fafc',
                      color: isCurrent ? '#fff' : isFlagged ? '#D97706' : isAnswered ? '#16a34a' : 'var(--color-text-main)',
                      fontSize: '12px', fontWeight: 700, cursor: 'pointer'
                    }}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Red Emphasized Exit Button at bottom of Question Navigator */}
            <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #f1f5f9' }}>
              <button
                onClick={() => setShowExitConfirm(true)}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: '10px',
                  backgroundColor: '#fef2f2', border: '1px solid #fca5a5',
                  color: '#dc2626', fontSize: '12px', fontWeight: 700,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  transition: 'all 0.2s ease'
                }}
              >
                <LogOut size={14} color="#dc2626" /> Exit Exam Session
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* AI Exam Tutor Drawer */}
      <AiExamTutor
        isOpen={showAiTutor}
        onClose={() => {
          setShowAiTutor(false);
          setAiAction(undefined);
        }}
        initialAction={aiAction}
        context={{
          exam,
          subject,
          questionNumber: currentQIndex + 1,
          totalQuestions: questions.length,
          questionText: currentQ?.question,
          options: currentQ?.options,
          explanation: currentQ?.explanation
        }}
      />

      {/* Submit Confirmation Modal */}
      {showSubmitConfirm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2000, padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#fff', borderRadius: '20px', padding: '32px',
            maxWidth: '420px', width: '100%', textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.2)'
          }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#fef3c7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <AlertCircle size={28} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-text-main)', marginBottom: '8px' }}>Submit Exam?</h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '24px' }}>Are you sure you want to finish and submit your answers now?</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowSubmitConfirm(false)} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid var(--glass-border)', backgroundColor: '#fff', color: 'var(--color-text-main)', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSubmitExam} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', backgroundColor: '#16a34a', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Submit</button>
            </div>
          </div>
        </div>
      )}

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2000, padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#fff', borderRadius: '20px', padding: '32px',
            maxWidth: '420px', width: '100%', textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.2)'
          }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <LogOut size={28} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-text-main)', marginBottom: '8px' }}>Exit Exam Session?</h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '24px' }}>Your active exam progress is automatically saved! You can safely resume this exam session anytime from your dashboard.</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => { setShowExitConfirm(false); blocker.reset?.(); }} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid var(--glass-border)', backgroundColor: '#fff', color: 'var(--color-text-main)', fontWeight: 600, cursor: 'pointer' }}>Continue Test</button>
              <button onClick={() => { blocker.proceed?.(); confirmExitExam(); }} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', backgroundColor: '#dc2626', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Exit Session</button>
            </div>
          </div>
        </div>
      )}

      {/* Question Error Reporting Modal */}
      {showReportModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2000, padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#fff', borderRadius: '20px', padding: '28px',
            maxWidth: '440px', width: '100%', boxShadow: '0 20px 50px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={18} color="#f59e0b" />
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Report Question Issue
                </h3>
              </div>
              <button
                onClick={() => setShowReportModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={18} />
              </button>
            </div>

            {reportSuccess ? (
              <div style={{ padding: '24px 0', textAlign: 'center' }}>
                <CheckCheck size={40} color="#16a34a" style={{ margin: '0 auto 12px' }} />
                <p style={{ fontSize: '14px', fontWeight: 700, color: '#16a34a', margin: '0 0 6px' }}>Report Received!</p>
                <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Our educational editorial team will review and verify this question.</p>
              </div>
            ) : (
              <>
                <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px', lineHeight: 1.4 }}>
                  Found a typo, incorrect answer key, or ambiguous wording in Question {currentQIndex + 1}? Let us know so our curriculum team can verify it.
                </p>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Issue Type
                  </label>
                  <select
                    value={reportIssueType}
                    onChange={e => setReportIssueType(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: '10px',
                      border: '1px solid #e2e8f0', fontSize: '13px', color: '#0f172a',
                      backgroundColor: '#f8fafc', outline: 'none'
                    }}
                  >
                    <option value="wrong_answer">Wrong Answer Key</option>
                    <option value="typo">Typo or Grammatical Error</option>
                    <option value="bad_explanation">Unclear or Missing Explanation</option>
                    <option value="image_missing">Diagram / Image Missing</option>
                    <option value="other">Other Content Issue</option>
                  </select>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Details / Correction (Optional)
                  </label>
                  <textarea
                    value={reportDescription}
                    onChange={e => setReportDescription(e.target.value)}
                    placeholder="E.g. Option B is actually correct because..."
                    rows={3}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: '10px',
                      border: '1px solid #e2e8f0', fontSize: '13px', color: '#0f172a',
                      backgroundColor: '#f8fafc', resize: 'vertical', outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    style={{
                      flex: 1, padding: '10px', borderRadius: '10px',
                      border: '1px solid #e2e8f0', backgroundColor: '#fff',
                      color: '#475569', fontSize: '13px', fontWeight: 600, cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleReportQuestion}
                    disabled={isSubmittingReport}
                    style={{
                      flex: 1, padding: '10px', borderRadius: '10px',
                      border: 'none', backgroundColor: '#7B2FF7',
                      color: '#fff', fontSize: '13px', fontWeight: 700,
                      cursor: isSubmittingReport ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                    }}
                  >
                    <Send size={14} /> {isSubmittingReport ? 'Sending...' : 'Submit Report'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Resume Unfinished Exam Modal */}
      {showResumeModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 3000, padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#fff', borderRadius: '20px', padding: '32px',
            maxWidth: '460px', width: '100%', textAlign: 'center',
            boxShadow: '0 20px 50px rgba(0,0,0,0.2)'
          }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '16px',
              backgroundColor: 'rgba(123, 47, 247, 0.1)', color: '#7B2FF7',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <Clock size={28} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
              You have an unfinished exam
            </h3>
            <p style={{ fontSize: '13.5px', color: '#64748b', marginBottom: '24px', lineHeight: 1.5 }}>
              We found saved progress for your <strong>{exam} {subject}</strong> practice test ({Object.keys(pendingResumeSession?.answers || {}).length} questions answered). Would you like to resume where you stopped?
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={handleStartFreshExam}
                style={{
                  flex: 1, padding: '12px', borderRadius: '12px',
                  border: '1px solid #e2e8f0', backgroundColor: '#fff',
                  color: '#64748b', fontSize: '13px', fontWeight: 600, cursor: 'pointer'
                }}
              >
                Start New Exam
              </button>
              <button
                type="button"
                onClick={handleConfirmResume}
                style={{
                  flex: 1, padding: '12px', borderRadius: '12px',
                  border: 'none', background: 'var(--gradient-primary)',
                  color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer'
                }}
              >
                Resume Exam
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Insufficient Token Balance Modal */}
      {showInsufficientBalance && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div style={{
            maxWidth: '440px', width: '100%', backgroundColor: '#ffffff',
            borderRadius: '20px', padding: '28px', textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px', fontSize: '26px'
            }}>
              🪙
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>
              Exam Token Fee Required
            </h3>
            <p style={{ fontSize: '13.5px', color: '#64748b', lineHeight: '1.5', margin: '0 0 20px' }}>
              Starting this CBT session requires <strong>20 tokens (₦20.00)</strong>. Your wallet has insufficient balance to begin.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => navigate('/dashboard/practice')}
                style={{
                  flex: 1, padding: '12px', borderRadius: '10px',
                  border: '1px solid #e2e8f0', backgroundColor: '#fff',
                  color: '#475569', fontWeight: 600, cursor: 'pointer', fontSize: '13px'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => navigate('/dashboard/wallet')}
                style={{
                  flex: 1, padding: '12px', borderRadius: '10px',
                  border: 'none', backgroundColor: '#7B2FF7',
                  color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '13px',
                  boxShadow: '0 4px 12px rgba(123, 47, 247, 0.3)'
                }}
              >
                Fund Wallet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
