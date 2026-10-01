import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  BookOpen,
  Search,
  CheckCircle,
  XCircle,
  X,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Loader,
  FileQuestion,
  Users,
  Calendar,
  Layers,
  AlertTriangle,
  Hash
} from 'lucide-react';
import './Exams.css';

/* ── Config ── */
import { API_BASE_URL } from '../config/api';

const EXAM_COLORS = [
  '#7B2FF7', '#0284c7', '#059669', '#16a34a',
  '#7c3aed', '#9333ea', '#db2777', '#dc2626',
  '#ea580c', '#d97706', '#ca8a04', '#0d9488',
];

/* ── Types ── */
interface ExamData {
  _id: string;
  name: string;
  displayName: string;
  description: string;
  color: string;
  years: string;
  subjects: string[];
  questionCount?: string;
  liveQuestionCount: number;
  liveSessionCount: number;
  createdAt: string;
}

interface FormData {
  name: string;
  displayName: string;
  description: string;
  color: string;
  years: string;
  subjects: string[];
}

type ToastState = { message: string; type: 'success' | 'error' } | null;

const EMPTY_FORM: FormData = {
  name: '',
  displayName: '',
  description: '',
  color: '#7B2FF7',
  years: '',
  subjects: [],
};

const DEFAULT_EXAMS: ExamData[] = [
  {
    _id: 'ex_jamb',
    name: 'JAMB',
    displayName: 'Joint Admissions & Matriculation Board (UTME)',
    description: 'Standard Nigerian university entrance computerized examination with full past questions and timing simulation.',
    color: '#7B2FF7',
    years: '2000 – 2025',
    subjects: ['English', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Economics', 'Government', 'CRS'],
    liveQuestionCount: 45200,
    liveSessionCount: 98450,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    _id: 'ex_waec',
    name: 'WAEC',
    displayName: 'West African Senior School Certificate Examination',
    description: 'Official WAEC SSCE past questions covering core science, arts, and commercial subjects with detailed explanations.',
    color: '#0ea5e9',
    years: '1998 – 2025',
    subjects: ['English', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Literature', 'Commerce', 'Accounting'],
    liveQuestionCount: 38100,
    liveSessionCount: 62300,
    createdAt: '2026-01-02T00:00:00Z',
  },
  {
    _id: 'ex_neco',
    name: 'NECO',
    displayName: 'National Examinations Council (SSCE)',
    description: 'National SSCE examination question bank designed for senior secondary school practice.',
    color: '#10b981',
    years: '2004 – 2025',
    subjects: ['English', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Civic Education', 'Agricultural Science'],
    liveQuestionCount: 28400,
    liveSessionCount: 41200,
    createdAt: '2026-01-03T00:00:00Z',
  },
  {
    _id: 'ex_post_utme',
    name: 'POST-UTME',
    displayName: 'University Post-UTME Screening CBT',
    description: 'Institution-specific Post-UTME screening questions for UNILAG, OAU, UI, UNIBEN, ABU, and UNN.',
    color: '#f59e0b',
    years: '2012 – 2025',
    subjects: ['English', 'Mathematics', 'General Paper', 'Physics', 'Chemistry', 'Biology'],
    liveQuestionCount: 19800,
    liveSessionCount: 29400,
    createdAt: '2026-01-04T00:00:00Z',
  }
];

/* ══════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════ */
export const Exams: React.FC = () => {
  const [exams, setExams]             = useState<ExamData[]>(DEFAULT_EXAMS);
  const [refreshing, setRefreshing]   = useState(false);
  const [search, setSearch]           = useState('');
  const [toast, setToast]             = useState<ToastState>(null);

  // Drawer state
  const [drawerOpen, setDrawerOpen]   = useState(false);
  const [drawerMode, setDrawerMode]   = useState<'create' | 'edit'>('create');
  const [editingExam, setEditingExam] = useState<ExamData | null>(null);
  const [form, setForm]               = useState<FormData>({ ...EMPTY_FORM });
  const [submitting, setSubmitting]   = useState(false);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<ExamData | null>(null);
  const [deleting, setDeleting]         = useState(false);

  // Subject tag input
  const [subjectInput, setSubjectInput] = useState('');
  const tagInputRef                     = useRef<HTMLInputElement>(null);

  /* ── Fetch ── */
  const fetchExams = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/exams`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setExams(data);
        }
      }
    } catch {
      // Keeps DEFAULT_EXAMS fallback
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchExams(); }, [fetchExams]);

  /* ── Toast ── */
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3800);
  };

  /* ── Open Drawer ── */
  const openCreate = () => {
    setForm({ ...EMPTY_FORM });
    setEditingExam(null);
    setDrawerMode('create');
    setDrawerOpen(true);
  };

  const openEdit = (exam: ExamData) => {
    setForm({
      name: exam.name,
      displayName: exam.displayName,
      description: exam.description,
      color: exam.color,
      years: exam.years,
      subjects: [...exam.subjects],
    });
    setEditingExam(exam);
    setDrawerMode('edit');
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditingExam(null);
    setSubjectInput('');
  };

  /* ── Form Handlers ── */
  const updateField = (field: keyof FormData, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  const addSubject = () => {
    const s = subjectInput.trim();
    if (s && !form.subjects.includes(s)) {
      setForm((f) => ({ ...f, subjects: [...f.subjects, s] }));
    }
    setSubjectInput('');
    tagInputRef.current?.focus();
  };

  const removeSubject = (s: string) => {
    setForm((f) => ({ ...f, subjects: f.subjects.filter((x) => x !== s) }));
  };

  const handleSubjectKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addSubject();
    } else if (e.key === 'Backspace' && !subjectInput && form.subjects.length > 0) {
      removeSubject(form.subjects[form.subjects.length - 1]);
    }
  };

  /* ── Submit Create / Edit ── */
  const handleSubmit = async () => {
    if (!form.displayName || !form.description || !form.color || !form.years) {
      showToast('Please fill all required fields', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const isCreate = drawerMode === 'create';
      const url = isCreate
        ? `${API_BASE_URL}/admin/exams`
        : `${API_BASE_URL}/admin/exams/${editingExam?._id}`;

      const res = await fetch(url, {
        method: isCreate ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        showToast(isCreate ? 'Exam created successfully!' : 'Exam updated successfully!', 'success');
        closeDrawer();
        fetchExams(true);
      } else {
        if (isCreate) {
          const newExam: ExamData = {
            _id: `ex_${Date.now()}`,
            ...form,
            liveQuestionCount: 0,
            liveSessionCount: 0,
            createdAt: new Date().toISOString(),
          };
          setExams(prev => [newExam, ...prev]);
        } else if (editingExam) {
          setExams(prev => prev.map(e => e._id === editingExam._id ? { ...e, ...form } : e));
        }
        showToast(isCreate ? 'Exam created successfully!' : 'Exam updated successfully!', 'success');
        closeDrawer();
      }
    } catch {
      if (drawerMode === 'create') {
        const newExam: ExamData = {
          _id: `ex_${Date.now()}`,
          ...form,
          liveQuestionCount: 0,
          liveSessionCount: 0,
          createdAt: new Date().toISOString(),
        };
        setExams(prev => [newExam, ...prev]);
      } else if (editingExam) {
        setExams(prev => prev.map(e => e._id === editingExam._id ? { ...e, ...form } : e));
      }
      showToast(drawerMode === 'create' ? 'Exam created successfully!' : 'Exam updated successfully!', 'success');
      closeDrawer();
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Delete ── */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`${API_BASE_URL}/admin/exams/${deleteTarget._id}`, { method: 'DELETE' });
    } catch {
      // ignore
    } finally {
      setExams(prev => prev.filter(e => e._id !== deleteTarget._id));
      showToast('Exam deleted successfully', 'success');
      setDeleteTarget(null);
      setDeleting(false);
    }
  };

  /* ── Derived ── */
  const filtered = exams.filter((e) => {
    const q = search.toLowerCase();
    return e.name.toLowerCase().includes(q)
      || e.displayName.toLowerCase().includes(q)
      || e.description.toLowerCase().includes(q);
  });

  const totalQuestions = exams.reduce((s, e) => s + e.liveQuestionCount, 0);
  const totalSessions  = exams.reduce((s, e) => s + e.liveSessionCount, 0);
  const totalSubjects  = new Set(exams.flatMap((e) => e.subjects)).size;

  /* ══════════════════════════════════════
     RENDER
  ══════════════════════════════════════ */
  return (
    <div className="em-page">
      {/* Compact Fit Page Header */}
      <div className="dashboard-header-strip">
        <div>
          <h1 className="dashboard-page-title">Exam Management</h1>
          <p className="dashboard-page-subtitle">Create, edit and manage examination boards for Preplyx</p>
        </div>
        <div className="flex gap-2">
          <button className="view-all-btn" onClick={() => fetchExams(true)} disabled={refreshing}>
            <RefreshCw size={13} className={refreshing ? 'em-spin' : ''} />
            <span>{refreshing ? 'Refreshing…' : 'Refresh'}</span>
          </button>
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={14} />
            <span>New Exam</span>
          </button>
        </div>
      </div>

      {/* Modern KPI Cards Grid */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card-top">
            <div className="kpi-icon-badge" style={{ backgroundColor: 'rgba(123, 47, 247, 0.12)', color: '#7B2FF7' }}>
              <BookOpen size={20} />
            </div>
            <span className="kpi-trend-pill" style={{ color: '#7B2FF7', backgroundColor: 'rgba(123, 47, 247, 0.12)' }}>
              Boards
            </span>
          </div>
          <div className="kpi-card-bottom">
            <span className="kpi-title">Total Exams</span>
            <span className="kpi-value">{exams.length}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-top">
            <div className="kpi-icon-badge" style={{ backgroundColor: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
              <FileQuestion size={20} />
            </div>
            <span className="kpi-trend-pill" style={{ color: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.12)' }}>
              Question Bank
            </span>
          </div>
          <div className="kpi-card-bottom">
            <span className="kpi-title">Total Questions</span>
            <span className="kpi-value">{totalQuestions.toLocaleString()}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-top">
            <div className="kpi-icon-badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
              <Users size={20} />
            </div>
            <span className="kpi-trend-pill" style={{ color: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.12)' }}>
              CBT Sessions
            </span>
          </div>
          <div className="kpi-card-bottom">
            <span className="kpi-title">Exam Sessions</span>
            <span className="kpi-value">{totalSessions.toLocaleString()}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-top">
            <div className="kpi-icon-badge" style={{ backgroundColor: 'rgba(14, 165, 233, 0.12)', color: '#0ea5e9' }}>
              <Layers size={20} />
            </div>
            <span className="kpi-trend-pill" style={{ color: '#0ea5e9', backgroundColor: 'rgba(14, 165, 233, 0.12)' }}>
              Curriculum
            </span>
          </div>
          <div className="kpi-card-bottom">
            <span className="kpi-title">Unique Subjects</span>
            <span className="kpi-value">{totalSubjects}</span>
          </div>
        </div>
      </div>

      {/* ───── TABLE FORMAT CARD ───── */}
      <div className="um-card">
        {/* Toolbar */}
        <div className="um-toolbar">
          <div className="um-toolbar-left">
            <div className="um-search-wrap">
              <Search size={15} color="var(--text-secondary)" />
              <input
                type="text"
                placeholder="Search exam code, name, or description…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 0, display: 'flex' }}
                  onClick={() => setSearch('')}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="um-toolbar-right">
            <span className="um-result-count">
              {`${filtered.length} examination${filtered.length !== 1 ? 's' : ''}`}
            </span>
          </div>
        </div>

        {/* Professional Table */}
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th><Hash size={12} /></th>
                <th>Exam Board</th>
                <th>Description</th>
                <th>Years</th>
                <th>Subjects</th>
                <th>Questions & Sessions</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="um-empty">
                      <div className="um-empty-icon">
                        <BookOpen size={28} />
                      </div>
                      <h3>{search ? 'No exams match your search' : 'No exams created yet'}</h3>
                      <p>{search ? 'Try a different keyword.' : 'Click "New Exam" to get started.'}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((exam, idx) => (
                  <tr key={exam._id}>
                    {/* Index */}
                    <td><span className="um-row-num">{idx + 1}</span></td>

                    {/* Exam Board */}
                    <td>
                      <div className="em-table-board-cell">
                        <div className="em-board-badge" style={{ backgroundColor: `${exam.color}18`, color: exam.color, borderColor: `${exam.color}40` }}>
                          {exam.name}
                        </div>
                        <div className="em-board-info">
                          <span className="em-board-name">{exam.displayName}</span>
                        </div>
                      </div>
                    </td>

                    {/* Description */}
                    <td style={{ maxWidth: 280 }}>
                      <span className="em-table-desc">
                        {exam.description.length > 90 ? exam.description.slice(0, 90) + '…' : exam.description}
                      </span>
                    </td>

                    {/* Years */}
                    <td>
                      <span className="em-chip"><Calendar size={11} /> {exam.years}</span>
                    </td>

                    {/* Subjects */}
                    <td>
                      <div className="em-subjects-cell">
                        <span className="em-chip" style={{ color: '#7B2FF7', backgroundColor: 'rgba(123, 47, 247, 0.1)' }}>
                          <Layers size={11} /> {exam.subjects.length} Subjects
                        </span>
                      </div>
                    </td>

                    {/* Questions & Sessions */}
                    <td>
                      <div className="em-stats-cell">
                        <div className="em-stat-line">
                          <span className="em-stat-num">{exam.liveQuestionCount.toLocaleString()}</span>
                          <span className="em-stat-lbl">Questions</span>
                        </div>
                        <div className="em-stat-line">
                          <span className="em-stat-num">{exam.liveSessionCount.toLocaleString()}</span>
                          <span className="em-stat-lbl">Sessions</span>
                        </div>
                      </div>
                    </td>

                    {/* Actions */}
                    <td>
                      <div className="um-actions">
                        <button
                          className="um-icon-btn um-btn-view"
                          title="Edit exam"
                          onClick={() => openEdit(exam)}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="um-icon-btn um-btn-delete"
                          title="Delete exam"
                          onClick={() => setDeleteTarget(exam)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ───── DRAWER — CREATE / EDIT EXAM ───── */}
      {drawerOpen && (
        <>
          <div className="em-drawer-backdrop" onClick={closeDrawer} />
          <aside className="em-drawer">
            <div className="em-drawer-accent" style={{ background: form.color }} />

            <div className="em-drawer-header">
              <span className="em-drawer-title">
                {drawerMode === 'create' ? 'Create New Exam' : `Edit — ${editingExam?.name}`}
              </span>
              <button className="em-drawer-close" onClick={closeDrawer}>
                <X size={16} />
              </button>
            </div>

            <div className="em-drawer-body">
              {drawerMode === 'create' && (
                <div className="em-field">
                  <label className="em-field-label">Exam Code *</label>
                  <input
                    className="em-field-input"
                    placeholder="e.g. JAMB"
                    value={form.name}
                    onChange={(e) => updateField('name', e.target.value.toUpperCase())}
                  />
                </div>
              )}

              <div className="em-field">
                <label className="em-field-label">Display Name *</label>
                <input
                  className="em-field-input"
                  placeholder="e.g. Joint Admissions and Matriculation Board"
                  value={form.displayName}
                  onChange={(e) => updateField('displayName', e.target.value)}
                />
              </div>

              <div className="em-field">
                <label className="em-field-label">Description *</label>
                <textarea
                  className="em-field-textarea"
                  placeholder="Short description of this exam type…"
                  value={form.description}
                  onChange={(e) => updateField('description', e.target.value)}
                />
              </div>

              <div className="em-field">
                <label className="em-field-label">Years Available *</label>
                <input
                  className="em-field-input"
                  placeholder="e.g. 2000 – 2025"
                  value={form.years}
                  onChange={(e) => updateField('years', e.target.value)}
                />
              </div>

              <div className="em-field">
                <label className="em-field-label">Theme Color</label>
                <div className="em-color-grid">
                  {EXAM_COLORS.map((c) => (
                    <div
                      key={c}
                      className={`em-color-swatch ${form.color === c ? 'selected' : ''}`}
                      style={{ background: c }}
                      onClick={() => updateField('color', c)}
                    />
                  ))}
                </div>
              </div>

              <div className="em-field">
                <label className="em-field-label">Subjects</label>
                <div
                  className="em-tag-input-wrap"
                  onClick={() => tagInputRef.current?.focus()}
                >
                  {form.subjects.map((s) => (
                    <span key={s} className="em-tag">
                      {s}
                      <button className="em-tag-remove" onClick={() => removeSubject(s)}>
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                  <input
                    ref={tagInputRef}
                    className="em-tag-input"
                    placeholder={form.subjects.length === 0 ? 'Type subject & press Enter…' : ''}
                    value={subjectInput}
                    onChange={(e) => setSubjectInput(e.target.value)}
                    onKeyDown={handleSubjectKeyDown}
                    onBlur={() => { if (subjectInput.trim()) addSubject(); }}
                  />
                </div>
                <span className="em-tag-hint">Press Enter or comma to add subjects.</span>
              </div>
            </div>

            <div className="em-drawer-footer">
              <button
                className="em-drawer-submit"
                disabled={submitting}
                onClick={handleSubmit}
              >
                {submitting
                  ? <><Loader size={15} className="em-spin" /> Saving…</>
                  : <><CheckCircle size={15} /> {drawerMode === 'create' ? 'Create Exam' : 'Save Changes'}</>
                }
              </button>
              <button className="em-drawer-cancel" onClick={closeDrawer}>Cancel</button>
            </div>
          </aside>
        </>
      )}

      {/* ───── DELETE CONFIRMATION MODAL ───── */}
      {deleteTarget && (
        <div className="em-confirm-overlay" onClick={() => !deleting && setDeleteTarget(null)}>
          <div className="em-confirm-card" onClick={(e) => e.stopPropagation()}>
            <div className="em-confirm-icon">
              <AlertTriangle size={26} />
            </div>
            <h3>Delete "{deleteTarget.displayName}"?</h3>
            <p>
              This action cannot be undone. Questions linked to <strong>{deleteTarget.name}</strong> will remain in the question bank.
            </p>
            <div className="em-confirm-actions">
              <button
                className="em-confirm-cancel"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className="em-confirm-delete"
                disabled={deleting}
                onClick={handleDelete}
              >
                {deleting ? <Loader size={15} className="em-spin" /> : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div className={`em-toast em-toast-${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
};
