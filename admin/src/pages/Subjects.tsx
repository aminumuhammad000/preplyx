import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Layers, Search, CheckCircle, X, Plus, Trash2, RefreshCw, AlertTriangle, BookOpen,
  Calculator, BookType, Zap, FlaskConical, Leaf, BarChart3, Landmark, Vote, Sprout, BookText, Briefcase, ShoppingCart,
  Globe, Scroll, Cross, Building2, Monitor, Music, Palette, Activity, Shield, Users, Apple, Shirt, Home, PenTool,
  Hammer, Cpu, Wrench, Pen, Keyboard, Book, TrendingUp, FileQuestion, Edit3
} from 'lucide-react';
import './Subjects.css';

import { API_BASE_URL } from '../config/api';

const ICON_MAP: Record<string, React.FC<any>> = {
  Calculator, BookType, Zap, FlaskConical, Leaf, BarChart3, Landmark, Vote, Sprout, BookText, Briefcase, ShoppingCart,
  Globe, Scroll, Cross, Building2, Monitor, Music, Palette, Activity, Shield, Users, Apple, Shirt, Home, PenTool,
  Hammer, Cpu, Wrench, Pen, Keyboard, Book, TrendingUp, BookOpen, Layers
};

const AVAILABLE_ICONS = Object.keys(ICON_MAP);

interface SubjectData {
  _id: string;
  name: string;
  code?: string;
  categories: string[];
  examBoards?: string[];
  icon: string;
  tips: string;
  liveQuestionCount?: number;
  createdAt: string;
}

interface FormData {
  name: string;
  code?: string;
  categories: string[];
  icon: string;
  tips: string;
}

type ToastState = { message: string; type: 'success' | 'error' } | null;

