"use client";
import { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, Bot, User, Lightbulb, HelpCircle, BookOpen, Zap, RefreshCw, Copy, Check, CheckCircle2, ChevronRight, FileText, Minimize2, Maximize2 } from 'lucide-react';
import { playButtonClickSound } from '@/lib/soundEffects';
import { api } from '@/lib/api';

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
}

interface QuestionContext {
  exam?: string;
  subject?: string;
  questionNumber?: number;
  totalQuestions?: number;
  questionText?: string;
  options?: any;
  explanation?: string;
}

interface AiExamTutorProps {
  isOpen: boolean;
  onClose: () => void;
  context?: QuestionContext;
  initialAction?: 'explain_concept' | 'hint' | 'speed_tip' | string;
}

export default function AiExamTutor({ isOpen, onClose, context, initialAction }: AiExamTutorProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initialTriggeredRef = useRef(false);

  // Initialize professional initial message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const qNumStr = context?.questionNumber ? `Question ${context.questionNumber}` : 'your active question';
      const subjStr = context?.subject ? `${context.subject}` : 'CBT Exam';
      
      const initialAiMsg: Message = {
        id: 'welcome',
        sender: 'ai',
        text: `**Welcome to Preplyx AI Tutor (AgentRouter Engine).**\n\nI am available to assist you with **${qNumStr}** in **${subjStr}**. Select a quick tool below for instant concept explanations, step-by-step breakdowns, hints, or strategy guidelines:`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages([initialAiMsg]);
    }

    if (isOpen && initialAction && !initialTriggeredRef.current) {
      initialTriggeredRef.current = true;
      if (initialAction === 'explain_concept') {
        setTimeout(() => {
          handleSend('Explain the underlying concept of this question in detail without answering or revealing the correct option');
        }, 300);
      }
    }
  }, [isOpen, context, initialAction, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  if (!isOpen) return null;

  const handleSend = async (customText?: string) => {
    const textToSend = (customText || input).trim();
    if (!textToSend || isTyping) return;

    playButtonClickSound();

    const userMsg: Message = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!customText) setInput('');
    setIsTyping(true);

    try {
      const res = await api.askAiTutor(textToSend, context).catch(() => null);
      const aiReplyText = res?.response || generateProfessionalAiResponse(textToSend, context);
      
      const aiMsg: Message = {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: aiReplyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch {
      const fallbackText = generateProfessionalAiResponse(textToSend, context);
      const aiMsg: Message = {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: fallbackText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '24px',
      width: isMinimized ? '320px' : '410px',
      height: isMinimized ? '54px' : '560px',
      maxHeight: 'calc(100vh - 80px)',
      zIndex: 2500,
      pointerEvents: 'none',
      transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      <div style={{
        width: '100%', height: '100%',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 16px 40px rgba(15, 23, 42, 0.22), 0 0 0 1px rgba(123, 47, 247, 0.15)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        pointerEvents: 'auto'
      }}>
        {/* Header Bar */}
        <div style={{
          padding: '12px 16px',
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
          color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          userSelect: 'none'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '10px',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Sparkles size={16} color="#a78bfa" />
            </div>
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '6px', letterSpacing: '-0.01em' }}>
                Preplyx AI Tutor
                <span style={{ fontSize: '9px', backgroundColor: 'rgba(167, 139, 250, 0.25)', color: '#c4b5fd', padding: '1px 5px', borderRadius: '4px', fontWeight: 700, textTransform: 'uppercase' }}>
                  ACTIVE
                </span>
              </h3>
              <p style={{ fontSize: '11px', color: '#cbd5e1', margin: 0, fontWeight: 500 }}>
                {context?.subject || 'CBT'} • Question {context?.questionNumber || 1}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              style={{
                background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
                width: '28px', height: '28px', borderRadius: '7px',
                color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.2s ease'
              }}
              title={isMinimized ? 'Expand Assistant' : 'Minimize Assistant'}
            >
              {isMinimized ? <Maximize2 size={13} /> : <Minimize2 size={13} />}
            </button>

            <button
              onClick={() => { playButtonClickSound(); onClose(); }}
              style={{
                background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
                width: '28px', height: '28px', borderRadius: '7px',
                color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.2s ease'
              }}
              title="Close Assistant"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>

        {/* Active Question Preview Strip */}
        {context?.questionText && (
          <div style={{
            padding: '10px 16px', backgroundColor: '#f8fafc',
            borderBottom: '1px solid #e2e8f0', fontSize: '12px', color: '#334155'
          }}>
            <div style={{ fontWeight: 700, color: '#4c1d95', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              <FileText size={12} color="#6d28d9" /> Question Context
            </div>
            <div style={{
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              fontWeight: 500, color: '#475569', fontSize: '12px'
            }}>
              "{context.questionText}"
            </div>
          </div>
        )}

        {/* Message Stream */}
        <div style={{
          flex: 1, padding: '16px', overflowY: 'auto',
          display: 'flex', flexDirection: 'column', gap: '14px',
          backgroundColor: '#f8fafc'
        }}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: 'flex', gap: '8px',
                alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '92%'
              }}
            >
              {msg.sender === 'ai' && (
                <div style={{
                  width: '26px', height: '26px', borderRadius: '8px',
                  backgroundColor: '#4c1d95', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  marginTop: '2px'
                }}>
                  <Bot size={14} />
                </div>
              )}

              <div style={{
                padding: '12px 14px', borderRadius: '12px',
                backgroundColor: msg.sender === 'user' ? '#4c1d95' : '#ffffff',
                color: msg.sender === 'user' ? '#ffffff' : '#0f172a',
                fontSize: '13px', lineHeight: '1.55', position: 'relative',
                boxShadow: msg.sender === 'user' ? '0 2px 8px rgba(76, 29, 149, 0.2)' : '0 1px 3px rgba(0,0,0,0.05)',
                border: msg.sender === 'user' ? 'none' : '1px solid #e2e8f0',
                borderTopRightRadius: msg.sender === 'user' ? '2px' : '12px',
                borderTopLeftRadius: msg.sender === 'ai' ? '2px' : '12px'
              }}>
                <div style={{ whiteSpace: 'pre-wrap' }}>
                  {formatMarkdownText(msg.text)}
                </div>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  marginTop: '8px', fontSize: '10px', color: msg.sender === 'user' ? 'rgba(255,255,255,0.7)' : '#64748b'
                }}>
                  <span>{msg.timestamp}</span>
                  {msg.sender === 'ai' && (
                    <button
                      onClick={() => handleCopy(msg.id, msg.text)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'inherit', display: 'flex', alignItems: 'center', gap: '3px'
                      }}
                    >
                      {copiedId === msg.id ? <Check size={11} /> : <Copy size={11} />}
                      {copiedId === msg.id ? 'Copied' : 'Copy'}
                    </button>
                  )}
                </div>
              </div>

              {msg.sender === 'user' && (
                <div style={{
                  width: '26px', height: '26px', borderRadius: '8px',
                  backgroundColor: '#334155', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  marginTop: '2px'
                }}>
                  <User size={14} />
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div style={{ display: 'flex', gap: '8px', alignSelf: 'flex-start' }}>
              <div style={{
                width: '26px', height: '26px', borderRadius: '8px',
                backgroundColor: '#4c1d95', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Bot size={14} />
              </div>
              <div style={{
                padding: '10px 14px', borderRadius: '12px', borderTopLeftRadius: '2px',
                backgroundColor: '#ffffff', border: '1px solid #e2e8f0', color: '#64748b', fontSize: '12px',
                display: 'flex', alignItems: 'center', gap: '6px'
              }}>
                <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
                <span>Generating analytical response...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Action Buttons */}
        <div style={{
          padding: '10px 14px', backgroundColor: '#ffffff',
          borderTop: '1px solid #e2e8f0', display: 'flex', gap: '6px', overflowX: 'auto',
          scrollbarWidth: 'none'
        }}>
          <button
            onClick={() => handleSend('Explain the underlying concept of this question in detail without answering or revealing the correct option')}
            style={{
              padding: '6px 10px', borderRadius: '8px', border: '1px solid #c4b5fd',
              backgroundColor: '#f3e8ff', color: '#6b21a8', fontSize: '11px', fontWeight: 700,
              cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '5px'
            }}
          >
            <Sparkles size={13} color="#7B2FF7" /> Explain Concept (No Answer)
          </button>

          <button
            onClick={() => handleSend('Explain this question step-by-step')}
            style={{
              padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1',
              backgroundColor: '#f8fafc', color: '#1e293b', fontSize: '11px', fontWeight: 600,
              cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '5px'
            }}
          >
            <Lightbulb size={13} color="#d97706" /> Step-by-Step Solution
          </button>

          <button
            onClick={() => handleSend('Give me a hint without revealing the answer')}
            style={{
              padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1',
              backgroundColor: '#f8fafc', color: '#1e293b', fontSize: '11px', fontWeight: 600,
              cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '5px'
            }}
          >
            <HelpCircle size={13} color="#4c1d95" /> Hint
          </button>

          <button
            onClick={() => handleSend('What is the best CBT strategy for this question?')}
            style={{
              padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1',
              backgroundColor: '#f8fafc', color: '#1e293b', fontSize: '11px', fontWeight: 600,
              cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '5px'
            }}
          >
            <Zap size={13} color="#059669" /> CBT Speed Tip
          </button>
        </div>

        {/* Input Form */}
        <div style={{ padding: '12px 14px', backgroundColor: '#ffffff', borderTop: '1px solid #e2e8f0' }}>
          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            style={{ display: 'flex', gap: '8px' }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask AI tutor about this question..."
              style={{
                flex: 1, padding: '10px 14px', borderRadius: '10px',
                border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none',
                backgroundColor: '#f8fafc', color: '#0f172a'
              }}
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              style={{
                padding: '10px 14px', borderRadius: '10px',
                backgroundColor: input.trim() && !isTyping ? '#4c1d95' : '#cbd5e1',
                color: '#ffffff', border: 'none', fontWeight: 700,
                cursor: input.trim() && !isTyping ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              <Send size={15} />
            </button>
          </form>
        </div>
        </>
        )}
      </div>
    </div>
  );
}

function formatMarkdownText(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index} style={{ fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function generateProfessionalAiResponse(userQuery: string, context?: QuestionContext): string {
  const query = userQuery.toLowerCase();
  const qText = context?.questionText || 'the active question';
  const subj = context?.subject || 'this subject';
  const exam = context?.exam || 'JAMB';
  const exp = context?.explanation;

  if (query.includes('without answering') || query.includes('without revealing') || query.includes('concept') || query.includes('no answer') || query.includes('in detail')) {
    return `**In-Depth Concept Explanation for ${subj} (No Answer Revealed):**\n\n` +
      `### 1. Theoretical Background & Core Principles\n` +
      `This problem evaluates essential principles in **${subj}**. Here is the theoretical framework:\n` +
      `${exp ? exp : `Focus on the foundational definitions, formulas, and laws governing this question.`}\n\n` +
      `### 2. Key Terminology & Constraints\n` +
      `- **Main Context**: Analyze the key terms and parameters given in "${qText}".\n` +
      `- **${exam} Examination Standards**: Pay strict attention to variable relationships, units of measurement, and standard definitions.\n\n` +
      `### 3. How to Solve This Problem Step-by-Step\n` +
      `1. Identify all given values and parameters in the question text.\n` +
      `2. Write down the fundamental formula or definition applicable to this subject.\n` +
      `3. Systematically eliminate options that contradict basic principles or produce incorrect units.\n\n` +
      `🔒 *Note: The specific correct answer (A, B, C, or D) is intentionally not revealed so you can test your understanding!*`;
  }

  if (query.includes('explain') || query.includes('solution') || query.includes('step-by-step')) {
    return `**Step-by-Step Breakdown for ${context?.questionNumber ? `Question ${context.questionNumber}` : 'Question'} (${subj}):**\n\n1. **Core Concept**: This problem evaluates fundamental principles of **${subj}**.\n\n2. **Analysis**: "${qText}"\n\n3. **Methodology**: ${exp ? exp : 'Eliminate distractor options that violate basic definitions or mathematical formulas.'}\n\n**Key Takeaway**: Pay strict attention to units, qualifiers, and exact terminology required in ${exam} examinations.`;
  }

  if (query.includes('hint')) {
    return `**AI Guidance for Question ${context?.questionNumber || 1}:**\n\nExamine the key variables and terminology in "${qText}". Focus on eliminating options that contradict core ${subj} rules. Look for common relationships between the presented terms before making your final selection.`;
  }

  if (query.includes('strategy') || query.includes('cbt speed') || query.includes('speed')) {
    return `**CBT Exam Strategy for ${exam}:**\n\n- **Time Allocation**: Limit time to 45–60 seconds per question.\n- **Process of Elimination**: Instantly rule out two incorrect distractor options.\n- **Flagging System**: If uncertain, make an educated selection, flag the question, and review it if time permits. Never leave questions unanswered.`;
  }

  return `**Analytical Review for ${subj}:**\n\nRegarding "${userQuery}":\n\nFor ${exam} testing standards, prioritize accuracy and rapid reasoning.${exp ? `\n\n**Official Explanation Note:**\n${exp}` : '\n\nEnsure you review standard formulas and definitions relevant to this topic.'}`;
}
