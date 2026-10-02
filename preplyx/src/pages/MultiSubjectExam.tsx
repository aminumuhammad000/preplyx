import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams, useBlocker } from 'react-router-dom';
import { 
  Timer, ArrowLeft, ArrowRight, Flag, CheckCheck, BookOpen, AlertCircle, 
  Grid3x3, ChevronDown, X, Calculator, Volume2, VolumeX, Save, Sparkles, 
  LogOut, FileText, Info, AlertTriangle, Send 
} from 'lucide-react';
import { saveActiveSession, getActiveSession, clearActiveSession, saveCompletedSession } from '@/lib/storage';
import { saveQuestionSet, getQuestionSet, savePendingAnswer } from '@/lib/offlineDB';
import { generateQuestions, Question } from '@/lib/questionGenerator';
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

export default function MultiSubjectExam() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { token } = useAuth();
  
  const exam = searchParams.get('exam') || 'JAMB';
  const year = searchParams.get('year') || '2018';
  const subjectsParam = searchParams.get('subjects') || '';
  const initialTime = parseInt(searchParams.get('time') || '3600');
  
  const subjects = useMemo(() => subjectsParam.split(',').filter(s => s.trim()), [subjectsParam]);
  
  const [currentSubjectIndex, setCurrentSubjectIndex] = useState(0);
  const [currentSubject, setCurrentSubject] = useState(subjects[0] || '');
  const [showSubjectSwitcher, setShowSubjectSwitcher] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

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
  
  const [allQuestions, setAllQuestions] = useState<Record<string, Question[]>>({});
  
  useEffect(() => {
    setMounted(true);
    const loadSubjectQuestions = async () => {
      // Deduct token fee before starting if online (50 tokens for multi-subject exam)
      const sessionPaidKey = `preplyx_multi_paid_${exam}_${subjects.join('_')}_${year}`;
      const alreadyPaid = sessionStorage.getItem(sessionPaidKey) === 'true';

      if (!alreadyPaid && navigator.onLine && token) {
        try {
          const deductRes = await api.deductWallet(token, 50, `Multi-Subject CBT Token Fee: ${exam} (${subjects.length} subjects)`);
          if (deductRes) {
            sessionStorage.setItem(sessionPaidKey, 'true');
            setTokenCharged(50);
          }
        } catch (deductErr: any) {
          const errMsg = (deductErr?.message || '').toLowerCase();
          if (errMsg.includes('insufficient') || deductErr?.status === 400) {
            setShowInsufficientBalance(true);
            return;
          }
          console.warn('[Wallet] Multi-subject token deduction bypass on connection hiccup:', errMsg);
        }
      }

      const map: Record<string, Question[]> = {};
      for (const subject of subjects) {
        try {
          const fetched = await api.getQuestions({ exam, subject, year, limit: 60 }, token || undefined).catch(() => []);
          if (fetched && fetched.length > 0) {
            map[subject] = fetched.map((q: any) => ({
              id: q._id || q.id,
              year: q.year || year,
              title: q.section || q.title || undefined,
              description: q.section || q.description || undefined,
              question: q.text || q.question,
              options: Array.isArray(q.options)
                ? { A: q.options[0] || '', B: q.options[1] || '', C: q.options[2] || '', D: q.options[3] || '' }
                : q.options,
              correct_answer: (q.correctAnswer || q.correct_answer || 'A') as any,
              explanation: q.explanation || '',
              imageUrl: q.imageUrl || undefined,
              topic: q.topic,
              subtopic: q.subtopic,
              source: q.source || (q.id && String(q.id).includes('-') ? 'ALOC_API' : 'Past Question Bank'),
              cognitiveTrap: q.cognitiveTrap,
              conceptSummary: q.conceptSummary
            }));

            // Save to IndexedDB for offline use
            const setId = `${exam}_${subject}_${year}`;
            await saveQuestionSet({
              setId,
              exam,
              subject,
              year,
              downloadedAt: Date.now(),
              questions: fetched.map((q: any) => ({
                id: q.id || q._id,
                text: q.text || q.question,
                options: Array.isArray(q.options) ? q.options : Object.values(q.options),
                correctAnswer: q.correctAnswer || q.correct_answer,
                explanation: q.explanation
              }))
            });
          } else {
            map[subject] = generateQuestions(subject, 60, year);
          }
        } catch {
          // Try loading from IndexedDB before falling back to generated questions
          try {
            const setId = `${exam}_${subject}_${year}`;
            const cached = await getQuestionSet(setId);
            if (cached && cached.questions.length > 0) {
              map[subject] = cached.questions.map((q: any) => ({
                id: q.id,
                year,
                question: q.text,
                options: Array.isArray(q.options)
                  ? { A: q.options[0] || '', B: q.options[1] || '', C: q.options[2] || '', D: q.options[3] || '' }
                  : q.options,
                correct_answer: (q.correctAnswer || 'A') as any,
                explanation: q.explanation || '',
              }));
            } else {
              map[subject] = generateQuestions(subject, 60, year);
            }
          } catch {
            map[subject] = generateQuestions(subject, 60, year);
          }
        }
      }
      setAllQuestions(map);
    };

    loadSubjectQuestions();
  }, [subjects, exam, year, token]);


  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [confidences, setConfidences] = useState<Record<string, 'high' | 'medium' | 'low'>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmittingExam, setIsSubmittingExam] = useState(false);
  const [showInsufficientBalance, setShowInsufficientBalance] = useState(false);
  const [tokenCharged, setTokenCharged] = useState<number | null>(null);

  // Question Reporting Modal State
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportIssueType, setReportIssueType] = useState('wrong_answer');
  const [reportDescription, setReportDescription] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

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

  const currentQuestions = allQuestions[currentSubject] || [];

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (sessionLoaded) return;
    
    const session = getActiveSession();
    if (session && session.exam === exam && session.subjects && session.subjects.join(',') === subjectsParam) {
      setCurrentSubjectIndex(session.currentSubjectIndex || 0);
      setCurrentSubject(session.currentSubject || subjects[0]);
      setCurrentQIndex(session.currentQIndex);
      setAnswers(session.answers);
      setFlagged(new Set(session.flagged));
      if (session.timeLeft) {
        setTimeLeft(session.timeLeft);
      }
    }
    setSessionLoaded(true);
  }, [exam, subjectsParam, subjects, sessionLoaded]);

  // Continuous Autosave
  useEffect(() => {
    if (!sessionLoaded || isSubmitted) return;

    saveActiveSession({
      exam,
      subject: currentSubject,
      subjects,
      currentSubject,
      currentSubjectIndex,
      currentQIndex,
      answers,
      flagged: Array.from(flagged),
      totalQ: (currentQuestions || []).length,
      timestamp: Date.now(),
      timeLeft
    });

    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLastSaved(nowStr);
  }, [exam, currentSubject, subjects, currentSubjectIndex, currentQIndex, answers, flagged, currentQuestions, sessionLoaded, isSubmitted, timeLeft]);

  // Periodic interval autosave every 5s
  useEffect(() => {
    if (!sessionLoaded || isSubmitted) return;

    const interval = setInterval(() => {
      saveActiveSession({
        exam,
        subject: currentSubject,
        subjects,
        currentSubject,
        currentSubjectIndex,
        currentQIndex,
        answers,
        flagged: Array.from(flagged),
        totalQ: (currentQuestions || []).length,
        timestamp: Date.now(),
        timeLeft
      });
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLastSaved(nowStr);
    }, 5000);

    return () => clearInterval(interval);
  }, [exam, currentSubject, subjects, currentSubjectIndex, currentQIndex, answers, flagged, currentQuestions, sessionLoaded, isSubmitted, timeLeft]);

  useEffect(() => {
    if (isSubmitted || !mounted) return;

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
  }, [isSubmitted, mounted]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isSubmitted) {
        e.preventDefault();
        e.returnValue = 'Your active multi-subject exam is running. Are you sure you want to exit?';
        return 'Your active multi-subject exam is running. Are you sure you want to exit?';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isSubmitted]);

  const currentQ = currentQuestions[currentQIndex];

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
      setId: `${exam}_${currentSubject}_${year}`,
      questionId: currentQ.id,
      selectedAnswer: optionId,
      exam,
      subject: currentSubject,
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
        subject: currentSubject,
        reportType: reportIssueType,
        userNotes: reportDescription || `Flagged as ${reportIssueType} by student`,
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

  const handleNext = () => {
    if (currentQIndex < (currentQuestions || []).length - 1) {
      setCurrentQIndex(prev => prev + 1);
    } else if (currentSubjectIndex < subjects.length - 1) {
      const nextSubjectIndex = currentSubjectIndex + 1;
      setCurrentSubjectIndex(nextSubjectIndex);
      setCurrentSubject(subjects[nextSubjectIndex]);
      setCurrentQIndex(0);
    }
  };

  const handlePrevious = () => {
    if (currentQIndex > 0) {
      setCurrentQIndex(prev => prev - 1);
    } else if (currentSubjectIndex > 0) {
      const prevSubjectIndex = currentSubjectIndex - 1;
      setCurrentSubjectIndex(prevSubjectIndex);
      setCurrentSubject(subjects[prevSubjectIndex]);
      const prevSubjectQuestions = allQuestions[subjects[prevSubjectIndex]] || [];
      setCurrentQIndex((prevSubjectQuestions || []).length - 1);
    }
  };

  const handleSwitchSubject = (index: number) => {
    setCurrentSubjectIndex(index);
    setCurrentSubject(subjects[index]);
    setCurrentQIndex(0);
    setShowSubjectSwitcher(false);
  };

  const handleJumpToQuestion = (index: number) => {
    setCurrentQIndex(index);
    setShowSubjectSwitcher(false);
  };

  const handleSubmitExam = async () => {
    setIsSubmittingExam(true);
    setSubmitError(null);
    playExamCompleteSound();

    const timeSpentSeconds = initialTime - timeLeft;
    const answeredCount = Object.keys(answers).length;
    const sessionStatus = timeLeft <= 0 ? 'timed_out' : (answeredCount === 0 ? 'abandoned_0_answers' : 'completed');
    const resultId = `result_${Date.now()}`;

    try {
      let serverResult: any = null;
      if (token) {
        // Authoritative server-side grading
        serverResult = await api.submitSession(token, {
          exam,
          subject: subjects.join(', '),
          timeSpentSeconds,
          answers,
          confidences,
        });
      }

      setIsSubmitted(true);
      clearActiveSession();

      const finalScore = serverResult?.score ?? 0;
      const finalTotal = serverResult?.total ?? Object.values(allQuestions).flat().length;
      const finalPct = serverResult?.percentage ?? (finalTotal > 0 ? Math.round((finalScore / finalTotal) * 100) : 0);

      saveCompletedSession({
        id: resultId,
        exam,
        subject: subjects.join(', '),
        score: finalScore,
        total: finalTotal,
        pct: finalPct,
        date: Date.now(),
        status: sessionStatus,
        answeredCount,
        answers,
        confidences,
        questions: serverResult?.details || Object.values(allQuestions).flat(),
        timeSpentSeconds,
        details: serverResult?.details,
      });

      navigate(`/dashboard/result?id=${resultId}`);
    } catch (err: any) {
      console.error('Submission failed in MultiSubjectExam:', err);
      setIsSubmittingExam(false);
      setSubmitError('Submission failed due to a network error. Your answers are saved locally. Please check your connection and retry.');
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const calculateSubjectProgress = (subjectName: string) => {
    const questions = allQuestions[subjectName] || [];
    const answeredCount = (questions || []).filter(q => answers[q.id]).length;
    return {
      answered: answeredCount,
      total: (questions || []).length,
      pct: (questions || []).length > 0 ? Math.round((answeredCount / (questions || []).length) * 100) : 0
    };
  };

  const isLowTime = timeLeft < 600;

  if (!mounted || !sessionLoaded) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>Preparing multi-subject exam...</div>;
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-text-main)', margin: 0 }}>
                {exam} CBT Exam
              </h1>
              <span style={{
                fontSize: '11px', fontWeight: 700, backgroundColor: '#F3E8FF',
                color: '#7B2FF7', padding: '2px 9px', borderRadius: '12px',
                letterSpacing: '0.3px'
              }}>
                Year {year}
              </span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '2px 0 0 0' }}>
              {subjects.length} {subjects.length === 1 ? 'subject' : 'subjects'} · {(currentQuestions || []).length * subjects.length} total questions · {year} Past Questions
            </p>
          </div>
        </div>

        {/* Subject Switcher and Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
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

          {/* Calculator Toggle Button */}
          <button
            onClick={() => setShowCalculator(!showCalculator)}
            style={{
              padding: '8px 14px', borderRadius: '10px',
              backgroundColor: showCalculator ? '#7B2FF7' : 'rgba(123, 47, 247, 0.1)',
              color: showCalculator ? '#fff' : '#7B2FF7',
              border: 'none', cursor: 'pointer',
              fontSize: '13px', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: '6px',
              transition: 'all 0.2s ease'
            }}
          >
            <Calculator size={16} />
            Calculator
          </button>

          {/* Subject Switcher Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowSubjectSwitcher(!showSubjectSwitcher)}
              style={{
                padding: '8px 16px', borderRadius: '10px',
                backgroundColor: 'rgba(75,15,163,0.08)', color: '#4B0FA3',
                border: '1px solid rgba(75,15,163,0.2)', cursor: 'pointer',
                fontSize: '13px', fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: '8px'
              }}
            >
              <BookOpen size={16} />
              <span>{currentSubject}</span>
              <ChevronDown size={14} />
            </button>

            {showSubjectSwitcher && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: '8px',
                width: '280px', backgroundColor: '#fff', borderRadius: '12px',
                border: '1px solid var(--glass-border)', boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                zIndex: 1000, padding: '8px'
              }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', padding: '8px 12px 4px 12px' }}>
                  Switch Subject
                </p>
                {subjects.map((subj, idx) => {
                  const progress = calculateSubjectProgress(subj);
                  const isCurrent = idx === currentSubjectIndex;
                  return (
                    <button
                      key={subj}
                      onClick={() => handleSwitchSubject(idx)}
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: '8px',
                        border: 'none', backgroundColor: isCurrent ? 'rgba(75,15,163,0.1)' : 'transparent',
                        color: isCurrent ? '#4B0FA3' : 'var(--color-text-main)',
                        textAlign: 'left', cursor: 'pointer',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        fontSize: '13px', fontWeight: isCurrent ? 700 : 500
                      }}
                    >
                      <span>{subj}</span>
                      <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                        {progress.answered}/{progress.total}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <FocusMusicWidget />

          {tokenCharged && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '6px 12px', borderRadius: '20px',
              backgroundColor: 'rgba(123, 47, 247, 0.08)', color: '#7B2FF7',
              fontSize: '12px', fontWeight: 600, border: '1px solid rgba(123, 47, 247, 0.2)'
            }} title="Multi-Subject token session fee paid">
              <span>🪙 {tokenCharged} tokens</span>
            </div>
          )}

          {/* Timer Display */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 16px', borderRadius: '10px',
            backgroundColor: isLowTime ? '#fee2e2' : '#f1f5f9',
            color: isLowTime ? '#dc2626' : 'var(--color-text-main)',
            fontWeight: 700, fontSize: '14px'
          }}>
            <Timer size={16} />
            <span>{formatTime(timeLeft)}</span>
          </div>

          {/* Submit Button */}
          <button
            onClick={() => setShowSubmitConfirm(true)}
            style={{
              padding: '10px 20px', borderRadius: '10px',
              backgroundColor: '#16a34a', color: '#fff',
              border: 'none', cursor: 'pointer',
              fontSize: '13px', fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            <CheckCheck size={16} /> Submit Exam
          </button>
        </div>
      </div>

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
              display: 'inline-flex', alignItems: 'center', gap: '6px'
            }}
          >
            {isSubmittingExam ? 'Retrying...' : 'Retry Submission'}
          </button>
        </div>
      )}

      {/* Main Content Area: Expanded question card & 250px sidebar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 250px', gap: '20px', alignItems: 'start' }}>
        {/* Question Area */}
        <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '32px', border: '1px solid var(--glass-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          {currentQ ? (
            <>
              {/* Question Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#4B0FA3' }}>
                    Question {currentQIndex + 1} of {(currentQuestions || []).length}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                    ({currentSubject})
                  </span>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px',
                    backgroundColor: (currentQ as any)?.source === 'ALOC_API' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(123, 47, 247, 0.1)',
                    color: (currentQ as any)?.source === 'ALOC_API' ? '#059669' : '#7B2FF7',
                    border: (currentQ as any)?.source === 'ALOC_API' ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(123, 47, 247, 0.2)'
                  }}>
                    {(currentQ as any)?.source === 'ALOC_API' ? '⚡ ALOC Live API' : '📘 Past Questions Bank'}
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
                    <Flag size={14} />
                    {flagged.has(currentQ.id) ? 'Flagged' : 'Flag Question'}
                  </button>
                </div>
              </div>

              {/* Question Title & Collapsible Description Toggle Card */}
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

              {/* Question Text */}
              <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '16px', lineHeight: 1.5 }}>
                {currentQ.question}
              </div>

              {/* Question Diagram / Image */}
              {currentQ.imageUrl && (
                <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                  <img
                    src={currentQ.imageUrl}
                    alt="Question Diagram"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '340px',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                    }}
                  />
                </div>
              )}

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

              {/* Options */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
                {(Array.isArray(currentQ.options)
                  ? currentQ.options
                  : Object.entries(currentQ.options || {}).map(([id, text]) => ({ id, text }))
                ).map((option: any) => {
                  const isSelected = answers[currentQ.id] === option.id;
                  return (
                    <button
                      key={option.id}
                      onClick={() => handleOptionSelect(option.id)}
                      style={{
                        padding: '16px 20px', borderRadius: '12px',
                        border: isSelected ? '2px solid #7B2FF7' : '1px solid var(--glass-border)',
                        backgroundColor: isSelected ? 'rgba(123, 47, 247, 0.05)' : '#fff',
                        textAlign: 'left', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '14px',
                        transition: 'all 0.2s ease'
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
                        {option.id}
                      </div>
                      <span style={{ fontSize: '14px', color: 'var(--color-text-main)', fontWeight: isSelected ? 600 : 400 }}>
                        {option.text}
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

              {/* Navigation Controls */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  onClick={handlePrevious}
                  disabled={currentQIndex === 0 && currentSubjectIndex === 0}
                  style={{
                    padding: '10px 20px', borderRadius: '10px',
                    border: '1px solid var(--glass-border)', backgroundColor: '#fff',
                    color: 'var(--color-text-main)', fontSize: '13px', fontWeight: 600,
                    cursor: (currentQIndex === 0 && currentSubjectIndex === 0) ? 'not-allowed' : 'pointer',
                    opacity: (currentQIndex === 0 && currentSubjectIndex === 0) ? 0.5 : 1,
                    display: 'flex', alignItems: 'center', gap: '6px'
                  }}
                >
                  <ArrowLeft size={16} /> Previous
                </button>

                {currentQIndex === (currentQuestions || []).length - 1 && currentSubjectIndex === subjects.length - 1 ? (
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
                    onClick={handleNext}
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
          ) : (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              No questions found for this subject.
            </div>
          )}
        </div>

        {/* Sidebar: Subject Summary & Navigator */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Scientific Calculator (Shown as popup/card when active) */}
          {showCalculator && (
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Calculator</span>
                <button onClick={() => setShowCalculator(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                  <X size={16} />
                </button>
              </div>
              <ScientificCalculator onClose={() => setShowCalculator(false)} />
            </div>
          )}

          {/* Subject Navigation List */}
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '20px', border: '1px solid var(--glass-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-main)', marginBottom: '16px' }}>
              Subject Overview
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {subjects.map((subj, idx) => {
                const progress = calculateSubjectProgress(subj);
                const isCurrent = idx === currentSubjectIndex;

                return (
                  <div
                    key={subj}
                    onClick={() => handleSwitchSubject(idx)}
                    style={{
                      padding: '12px', borderRadius: '10px',
                      backgroundColor: isCurrent ? 'rgba(75,15,163,0.05)' : '#f8fafc',
                      border: isCurrent ? '1px solid #7B2FF7' : '1px solid var(--glass-border)',
                      cursor: 'pointer', transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: isCurrent ? '#7B2FF7' : 'var(--color-text-main)' }}>
                        {subj}
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                        {progress.answered}/{progress.total}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div style={{ width: '100%', height: '4px', backgroundColor: '#e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${progress.pct}%`, height: '100%',
                        backgroundColor: isCurrent ? '#7B2FF7' : '#16a34a',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Question Grid Navigator */}
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '18px 20px', border: '1px solid var(--glass-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '4px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-main)', margin: 0, whiteSpace: 'nowrap' }}>
                Questions
              </h3>
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                {(currentQuestions || []).filter(q => answers[q.id]).length}/{(currentQuestions || []).length} Answered
              </span>
            </div>

            <div className="question-navigator-scrollbar" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}>
              {(currentQuestions || []).map((q, idx) => {
                const isAnswered = !!answers[q.id];
                const isCurrent = idx === currentQIndex;
                const isFlagged = flagged.has(q.id);

                return (
                  <button
                    key={q.id}
                    onClick={() => handleJumpToQuestion(idx)}
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
          subject: currentSubject,
          questionNumber: currentQIndex + 1,
          totalQuestions: (currentQuestions || []).length,
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
            maxWidth: '440px', width: '100%', textAlign: 'center',
            boxShadow: '0 20px 50px rgba(0,0,0,0.2)'
          }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#fef3c7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <AlertCircle size={28} />
            </div>

            <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-text-main)', marginBottom: '8px' }}>
              Ready to Submit?
            </h3>

            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '24px', lineHeight: 1.5 }}>
              You are about to submit your multi-subject exam. Make sure you have reviewed all flagged and unanswered questions.
            </p>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowSubmitConfirm(false)}
                style={{
                  flex: 1, padding: '12px', borderRadius: '10px',
                  border: '1px solid var(--glass-border)', backgroundColor: '#fff',
                  color: 'var(--color-text-main)', fontSize: '14px', fontWeight: 600, cursor: 'pointer'
                }}
              >
                Continue Test
              </button>

              <button
                onClick={handleSubmitExam}
                style={{
                  flex: 1, padding: '12px', borderRadius: '10px',
                  border: 'none', backgroundColor: '#16a34a',
                  color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer'
                }}
              >
                Submit Now
              </button>
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
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '24px' }}>Your active exam progress is automatically saved! You can safely resume this multi-subject session anytime from your dashboard.</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => { setShowExitConfirm(false); blocker.reset?.(); }} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid var(--glass-border)', backgroundColor: '#fff', color: 'var(--color-text-main)', fontWeight: 600, cursor: 'pointer' }}>Continue Test</button>
              <button onClick={() => { blocker.proceed?.(); navigate('/dashboard/practice'); }} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', backgroundColor: '#dc2626', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Exit Session</button>
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
              Multi-Subject Exam Fee Required
            </h3>
            <p style={{ fontSize: '13.5px', color: '#64748b', lineHeight: '1.5', margin: '0 0 20px' }}>
              Starting this {subjects.length}-subject exam requires <strong>50 tokens (₦50.00)</strong>. Your wallet has insufficient balance to begin.
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