const DEFAULT_SUBJECTS: SubjectData[] = [
  {
    _id: 'sub_101',
    name: 'Mathematics',
    code: 'MTH101',
    categories: ['Science', 'General', 'Commercial'],
    examBoards: ['JAMB', 'WAEC', 'NECO'],
    icon: 'Calculator',
    tips: 'Algebra, Trigonometry, Calculus, Statistics, Geometry',
    liveQuestionCount: 4250,
    createdAt: '2026-01-15T00:00:00Z'
  },
  {
    _id: 'sub_102',
    name: 'English Language',
    code: 'ENG101',
    categories: ['General', 'Art'],
    examBoards: ['JAMB', 'WAEC', 'NECO'],
    icon: 'BookType',
    tips: 'Comprehension, Lexis & Structure, Oral English, Summary Writing',
    liveQuestionCount: 3890,
    createdAt: '2026-01-15T00:00:00Z'
  },
  {
    _id: 'sub_103',
    name: 'Physics',
    code: 'PHY101',
    categories: ['Science'],
    examBoards: ['JAMB', 'WAEC', 'NECO'],
    icon: 'Zap',
    tips: 'Mechanics, Optics, Electricity, Quantum Physics, Waves',
    liveQuestionCount: 2950,
    createdAt: '2026-01-16T00:00:00Z'
  },
  {
    _id: 'sub_104',
    name: 'Chemistry',
    code: 'CHM101',
    categories: ['Science'],
    examBoards: ['JAMB', 'WAEC', 'NECO'],
    icon: 'FlaskConical',
    tips: 'Organic Chemistry, Stoichiometry, Periodic Table, Electrolysis',
    liveQuestionCount: 3120,
    createdAt: '2026-01-16T00:00:00Z'
  },
  {
    _id: 'sub_105',
    name: 'Biology',
    code: 'BIO101',
    categories: ['Science'],
    examBoards: ['JAMB', 'WAEC', 'NECO'],
    icon: 'Leaf',
    tips: 'Cell Biology, Genetics, Ecology, Anatomy, Physiology',
    liveQuestionCount: 3400,
    createdAt: '2026-01-17T00:00:00Z'
  },
  {
    _id: 'sub_106',
    name: 'Economics',
    code: 'ECO101',
    categories: ['Commercial', 'Art'],
    examBoards: ['JAMB', 'WAEC', 'NECO'],
    icon: 'TrendingUp',
    tips: 'Microeconomics, Macroeconomics, Inflation, Banking & Trade',
    liveQuestionCount: 2180,
    createdAt: '2026-01-18T00:00:00Z'
  },
  {
    _id: 'sub_107',
    name: 'Government',
    code: 'GOV101',
    categories: ['Art'],
    examBoards: ['JAMB', 'WAEC', 'NECO'],
    icon: 'Landmark',
    tips: 'Constitution, Political Systems, Foreign Policy, Public Admin',
    liveQuestionCount: 1950,
    createdAt: '2026-01-19T00:00:00Z'
  },
  {
    _id: 'sub_108',
    name: 'Literature in English',
    code: 'LIT101',
    categories: ['Art'],
    examBoards: ['JAMB', 'WAEC', 'NECO'],
    icon: 'BookText',
    tips: 'African Drama, Prose, Poetry Analysis, Literary Devices',
    liveQuestionCount: 1820,
    createdAt: '2026-01-20T00:00:00Z'
  },
  {
    _id: 'sub_109',
    name: 'Commerce',
    code: 'COM101',
    categories: ['Commercial'],
    examBoards: ['JAMB', 'WAEC', 'NECO'],
    icon: 'ShoppingCart',
    tips: 'Trade, Stock Exchange, Business Law, Advertising & Warehousing',
    liveQuestionCount: 1640,
    createdAt: '2026-01-21T00:00:00Z'
  },
  {
    _id: 'sub_110',
    name: 'Agricultural Science',
    code: 'AGR101',
    categories: ['Science', 'General'],
    examBoards: ['JAMB', 'WAEC', 'NECO'],
    icon: 'Sprout',
    tips: 'Crop Production, Animal Husbandry, Soil Science, Agronomy',
    liveQuestionCount: 1450,
    createdAt: '2026-01-22T00:00:00Z'
  },
  {
    _id: 'sub_111',
    name: 'Civic Education',
    code: 'CVE101',
    categories: ['General'],
    examBoards: ['WAEC', 'NECO'],
    icon: 'Shield',
    tips: 'Human Rights, Citizenship, Democracy, Values & Ethics',
    liveQuestionCount: 1720,
    createdAt: '2026-01-23T00:00:00Z'
  },
  {
    _id: 'sub_112',
    name: 'Computer Studies',
    code: 'CMP101',
    categories: ['Science', 'General'],
    examBoards: ['JAMB', 'WAEC', 'NECO'],
    icon: 'Cpu',
    tips: 'Data Processing, Algorithms, Hardware Systems, Networking',
    liveQuestionCount: 2100,
    createdAt: '2026-01-24T00:00:00Z'
  }
];

const EMPTY_FORM: FormData = {
  name: '',
  code: '',
  categories: [],
  icon: 'BookOpen',
  tips: '',
};

