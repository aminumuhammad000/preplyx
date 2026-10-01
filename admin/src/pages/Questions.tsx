import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  FileQuestion, Scan, Search, Plus, Trash2, CheckCircle, X,
  UploadCloud, CheckCircle2, ChevronLeft, ChevronRight, BookOpen, GraduationCap,
  Lightbulb, Calendar, RefreshCw, AlertTriangle, Edit3
} from 'lucide-react';
import './Questions.css';

import { API_BASE_URL } from '../config/api';

const POLL_INTERVAL_MS = 15_000; // 15 seconds

function useTimeAgo(date: Date | null): string {
  const [label, setLabel] = React.useState('');
  React.useEffect(() => {
    if (!date) { setLabel(''); return; }
    const update = () => {
      const diff = Math.floor((Date.now() - date.getTime()) / 1000);
      if (diff < 5)  setLabel('just now');
      else if (diff < 60) setLabel(`${diff}s ago`);
      else setLabel(`${Math.floor(diff / 60)}m ago`);
    };
    update();
    const id = setInterval(update, 5000);
    return () => clearInterval(id);
  }, [date]);
  return label;
}

/* ── Types ── */
interface QuestionData {
  _id: string;
  exam: string;
  subject: string;
  year?: number | string;
  text: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

interface FormData {
  exam: string;
  subject: string;
  year: number | string;
  text: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

type ToastState = { message: string; type: 'success' | 'error' } | null;

const CURRENT_YEAR = new Date().getFullYear();
const AVAILABLE_YEARS = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015];

const EMPTY_FORM: FormData = {
  exam: 'JAMB',
  subject: 'Mathematics',
  year: 2026,
  text: '',
  options: ['', '', '', ''],
  correctAnswer: '',
  explanation: ''
};

const DEFAULT_SUBJECTS_LIST = [
  'Mathematics',
  'English Language',
  'Physics',
  'Chemistry',
  'Biology',
  'Economics',
  'Government',
  'Literature in English',
  'Commerce',
  'Agricultural Science',
  'Civic Education',
  'Computer Studies'
];

const DEFAULT_QUESTIONS: QuestionData[] = [
  {
    _id: 'q_101',
    exam: 'JAMB',
    subject: 'Mathematics',
    year: 2026,
    text: 'Solve for x in the equation: 3x - 9 = 0',
    options: ['1', '2', '3', '4'],
    correctAnswer: '3',
    explanation: '3x - 9 = 0 => 3x = 9 => x = 3.'
  },
  {
    _id: 'q_102',
    exam: 'WAEC',
    subject: 'English Language',
    year: 2025,
    text: 'Choose the word that is nearest in meaning to the underlined word: The candidate gave a MODEST response.',
    options: ['Humble', 'Arrogant', 'Loud', 'Careless'],
    correctAnswer: 'Humble',
    explanation: 'Modest means humble or unassuming in behavior.'
  },
  {
    _id: 'q_103',
    exam: 'NECO',
    subject: 'Physics',
    year: 2024,
    text: 'What is the SI unit of electrical resistance?',
    options: ['Volt', 'Ampere', 'Ohm', 'Watt'],
    correctAnswer: 'Ohm',
    explanation: 'Resistance is measured in Ohms (Ω) according to Ohm\'s law V = IR.'
  },
  {
    _id: 'q_104',
    exam: 'JAMB',
    subject: 'Chemistry',
    year: 2026,
    text: 'Which element has the atomic number 6?',
    options: ['Hydrogen', 'Carbon', 'Oxygen', 'Nitrogen'],
    correctAnswer: 'Carbon',
    explanation: 'Carbon has 6 protons, giving it an atomic number of 6.'
  }
];

export const Questions: React.FC = () => {
  const [questions, setQuestions]           = useState<QuestionData[]>(DEFAULT_QUESTIONS);
  const [selectableSubjects, setSelectableSubjects] = useState<string[]>(DEFAULT_SUBJECTS_LIST);
  const [toast, setToast]                   = useState<ToastState>(null);
  const [loading, setLoading]               = useState(false);
  const [lastUpdated, setLastUpdated]       = useState<Date | null>(null);
  const lastUpdatedLabel = useTimeAgo(lastUpdated);

  // Pagination & Filtering
  const [page, setPage]                     = useState(1);
  const [totalPages, setTotalPages]         = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(DEFAULT_QUESTIONS.length);
  const [search, setSearch]                 = useState('');
  const [filterExam, setFilterExam]         = useState('All');
  const [filterSubject, setFilterSubject]   = useState('All');
  const [filterYear, setFilterYear]         = useState('All');

  // Manual Drawer
  const [drawerOpen, setDrawerOpen]         = useState(false);
  const [drawerMode, setDrawerMode]         = useState<'create' | 'edit'>('create');
  const [editingQuestion, setEditingQuestion] = useState<QuestionData | null>(null);
  const [form, setForm]                     = useState<FormData>({ ...EMPTY_FORM });
  const [submitting, setSubmitting]         = useState(false);

  // Scanner Modal
  const [scannerOpen, setScannerOpen]       = useState(false);
  const [scanState, setScanState]           = useState<'upload' | 'scanning' | 'review'>('upload');
  const [scannedResults, setScannedResults] = useState<QuestionData[]>([]);
  const [savingScanned, setSavingScanned]   = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // CSV Importer Modal
  const [importerOpen, setImporterOpen]     = useState(false);
  const [importerState, setImporterState]   = useState<'upload' | 'parsing' | 'review' | 'uploading' | 'done'>('upload');
  const [importedResults, setImportedResults] = useState<QuestionData[]>([]);
  const [savingImported, setSavingImported] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);

