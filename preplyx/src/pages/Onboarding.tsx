import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Target, BookOpen, GraduationCap, CheckCircle2, ArrowRight, 
  ArrowLeft, Clock, Sparkles, Award, HelpCircle, ShieldAlert,
  Flame, Check, RefreshCw
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function Onboarding() {
  const navigate = useNavigate();
  const { token, user } = useAuth();

  // Multi-step state: 1 = Goal Setup, 2 = Diagnostic Assessment, 3 = Starting Point
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Objective & Plan Form
  const [targetExam, setTargetExam] = useState<string>('JAMB');
  const [targetScore, setTargetScore] = useState<number>(280);
  const [targetCourse, setTargetCourse] = useState<string>('Medicine & Surgery');
  const [targetInstitution, setTargetInstitution] = useState<string>('University of Lagos (UNILAG)');
  const [dailyStudyMinutes, setDailyStudyMinutes] = useState<number>(60);
  const [confidenceLevel, setConfidenceLevel] = useState<string>('moderate');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([
    'English Language', 'Mathematics', 'Physics', 'Chemistry'
  ]);
  const [savingTarget, setSavingTarget] = useState<boolean>(false);

  // Step 2: Diagnostic Assessment
  const [diagnosticQuestions, setDiagnosticQuestions] = useState<any[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [confidenceMap, setConfidenceMap] = useState<Record<string, string>>({});
  const [loadingDiagnostic, setLoadingDiagnostic] = useState<boolean>(false);
  const [submittingDiagnostic, setSubmittingDiagnostic] = useState<boolean>(false);

  // Step 3: Starting Point & Recommendations
  const [startingPoint, setStartingPoint] = useState<{
    score: number;
    total: number;
    percentage: number;
    strongestSubject: string;
    weakestSubject: string;
    biggestOpportunityTopic: string;
    currentReadiness: number;
    targetScore: number;
    recommendedFirstMission: {
      subject: string;
      topic: string;
      questionCount: number;
      description: string;
    };
  } | null>(null);

  const availableSubjectsByExam: Record<string, string[]> = {
    JAMB: ['English Language', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Economics', 'Government', 'Literature in English', 'Commerce', 'Civic Education'],
    WAEC: ['English Language', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Economics', 'Government', 'Civic Education', 'Agricultural Science', 'Literature in English'],
    NECO: ['English Language', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Economics', 'Government', 'Civic Education', 'Commerce'],
  };

  const currentSubjectsPool = availableSubjectsByExam[targetExam] || availableSubjectsByExam.JAMB;

  const toggleSubject = (subj: string) => {
    if (selectedSubjects.includes(subj)) {
      if (selectedSubjects.length > 1) {
        setSelectedSubjects(selectedSubjects.filter(s => s !== subj));
      }
    } else {
      if (selectedSubjects.length < 5) {
        setSelectedSubjects([...selectedSubjects, subj]);
      }
    }
  };

  const handleSaveGoal = async () => {
    setSavingTarget(true);
    try {
      if (token) {
        await api.setupTargetAndPlan(token, {
          targetExam,
          targetScore,
          targetCourse,
          targetInstitution,
          subjects: selectedSubjects,
          dailyStudyMinutes,
          confidenceLevel,
        });
      }

      // Load diagnostic questions
      setLoadingDiagnostic(true);
      setStep(2);
      
      let qList: any[] = [];
      if (token) {
        qList = await api.getDiagnostic(token).catch(() => []);
      }
      
      if (!qList || qList.length === 0) {
        qList = getFallbackDiagnosticQuestions(targetExam, selectedSubjects);
      }
      
      setDiagnosticQuestions(qList);
    } catch (err) {
      console.warn('Error saving target:', err);
      setStep(2);
      setDiagnosticQuestions(getFallbackDiagnosticQuestions(targetExam, selectedSubjects));
    } finally {
      setSavingTarget(false);
      setLoadingDiagnostic(false);
    }
  };

  const handleSelectOption = (qId: string, optionLetter: string) => {
    setAnswers(prev => ({ ...prev, [qId]: optionLetter }));
  };

  const handleSelectConfidence = (qId: string, conf: string) => {
    setConfidenceMap(prev => ({ ...prev, [qId]: conf }));
  };

  const handleSubmitDiagnostic = async () => {
    setSubmittingDiagnostic(true);
    try {
      let result: any = null;
      if (token) {
        result = await api.completeDiagnostic(token, answers, confidenceMap).catch(() => null);
      }

      if (!result) {
        result = calculateLocalDiagnostic(diagnosticQuestions, answers, targetScore);
      }

      setStartingPoint(result);
      setStep(3);
    } catch (err) {
      console.warn('Error completing diagnostic:', err);
      const result = calculateLocalDiagnostic(diagnosticQuestions, answers, targetScore);
      setStartingPoint(result);
      setStep(3);
    } finally {
      setSubmittingDiagnostic(false);
    }
  };

  const currentQ = diagnosticQuestions[currentQIndex];

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      padding: '40px 20px',
      fontFamily: 'Inter, system-ui, sans-serif',
      color: '#0f172a',
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        
        {/* Top Preplyx Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '6px 14px', borderRadius: '20px',
            backgroundColor: '#ffffff', border: '1px solid #e2e8f0',
            boxShadow: '0 2px 6px rgba(15,23,42,0.04)', marginBottom: '12px'
          }}>
            <Sparkles size={16} color="#7c3aed" />
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#4c1d95', letterSpacing: '-0.2px' }}>
              PREPLYX PREPARATION ONBOARDING
            </span>
          </div>

          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
            {step === 1 && "What is your examination goal?"}
            {step === 2 && "Baseline Diagnostic Assessment"}
            {step === 3 && "Your Preplyx Starting Point"}
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
            {step === 1 && "Define your target exam and score so Preplyx can personalize your study roadmap."}
            {step === 2 && "A short 15-question assessment across your subjects to locate your baseline strengths & weaknesses."}
            {step === 3 && "Here is exactly where you are today and what you should study first."}
          </p>
        </div>

        {/* STEP 1: TARGET GOAL & PLAN */}
        {step === 1 && (
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            border: '1px solid #e2e8f0',
            padding: '32px',
            boxShadow: '0 4px 20px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px'
          }}>
            {/* Exam Board Selector */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>
                1. Select Examination
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {['JAMB', 'WAEC', 'NECO'].map(exam => {
                  const isSel = targetExam === exam;
                  return (
                    <button
                      key={exam}
                      type="button"
                      onClick={() => {
                        setTargetExam(exam);
                        if (exam === 'JAMB') setTargetScore(280);
                        else setTargetScore(85);
                      }}
                      style={{
                        padding: '16px',
                        borderRadius: '12px',
                        border: isSel ? '2px solid #7c3aed' : '1px solid #e2e8f0',
                        backgroundColor: isSel ? '#f5f3ff' : '#ffffff',
                        color: isSel ? '#6d28d9' : '#334155',
                        fontWeight: 700,
                        fontSize: '15px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {exam}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Target Score Selector */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.5px' }}>
                  2. Your Target Score
                </label>
                <span style={{ fontSize: '18px', fontWeight: 800, color: '#7c3aed' }}>
                  {targetExam === 'JAMB' ? `${targetScore} / 400` : `${targetScore}% (Distinction)`}
                </span>
              </div>
              <input
                type="range"
                min={targetExam === 'JAMB' ? 180 : 50}
                max={targetExam === 'JAMB' ? 360 : 100}
                step={targetExam === 'JAMB' ? 5 : 1}
                value={targetScore}
                onChange={(e) => setTargetScore(Number(e.target.value))}
                style={{
                  width: '100%',
                  accentColor: '#7c3aed',
                  cursor: 'pointer',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                <span>{targetExam === 'JAMB' ? '180 (Cut-off)' : '50% (Credit)'}</span>
                <span>{targetExam === 'JAMB' ? '250 (Competitive)' : '75% (Very Good)'}</span>
                <span>{targetExam === 'JAMB' ? '300+ (Elite)' : '90%+ (Distinction)'}</span>
              </div>
            </div>

            {/* Target Course & University */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>
                  Target Course
                </label>
                <input
                  type="text"
                  placeholder="e.g. Medicine, Law, Computer Science"
                  value={targetCourse}
                  onChange={(e) => setTargetCourse(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    fontSize: '13px',
                    outline: 'none',
                    backgroundColor: '#f8fafc',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>
                  Target Institution
                </label>
                <input
                  type="text"
                  placeholder="e.g. UNILAG, UI, OAU, ABU"
                  value={targetInstitution}
                  onChange={(e) => setTargetInstitution(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    fontSize: '13px',
                    outline: 'none',
                    backgroundColor: '#f8fafc',
                  }}
                />
              </div>
            </div>

            {/* Subject Selection */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.5px' }}>
                  3. Select Your 4 Examination Subjects
                </label>
                <span style={{ fontSize: '12px', fontWeight: 700, color: selectedSubjects.length === 4 ? '#16a34a' : '#d97706' }}>
                  {selectedSubjects.length}/4 Selected
                </span>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {currentSubjectsPool.map(subj => {
                  const isSel = selectedSubjects.includes(subj);
                  return (
                    <button
                      key={subj}
                      type="button"
                      onClick={() => toggleSubject(subj)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 600,
                        border: isSel ? '1.5px solid #7c3aed' : '1px solid #e2e8f0',
                        backgroundColor: isSel ? '#7c3aed' : '#f8fafc',
                        color: isSel ? '#ffffff' : '#334155',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {subj}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CTA Button */}
            <div style={{ paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
              <button
                type="button"
                onClick={handleSaveGoal}
                disabled={savingTarget || selectedSubjects.length < 2}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                  color: '#ffffff',
                  fontSize: '15px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: savingTarget ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px rgba(124, 58, 237, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <span>Take 15-Minute Diagnostic Assessment</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: DIAGNOSTIC CBT ASSESSMENT */}
        {step === 2 && (
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            border: '1px solid #e2e8f0',
            padding: '32px',
            boxShadow: '0 4px 20px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            {loadingDiagnostic ? (
              <div style={{ padding: '60px', textAlign: 'center' }}>
                <RefreshCw size={28} className="animate-spin" color="#7c3aed" style={{ margin: '0 auto 12px' }} />
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>Generating tailored diagnostic question set...</p>
              </div>
            ) : currentQ ? (
              <>
                {/* Question Progress Bar & Subject Pill */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{
                    fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
                    backgroundColor: '#f3e8ff', color: '#7c3aed',
                    padding: '3px 10px', borderRadius: '12px', letterSpacing: '0.5px'
                  }}>
                    {currentQ.subject} • {currentQ.topic}
                  </span>

                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748b' }}>
                    Question {currentQIndex + 1} of {diagnosticQuestions.length}
                  </span>
                </div>

                {/* Progress Bar */}
                <div style={{ width: '100%', height: '6px', backgroundColor: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${((currentQIndex + 1) / diagnosticQuestions.length) * 100}%`,
                    height: '100%',
                    backgroundColor: '#7c3aed',
                    transition: 'width 0.2s ease'
                  }} />
                </div>

                {/* Question Text */}
                <div style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', lineHeight: 1.55 }}>
                  {currentQ.text}
                </div>

                {/* Options */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {(currentQ.options || []).map((opt: string, optIdx: number) => {
                    const letters = ['A', 'B', 'C', 'D'];
                    const letter = letters[optIdx] || String(optIdx);
                    const isSelected = answers[currentQ.id] === opt || answers[currentQ.id] === letter;

                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() => handleSelectOption(currentQ.id, opt)}
                        style={{
                          padding: '14px 18px',
                          borderRadius: '12px',
                          border: isSelected ? '2px solid #7c3aed' : '1px solid #e2e8f0',
                          backgroundColor: isSelected ? '#f5f3ff' : '#ffffff',
                          textAlign: 'left',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{
                          width: '24px', height: '24px', borderRadius: '50%',
                          backgroundColor: isSelected ? '#7c3aed' : '#f1f5f9',
                          color: isSelected ? '#ffffff' : '#64748b',
                          fontSize: '12px', fontWeight: 700,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>
                          {letter}
                        </div>
                        <span style={{ fontSize: '14px', color: '#1e293b', fontWeight: isSelected ? 600 : 400 }}>
                          {opt}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Confidence Selector (Optional & Helpful) */}
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '12px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>
                    How confident are you?
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {[
                      { id: 'very_sure', label: '🎯 Very sure' },
                      { id: 'somewhat_sure', label: '🤔 Somewhat' },
                      { id: 'guessing', label: '🎲 Guessing' }
                    ].map(c => {
                      const isConf = confidenceMap[currentQ.id] === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleSelectConfidence(currentQ.id, c.id)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '8px',
                            fontSize: '11px',
                            fontWeight: 600,
                            border: isConf ? '1px solid #7c3aed' : '1px solid #e2e8f0',
                            backgroundColor: isConf ? '#f3e8ff' : '#ffffff',
                            color: isConf ? '#6d28d9' : '#475569',
                            cursor: 'pointer',
                          }}
                        >
                          {c.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Navigation Buttons */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setCurrentQIndex(Math.max(0, currentQIndex - 1))}
                    disabled={currentQIndex === 0}
                    style={{
                      padding: '10px 18px',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      backgroundColor: '#ffffff',
                      color: '#475569',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: currentQIndex === 0 ? 'not-allowed' : 'pointer',
                      opacity: currentQIndex === 0 ? 0.5 : 1,
                    }}
                  >
                    Previous
                  </button>

                  {currentQIndex === diagnosticQuestions.length - 1 ? (
                    <button
                      type="button"
                      onClick={handleSubmitDiagnostic}
                      disabled={submittingDiagnostic}
                      style={{
                        padding: '10px 24px',
                        borderRadius: '10px',
                        backgroundColor: '#16a34a',
                        color: '#ffffff',
                        fontSize: '13px',
                        fontWeight: 700,
                        border: 'none',
                        cursor: submittingDiagnostic ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)'
                      }}
                    >
                      <CheckCircle2 size={16} />
                      <span>{submittingDiagnostic ? 'Analyzing...' : 'Complete Diagnostic'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setCurrentQIndex(Math.min(diagnosticQuestions.length - 1, currentQIndex + 1))}
                      style={{
                        padding: '10px 20px',
                        borderRadius: '10px',
                        backgroundColor: '#7c3aed',
                        color: '#ffffff',
                        fontSize: '13px',
                        fontWeight: 600,
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <span>Next</span>
                      <ArrowRight size={15} />
                    </button>
                  )}
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* STEP 3: STARTING POINT & RECOMMENDED FIRST MISSION */}
        {step === 3 && startingPoint && (
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            border: '1px solid #e2e8f0',
            padding: '32px',
            boxShadow: '0 4px 20px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px'
          }}>
            {/* Readiness Hero Badge */}
            <div style={{
              padding: '24px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px'
            }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#a78bfa', letterSpacing: '0.8px' }}>
                  Current Preparation Indicator
                </span>
                <h2 style={{ fontSize: '24px', fontWeight: 800, margin: '4px 0 2px' }}>
                  {targetExam} Readiness: {startingPoint.currentReadiness}%
                </h2>
                <p style={{ fontSize: '13px', color: '#cbd5e1', margin: 0 }}>
                  Diagnostic Score: {startingPoint.score}/{startingPoint.total} ({startingPoint.percentage}%) • Target: {startingPoint.targetScore}
                </p>
              </div>

              <div style={{
                width: '64px', height: '64px', borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Award size={32} color="#a78bfa" />
              </div>
            </div>

            {/* Diagnostic Breakdown Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
              <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' }}>Strongest Area</span>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#15803d', marginTop: '4px' }}>
                  {startingPoint.strongestSubject}
                </div>
                <p style={{ fontSize: '11px', color: '#166534', margin: '4px 0 0' }}>Solid baseline. Maintain with periodic timed drills.</p>
              </div>

              <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#fef2f2', border: '1px solid #fee2e2' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase' }}>Needs Attention</span>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#b91c1c', marginTop: '4px' }}>
                  {startingPoint.weakestSubject}
                </div>
                <p style={{ fontSize: '11px', color: '#991b1b', margin: '4px 0 0' }}>Greatest opportunity to recover lost marks.</p>
              </div>

              <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#fefce8', border: '1px solid #fef08a' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#ca8a04', textTransform: 'uppercase' }}>Biggest Lever</span>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#854d0e', marginTop: '4px' }}>
                  {startingPoint.biggestOpportunityTopic}
                </div>
                <p style={{ fontSize: '11px', color: '#713f12', margin: '4px 0 0' }}>Focusing here will produce rapid score improvement.</p>
              </div>
            </div>

            {/* Recommended First Mission Card */}
            <div style={{
              padding: '20px 24px',
              borderRadius: '16px',
              backgroundColor: '#f5f3ff',
              border: '1.5px solid #c4b5fd',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px'
            }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#6d28d9', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  Recommended First Mission
                </span>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#4c1d95', margin: '4px 0 2px' }}>
                  {startingPoint.recommendedFirstMission.subject} — {startingPoint.recommendedFirstMission.topic} ({startingPoint.recommendedFirstMission.questionCount} Questions)
                </h3>
                <p style={{ fontSize: '13px', color: '#6d28d9', margin: 0, lineHeight: 1.4 }}>
                  {startingPoint.recommendedFirstMission.description}
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate(`/dashboard/practice/${encodeURIComponent(targetExam)}/${encodeURIComponent(startingPoint.recommendedFirstMission.subject)}?topic=${encodeURIComponent(startingPoint.recommendedFirstMission.topic)}`)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(124, 58, 237, 0.35)'
                }}
              >
                <span>Start Mission Now</span>
                <ArrowRight size={15} />
              </button>
            </div>

            {/* Link to Main Dashboard */}
            <div style={{ textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Go to Today's Mission & Dashboard
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function getFallbackDiagnosticQuestions(exam: string, subjects: string[]): any[] {
  return [
    {
      id: 'diag_1',
      subject: subjects[0] || 'English Language',
      topic: 'Lexis & Structure',
      text: 'Choose the word nearest in meaning to METICULOUS: "The auditor gave a meticulous review of the accounts."',
      options: ['Thorough and precise', 'Careless and hurried', 'Vague and complicated', 'Short and brief'],
      correctAnswer: 'Thorough and precise',
    },
    {
      id: 'diag_2',
      subject: subjects[0] || 'English Language',
      topic: 'Concord',
      text: 'Neither the teacher nor the students _____ present at the auditorium.',
      options: ['were', 'was', 'is', 'has been'],
      correctAnswer: 'were',
    },
    {
      id: 'diag_3',
      subject: subjects[1] || 'Mathematics',
      topic: 'Logarithms',
      text: 'If log₁₀ 2 = 0.3010 and log₁₀ 3 = 0.4771, evaluate log₁₀ 18.',
      options: ['1.2552', '1.0791', '1.4313', '0.7781'],
      correctAnswer: '1.2552',
    },
    {
      id: 'diag_4',
      subject: subjects[1] || 'Mathematics',
      topic: 'Quadratic Equations',
      text: 'Solve for x in the equation 2x² - 5x + 2 = 0.',
      options: ['x = 2 or x = 1/2', 'x = -2 or x = -1/2', 'x = 3 or x = 1', 'x = 4 or x = 1/4'],
      correctAnswer: 'x = 2 or x = 1/2',
    },
    {
      id: 'diag_5',
      subject: subjects[2] || 'Physics',
      topic: 'Mechanics',
      text: 'Calculate the kinetic energy of a body of mass 4 kg moving at a velocity of 5 m/s.',
      options: ['50 J', '100 J', '20 J', '10 J'],
      correctAnswer: '50 J',
    },
    {
      id: 'diag_6',
      subject: subjects[2] || 'Physics',
      topic: 'Electricity',
      text: 'Three resistors of resistances 2 Ω, 3 Ω, and 6 Ω are connected in parallel. Find the equivalent resistance.',
      options: ['1 Ω', '11 Ω', '2 Ω', '0.5 Ω'],
      correctAnswer: '1 Ω',
    },
    {
      id: 'diag_7',
      subject: subjects[3] || 'Chemistry',
      topic: 'Organic Chemistry',
      text: 'What is the correct IUPAC name for CH₃-CH(CH₃)-CH₂-CH=CH₂?',
      options: ['4-methylpent-1-ene', '2-methylpent-4-ene', '4-methylpent-2-ene', '2-methylpent-1-ene'],
      correctAnswer: '4-methylpent-1-ene',
    },
    {
      id: 'diag_8',
      subject: subjects[3] || 'Chemistry',
      topic: 'Electrochemistry',
      text: 'What is the oxidation number of manganese in KMnO₄?',
      options: ['+7', '+6', '+5', '+4'],
      correctAnswer: '+7',
    },
    {
      id: 'diag_9',
      subject: subjects[0] || 'English Language',
      topic: 'Antonyms',
      text: 'Choose the word opposite in meaning to EPHEMERAL: "Her fame proved to be ephemeral."',
      options: ['Enduring', 'Transient', 'Fleeting', 'Brief'],
      correctAnswer: 'Enduring',
    },
    {
      id: 'diag_10',
      subject: subjects[1] || 'Mathematics',
      topic: 'Calculus',
      text: 'Find the derivative of f(x) = 3x² + 5x - 2 at x = 2.',
      options: ['17', '12', '15', '21'],
      correctAnswer: '17',
    },
    {
      id: 'diag_11',
      subject: subjects[2] || 'Physics',
      topic: 'Optics',
      text: 'If the critical angle for a glass-air interface is 42°, what is the refractive index of the glass? [sin 42° = 0.6691]',
      options: ['1.49', '1.33', '1.50', '0.67'],
      correctAnswer: '1.49',
    },
    {
      id: 'diag_12',
      subject: subjects[3] || 'Chemistry',
      topic: 'Acids, Bases & Salts',
      text: 'Calculate the pH of a 0.005 M solution of H₂SO₄, assuming complete dissociation.',
      options: ['2.0', '1.0', '2.3', '3.0'],
      correctAnswer: '2.0',
    },
    {
      id: 'diag_13',
      subject: subjects[0] || 'English Language',
      topic: 'Figures of Speech',
      text: 'Identify the figure of speech: "The trees whispered in the evening breeze."',
      options: ['Personification', 'Hyperbole', 'Oxymoron', 'Simile'],
      correctAnswer: 'Personification',
    },
    {
      id: 'diag_14',
      subject: subjects[1] || 'Mathematics',
      topic: 'Trigonometry',
      text: 'If tan θ = 3/4 and θ is acute, find cos θ.',
      options: ['4/5', '3/5', '5/4', '3/4'],
      correctAnswer: '4/5',
    },
    {
      id: 'diag_15',
      subject: subjects[3] || 'Chemistry',
      topic: 'Stoichiometry',
      text: 'What volume of gas at s.t.p. is occupied by 0.5 moles of oxygen? [Molar volume at s.t.p. = 22.4 dm³]',
      options: ['11.2 dm³', '22.4 dm³', '44.8 dm³', '5.6 dm³'],
      correctAnswer: '11.2 dm³',
    }
  ];
}

function calculateLocalDiagnostic(questions: any[], answers: Record<string, string>, targetScore: number) {
  let score = 0;
  const total = questions.length || 15;

  questions.forEach(q => {
    if (answers[q.id] === q.correctAnswer) {
      score++;
    }
  });

  const pct = Math.round((score / total) * 100);
  const readiness = Math.min(95, Math.max(30, Math.round(pct * 0.85 + 15)));

  return {
    score,
    total,
    percentage: pct,
    strongestSubject: 'English Language',
    weakestSubject: 'Chemistry',
    biggestOpportunityTopic: 'Organic Chemistry',
    currentReadiness: readiness,
    targetScore,
    recommendedFirstMission: {
      subject: 'Chemistry',
      topic: 'Organic Chemistry',
      questionCount: 15,
      description: 'Targeted 15-question drill on Organic Chemistry to strengthen IUPAC nomenclature and isomerism.',
    },
  };
}
