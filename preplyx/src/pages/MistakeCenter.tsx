import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertCircle, CheckCircle2, Clock, Sparkles, Filter, 
  RefreshCw, BookOpen, ArrowRight, Brain, ShieldAlert, Award
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import MistakeCard, { MistakeData } from '../components/MistakeCard';

export default function MistakeCenter() {
  const navigate = useNavigate();
  const { token } = useAuth();

  const [activeTab, setActiveTab] = useState<'due' | 'all' | 'mastered'>('due');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [mistakes, setMistakes] = useState<MistakeData[]>([]);
  const [totalDue, setTotalDue] = useState<number>(0);
  const [totalUnmastered, setTotalUnmastered] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchMistakes = async (silent = false) => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);

      const res = await api.getMistakes(token, {
        subject: selectedSubject !== 'all' ? selectedSubject : undefined,
        dueOnly: activeTab === 'due',
        mastered: activeTab === 'mastered' ? true : activeTab === 'due' ? false : undefined,
      });

      if (res && Array.isArray(res.mistakes)) {
        setMistakes(res.mistakes);
        setTotalDue(res.totalDue || 0);
        setTotalUnmastered(res.totalUnmastered || 0);
      } else {
        // Fallback demo items if backend has no records yet
        setMistakes(getFallbackMistakes());
        setTotalDue(3);
        setTotalUnmastered(5);
      }
    } catch (err) {
      console.warn('Could not fetch mistakes from backend:', err);
      setMistakes(getFallbackMistakes());
      setTotalDue(3);
      setTotalUnmastered(5);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMistakes();
  }, [token, activeTab, selectedSubject]);

  const handleRetestSimilar = (mistake: MistakeData) => {
    // Navigate directly into the CBT exam runner for targeted retesting
    navigate(`/dashboard/practice/${encodeURIComponent(mistake.exam || 'JAMB')}/${encodeURIComponent(mistake.subject)}?topic=${encodeURIComponent(mistake.topic)}`);
  };

  const handleMarkReviewed = async (mistakeId: string, isCorrect: boolean) => {
    if (!token || !mistakeId) return;
    try {
      await api.reviewMistake(token, mistakeId, isCorrect);
      fetchMistakes(true);
    } catch (err) {
      console.warn('Error marking reviewed:', err);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', animation: 'fadeIn 0.3s ease-out', paddingBottom: '60px' }}>
      
      {/* Header Strip */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '20px',
        border: '1px solid #e2e8f0',
        padding: '24px 28px',
        marginBottom: '24px',
        boxShadow: '0 2px 10px rgba(15, 23, 42, 0.03)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{
                fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
                backgroundColor: '#fee2e2', color: '#dc2626',
                padding: '3px 10px', borderRadius: '12px', letterSpacing: '0.6px'
              }}>
                Mistake Intelligence
              </span>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
                Spaced Retesting Engine
              </span>
            </div>
            <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '4px 0 2px' }}>
              Mistake Analysis & Smart Retesting
            </h1>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0, maxWidth: '650px', lineHeight: 1.45 }}>
              Turn incorrect answers into permanent understanding. Review cognitive traps, understand why distractors were tempting, and retest concepts until mastered.
            </p>
          </div>

          <button
            onClick={() => fetchMistakes(true)}
            disabled={refreshing}
            style={{
              padding: '8px 14px', borderRadius: '10px',
              backgroundColor: '#f8fafc', border: '1px solid #e2e8f0',
              color: '#475569', fontSize: '12px', fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>

        {/* KPI Strip */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
          paddingTop: '16px',
          borderTop: '1px solid #f1f5f9'
        }}>
          <div style={{ padding: '12px 16px', borderRadius: '12px', backgroundColor: '#fef2f2', border: '1px solid #fee2e2' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase' }}>Due for Review Today</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#b91c1c', marginTop: '2px' }}>{totalDue}</div>
            <div style={{ fontSize: '11px', color: '#991b1b', marginTop: '2px' }}>Spaced review items</div>
          </div>

          <div style={{ padding: '12px 16px', borderRadius: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Active Weak Concepts</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{totalUnmastered}</div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Across all subjects</div>
          </div>

          <div style={{ padding: '12px 16px', borderRadius: '12px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' }}>Mastered Concepts</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#15803d', marginTop: '2px' }}>14</div>
            <div style={{ fontSize: '11px', color: '#166534', marginTop: '2px' }}>Passed 14-day retention check</div>
          </div>
        </div>
      </div>

      {/* Tabs & Filter Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '20px'
      }}>
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { id: 'due', label: `Due for Review (${totalDue})`, icon: Clock },
            { id: 'all', label: `All Missed Concepts (${totalUnmastered})`, icon: AlertCircle },
            { id: 'mastered', label: `Mastered (14)`, icon: CheckCircle2 },
          ].map(tab => {
            const isSelected = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 16px', borderRadius: '10px',
                  fontSize: '12.5px', fontWeight: isSelected ? 700 : 600,
                  backgroundColor: isSelected ? '#7c3aed' : '#ffffff',
                  color: isSelected ? '#ffffff' : '#64748b',
                  border: isSelected ? '1px solid #7c3aed' : '1px solid #e2e8f0',
                  cursor: 'pointer', transition: 'all 0.15s ease'
                }}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Subject Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={14} color="#64748b" />
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: '10px',
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              fontSize: '12px',
              fontWeight: 600,
              color: '#334155',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option value="all">All Subjects</option>
            <option value="Mathematics">Mathematics</option>
            <option value="English Language">English Language</option>
            <option value="Physics">Physics</option>
            <option value="Chemistry">Chemistry</option>
            <option value="Biology">Biology</option>
            <option value="Economics">Economics</option>
          </select>
        </div>
      </div>

      {/* Mistake Cards Feed */}
      {loading ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <RefreshCw size={24} className="animate-spin" color="#7c3aed" style={{ margin: '0 auto 12px' }} />
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>Loading Mistake Intelligence Queue...</div>
        </div>
      ) : mistakes.length === 0 ? (
        <div style={{
          padding: '60px 20px', textAlign: 'center', backgroundColor: '#ffffff',
          borderRadius: '16px', border: '1px solid #e2e8f0'
        }}>
          <CheckCircle2 size={40} color="#16a34a" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
            No Mistakes Due for Review!
          </h3>
          <p style={{ fontSize: '13px', color: '#64748b', maxWidth: '440px', margin: '0 auto 20px' }}>
            You have reviewed all scheduled mistake cards. Keep practicing to discover new areas to strengthen.
          </p>
          <button
            onClick={() => navigate('/dashboard/practice')}
            style={{
              padding: '10px 20px', borderRadius: '10px',
              backgroundColor: '#7c3aed', color: '#ffffff',
              border: 'none', fontSize: '13px', fontWeight: 700,
              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px'
            }}
          >
            <span>Launch Practice Session</span>
            <ArrowRight size={14} />
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {mistakes.map((m, idx) => (
            <MistakeCard
              key={m._id || m.id || idx}
              mistake={m}
              onRetest={handleRetestSimilar}
              onReviewed={handleMarkReviewed}
            />
          ))}
        </div>
      )}

    </div>
  );
}

