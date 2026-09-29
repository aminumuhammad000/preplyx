import React, { useState } from 'react';
import { 
  AlertCircle, CheckCircle2, XCircle, Sparkles, RefreshCw, 
  HelpCircle, ChevronDown, ChevronUp, BookOpen, Clock, ArrowRight,
  ShieldAlert, Brain
} from 'lucide-react';
import { api } from '../lib/api';

export interface MistakeData {
  _id?: string;
  id?: string;
  questionId: string;
  questionText: string;
  options: string[] | Record<string, string>;
  selectedAnswer: string;
  correctAnswer: string;
  topic: string;
  subtopic?: string;
  subject: string;
  exam: string;
  confidence?: 'very_sure' | 'somewhat_sure' | 'guessing';
  cognitiveTrap?: string;
  conceptSummary?: string;
  reviewStage?: number;
  attemptsCount?: number;
  mastered?: boolean;
}

interface MistakeCardProps {
  mistake: MistakeData;
  onRetest?: (mistake: MistakeData) => void;
  onReviewed?: (mistakeId: string, isCorrect: boolean) => void;
}

export default function MistakeCard({ mistake, onRetest, onReviewed }: MistakeCardProps) {
  const [showWhyWrong, setShowWhyWrong] = useState(false);
  const [loadingWhyWrong, setLoadingWhyWrong] = useState(false);
  const [whyWrongData, setWhyWrongData] = useState<any>(null);
  const [whyWrongError, setWhyWrongError] = useState<string | null>(null);

  const optionsList: { id: string; text: string }[] = Array.isArray(mistake.options)
    ? mistake.options.map((opt, idx) => {
        const letters = ['A', 'B', 'C', 'D', 'E'];
        return { id: letters[idx] || String(idx), text: opt };
      })
    : Object.entries(mistake.options || {}).map(([id, text]) => ({ id, text: String(text) }));

  const handleFetchWhyWrong = async () => {
    if (whyWrongData) {
      setShowWhyWrong(!showWhyWrong);
      return;
    }

    setLoadingWhyWrong(true);
    setWhyWrongError(null);
    setShowWhyWrong(true);

    try {
      const res = await api.explainWhyWrong({
        questionId: mistake.questionId,
        questionText: mistake.questionText,
        selectedAnswer: mistake.selectedAnswer,
        correctAnswer: mistake.correctAnswer,
        subject: mistake.subject,
        topic: mistake.topic,
        options: optionsList.map(o => `${o.id}: ${o.text}`),
      });

      setWhyWrongData(res?.data || res);
    } catch (err: any) {
      console.warn('Why wrong error:', err);
      // Fallback data
      setWhyWrongData({
        correctAnswer: mistake.correctAnswer,
        relevantConcept: `Foundational principle in ${mistake.subject} (${mistake.topic}).`,
        whySelectedIsIncorrect: `Option "${mistake.selectedAnswer}" does not fulfill the standard condition required by ${mistake.topic}.`,
        whySelectedIsTempting: mistake.cognitiveTrap || `This option is an examination distractor that mimics the correct solution while omitting a critical condition.`,
        correctReasoning: `1. Identify the given parameters.\n2. Apply the core formula or rule of ${mistake.topic}.\n3. Conclude that "${mistake.correctAnswer}" is the only accurate choice.`,
        simpleExplanation: `Verify terms and units carefully to avoid this common distractor.`,
        example: `In similar ${mistake.subject} questions, double-check whether all boundary criteria are satisfied.`,
      });
    } finally {
      setLoadingWhyWrong(false);
    }
  };

  const getConfidenceBadge = () => {
    if (mistake.confidence === 'very_sure') {
      return {
        label: 'False Confidence',
        color: '#dc2626',
        bg: '#fee2e2',
        desc: 'You were very sure, but chose the wrong option. High priority to fix!',
      };
    }
    if (mistake.confidence === 'guessing') {
      return {
        label: 'Educated Guess',
        color: '#d97706',
        bg: '#fef3c7',
        desc: 'You were guessing. Build core understanding here.',
      };
    }
    return {
      label: 'Uncertain',
      color: '#4b5563',
      bg: '#f3f4f6',
      desc: 'Moderate confidence. Review core concept.',
    };
  };

  const confBadge = getConfidenceBadge();

  return (
    <div style={{
      backgroundColor: '#ffffff',
      borderRadius: '16px',
      border: '1px solid #e2e8f0',
      padding: '20px 22px',
      boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
      transition: 'all 0.2s ease',
    }}>
      {/* Top Tag Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{
            fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
            backgroundColor: '#f3e8ff', color: '#7c3aed',
            padding: '3px 10px', borderRadius: '12px', letterSpacing: '0.5px'
          }}>
            {mistake.subject} • {mistake.topic}
          </span>

          {mistake.subtopic && (
            <span style={{
              fontSize: '11px', fontWeight: 600,
              backgroundColor: '#f1f5f9', color: '#475569',
              padding: '3px 8px', borderRadius: '8px'
            }}>
              {mistake.subtopic}
            </span>
          )}

          <span style={{
            fontSize: '11px', fontWeight: 700,
            backgroundColor: confBadge.bg, color: confBadge.color,
            padding: '3px 10px', borderRadius: '12px',
            display: 'inline-flex', alignItems: 'center', gap: '4px'
          }} title={confBadge.desc}>
            <ShieldAlert size={12} /> {confBadge.label}
          </span>
        </div>

        <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>
          {mistake.attemptsCount ? `Attempted ${mistake.attemptsCount}x` : 'Missed in recent session'}
        </div>
      </div>

      {/* Question Text */}
      <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', lineHeight: 1.5 }}>
        {mistake.questionText}
      </div>

      {/* Selected vs Correct Comparison Strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '10px',
        padding: '12px 14px',
        borderRadius: '12px',
        backgroundColor: '#f8fafc',
        border: '1px solid #f1f5f9',
      }}>
        {/* Student Wrong Answer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '24px', height: '24px', borderRadius: '50%',
            backgroundColor: '#fee2e2', color: '#dc2626',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <XCircle size={14} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Your Answer:</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#b91c1c' }}>
              {mistake.selectedAnswer}
            </div>
          </div>
        </div>

        {/* Correct Answer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '24px', height: '24px', borderRadius: '50%',
            backgroundColor: '#dcfce7', color: '#16a34a',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <CheckCircle2 size={14} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Correct Answer:</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#15803d' }}>
              {mistake.correctAnswer}
            </div>
          </div>
        </div>
      </div>

      {/* Cognitive Trap Explanation Note */}
      {mistake.cognitiveTrap && (
        <div style={{
          fontSize: '12.5px', color: '#854d0e', backgroundColor: '#fefce8',
          border: '1px solid #fef08a', padding: '10px 14px', borderRadius: '10px',
          lineHeight: 1.4, display: 'flex', alignItems: 'flex-start', gap: '8px'
        }}>
          <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '2px' }} color="#ca8a04" />
          <div>
            <strong>What went wrong:</strong> {mistake.cognitiveTrap}
          </div>
        </div>
      )}

      {/* In-depth "Why Was My Answer Wrong?" Accordion */}
      {showWhyWrong && (
        <div style={{
          backgroundColor: '#faf5ff',
          borderRadius: '12px',
          border: '1px solid #e9d5ff',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          {loadingWhyWrong ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#7c3aed', fontSize: '13px', padding: '8px 0' }}>
              <RefreshCw size={15} className="animate-spin" /> Analyzing your mistake with Preplyx Mistake Engine...
            </div>
          ) : whyWrongData ? (
            <>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#6b21a8', textTransform: 'uppercase' }}>
                  Core Syllabus Concept
                </span>
                <p style={{ fontSize: '13px', color: '#3b0764', margin: '4px 0 0', lineHeight: 1.5 }}>
                  {whyWrongData.relevantConcept}
                </p>
              </div>

              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#991b1b', textTransform: 'uppercase' }}>
                  Why Your Selected Answer Was Tempting
                </span>
                <p style={{ fontSize: '13px', color: '#450a0a', margin: '4px 0 0', lineHeight: 1.5 }}>
                  {whyWrongData.whySelectedIsTempting}
                </p>
              </div>

              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#15803d', textTransform: 'uppercase' }}>
                  Correct Step-by-Step Reasoning
                </span>
                <p style={{ fontSize: '13px', color: '#052e16', margin: '4px 0 0', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
                  {whyWrongData.correctReasoning}
                </p>
              </div>

              {whyWrongData.example && (
                <div style={{ backgroundColor: '#ffffff', padding: '10px 12px', borderRadius: '8px', border: '1px solid #f3e8ff', fontSize: '12px', color: '#475569' }}>
                  <strong style={{ color: '#6b21a8' }}>Example: </strong> {whyWrongData.example}
                </div>
              )}
            </>
          ) : (
            <div style={{ fontSize: '12px', color: '#ef4444' }}>
              {whyWrongError || 'Could not load in-depth explanation.'}
            </div>
          )}
        </div>
      )}

      {/* Action Footer Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
        paddingTop: '10px',
        borderTop: '1px solid #f1f5f9'
      }}>
        {/* "Why was my answer wrong?" Button */}
        <button
          onClick={handleFetchWhyWrong}
          style={{
            background: 'none',
            border: 'none',
            color: '#7c3aed',
            fontSize: '12.5px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: 0
          }}
        >
          <Sparkles size={14} color="#7c3aed" />
          <span>Why was my answer wrong?</span>
          {showWhyWrong ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {/* Retest Similar Questions Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onRetest && (
            <button
              onClick={() => onRetest(mistake)}
              style={{
                padding: '7px 14px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                color: '#ffffff',
                border: 'none',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 6px rgba(124, 58, 237, 0.25)',
                transition: 'transform 0.15s ease'
              }}
            >
              <span>Practice Similar Questions</span>
              <ArrowRight size={13} />
            </button>
          )}

          {onReviewed && (
            <button
              onClick={() => onReviewed(mistake._id || mistake.id || '', true)}
              style={{
                padding: '7px 12px',
                borderRadius: '8px',
                backgroundColor: '#f1f5f9',
                color: '#475569',
                border: '1px solid #e2e8f0',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="Mark as reviewed for your next spaced review cycle"
            >
              <CheckCircle2 size={13} color="#16a34a" />
              <span>Mark Reviewed</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
