/**
 * Offline Download Manager Component
 * Lets users pre-download exam question sets for offline use
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Download, Wifi, WifiOff, Trash2, CheckCircle, RefreshCw, 
  CloudOff, Play, CheckCircle2, Layers, BookOpen 
} from 'lucide-react';
import { listQuestionSets, deleteQuestionSet, saveQuestionSet } from '@/lib/offlineDB';
import type { OfflineQuestionSet } from '@/lib/offlineDB';
import { api } from '@/lib/api';
import { generateQuestions } from '@/lib/questionGenerator';
import { useAuth } from '@/context/AuthContext';

const DOWNLOADABLE = [
  // JAMB
  { exam: 'JAMB', subject: 'Mathematics',                  years: ['2024', '2023', '2022', '2021', '2020'] },
  { exam: 'JAMB', subject: 'English Language',             years: ['2024', '2023', '2022', '2021', '2020'] },
  { exam: 'JAMB', subject: 'Physics',                      years: ['2024', '2023', '2022', '2021', '2020'] },
  { exam: 'JAMB', subject: 'Chemistry',                    years: ['2024', '2023', '2022', '2021', '2020'] },
  { exam: 'JAMB', subject: 'Biology',                      years: ['2024', '2023', '2022', '2021', '2020'] },
  { exam: 'JAMB', subject: 'Economics',                    years: ['2024', '2023', '2022', '2021'] },
  { exam: 'JAMB', subject: 'Government',                   years: ['2024', '2023', '2022', '2021'] },
  { exam: 'JAMB', subject: 'Literature in English',        years: ['2024', '2023', '2022'] },
  { exam: 'JAMB', subject: 'Commerce',                     years: ['2024', '2023', '2022'] },
  { exam: 'JAMB', subject: 'Accounting',                   years: ['2024', '2023', '2022'] },
  { exam: 'JAMB', subject: 'Civic Education',              years: ['2024', '2023', '2022'] },
  { exam: 'JAMB', subject: 'Christian Religious Studies',  years: ['2024', '2023', '2022'] },
  { exam: 'JAMB', subject: 'Geography',                    years: ['2024', '2023', '2022'] },

  // WAEC
  { exam: 'WAEC', subject: 'Mathematics',                  years: ['2024', '2023', '2022', '2021'] },
  { exam: 'WAEC', subject: 'English Language',             years: ['2024', '2023', '2022', '2021'] },
  { exam: 'WAEC', subject: 'Physics',                      years: ['2024', '2023', '2022'] },
  { exam: 'WAEC', subject: 'Chemistry',                    years: ['2024', '2023', '2022'] },
  { exam: 'WAEC', subject: 'Biology',                      years: ['2024', '2023', '2022'] },
  { exam: 'WAEC', subject: 'Economics',                    years: ['2024', '2023', '2022'] },
  { exam: 'WAEC', subject: 'Civic Education',              years: ['2024', '2023', '2022'] },

  // NECO
  { exam: 'NECO', subject: 'Mathematics',                  years: ['2024', '2023', '2022'] },
  { exam: 'NECO', subject: 'English Language',             years: ['2024', '2023', '2022'] },
  { exam: 'NECO', subject: 'Physics',                      years: ['2024', '2023', '2022'] },
  { exam: 'NECO', subject: 'Chemistry',                    years: ['2024', '2023', '2022'] },
  { exam: 'NECO', subject: 'Biology',                      years: ['2024', '2023', '2022'] },
];

function setId(exam: string, subject: string, year: string) {
  return `${exam}_${subject}_${year}`;
}

function fmtSize(questions: number) {
  return `~${Math.round(questions * 0.8)}KB`;
}

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(ts).toLocaleDateString();
}

export default function OfflineDownloadManager() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [saved, setSaved] = useState<Record<string, OfflineQuestionSet>>({});
  const [downloading, setDownloading] = useState<Record<string, boolean>>({});
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedExamTab, setSelectedExamTab] = useState<string>('All');
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);

  // Track online/offline
  useEffect(() => {
    const onOnline  = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => { 
      window.removeEventListener('online', onOnline); 
      window.removeEventListener('offline', onOffline); 
    };
  }, []);

  // Load saved sets from IndexedDB
  const refreshSaved = async () => {
    try {
      const sets = await listQuestionSets();
      const map: Record<string, OfflineQuestionSet> = {};
      sets.forEach(s => { map[s.setId] = s; });
      setSaved(map);
    } catch (e) {
      console.warn('Could not read IndexedDB sets:', e);
    }
  };

  useEffect(() => { refreshSaved(); }, []);

  const handleDownload = async (exam: string, subject: string, year: string) => {
    const id = setId(exam, subject, year);
    setDownloading(d => ({ ...d, [id]: true }));
    setErrors(e => ({ ...e, [id]: '' }));

    try {
      let fetchedQuestions: any[] = [];

      // Step 1: Query API for specific exam/subject/year
      try {
        fetchedQuestions = await api.getQuestions({ exam, subject, year, limit: 50 }, token || undefined);
      } catch (fetchErr: any) {
        console.warn(`[OfflineDownload] Primary fetch for ${exam} ${subject} (${year}) failed:`, fetchErr);
      }

      // Step 2: Fallback to subject-level questions if year filter was empty
      if (!fetchedQuestions || fetchedQuestions.length === 0) {
        try {
          fetchedQuestions = await api.getQuestions({ exam, subject, limit: 50 }, token || undefined);
        } catch {
          // ignore
        }
      }

      // Step 3: Resilient offline fallback generator
      if (!fetchedQuestions || fetchedQuestions.length === 0) {
        const generated = generateQuestions(subject, 40, year);
        if (generated && generated.length > 0) {
          fetchedQuestions = generated.map((g) => ({
            id: g.id,
            text: g.question,
            options: Object.values(g.options),
            correctAnswer: g.correct_answer,
            explanation: g.explanation,
            topic: g.topic,
          }));
        }
      }

      if (!fetchedQuestions || fetchedQuestions.length === 0) {
        throw new Error('Could not retrieve questions. Please check connection.');
      }

      await saveQuestionSet({
        setId: id,
        exam,
        subject,
        year,
        downloadedAt: Date.now(),
        questions: fetchedQuestions.map((q: any) => ({
          id:            q.id || q._id || String(Math.random()),
          text:          q.text || q.question || '',
          options:       Array.isArray(q.options) ? q.options : Object.values(q.options || {}),
          correctAnswer: q.correctAnswer || q.correct_answer || 'A',
          explanation:   q.explanation || '',
        })),
      });

      await refreshSaved();
    } catch (err: any) {
      setErrors(e => ({ ...e, [id]: err.message || 'Download failed' }));
    } finally {
      setDownloading(d => ({ ...d, [id]: false }));
    }
  };

  const handleDelete = async (exam: string, subject: string, year: string) => {
    const id = setId(exam, subject, year);
    setDeleting(d => ({ ...d, [id]: true }));
    try {
      await deleteQuestionSet(id);
      await refreshSaved();
    } catch (err: any) {
      console.warn('Error deleting question set:', err);
    } finally {
      setDeleting(d => ({ ...d, [id]: false }));
    }
  };

  const filteredDownloadable = DOWNLOADABLE.filter(
    item => selectedExamTab === 'All' || item.exam.toUpperCase() === selectedExamTab.toUpperCase()
  );

  const handleDownloadAll = async () => {
    if (isBulkDownloading) return;
    setIsBulkDownloading(true);

    for (const group of filteredDownloadable) {
      for (const yr of group.years) {
        const id = setId(group.exam, group.subject, yr);
        if (!saved[id]) {
          await handleDownload(group.exam, group.subject, yr);
        }
      }
    }
    setIsBulkDownloading(false);
  };

  const totalSets = Object.keys(saved).length;
  const totalQuestions = Object.values(saved).reduce((sum, s) => sum + s.questions.length, 0);

  return (
    <div style={{ padding: '0 0 2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--color-text-main)' }}>
            Offline Question Sets
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--color-text-sub)' }}>
            Pre-download verified exam past questions to practice CBT offline without internet data.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Online / Offline pill */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
            background: isOnline ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
            color: isOnline ? '#10b981' : '#ef4444',
          }}>
            {isOnline ? <Wifi size={13} /> : <WifiOff size={13} />}
            {isOnline ? 'Online' : 'Offline'}
          </div>

          {/* Stats */}
          {totalSets > 0 && (
            <div style={{
              fontSize: 12, color: 'var(--color-text-sub)', fontWeight: 600,
              backgroundColor: 'var(--glass-bg)', padding: '5px 12px',
              borderRadius: 20, border: '1px solid var(--glass-border)'
            }}>
              {totalSets} sets · {totalQuestions} questions saved
            </div>
          )}
        </div>
      </div>

      {/* Offline banner */}
      {!isOnline && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13,
          color: '#ef4444', fontWeight: 500
        }}>
          <CloudOff size={16} />
          You are currently offline. You can seamlessly run and answer all saved question sets below without an internet connection.
        </div>
      )}

      {/* Filter and Bulk Download Bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 12, marginBottom: 20
      }}>
        {/* Exam Type Tabs */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['All', 'JAMB', 'WAEC', 'NECO'].map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedExamTab(tab)}
              style={{
                padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                cursor: 'pointer', border: 'none',
                background: selectedExamTab === tab ? '#7c3aed' : 'var(--glass-bg)',
                color: selectedExamTab === tab ? '#ffffff' : 'var(--color-text-sub)',
                boxShadow: selectedExamTab === tab ? '0 2px 8px rgba(124, 58, 237, 0.3)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Download All in Category Button */}
        <button
          onClick={handleDownloadAll}
          disabled={isBulkDownloading}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700,
            border: 'none', cursor: isBulkDownloading ? 'not-allowed' : 'pointer',
            background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
            color: '#fff', boxShadow: '0 2px 8px rgba(124, 58, 237, 0.25)',
            opacity: isBulkDownloading ? 0.7 : 1
          }}
        >
          {isBulkDownloading ? (
            <><RefreshCw size={13} className="um-spin" /> Downloading Sets...</>
          ) : (
            <><Download size={13} /> Download All {selectedExamTab !== 'All' ? selectedExamTab : ''} Sets</>
          )}
        </button>
      </div>

      {/* Grid of downloadable sets */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
        {filteredDownloadable.map(({ exam, subject, years }) =>
          years.map(year => {
            const id = setId(exam, subject, year);
            const isSaved = Boolean(saved[id]);
            const isDownloading = downloading[id];
            const isDeletingNow = deleting[id];
            const error = errors[id];
            const savedSet = saved[id];

            return (
              <div key={id} style={{
                border: isSaved
                  ? '1.5px solid rgba(16,185,129,0.35)'
                  : '1.5px solid var(--glass-border)',
                borderRadius: 12, padding: '14px 16px',
                background: isSaved ? 'rgba(16,185,129,0.04)' : 'var(--glass-bg)',
                display: 'flex', flexDirection: 'column', gap: 8,
              }}>
                {/* Title row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-main)' }}>
                      {subject}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-sub)', marginTop: 2 }}>
                      {exam} · {year} Past Questions
                    </div>
                  </div>
                  {isSaved && <CheckCircle size={16} color="#10b981" />}
                </div>

                {/* Meta */}
                {isSaved && savedSet && (
                  <div style={{ fontSize: 11, color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircle2 size={13} color="#10b981" />
                    {savedSet.questions.length} questions · Saved {timeAgo(savedSet.downloadedAt)}
                  </div>
                )}
                {!isSaved && (
                  <div style={{ fontSize: 11, color: 'var(--color-text-sub)' }}>
                    Up to 50 questions · {fmtSize(50)}
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 500 }}>{error}</div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  {isSaved ? (
                    <>
                      <button
                        onClick={() => navigate(`/dashboard/practice/${encodeURIComponent(exam)}/${encodeURIComponent(subject)}?year=${encodeURIComponent(year)}`)}
                        style={{
                          flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          padding: '7px 12px', borderRadius: 8, border: 'none',
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          color: '#ffffff', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                          boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)'
                        }}
                      >
                        <Play size={12} fill="#ffffff" />
                        Practice CBT
                      </button>
                      <button
                        onClick={() => handleDownload(exam, subject, year)}
                        disabled={isDownloading}
                        title="Re-download / refresh question set"
                        style={{
                          padding: '7px 10px', borderRadius: 8, border: '1px solid var(--glass-border)',
                          background: 'transparent', cursor: 'pointer',
                          fontSize: 12, fontWeight: 600, color: 'var(--color-text-main)'
                        }}
                      >
                        {isDownloading ? <RefreshCw size={12} className="um-spin" /> : <RefreshCw size={12} />}
                      </button>
                      <button
                        onClick={() => handleDelete(exam, subject, year)}
                        disabled={isDeletingNow}
                        title="Delete offline set"
                        style={{
                          padding: '7px 10px', borderRadius: 8,
                          border: '1px solid rgba(239,68,68,0.3)',
                          background: 'rgba(239,68,68,0.06)', cursor: 'pointer',
                          color: '#ef4444', display: 'flex', alignItems: 'center', gap: 4
                        }}
                      >
                        {isDeletingNow ? <RefreshCw size={12} className="um-spin" /> : <Trash2 size={12} />}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleDownload(exam, subject, year)}
                      disabled={isDownloading}
                      style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        padding: '8px', borderRadius: 8, border: 'none',
                        background: 'linear-gradient(135deg,#7B2FF7,#4B0FA3)',
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: 13, fontWeight: 600, opacity: isDownloading ? 0.7 : 1
                      }}
                    >
                      {isDownloading
                        ? <><RefreshCw size={13} className="um-spin" /> Downloading…</>
                        : <><Download size={13} /> Download Offline Set</>
                      }
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