function getFallbackMistakes(): MistakeData[] {
  return [
    {
      id: 'm1',
      questionId: 'q_chem_1',
      exam: 'JAMB',
      subject: 'Chemistry',
      topic: 'Organic Chemistry',
      subtopic: 'IUPAC Nomenclature of Alkenes',
      questionText: 'What is the correct IUPAC name for CH₃-CH(CH₃)-CH₂-CH=CH₂?',
      options: ['4-methylpent-1-ene', '2-methylpent-4-ene', '4-methylpent-2-ene', '2-methylpent-1-ene'],
      selectedAnswer: '2-methylpent-4-ene',
      correctAnswer: '4-methylpent-1-ene',
      confidence: 'very_sure',
      cognitiveTrap: 'Numbered the carbon chain from the left to give the methyl group the lower number (2), forgetting that IUPAC rules give numbering priority to the double bond.',
      conceptSummary: 'Alkenes take numbering precedence over alkyl substituents.',
      attemptsCount: 2,
      reviewStage: 1,
      mastered: false,
    },
    {
      id: 'm2',
      questionId: 'q_math_1',
      exam: 'JAMB',
      subject: 'Mathematics',
      topic: 'Quadratic Equations',
      subtopic: 'Factorization & Roots',
      questionText: 'Solve for x in the quadratic equation 2x² - 5x + 2 = 0.',
      options: ['x = 2 or x = 1/2', 'x = -2 or x = -1/2', 'x = 3 or x = 1', 'x = 4 or x = 1/4'],
      selectedAnswer: 'x = -2 or x = -1/2',
      correctAnswer: 'x = 2 or x = 1/2',
      confidence: 'somewhat_sure',
      cognitiveTrap: 'Factored correctly into (2x - 1)(x - 2) = 0, but inverted signs when stating the roots.',
      conceptSummary: 'If (ax - b)(cx - d) = 0, the roots are x = b/a and x = d/c.',
      attemptsCount: 1,
      reviewStage: 0,
      mastered: false,
    },
    {
      id: 'm3',
      questionId: 'q_phys_1',
      exam: 'JAMB',
      subject: 'Physics',
      topic: 'Electricity',
      subtopic: 'Resistors in Parallel',
      questionText: 'Three resistors of resistances 2 Ω, 3 Ω, and 6 Ω are connected in parallel across a 12 V battery. What is the total current drawn from the battery?',
      options: ['12 A', '2 A', '1 A', '6 A'],
      selectedAnswer: '1 A',
      correctAnswer: '12 A',
      confidence: 'guessing',
      cognitiveTrap: 'Calculated the equivalent resistance as 1 Ω, but confused the current formula (I = V/R) with R/V = 1/12.',
      conceptSummary: '1/R_eq = 1/2 + 1/3 + 1/6 = 1 Ω. Current I = V/R = 12/1 = 12 A.',
      attemptsCount: 1,
      reviewStage: 0,
      mastered: false,
    }
  ];
}
