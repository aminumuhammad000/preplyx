/**
 * Offline Download Manager Component
 * Lets users pre-download exam question sets for offline use
 */

import { useState, useEffect } from 'react';
import { Download, Wifi, WifiOff, Trash2, CheckCircle, RefreshCw, CloudOff } from 'lucide-react';
import { listQuestionSets, deleteQuestionSet } from '@/lib/offlineDB';
import type { OfflineQuestionSet } from '@/lib/offlineDB';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

const DOWNLOADABLE = [
  { exam: 'JAMB', subject: 'Mathematics',      years: ['2023','2022','2021','2020','2019'] },
  { exam: 'JAMB', subject: 'English Language', years: ['2023','2022','2021','2020','2019'] },
  { exam: 'JAMB', subject: 'Physics',          years: ['2023','2022','2021','2020','2019'] },
  { exam: 'JAMB', subject: 'Chemistry',        years: ['2023','2022','2021','2020','2019'] },
  { exam: 'JAMB', subject: 'Biology',          years: ['2023','2022','2021','2020','2019'] },
  { exam: 'WAEC', subject: 'Mathematics',      years: ['2023','2022','2021'] },
  { exam: 'WAEC', subject: 'English Language', years: ['2023','2022','2021'] },
  { exam: 'NECO', subject: 'Mathematics',      years: ['2023','2022'] },
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
  const { token } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [saved, setSaved] = useState<Record<string, OfflineQuestionSet>>({});
  const [downloading, setDownloading] = useState<Record<string, boolean>>({});
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Track online/offline
  useEffect(() => {
    const onOnline  = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, []);

  // Load saved sets from IndexedDB
  const refreshSaved = async () => {
    const sets = await listQuestionSets();
    const map: Record<string, OfflineQuestionSet> = {};
    sets.forEach(s => { map[s.setId] = s; });
    setSaved(map);
  };

  useEffect(() => { refreshSaved(); }, []);

  const handleDownload = async (exam: string, subject: string, year: string) => {
    const id = setId(exam, subject, year);
    setDownloading(d => ({ ...d, [id]: true }));
    setErrors(e => ({ ...e, [id]: '' }));

    try {
      const questions = await api.getQuestions({ exam, subject, year, limit: 50 }, token || undefined);
      if (!questions || questions.length === 0) throw new Error('No questions returned');

      const { saveQuestionSet } = await import('@/lib/offlineDB');
      await saveQuestionSet({
        setId: id,
        exam,
        subject,
        year,
        downloadedAt: Date.now(),
        questions: questions.map((q: any) => ({
          id:            q.id || q._id || String(Math.random()),
          text:          q.text || q.question || '',
          options:       Array.isArray(q.options) ? q.options : Object.values(q.options || {}),
          correctAnswer: q.correctAnswer || q.correct_answer || '',
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
    } finally {
      setDeleting(d => ({ ...d, [id]: false }));
    }
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
            Download exam sets to practise without internet.
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
            <div style={{ fontSize: 12, color: 'var(--color-text-sub)', fontWeight: 500 }}>
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
          borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13,
          color: '#ef4444', fontWeight: 500
        }}>
          <CloudOff size={15} />
          You are offline. Downloading is unavailable. Saved sets below can still be used.
        </div>
      )}

      {/* Grid of downloadable sets */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
        {DOWNLOADABLE.map(({ exam, subject, years }) =>
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
                      {exam} · {year}
                    </div>
                  </div>
                  {isSaved && <CheckCircle size={16} color="#10b981" />}
                </div>

                {/* Meta */}
                {isSaved && savedSet && (
                  <div style={{ fontSize: 11, color: '#10b981', fontWeight: 500 }}>
                    {savedSet.questions.length} questions · Downloaded {timeAgo(savedSet.downloadedAt)}
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
                        onClick={() => handleDownload(exam, subject, year)}
                        disabled={isDownloading || !isOnline}
                        style={{
                          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                          padding: '7px', borderRadius: 8, border: '1px solid var(--glass-border)',
                          background: 'transparent', cursor: isOnline ? 'pointer' : 'not-allowed',
                          fontSize: 12, fontWeight: 600, color: 'var(--color-text-main)', opacity: isOnline ? 1 : 0.5
                        }}
                      >
                        {isDownloading ? <RefreshCw size={12} className="um-spin" /> : <RefreshCw size={12} />}
                        Refresh
                      </button>
                      <button
                        onClick={() => handleDelete(exam, subject, year)}
                        disabled={isDeletingNow}
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
                      disabled={isDownloading || !isOnline}
                      style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        padding: '8px', borderRadius: 8, border: 'none',
                        background: isOnline ? 'linear-gradient(135deg,#7B2FF7,#4B0FA3)' : 'var(--glass-border)',
                        color: isOnline ? '#fff' : 'var(--color-text-sub)',
                        cursor: isOnline ? 'pointer' : 'not-allowed',
                        fontSize: 13, fontWeight: 600, opacity: isDownloading ? 0.7 : 1
                      }}
                    >
                      {isDownloading
                        ? <><RefreshCw size={13} className="um-spin" /> Downloading…</>
                        : <><Download size={13} /> Download</>
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