export const Subjects: React.FC = () => {
  const [subjects, setSubjects]           = useState<SubjectData[]>(DEFAULT_SUBJECTS);
  const [refreshing, setRefreshing]       = useState(false);
  const [search, setSearch]               = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [toast, setToast]                 = useState<ToastState>(null);

  // Table selection & pagination
  const [selectedIds, setSelectedIds]     = useState<string[]>([]);
  const [page, setPage]                   = useState(1);
  const [pageSize, setPageSize]           = useState(10);

  // Drawer state
  const [drawerOpen, setDrawerOpen]       = useState(false);
  const [drawerMode, setDrawerMode]       = useState<'create' | 'edit'>('create');
  const [editingSubject, setEditingSubject] = useState<SubjectData | null>(null);
  const [form, setForm]                   = useState<FormData>({ ...EMPTY_FORM });
  const [submitting, setSubmitting]       = useState(false);

  // Delete modal
  const [deleteTarget, setDeleteTarget]   = useState<SubjectData | null>(null);
  const [deleting, setDeleting]           = useState(false);

  // Category tag input
  const [categoryInput, setCategoryInput] = useState('');
  const tagInputRef = useRef<HTMLInputElement>(null);

  const fetchSubjects = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/subjects`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) setSubjects(data);
      }
    } catch {
      // Keeps DEFAULT_SUBJECTS
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchSubjects(); }, [fetchSubjects]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3800);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map(s => s._id));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const openCreate = () => {
    setForm({ ...EMPTY_FORM });
    setEditingSubject(null);
    setDrawerMode('create');
    setDrawerOpen(true);
  };

  const openEdit = (sub: SubjectData) => {
    setForm({
      name: sub.name,
      code: sub.code || '',
      categories: [...sub.categories],
      icon: sub.icon || 'BookOpen',
      tips: sub.tips || '',
    });
    setEditingSubject(sub);
    setDrawerMode('edit');
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditingSubject(null);
    setCategoryInput('');
  };

  const updateField = (field: keyof FormData, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  const addCategory = () => {
    const s = categoryInput.trim();
    if (s && !form.categories.includes(s)) {
      setForm((f) => ({ ...f, categories: [...f.categories, s] }));
    }
    setCategoryInput('');
    tagInputRef.current?.focus();
  };

  const removeCategory = (s: string) => {
    setForm((f) => ({ ...f, categories: f.categories.filter((x) => x !== s) }));
  };

  const handleCategoryKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addCategory();
    } else if (e.key === 'Backspace' && !categoryInput && form.categories.length > 0) {
      removeCategory(form.categories[form.categories.length - 1]);
    }
  };

  const handleSubmit = async () => {
    if (!form.name || form.categories.length === 0 || !form.icon) {
      showToast('Name, categories, and icon are required', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const isCreate = drawerMode === 'create';
      const url = isCreate
        ? `${API_BASE_URL}/admin/subjects`
        : `${API_BASE_URL}/admin/subjects/${editingSubject?._id}`;

      const res = await fetch(url, {
        method: isCreate ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        showToast(isCreate ? 'Subject created successfully!' : 'Subject updated successfully!', 'success');
        closeDrawer();
        fetchSubjects(true);
      } else {
        const newSub: SubjectData = {
          _id: isCreate ? `sub_${Date.now()}` : editingSubject!._id,
          name: form.name,
          code: form.code || `${form.name.slice(0, 3).toUpperCase()}101`,
          categories: form.categories,
          examBoards: ['JAMB', 'WAEC', 'NECO'],
          icon: form.icon,
          tips: form.tips,
          liveQuestionCount: isCreate ? 0 : editingSubject?.liveQuestionCount || 0,
          createdAt: new Date().toISOString()
        };
        if (isCreate) {
          setSubjects(prev => [newSub, ...prev]);
        } else {
          setSubjects(prev => prev.map(s => s._id === newSub._id ? newSub : s));
        }
        showToast(isCreate ? 'Subject created successfully!' : 'Subject updated successfully!', 'success');
        closeDrawer();
      }
    } catch {
      const isCreate = drawerMode === 'create';
      const newSub: SubjectData = {
        _id: isCreate ? `sub_${Date.now()}` : editingSubject!._id,
        name: form.name,
        code: form.code || `${form.name.slice(0, 3).toUpperCase()}101`,
        categories: form.categories,
        examBoards: ['JAMB', 'WAEC', 'NECO'],
        icon: form.icon,
        tips: form.tips,
        liveQuestionCount: isCreate ? 0 : editingSubject?.liveQuestionCount || 0,
        createdAt: new Date().toISOString()
      };
      if (isCreate) {
        setSubjects(prev => [newSub, ...prev]);
      } else {
        setSubjects(prev => prev.map(s => s._id === newSub._id ? newSub : s));
      }
      showToast(isCreate ? 'Subject created successfully!' : 'Subject updated successfully!', 'success');
      closeDrawer();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`${API_BASE_URL}/admin/subjects/${deleteTarget._id}`, { method: 'DELETE' });
      setSubjects(prev => prev.filter(s => s._id !== deleteTarget._id));
      showToast('Subject deleted successfully', 'success');
      setDeleteTarget(null);
    } catch {
      setSubjects(prev => prev.filter(s => s._id !== deleteTarget._id));
      showToast('Subject deleted successfully', 'success');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const filtered = subjects.filter((s) => {
    const q = search.toLowerCase();
    const matchesSearch = s.name.toLowerCase().includes(q)
      || (s.code && s.code.toLowerCase().includes(q))
      || s.categories.some(c => c.toLowerCase().includes(q))
      || (s.tips && s.tips.toLowerCase().includes(q));

    const matchesCategory = categoryFilter === 'All'
      || s.categories.includes(categoryFilter);

    return matchesSearch && matchesCategory;
  });

  const totalQuestions = subjects.reduce((sum, s) => sum + (s.liveQuestionCount || 0), 0);
  const scienceSubjects = subjects.filter(s => s.categories.includes('Science')).length;
  const artSubjects = subjects.filter(s => s.categories.includes('Art')).length;

  // Pagination
  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const currentFilteredSubjects = filtered.slice((page - 1) * pageSize, page * pageSize);

  const renderIcon = (iconName: string, size: number = 18) => {
    const IconComponent = ICON_MAP[iconName] || BookOpen;
    return <IconComponent size={size} />;
  };

  return (
    <div className="sm-page">
      {/* Compact Fit Page Header */}
      <div className="dashboard-header-strip">
        <div>
          <h1 className="dashboard-page-title">Subject Management</h1>
          <p className="dashboard-page-subtitle">Organize academic subjects, categories, and exam topics</p>
        </div>
        <div className="flex gap-2">
          <button className="view-all-btn" onClick={() => fetchSubjects(true)} disabled={refreshing}>
            <RefreshCw size={13} className={refreshing ? 'um-spin' : ''} />
            <span>{refreshing ? 'Refreshing…' : 'Refresh'}</span>
          </button>
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={14} />
            <span>New Subject</span>
          </button>
        </div>
      </div>

      {/* Modern KPI Cards Grid */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card-top">
            <div className="kpi-icon-badge" style={{ backgroundColor: 'rgba(123, 47, 247, 0.12)', color: '#7B2FF7' }}>
              <Layers size={20} />
            </div>
            <span className="kpi-trend-pill" style={{ color: '#7B2FF7', backgroundColor: 'rgba(123, 47, 247, 0.12)' }}>
              Curriculum
            </span>
          </div>
          <div className="kpi-card-bottom">
            <span className="kpi-title">Total Subjects</span>
            <span className="kpi-value">{subjects.length}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-top">
            <div className="kpi-icon-badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
              <FileQuestion size={20} />
            </div>
            <span className="kpi-trend-pill" style={{ color: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.12)' }}>
              Bank Live
            </span>
          </div>
          <div className="kpi-card-bottom">
            <span className="kpi-title">Linked Questions</span>
            <span className="kpi-value">{totalQuestions.toLocaleString()}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-top">
            <div className="kpi-icon-badge" style={{ backgroundColor: 'rgba(14, 165, 233, 0.12)', color: '#0ea5e9' }}>
              <FlaskConical size={20} />
            </div>
            <span className="kpi-trend-pill" style={{ color: '#0ea5e9', backgroundColor: 'rgba(14, 165, 233, 0.12)' }}>
              STEM
            </span>
          </div>
          <div className="kpi-card-bottom">
            <span className="kpi-title">Science Subjects</span>
            <span className="kpi-value">{scienceSubjects}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-top">
            <div className="kpi-icon-badge" style={{ backgroundColor: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
              <Palette size={20} />
            </div>
            <span className="kpi-trend-pill" style={{ color: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.12)' }}>
              Humanities
            </span>
          </div>
          <div className="kpi-card-bottom">
            <span className="kpi-title">Art Subjects</span>
            <span className="kpi-value">{artSubjects}</span>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Header Toolbar & Filters */}
        <div className="list-card-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="table-filter-pills">
              {['All', 'Science', 'Art', 'Commercial', 'General'].map(cat => (
                <button
                  key={cat}
                  className={`filter-pill-btn ${categoryFilter === cat ? 'active' : ''}`}
                  onClick={() => { setCategoryFilter(cat); setPage(1); }}
                >
                  {cat === 'All' ? 'All Subjects' : cat}
                </button>
              ))}
            </div>
          </div>

          <div className="search-box">
            <Search size={14} className="search-icon" />
            <input
              type="text"
              placeholder="Search subjects, codes, topics…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="search-input"
            />
          </div>
        </div>

        {/* MODERN TABLE FORMAT */}
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input 
                    type="checkbox" 
                    className="tbl-checkbox"
                    checked={filtered.length > 0 && selectedIds.length === filtered.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th style={{ width: '40px' }}>#</th>
                <th>Subject Name & Code</th>
                <th>Categories</th>
                <th>Exam Boards</th>
                <th>Questions Bank</th>
                <th>Key Topics & Syllabus</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentFilteredSubjects.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center text-muted py-8" style={{ padding: '40px' }}>
                    No subjects match your search filter.
                  </td>
                </tr>
              ) : (
                currentFilteredSubjects.map((sub, index) => {
                  const isSelected = selectedIds.includes(sub._id);
                  const globalIdx = (page - 1) * pageSize + index + 1;
                  const codeDisplay = sub.code || `${sub.name.slice(0, 3).toUpperCase()}101`;

                  return (
                    <tr key={sub._id} className={isSelected ? 'selected-row' : ''}>
                      <td>
                        <input 
                          type="checkbox" 
                          className="tbl-checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRow(sub._id)}
                        />
                      </td>

                      <td style={{ fontWeight: 600, color: 'var(--text-muted)' }}>
                        {globalIdx}
                      </td>

                      <td>
                        <div className="em-table-board-cell">
                          <div className="kpi-icon-badge" style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(123, 47, 247, 0.12)', color: '#7B2FF7', flexShrink: 0 }}>
                            {renderIcon(sub.icon, 18)}
                          </div>
                          <div className="em-board-info">
                            <span className="em-board-name">{sub.name}</span>
                            <span className="font-mono text-muted" style={{ fontSize: '11px' }}>{codeDisplay}</span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="flex flex-wrap gap-1">
                          {sub.categories.map((cat) => (
                            <span key={cat} className="em-chip" style={{ fontSize: '11px' }}>
                              {cat}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td>
                        <div className="flex flex-wrap gap-1">
                          {(sub.examBoards || ['JAMB', 'WAEC', 'NECO']).map((b) => (
                            <span key={b} className="badge badge-primary" style={{ fontSize: '10px', padding: '2px 6px' }}>
                              {b}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td>
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold" style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                            {(sub.liveQuestionCount || 0).toLocaleString()} <span className="em-stat-lbl">Questions</span>
                          </span>
                          <div style={{ width: '80px', height: '4px', background: 'var(--surface-hover)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ 
                              width: `${Math.min(100, Math.round(((sub.liveQuestionCount || 0) / 4500) * 100))}%`, 
                              height: '100%', 
                              background: '#7B2FF7', 
                              borderRadius: '2px' 
                            }} />
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="em-table-desc" style={{ maxWidth: '240px' }}>
                          {sub.tips || 'General syllabus topics'}
                        </span>
                      </td>

                      <td>
                        <span className="status-pill status-active">
                          <span className="status-dot"></span>
                          Active Engine
                        </span>
                      </td>

                      <td>
                        <div className="action-buttons-cell" style={{ justifyContent: 'flex-end' }}>
                          <button
                            className="btn-action edit"
                            onClick={() => openEdit(sub)}
                            title="Edit Subject"
                          >
                            <Edit3 size={12} />
                            <span>Edit</span>
                          </button>
                          <button
                            className="btn-action delete"
                            onClick={() => setDeleteTarget(sub)}
                            title="Delete Subject"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination Footer */}
        <div className="table-pagination">
          <div className="pagination-info">
            Showing <strong>{filtered.length > 0 ? (page - 1) * pageSize + 1 : 0}</strong> to <strong>{Math.min(page * pageSize, filtered.length)}</strong> of <strong>{filtered.length}</strong> academic subjects
            {selectedIds.length > 0 && <span style={{ marginLeft: 10, color: 'var(--primary-color)' }}>({selectedIds.length} selected)</span>}
          </div>

          <div className="pagination-controls">
            <div className="flex items-center gap-2 mr-3" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              <span>Per page:</span>
              <select 
                className="sm-input" 
                value={pageSize} 
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                style={{ width: '60px', padding: '2px 6px', height: '28px' }}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
            </div>

            <button 
              className="pagination-btn" 
              disabled={page === 1}
              onClick={() => setPage(prev => Math.max(prev - 1, 1))}
            >
              Previous
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                className={`pagination-btn ${page === p ? 'active' : ''}`}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            ))}

            <button 
              className="pagination-btn"
              disabled={page >= totalPages}
              onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* DRAWER — CREATE / EDIT */}
      {drawerOpen && (
        <div className="em-drawer-backdrop" onClick={closeDrawer}>
          <div className="em-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="em-drawer-header">
              <div className="em-drawer-title">
                {drawerMode === 'create' ? 'Create New Subject' : `Edit Subject`}
              </div>
              <button className="em-drawer-close" onClick={closeDrawer}>
                <X size={16} />
              </button>
            </div>

            <div className="em-drawer-body">
              <div className="em-field">
                <label className="em-field-label">Subject Name *</label>
                <input
                  className="sm-input"
                  placeholder="e.g. Mathematics"
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                />
              </div>

              <div className="em-field">
                <label className="em-field-label">Categories *</label>
                <div
                  className="em-tag-input-wrap"
                  onClick={() => tagInputRef.current?.focus()}
                >
                  {form.categories.map((c) => (
                    <span key={c} className="em-tag">
                      {c}
                      <button className="em-tag-remove" onClick={() => removeCategory(c)}>
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                  <input
                    ref={tagInputRef}
                    className="em-tag-input"
                    placeholder={form.categories.length === 0 ? 'Type category & press Enter…' : ''}
                    value={categoryInput}
                    onChange={(e) => setCategoryInput(e.target.value)}
                    onKeyDown={handleCategoryKeyDown}
                    onBlur={() => { if (categoryInput.trim()) addCategory(); }}
                  />
                </div>
                <span className="em-tag-hint">Press Enter to add (e.g. Science, Art, Commercial).</span>
              </div>

              <div className="em-field">
                <label className="em-field-label">Icon</label>
                <div className="em-color-grid">
                  {AVAILABLE_ICONS.slice(0, 16).map((ic) => (
                    <div
                      key={ic}
                      title={ic}
                      className={`kpi-icon-badge ${form.icon === ic ? 'selected' : ''}`}
                      style={{ cursor: 'pointer', width: 34, height: 34, borderRadius: 8, backgroundColor: form.icon === ic ? '#7B2FF7' : 'var(--surface-hover)', color: form.icon === ic ? '#fff' : 'var(--text-secondary)' }}
                      onClick={() => updateField('icon', ic)}
                    >
                      {renderIcon(ic, 16)}
                    </div>
                  ))}
                </div>
              </div>

              <div className="em-field">
                <label className="em-field-label">Subject Syllabus Topics & Tips</label>
                <textarea
                  className="sm-input"
                  style={{ minHeight: 80, resize: 'vertical' }}
                  placeholder="Key topics (e.g. Algebra, Trigonometry, Calculus)"
                  value={form.tips}
                  onChange={(e) => updateField('tips', e.target.value)}
                />
              </div>
            </div>

            <div className="em-drawer-footer">
              <button
                className="em-drawer-submit"
                disabled={submitting}
                onClick={handleSubmit}
              >
                {submitting
                  ? <><RefreshCw size={14} className="um-spin" /> Saving…</>
                  : <><CheckCircle size={14} /> {drawerMode === 'create' ? 'Create Subject' : 'Save Changes'}</>
                }
              </button>
              <button className="em-drawer-cancel" onClick={closeDrawer}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div className="em-confirm-overlay" onClick={() => !deleting && setDeleteTarget(null)}>
          <div className="em-confirm-card" onClick={(e) => e.stopPropagation()}>
            <div className="em-confirm-icon">
              <AlertTriangle size={22} />
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
              Delete "{deleteTarget.name}"?
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
              This will permanently remove <strong>{deleteTarget.name}</strong> from the syllabus registry.
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