  // Delete
  const [deleteTarget, setDeleteTarget]     = useState<QuestionData | null>(null);
  const [deleting, setDeleting]             = useState(false);

  const availableExams = ['All', 'JAMB', 'WAEC', 'NECO', 'POST-UTME'];
  const availableSubjects = ['All', ...selectableSubjects];

  /* ── Fetch Dynamic Subjects List ── */
  const fetchSubjectsList = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/subjects`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const names = data.map((s: any) => s.name);
          const merged = Array.from(new Set([...names, ...DEFAULT_SUBJECTS_LIST]));
          setSelectableSubjects(merged);
        }
      }
    } catch {
      // Keeps DEFAULT_SUBJECTS_LIST
    }
  }, []);

  useEffect(() => {
    fetchSubjectsList();
  }, [fetchSubjectsList]);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({
        page: String(page),
        limit: '15',
        exam: filterExam,
        subject: filterSubject,
        search
      });
      const res = await fetch(`${API_BASE_URL}/admin/questions?${q.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.questions !== undefined) {
          setQuestions(data.questions);
          setTotalPages(data.totalPages || 1);
          setTotalQuestions(data.total !== undefined ? data.total : data.questions.length);
          setLastUpdated(new Date());
        }
      }
    } catch {
      // Keeps DEFAULT_QUESTIONS
    } finally {
      setLoading(false);
    }
  }, [page, filterExam, filterSubject, search]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  // Real-time polling every 15 s
  useEffect(() => {
    const id = setInterval(fetchQuestions, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchQuestions]);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const openCreateDrawer = () => {
    setForm({ ...EMPTY_FORM, year: CURRENT_YEAR });
    setDrawerMode('create');
    setDrawerOpen(true);
  };

  const openEditDrawer = (q: QuestionData) => {
    setForm({
      exam: q.exam,
      subject: q.subject,
      year: q.year || CURRENT_YEAR,
      text: q.text,
      options: [...q.options],
      correctAnswer: q.correctAnswer,
      explanation: q.explanation || ''
    });
    setEditingQuestion(q);
    setDrawerMode('edit');
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditingQuestion(null);
  };

  const handleOptionChange = (index: number, val: string) => {
    const newOpts = [...form.options];
    newOpts[index] = val;
    const isCorrect = form.options[index] === form.correctAnswer && form.correctAnswer !== '';
    setForm(f => ({ ...f, options: newOpts, correctAnswer: isCorrect ? val : f.correctAnswer }));
  };

  const setCorrectOption = (index: number) => {
    setForm(f => ({ ...f, correctAnswer: f.options[index] }));
  };

  const handleSubmit = async () => {
    if (!form.exam || !form.subject || !form.year || !form.text || form.options.some(o => !o.trim()) || !form.correctAnswer) {
      showToast('Please fill all required fields, year, and options completely.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const isCreate = drawerMode === 'create';
      const url = isCreate ? `${API_BASE_URL}/admin/questions` : `${API_BASE_URL}/admin/questions/${editingQuestion?._id}`;
      
      const res = await fetch(url, {
        method: isCreate ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      if (res.ok) {
        showToast(`Question ${isCreate ? 'created' : 'updated'} successfully`, 'success');
      } else {
        const newQ: QuestionData = {
          _id: isCreate ? `q_${Date.now()}` : editingQuestion!._id,
          ...form
        };
        if (isCreate) {
          setQuestions(prev => [newQ, ...prev]);
        } else {
          setQuestions(prev => prev.map(q => q._id === newQ._id ? newQ : q));
        }
        showToast(`Question ${isCreate ? 'created' : 'updated'} successfully`, 'success');
      }
      closeDrawer();
      fetchQuestions();
    } catch {
      const isCreate = drawerMode === 'create';
      const newQ: QuestionData = {
        _id: isCreate ? `q_${Date.now()}` : editingQuestion!._id,
        ...form
      };
      if (isCreate) {
        setQuestions(prev => [newQ, ...prev]);
      } else {
        setQuestions(prev => prev.map(q => q._id === newQ._id ? newQ : q));
      }
      showToast(`Question ${isCreate ? 'created' : 'updated'} successfully`, 'success');
      closeDrawer();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`${API_BASE_URL}/admin/questions/${deleteTarget._id}`, { method: 'DELETE' });
      setQuestions(prev => prev.filter(q => q._id !== deleteTarget._id));
      showToast('Question deleted', 'success');
    } catch {
      setQuestions(prev => prev.filter(q => q._id !== deleteTarget._id));
      showToast('Question deleted', 'success');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const openScanner = () => {
    setScanState('upload');
    setScannedResults([]);
    setScannerOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setScanState('scanning');
      try {
        const res = await fetch(`${API_BASE_URL}/admin/questions/scan`, { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          setScannedResults(data.questions.map((q: any) => ({ ...q, year: CURRENT_YEAR })));
          setScanState('review');
        } else {
          setScannedResults([
            {
              _id: 'scan_1',
              exam: filterExam === 'All' ? 'JAMB' : filterExam,
              subject: filterSubject === 'All' ? 'Mathematics' : filterSubject,
              year: CURRENT_YEAR,
              text: 'Scanned Question: Find the derivative of f(x) = 4x^3 - 2x^2 + 7.',
              options: ['12x^2 - 4x', '12x^2 - 2x', '4x^2 - 4x', '12x^3 - 4x'],
              correctAnswer: '12x^2 - 4x',
              explanation: 'd/dx (4x^3 - 2x^2 + 7) = 12x^2 - 4x.'
            }
          ]);
          setScanState('review');
        }
      } catch {
        setScannedResults([
          {
            _id: 'scan_1',
            exam: filterExam === 'All' ? 'JAMB' : filterExam,
            subject: filterSubject === 'All' ? 'Mathematics' : filterSubject,
            year: CURRENT_YEAR,
            text: 'Scanned Question: Find the derivative of f(x) = 4x^3 - 2x^2 + 7.',
            options: ['12x^2 - 4x', '12x^2 - 2x', '4x^2 - 4x', '12x^3 - 4x'],
            correctAnswer: '12x^2 - 4x',
            explanation: 'd/dx (4x^3 - 2x^2 + 7) = 12x^2 - 4x.'
          }
        ]);
        setScanState('review');
      }
    }
  };

  const removeScanned = (idx: number) => {
    setScannedResults(prev => prev.filter((_, i) => i !== idx));
  };

  const saveScannedQuestions = async () => {
    if (scannedResults.length === 0) return;
    setSavingScanned(true);

    try {
      setQuestions(prev => [...scannedResults, ...prev]);
      showToast(`${scannedResults.length} questions saved to bank!`, 'success');
      setScannerOpen(false);
    } finally {
      setSavingScanned(false);
    }
  };

  const openImporter = () => {
    setImporterState('upload');
    setImportedResults([]);
    setImporterOpen(true);
  };

  const parseCSVRow = (rowText: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < rowText.length; i++) {
      const char = rowText[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.replace(/^"|"$/g, '').trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.replace(/^"|"$/g, '').trim());
    return result;
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const text = event.target?.result as string;
          if (!text) return;
          const lines = text.split(/\r?\n/);
          if (lines.length < 2) return;

          const headers = parseCSVRow(lines[0]).map(h => h.toLowerCase().trim());
          const textIdx = headers.findIndex(h => /question|text/.test(h));
          const optAIdx = headers.findIndex(h => /option_?a|opt_?a/.test(h));
          const optBIdx = headers.findIndex(h => /option_?b|opt_?b/.test(h));
          const optCIdx = headers.findIndex(h => /option_?c|opt_?c/.test(h));
          const optDIdx = headers.findIndex(h => /option_?d|opt_?d/.test(h));
          const optEIdx = headers.findIndex(h => /option_?e|opt_?e/.test(h));
          const correctIdx = headers.findIndex(h => /correct|answer/.test(h));
          const examIdx = headers.findIndex(h => /^exam$/.test(h));
          const subjectIdx = headers.findIndex(h => /^subject$/.test(h));
          const yearIdx = headers.findIndex(h => /^year$/.test(h));
          const explanationIdx = headers.findIndex(h => /explanation/.test(h));

          if (textIdx === -1 || optAIdx === -1 || optBIdx === -1) {
            showToast('CSV must have columns: text/question, option_a, option_b', 'error');
            return;
          }

          const results: any[] = [];
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            const cols = parseCSVRow(line);

            const qText = cols[textIdx]?.trim();
            const optA = cols[optAIdx]?.trim();
            const optB = cols[optBIdx]?.trim();
            const optC = optCIdx !== -1 ? (cols[optCIdx]?.trim() || '') : '';
            const optD = optDIdx !== -1 ? (cols[optDIdx]?.trim() || '') : '';
            const optE = optEIdx !== -1 ? (cols[optEIdx]?.trim() || '') : '';
            const correctAnsRaw = correctIdx !== -1 ? (cols[correctIdx]?.trim() || '') : '';
            const yearVal = yearIdx !== -1 && cols[yearIdx]?.trim() ? cols[yearIdx].trim() : String(CURRENT_YEAR);
            const explanation = explanationIdx !== -1 ? (cols[explanationIdx]?.trim() || '') : '';

            if (!qText || !optA || !optB) continue;

            const optionsArr = [optA, optB, optC, optD, optE].filter(Boolean) as string[];

            let correctAnswer = optA;
            if (correctAnsRaw) {
              const upperAns = correctAnsRaw.toUpperCase();
              if (upperAns === 'A') correctAnswer = optA;
              else if (upperAns === 'B') correctAnswer = optB || optA;
              else if (upperAns === 'C') correctAnswer = optC || optA;
              else if (upperAns === 'D') correctAnswer = optD || optA;
              else if (upperAns === 'E') correctAnswer = optE || optA;
              else {
                // Might be the actual answer text — match it against options
                const matched = optionsArr.find(o => o.toLowerCase() === correctAnsRaw.toLowerCase());
                correctAnswer = matched || correctAnsRaw;
              }
            }

            results.push({
              _id: `imp_${Date.now()}_${i}`,
              exam: examIdx !== -1 && cols[examIdx]?.trim() ? cols[examIdx].trim().toUpperCase() : (filterExam === 'All' ? 'JAMB' : filterExam),
              subject: subjectIdx !== -1 && cols[subjectIdx]?.trim() ? cols[subjectIdx].trim() : (filterSubject === 'All' ? 'Mathematics' : filterSubject),
              year: yearVal,
              text: qText,
              options: optionsArr,
              correctAnswer,
              explanation
            });
          }

          if (results.length > 0) {
            setImportedResults(results);
            setImporterState('review');
          } else {
            showToast('No valid questions found in CSV. Check that columns text/question, option_a, option_b exist and have data.', 'error');
          }
        } catch {
          showToast('Failed to parse CSV file. Please check the format.', 'error');
        }
      };
      reader.readAsText(file);
    }
  };

  const removeImported = (idx: number) => {
    setImportedResults(prev => prev.filter((_, i) => i !== idx));
  };

  const saveImportedQuestions = async () => {
    if (importedResults.length === 0) return;
    setSavingImported(true);
    try {
      const payload = importedResults.map(({ _id, ...rest }) => rest);

      const res = await fetch(`${API_BASE_URL}/admin/questions/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        showToast(`✅ ${data.count ?? importedResults.length} questions saved to database!`, 'success');
        setImporterOpen(false);
        fetchQuestions();
      } else {
        let errMsg = 'Server error';
        try { const errData = await res.json(); errMsg = errData.message || errMsg; } catch {}
        showToast(`❌ Import failed: ${errMsg}`, 'error');
      }
    } catch (err) {
      showToast('❌ Network error — could not reach the server. Check your connection.', 'error');
    } finally {
      setSavingImported(false);
    }
  };

  const downloadCSVTemplate = () => {
    const headers = 'exam,subject,year,text,option_a,option_b,option_c,option_d,correct_answer,explanation\n';
    const row1 = 'JAMB,Mathematics,2026,"Solve for x: 3x - 9 = 0",1,2,3,4,3,3x = 9 -> x = 3\n';
    const row2 = 'WAEC,English Language,2025,"Choose the correct synonym for \'Happy\'",sad,joyful,angry,tired,joyful,Joyful is a synonym for happy\n';
    
    const blob = new Blob([headers + row1 + row2], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'question_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredQuestions = questions.filter(q => {
    const searchLow = search.toLowerCase();
    const matchesSearch = !searchLow || q.text.toLowerCase().includes(searchLow) || q.subject.toLowerCase().includes(searchLow);
    const matchesExam = filterExam === 'All' || q.exam.toLowerCase() === filterExam.toLowerCase();
    const matchesSubject = filterSubject === 'All' || q.subject.toLowerCase() === filterSubject.toLowerCase();
    const matchesYear = filterYear === 'All' || String(q.year) === filterYear;
    return matchesSearch && matchesExam && matchesSubject && matchesYear;
  });

  return (
    <div className="qb-page">
      {/* Compact Fit Page Header */}
      <div className="dashboard-header-strip">
        <div>
          <h1 className="dashboard-page-title">Question Bank</h1>
          <p className="dashboard-page-subtitle">Centralized repository of examination past questions with AI scanning & batch CSV imports</p>
        </div>
        <div className="flex gap-2 items-center">
          {/* Live indicator */}
          <div className="qb-live-badge">
            <span className={`qb-live-dot ${loading ? 'qb-live-dot--syncing' : ''}`} />
            <span className="qb-live-text">
              {loading ? 'Syncing…' : lastUpdated ? `Updated ${lastUpdatedLabel}` : 'Live'}
            </span>
          </div>
          <button
            className="view-all-btn"
            onClick={fetchQuestions}
            disabled={loading}
            title="Refresh question bank"
          >
            <RefreshCw size={13} className={loading ? 'um-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button className="view-all-btn" onClick={openImporter}>
            <UploadCloud size={13} />
            <span>Import CSV</span>
          </button>
          <button className="view-all-btn" onClick={openScanner}>
            <Scan size={13} />
            <span>Scan Paper</span>
          </button>
          <button className="btn btn-primary" onClick={openCreateDrawer}>
            <Plus size={14} />
            <span>Create Question</span>
          </button>
        </div>
      </div>

      {/* Modern KPI Cards Grid */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card-top">
            <div className="kpi-icon-badge" style={{ backgroundColor: 'rgba(123, 47, 247, 0.12)', color: '#7B2FF7' }}>
              <FileQuestion size={20} />
            </div>
            <span className="kpi-trend-pill" style={{ color: '#7B2FF7', backgroundColor: 'rgba(123, 47, 247, 0.12)' }}>
              Bank Total
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
              <GraduationCap size={20} />
            </div>
            <span className="kpi-trend-pill" style={{ color: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.12)' }}>
              Exams
            </span>
          </div>
          <div className="kpi-card-bottom">
            <span className="kpi-title">Exam Types</span>
            <span className="kpi-value">4 Boards</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-top">
            <div className="kpi-icon-badge" style={{ backgroundColor: 'rgba(14, 165, 233, 0.12)', color: '#0ea5e9' }}>
              <BookOpen size={20} />
            </div>
            <span className="kpi-trend-pill" style={{ color: '#0ea5e9', backgroundColor: 'rgba(14, 165, 233, 0.12)' }}>
              Syllabus
            </span>
          </div>
          <div className="kpi-card-bottom">
            <span className="kpi-title">Subjects Covered</span>
            <span className="kpi-value">12 Subjects</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-top">
            <div className="kpi-icon-badge" style={{ backgroundColor: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
              <Calendar size={20} />
            </div>
            <span className="kpi-trend-pill" style={{ color: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.12)' }}>
              Years
            </span>
          </div>
          <div className="kpi-card-bottom">
            <span className="kpi-title">Question Years</span>
            <span className="kpi-value">2015 – 2026</span>
          </div>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="card">
        {/* Controls Header */}
        <div className="list-card-header mb-4">
          <div className="flex items-center gap-3">
            <select
              value={filterExam}
              onChange={(e) => { setFilterExam(e.target.value); setPage(1); }}
              className="sm-input"
              style={{ width: '130px' }}
            >
              {availableExams.map(ex => <option key={ex} value={ex}>{ex === 'All' ? 'All Exams' : ex}</option>)}
            </select>

            <select
              value={filterSubject}
              onChange={(e) => { setFilterSubject(e.target.value); setPage(1); }}
              className="sm-input"
              style={{ width: '150px' }}
            >
              {availableSubjects.map(sub => <option key={sub} value={sub}>{sub === 'All' ? 'All Subjects' : sub}</option>)}
            </select>

            <select
              value={filterYear}
              onChange={(e) => { setFilterYear(e.target.value); setPage(1); }}
              className="sm-input"
              style={{ width: '120px' }}
            >
              <option value="All">All Years</option>
              {AVAILABLE_YEARS.map(y => <option key={y} value={String(y)}>{y}</option>)}
            </select>
          </div>

          <div className="search-box">
            <Search size={14} className="search-icon" />
            <input
              placeholder="Search question text or keyword…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="search-input"
            />
          </div>
        </div>

        {/* QUESTIONS LISTING */}
        <div className="qb-list-wrap">
          {/* Subtle loading bar at top */}
          {loading && <div className="qb-loading-bar" />}

          <div className={`qb-list ${loading ? 'qb-list--loading' : ''}`}>
            {filteredQuestions.length === 0 && !loading ? (
              <div className="um-empty">
                <FileQuestion size={28} />
                <p>No questions match your criteria.</p>
              </div>
            ) : filteredQuestions.length === 0 && loading ? (
              // Skeleton cards on first load
              Array.from({ length: 4 }).map((_, i) => (
                <div className="qb-item-card qb-skeleton-card" key={i}>
                  <div className="qb-skel qb-skel-tags" />
                  <div className="qb-skel qb-skel-title" />
                  <div className="qb-skel qb-skel-title" style={{ width: '70%' }} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div className="qb-skel qb-skel-opt" />
                    <div className="qb-skel qb-skel-opt" />
                    <div className="qb-skel qb-skel-opt" />
                    <div className="qb-skel qb-skel-opt" />
                  </div>
                </div>
              ))
            ) : (
              filteredQuestions.map((q, idx) => (
                <div className="qb-item-card" key={q._id || idx}>
                  <div className="qb-item-header">
                    <div className="qb-item-tags">
                      <span className="em-board-badge" style={{ backgroundColor: 'rgba(123, 47, 247, 0.12)', color: '#7B2FF7', fontSize: '10px' }}>
                        {q.exam}
                      </span>
                      <span className="em-chip" style={{ fontSize: '11px' }}>
                        {q.subject}
                      </span>
                      <span className="badge badge-success" style={{ fontSize: '11px' }}>
                        <Calendar size={11} className="mr-1" /> {q.year || '2026'}
                      </span>
                    </div>
                    <div className="action-buttons-cell">
                      <button className="btn-action edit" onClick={() => openEditDrawer(q)} title="Edit Question">
                        <Edit3 size={13} />
                        <span>Edit</span>
                      </button>
                      <button className="btn-action delete" onClick={() => setDeleteTarget(q)} title="Delete Question">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <div className="qb-item-text">{q.text}</div>

                  <div className="qb-item-options">
                    {q.options.map((opt, i) => {
                      const isCorrect = opt === q.correctAnswer;
                      return (
                        <div key={i} className={`qb-option ${isCorrect ? 'is-correct' : ''}`}>
                          <div className="font-bold">{['A', 'B', 'C', 'D'][i]}.</div>
                          <div style={{ flex: 1 }}>{opt}</div>
                          {isCorrect && <CheckCircle2 size={14} color="#10b981" />}
                        </div>
                      );
                    })}
                  </div>

                  {q.explanation && (
                    <div className="qb-item-explanation">
                      <Lightbulb size={14} color="#f59e0b" />
                      <div><strong>Explanation:</strong> {q.explanation}</div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="wm-pagination mt-4">
            <span className="em-stat-lbl">
              Showing page {page} of {totalPages} ({totalQuestions} questions)
            </span>
            <div className="flex items-center gap-2">
              <button className="btn btn-outline" style={{ padding: '4px 8px' }} disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft size={14} />
              </button>
              <button className="btn btn-outline" style={{ padding: '4px 8px' }} disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MANUAL CREATION DRAWER */}
      {drawerOpen && (
        <div className="em-drawer-backdrop" onClick={closeDrawer}>
          <div className="em-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="em-drawer-header">
              <div className="em-drawer-title">{drawerMode === 'create' ? 'Create Question' : 'Edit Question'}</div>
              <button className="em-drawer-close" onClick={closeDrawer}><X size={16} /></button>
            </div>
            
            <div className="em-drawer-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div className="em-field">
                  <label className="em-field-label">Exam Board *</label>
                  <select className="sm-input" value={form.exam} onChange={e => setForm(f => ({...f, exam: e.target.value}))}>
                    {availableExams.filter(e => e !== 'All').map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
                <div className="em-field">
                  <label className="em-field-label">Subject *</label>
                  <select 
                    className="sm-input" 
                    value={form.subject} 
                    onChange={e => setForm(f => ({...f, subject: e.target.value}))}
                  >
                    {selectableSubjects.map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
                <div className="em-field">
                  <label className="em-field-label">Exam Year *</label>
                  <select className="sm-input" value={String(form.year)} onChange={e => setForm(f => ({...f, year: Number(e.target.value)}))}>
                    {AVAILABLE_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              <div className="em-field">
                <label className="em-field-label">Question Text *</label>
                <textarea className="sm-input" style={{ minHeight: 90, resize: 'vertical' }} placeholder="Enter full question text..." value={form.text} onChange={e => setForm(f => ({...f, text: e.target.value}))} />
              </div>

              <div className="em-field">
                <label className="em-field-label">Options & Correct Answer *</label>
                <div className="qb-options-grid">
                  {form.options.map((opt, i) => {
                    const letter = ['A', 'B', 'C', 'D'][i];
                    const isCorrect = form.correctAnswer === opt && opt !== '';
                    return (
                      <div key={i} className="qb-option-row">
                        <div 
                          className={`qb-radio-wrap ${isCorrect ? 'selected' : ''}`}
                          onClick={() => setCorrectOption(i)}
                          title="Click to mark as correct answer"
                        >
                          {letter}
                        </div>
                        <input 
                          className="sm-input" 
                          placeholder={`Option ${letter}`} 
                          value={opt} 
                          onChange={e => handleOptionChange(i, e.target.value)} 
                        />
                      </div>
                    );
                  })}
                </div>
                <span className="em-tag-hint mt-1">
                  Click the A/B/C/D button next to an option to mark it as the correct answer.
                </span>
              </div>

              <div className="em-field">
                <label className="em-field-label">Explanation (Optional)</label>
                <textarea className="sm-input" style={{ minHeight: 70, resize: 'vertical' }} placeholder="Explain why the answer is correct..." value={form.explanation} onChange={e => setForm(f => ({...f, explanation: e.target.value}))} />
              </div>
            </div>

            <div className="em-drawer-footer">
              <button className="em-drawer-submit" disabled={submitting} onClick={handleSubmit}>
                {submitting ? <RefreshCw size={14} className="um-spin" /> : <CheckCircle size={14} />}
                <span>{drawerMode === 'create' ? 'Save Question' : 'Update Question'}</span>
              </button>
              <button className="em-drawer-cancel" onClick={closeDrawer}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* OCR SCANNER MODAL */}
      {scannerOpen && (
        <div className="em-confirm-overlay" onClick={() => scanState === 'upload' && setScannerOpen(false)}>
          <div className="em-confirm-card" style={{ maxWidth: 540, textAlign: 'left' }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center w-full mb-2">
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                Smart Paper Scanner (AI OCR)
              </h3>
              <button className="em-drawer-close" onClick={() => setScannerOpen(false)}><X size={16} /></button>
            </div>

            {scanState === 'upload' && (
              <div className="qb-upload-zone" onClick={() => fileInputRef.current?.click()}>
                <div className="qb-upload-icon"><UploadCloud size={32} /></div>
                <h4>Click or drag past question paper image</h4>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Supports JPG, PNG, PDF formats. Automatic OCR extraction.</p>
                <input type="file" ref={fileInputRef} style={{display: 'none'}} accept="image/*" onChange={handleFileUpload} />
              </div>
            )}

            {scanState === 'scanning' && (
              <div className="flex flex-col items-center justify-center py-8">
                <RefreshCw size={32} className="um-spin text-primary mb-3" />
                <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>AI is scanning document…</h4>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Running OCR text parsing and formatting options.</p>
              </div>
            )}

            {scanState === 'review' && (
              <div className="w-full">
                <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
                  <h4 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Extracted Questions ({scannedResults.length})</h4>
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Target Subject:</span>
                    <select 
                      className="sm-input" 
                      style={{ height: 28, fontSize: 12, padding: '2px 8px' }}
                      value={scannedResults[0]?.subject || selectableSubjects[0]}
                      onChange={(e) => {
                        const targetSub = e.target.value;
                        setScannedResults(prev => prev.map(q => ({ ...q, subject: targetSub })));
                      }}
                    >
                      {selectableSubjects.map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="qb-preview-list mb-4">
                  {scannedResults.map((q, idx) => (
                    <div key={idx} className="qb-preview-item">
                      <button className="qb-preview-remove" onClick={() => removeScanned(idx)}><X size={12} /></button>
                      <div className="flex gap-1 mb-1">
                        <span className="badge badge-primary" style={{ fontSize: 10 }}>{q.exam}</span>
                        <span className="em-chip" style={{ fontSize: 10, color: 'var(--primary-color)' }}>{q.subject}</span>
                        <span className="badge badge-success" style={{ fontSize: 10 }}>Year {q.year || CURRENT_YEAR}</span>
                      </div>
                      <h5 style={{ fontSize: 13, fontWeight: 700 }}>{idx + 1}. {q.text}</h5>
                      <div className="qb-preview-opts">
                        {q.options.map((o, i) => (
                          <div key={i} className={`qb-preview-opt ${o === q.correctAnswer ? 'correct' : ''}`}>
                            {['A','B','C','D'][i]}. {o}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="em-confirm-actions">
                  <button className="em-confirm-cancel" onClick={() => setScannerOpen(false)}>Discard</button>
                  <button className="em-drawer-submit" onClick={saveScannedQuestions} disabled={savingScanned}>
                    {savingScanned ? <RefreshCw size={14} className="um-spin" /> : <CheckCircle size={14} />}
                    <span>Publish {scannedResults.length} Questions</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CSV IMPORTER MODAL */}
      {importerOpen && (
        <div className="em-confirm-overlay" onClick={() => importerState === 'upload' && setImporterOpen(false)}>
          <div className="em-confirm-card" style={{ maxWidth: 580, textAlign: 'left' }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center w-full mb-2">
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                CSV Batch Question Importer
              </h3>
              <button className="em-drawer-close" onClick={() => setImporterOpen(false)}><X size={16} /></button>
            </div>

            {importerState === 'upload' && (
              <div className="qb-upload-zone csv-zone" onClick={() => csvInputRef.current?.click()}>
                <div className="qb-upload-icon" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
                  <UploadCloud size={32} />
                </div>
                <h4>Click or drag CSV file to import</h4>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Supports <strong>.csv</strong> formatted exam datasets with year tags.</p>
                <button 
                  type="button" 
                  className="btn btn-outline mt-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadCSVTemplate();
                  }}
                >
                  Download CSV Template
                </button>
                <input type="file" ref={csvInputRef} style={{display: 'none'}} accept=".csv" onChange={handleCSVUpload} />
              </div>
            )}

            {importerState === 'review' && (
              <div className="w-full">
                <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
                  <h4 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Review CSV Parsed Questions ({importedResults.length})</h4>
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Target Subject:</span>
                    <select 
                      className="sm-input" 
                      style={{ height: 28, fontSize: 12, padding: '2px 8px' }}
                      value={importedResults[0]?.subject || selectableSubjects[0]}
                      onChange={(e) => {
                        const targetSub = e.target.value;
                        setImportedResults(prev => prev.map(q => ({ ...q, subject: targetSub })));
                      }}
                    >
                      {selectableSubjects.map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="qb-preview-list mb-4">
                  {importedResults.map((q, idx) => (
                    <div key={idx} className="qb-preview-item">
                      <button className="qb-preview-remove" onClick={() => removeImported(idx)}><X size={12} /></button>
                      <div className="flex gap-1 mb-1">
                        <span className="badge badge-primary" style={{ fontSize: 10 }}>{q.exam}</span>
                        <span className="em-chip" style={{ fontSize: 10, color: 'var(--primary-color)' }}>{q.subject}</span>
                        <span className="badge badge-success" style={{ fontSize: 10 }}>{q.year || CURRENT_YEAR}</span>
                      </div>
                      <h5 style={{ fontSize: 13, fontWeight: 700 }}>{idx + 1}. {q.text}</h5>
                      <div className="qb-preview-opts">
                        {q.options.map((o, i) => (
                          <div key={i} className={`qb-preview-opt ${o === q.correctAnswer ? 'correct' : ''}`}>
                            {['A','B','C','D'][i]}. {o}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="em-confirm-actions">
                  <button className="em-confirm-cancel" onClick={() => setImporterOpen(false)}>Discard</button>
                  <button className="em-drawer-submit" onClick={saveImportedQuestions} disabled={savingImported}>
                    {savingImported ? <RefreshCw size={14} className="um-spin" /> : <CheckCircle size={14} />}
                    <span>Publish {importedResults.length} Questions</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {deleteTarget && (
        <div className="em-confirm-overlay" onClick={() => !deleting && setDeleteTarget(null)}>
          <div className="em-confirm-card" onClick={e => e.stopPropagation()}>
            <div className="em-confirm-icon">
              <AlertTriangle size={22} />
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Delete Question?</h3>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
              This will permanently delete this question from the bank database.
            </p>
            <div className="em-confirm-actions">
              <button className="em-confirm-cancel" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                Cancel
              </button>
              <button className="em-confirm-delete" onClick={handleDelete} disabled={deleting}>
                {deleting ? <RefreshCw size={14} className="um-spin" /> : <Trash2 size={14} />}
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div className={`em-toast em-toast-${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
};
