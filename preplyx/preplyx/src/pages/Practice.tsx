import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  ArrowRight, BookOpen, Clock, BarChart2, CheckCircle2, Zap, Calculator, 
  BookType, FlaskConical, Leaf, BarChart3, Landmark, Vote, Sprout, BookText, 
  Briefcase, ShoppingCart, Globe, Scroll, Monitor, Music, Palette, Activity, 
  Shield, Users, Apple, Shirt, Home, PenTool, Hammer, Cpu, Wrench, Keyboard, 
  Pen, TrendingUp, Play, Building2, Cross, Book, X, Sparkles, Sliders, Search,
  Calendar
} from 'lucide-react';
import { api } from '../lib/api';

interface ExamData {
  subjects: string[];
  color: string;
  years: string;
  desc: string;
}

interface ExamAvailability {
  hasQuestions: boolean;
  totalCount: number;
  years: string[];
  subjects: string[];
  subjectYears: Record<string, string[]>;
  topics: Record<string, string[]>;
}

const CATEGORIES = ['All', 'Science', 'Art', 'Commerce', 'Vocational', 'Language'] as const;
type Category = typeof CATEGORIES[number];

const ICON_MAP: Record<string, any> = {
  Calculator,
  BookType,
  Zap,
  FlaskConical,
  Leaf,
  BarChart3,
  Landmark,
  Vote,
  Sprout,
  BookText,
  Briefcase,
  ShoppingCart,
  Globe,
  Scroll,
  Cross,
  Building2,
  Monitor,
  Music,
  Palette,
  Activity,
  Shield,
  Users,
  Apple,
  Shirt,
  Home,
  PenTool,
  Hammer,
  Cpu,
  Wrench,
  Keyboard,
  Pen,
  TrendingUp,
  Play,
  Book
};

function getIconComponent(iconName: string): any {
  return ICON_MAP[iconName] || BookOpen;
}

export default function Practice() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [examData, setExamData] = useState<Record<string, ExamData>>({});
  const [availability, setAvailability] = useState<Record<string, ExamAvailability>>({});
  const [subjectCategories, setSubjectCategories] = useState<Record<string, Category[]>>({});
  const [subjectIcons, setSubjectIcons] = useState<Record<string, string>>({});
  const [subjectTips, setSubjectTips] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const queryExam = searchParams.get('exam');
  const initialExam = queryExam || 'JAMB';
  const [selectedExam, setSelectedExam] = useState<string>(initialExam);
  const [selectedYear, setSelectedYear] = useState<string>(searchParams.get('year') || 'All');
  const [selectedCategory, setSelectedCategory] = useState<Category>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [customTime, setCustomTime] = useState<number>(2);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        const [exams, categories, icons, tips, avail] = await Promise.all([
          api.getExams(),
          api.getSubjectCategories(),
          api.getSubjectIcons(),
          api.getSubjectTips(),
          api.getExamAvailability()
        ]);
        
        setExamData(exams);
        setSubjectCategories(categories as any);
        setSubjectIcons(icons);
        setSubjectTips(tips);
        setAvailability(avail);
        
        if (queryExam && !exams[queryExam]) {
          setSelectedExam('JAMB');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch exam data');
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [queryExam]);

  // Real data computed from availability
  const currentAvail = availability[selectedExam];
  const examHasQuestions = currentAvail?.hasQuestions ?? false;

  // Years that have questions for the selected exam (sorted descending)
  const availableYears = currentAvail?.years ?? [];

  // Subjects that have questions for selected exam + selected year
  const subjectsWithQuestions: string[] = (() => {
    if (!currentAvail) return [];
    if (selectedYear === 'All') {
      return currentAvail.subjects;
    }
    // Only subjects where the selected year is in their subjectYears list
    return currentAvail.subjects.filter(subject => {
      const yearsForSubject = currentAvail.subjectYears[subject] ?? [];
      return yearsForSubject.includes(selectedYear);
    });
  })();

  const exam = examData[selectedExam] || examData['JAMB'] || { subjects: [], color: '#7B2FF7', years: '', desc: '' };
  
  // Filter subjects further by category and search — but only from subjects that have actual questions
  const filteredSubjects = subjectsWithQuestions.filter(subject => {
    const matchesCategory = selectedCategory === 'All' || (subjectCategories[subject] || []).includes(selectedCategory);
    const matchesSearch = subject.toLowerCase().includes(searchQuery.toLowerCase().trim());
    return matchesCategory && matchesSearch;
  });

  const toggleSubjectSelection = (subject: string) => {
    setSelectedSubjects(prev => 
      prev.includes(subject) 
        ? prev.filter(s => s !== subject)
        : [...prev, subject]
    );
  };

  const handleSelectAllFiltered = () => {
    const allSelected = filteredSubjects.every(s => selectedSubjects.includes(s));
    if (allSelected) {
      setSelectedSubjects(prev => prev.filter(s => !filteredSubjects.includes(s)));
    } else {
      const toAdd = filteredSubjects.filter(s => !selectedSubjects.includes(s));
      setSelectedSubjects(prev => [...prev, ...toAdd]);
    }
  };

  const handleStartExam = () => {
    if (selectedSubjects.length === 0) {
      alert('Please select at least one subject to begin');
      return;
    }
    const examParams = new URLSearchParams();
    examParams.set('exam', selectedExam);
    examParams.set('year', selectedYear);
    examParams.set('subjects', selectedSubjects.join(','));
    examParams.set('time', (customTime * 3600).toString());
    navigate(`/dashboard/multi-subject-exam?${examParams.toString()}`);
  };


  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out', paddingBottom: selectedSubjects.length > 0 ? '120px' : '40px' }}>

      {/* Minimalist Top Main Banner Card */}
      <div style={{
        borderRadius: '20px',
        backgroundColor: '#ffffff',
        padding: '24px 28px',
        marginBottom: '28px',
        boxShadow: '0 2px 12px rgba(15, 23, 42, 0.03)',
        border: '1px solid #E2E8F0',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{
              fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '1px', backgroundColor: '#F3E8FF', color: 'var(--color-primary)',
              padding: '3px 10px', borderRadius: '12px'
            }}>
              Practice Simulator
            </span>
          </div>
          
          <h1 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text-main)', letterSpacing: '-0.3px', marginBottom: '4px' }}>
            Computer-Based Test Simulator
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', maxWidth: '680px', lineHeight: 1.5 }}>
            Select your exam board and subjects to launch a timed CBT practice session with past question solutions.
          </p>
        </div>

        {/* Minimalist Stat Badges Strip */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))',
          gap: '12px',
          paddingTop: '16px',
          borderTop: '1px solid #F1F5F9'
        }}>
          {[
            { icon: BookOpen, label: 'Available Subjects', value: currentAvail ? `${currentAvail.subjects.length}` : (exam.subjects || []).length.toString() },
            { icon: Clock, label: 'Exam Duration', value: '1 – 10 hrs' },
            { icon: BarChart2, label: 'Question Bank', value: currentAvail && currentAvail.years.length > 0 ? `${currentAvail.years.length} Year${currentAvail.years.length !== 1 ? 's' : ''}` : 'No Data' },
            { icon: CheckCircle2, label: 'Total Questions', value: currentAvail ? `${currentAvail.totalCount.toLocaleString()}` : '0' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              borderRadius: '12px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #F1F5F9'
            }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '8px',
                backgroundColor: '#F3E8FF', color: 'var(--color-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <Icon size={16} />
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-main)', lineHeight: 1.1 }}>{value}</div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px', fontWeight: 500 }}>{label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', flexDirection: 'column', gap: '16px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen size={20} color="#fff" />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-main)', marginBottom: '4px' }}>Loading Catalog...</div>
            <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Fetching exam board details</div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div style={{ padding: '16px 20px', backgroundColor: '#FEF2F2', borderRadius: '14px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
          <div style={{ fontSize: '13px', color: '#DC2626', fontWeight: 600 }}>Error: {error}</div>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* STEP 1: EXAM BOARD SELECTION */}
          <div style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  width: '22px', height: '22px', borderRadius: '50%',
                  backgroundColor: 'var(--color-primary)', color: '#fff',
                  fontSize: '11px', fontWeight: 700, display: 'flex',
                  alignItems: 'center', justifyContent: 'center'
                }}>1</span>
                <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-main)', letterSpacing: '-0.3px' }}>
                  Select Exam Board
                </h2>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                Active: <strong style={{ color: 'var(--color-primary)', fontWeight: 700 }}>{selectedExam}</strong>
              </span>
            </div>

            {/* Exam Board Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '12px' }}>
              {Object.entries(examData || {}).map(([examKey, data]) => {
                const isActive = selectedExam === examKey;
                const examAvail = availability[examKey];
                const hasQuestions = examAvail?.hasQuestions ?? false;
                const questionCount = examAvail?.totalCount ?? 0;
                const examYears = examAvail?.years ?? [];
                const isDisabled = !hasQuestions;
                const yearsLabel = examYears.length > 0
                  ? `${examYears[examYears.length - 1]} – ${examYears[0]}`
                  : 'No questions yet';

                return (
                  <button
                    key={examKey}
                    onClick={() => {
                      if (isDisabled) return;
                      setSelectedExam(examKey);
                      setSelectedSubjects([]);
                      setSelectedYear('All');
                    }}
                    disabled={isDisabled}
                    className={isDisabled ? '' : 'header-hover-card'}
                    title={isDisabled ? `${examKey} questions coming soon — no questions uploaded yet` : undefined}
                    style={{
                      padding: '16px 18px',
                      borderRadius: '14px',
                      textAlign: 'left',
                      backgroundColor: isDisabled ? '#F8FAFC' : isActive ? '#F5F3FF' : '#ffffff',
                      border: isDisabled ? '1px dashed #CBD5E1' : isActive ? '1.5px solid var(--color-primary)' : '1px solid #E2E8F0',
                      boxShadow: isDisabled ? 'none' : isActive ? '0 4px 16px rgba(123, 47, 247, 0.08)' : '0 1px 3px rgba(15,23,42,0.02)',
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease',
                      outline: 'none',
                      opacity: isDisabled ? 0.55 : 1
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '16px', fontWeight: 700, color: isDisabled ? '#94A3B8' : isActive ? 'var(--color-primary)' : 'var(--color-text-main)' }}>
                        {examKey}
                      </span>
                      {isDisabled ? (
                        <span style={{ fontSize: '10px', fontWeight: 700, backgroundColor: '#F1F5F9', color: '#94A3B8', padding: '2px 8px', borderRadius: '10px' }}>
                          Coming Soon
                        </span>
                      ) : isActive ? (
                        <span style={{ fontSize: '10px', fontWeight: 700, backgroundColor: '#F3E8FF', color: 'var(--color-primary)', padding: '2px 8px', borderRadius: '10px' }}>
                          Active
                        </span>
                      ) : null}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '8px', lineHeight: 1.3 }}>
                      {data.desc}
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: isDisabled ? '#94A3B8' : isActive ? 'var(--color-primary)' : '#64748B' }}>
                      {isDisabled
                        ? 'No questions uploaded yet'
                        : `${questionCount} questions · ${yearsLabel}`
                      }
                    </div>
                  </button>
                );

              })}
            </div>
          </div>

          {/* STEP 2: EXAM YEAR SELECTION */}
          <div style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  width: '22px', height: '22px', borderRadius: '50%',
                  backgroundColor: 'var(--color-primary)', color: '#fff',
                  fontSize: '11px', fontWeight: 700, display: 'flex',
                  alignItems: 'center', justifyContent: 'center'
                }}>2</span>
                <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-main)', letterSpacing: '-0.3px' }}>
                  Select Exam Year
                  {availableYears.length > 0 && (
                    <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-muted)', marginLeft: '6px' }}>
                      ({availableYears[availableYears.length - 1]} – {availableYears[0]})
                    </span>
                  )}
                </h2>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                  Selected Year:
                </span>
                <span style={{
                  fontSize: '12px', fontWeight: 700, backgroundColor: '#F3E8FF',
                  color: 'var(--color-primary)', padding: '3px 12px', borderRadius: '16px',
                  border: '1px solid rgba(123, 47, 247, 0.2)'
                }}>
                  {selectedYear === 'All' ? 'All Years (Mixed)' : `${selectedExam} ${selectedYear}`}
                </span>
              </div>
            </div>

            {/* Year Selector Container */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '18px 20px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 1px 3px rgba(15,23,42,0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={15} color="var(--color-primary)" />
                  {availableYears.length > 0
                    ? `${availableYears.length} year${availableYears.length !== 1 ? 's' : ''} available in question bank:`
                    : 'No questions uploaded yet for this exam board'}
                </div>

                {/* Direct Dropdown Select */}
                {availableYears.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Jump to Year:</span>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '10px',
                        border: '1px solid #CBD5E1',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: 'var(--color-primary)',
                        backgroundColor: '#F8FAFC',
                        cursor: 'pointer',
                        outline: 'none'
                      }}
                    >
                      <option value="All">All Years (Mixed)</option>
                      {availableYears.map(yr => (
                        <option key={yr} value={yr}>Year {yr}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Scrollable Year Pills Ribbon — only real years */}
              {availableYears.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#94A3B8', fontSize: '13px', fontWeight: 500 }}>
                  No years available — upload questions for this exam in the admin panel first.
                </div>
              ) : (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  overflowX: 'auto',
                  paddingBottom: '6px',
                  paddingTop: '2px'
                }} className="custom-thin-scrollbar">
                  <button
                    onClick={() => setSelectedYear('All')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      border: selectedYear === 'All' ? '1.5px solid var(--color-primary)' : '1px solid #E2E8F0',
                      backgroundColor: selectedYear === 'All' ? 'var(--color-primary)' : '#F8FAFC',
                      color: selectedYear === 'All' ? '#ffffff' : '#475569',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s ease',
                      boxShadow: selectedYear === 'All' ? '0 4px 12px rgba(123, 47, 247, 0.2)' : 'none'
                    }}
                  >
                    All Years (Mixed)
                  </button>

                  {availableYears.map(yr => {
                    const isYearActive = selectedYear === yr;
                    return (
                      <button
                        key={yr}
                        onClick={() => setSelectedYear(yr)}
                        style={{
                          padding: '8px 14px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: isYearActive ? 800 : 600,
                          border: isYearActive ? '1.5px solid var(--color-primary)' : '1px solid #E2E8F0',
                          backgroundColor: isYearActive ? 'var(--color-primary)' : '#ffffff',
                          color: isYearActive ? '#ffffff' : '#334155',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          transition: 'all 0.15s ease',
                          boxShadow: isYearActive ? '0 4px 12px rgba(123, 47, 247, 0.25)' : 'none'
                        }}
                      >
                        {yr}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>


          {/* STEP 3: PROFESSIONAL SUBJECT SELECTION */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  width: '22px', height: '22px', borderRadius: '50%',
                  backgroundColor: 'var(--color-primary)', color: '#fff',
                  fontSize: '11px', fontWeight: 700, display: 'flex',
                  alignItems: 'center', justifyContent: 'center'
                }}>3</span>
                <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-main)', letterSpacing: '-0.3px' }}>
                  Pick Practice Subjects ({selectedExam} {selectedYear === 'All' ? 'All Years' : selectedYear})
                </h2>
              </div>

              {/* Status & Quick Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  onClick={handleSelectAllFiltered}
                  style={{
                    background: 'none', border: 'none', fontSize: '12px',
                    fontWeight: 600, color: 'var(--color-primary)', cursor: 'pointer'
                  }}
                >
                  {filteredSubjects.every(s => selectedSubjects.includes(s)) && filteredSubjects.length > 0 ? 'Deselect All' : 'Select All'}
                </button>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', backgroundColor: '#F1F5F9', padding: '4px 12px', borderRadius: '16px' }}>
                  {filteredSubjects.length} Available
                </div>
                {selectedSubjects.length > 0 && (
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#059669', backgroundColor: '#ECFDF5', padding: '4px 12px', borderRadius: '16px' }}>
                    {selectedSubjects.length} Selected
                  </div>
                )}
              </div>
            </div>

            {/* Search Bar & Category Filter Bar */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '20px', alignItems: 'center' }}>
              
              {/* Minimalist Search Box */}
              <div style={{
                position: 'relative',
                flex: '1 1 220px',
                minWidth: '200px'
              }}>
                <Search size={15} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Search subject (e.g. Math, Physics)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 36px',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    fontSize: '13px',
                    backgroundColor: '#ffffff',
                    outline: 'none',
                    color: 'var(--color-text-main)',
                    transition: 'border-color 0.2s ease'
                  }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--color-primary)')}
                  onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                />
                {searchQuery && (
                  <X
                    size={14}
                    color="#94A3B8"
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer' }}
                    onClick={() => setSearchQuery('')}
                  />
                )}
              </div>

              {/* Category Pills */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {CATEGORIES.map(cat => {
                  const isCatActive = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 600,
                        border: 'none',
                        backgroundColor: isCatActive ? 'var(--color-primary)' : '#F1F5F9',
                        color: isCatActive ? '#ffffff' : '#475569',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        whiteSpace: 'nowrap'
                      }}
                      className="header-hover-card"
                    >
                      {cat === 'All' ? 'All' : cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Empty Subject State */}
            {filteredSubjects.length === 0 && (
              <div style={{ padding: '40px 20px', textAlign: 'center', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
                <BookOpen size={28} color="#94A3B8" style={{ marginBottom: '8px' }} />
                {subjectsWithQuestions.length === 0 ? (
                  <>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-main)' }}>
                      {selectedYear === 'All'
                        ? `No questions uploaded yet for ${selectedExam}`
                        : `No questions for ${selectedExam} ${selectedYear}`}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                      {selectedYear === 'All'
                        ? 'Upload questions from the admin panel to make them available here.'
                        : 'Try selecting "All Years" or a different year that has questions.'}
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-main)' }}>No subjects found</div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>Try adjusting your search query or category filter.</div>
                  </>
                )}
              </div>
            )}

            {/* Subject Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '14px' }}>
              {(filteredSubjects || []).map((subject) => {
                const isSelected = selectedSubjects.includes(subject);
                const IconComp = getIconComponent(subjectIcons[subject] || 'Book');
                const categoryList = subjectCategories[subject] || [];
                const primaryCategory = categoryList[0] || 'General';

                return (
                  <div
                    key={subject}
                    onClick={() => toggleSubjectSelection(subject)}
                    className="header-hover-card"
                    style={{
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      padding: '20px',
                      borderRadius: '16px',
                      backgroundColor: '#ffffff',
                      border: isSelected ? '1.5px solid var(--color-primary)' : '1px solid #E2E8F0',
                      boxShadow: isSelected 
                        ? '0 8px 24px rgba(123, 47, 247, 0.12)' 
                        : '0 2px 8px rgba(15, 23, 42, 0.03)',
                      cursor: 'pointer',
                      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                      minHeight: '140px',
                      overflow: 'hidden'
                    }}
                  >
                    {/* Left Selection Accent Indicator Bar */}
                    {isSelected && (
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        bottom: 0,
                        width: '4px',
                        backgroundColor: 'var(--color-primary)'
                      }} />
                    )}

                    {/* Card Top Row: Icon, Category Badge & Selection Badge */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '10px',
                            backgroundColor: isSelected ? '#F3E8FF' : '#F8FAFC',
                            color: isSelected ? 'var(--color-primary)' : '#475569',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            transition: 'all 0.2s ease'
                          }}>
                            <IconComp size={19} />
                          </div>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: isSelected ? 'var(--color-primary)' : '#64748B',
                            backgroundColor: isSelected ? '#F3E8FF' : '#F1F5F9',
                            padding: '2px 8px',
                            borderRadius: '8px'
                          }}>
                            {primaryCategory}
                          </span>
                        </div>

                        {/* Interactive Selection Pill Badge */}
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 10px',
                          borderRadius: '20px',
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor: isSelected ? 'var(--color-primary)' : '#F1F5F9',
                          color: isSelected ? '#ffffff' : '#64748B',
                          transition: 'all 0.2s ease'
                        }}>
                          {isSelected ? (
                            <>
                              <CheckCircle2 size={12} color="#ffffff" />
                              <span>Selected</span>
                            </>
                          ) : (
                            <span>Select</span>
                          )}
                        </div>
                      </div>

                      {/* Card Content: Title & Details */}
                      <h3 style={{
                        fontSize: '15px',
                        fontWeight: 700,
                        color: isSelected ? 'var(--color-primary)' : 'var(--color-text-main)',
                        marginBottom: '4px',
                        letterSpacing: '-0.2px',
                        lineHeight: 1.25
                      }}>
                        {subject}
                      </h3>
                      <p style={{
                        fontSize: '11px',
                        color: 'var(--color-text-muted)',
                        lineHeight: '1.4',
                        margin: 0
                      }}>
                        {subjectTips[subject] || 'Comprehensive past questions & timed CBT simulation.'}
                      </p>
                    </div>

                    <div style={{
                      marginTop: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: '10px',
                      borderTop: '1px solid #F1F5F9'
                    }}>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: isSelected ? 'var(--color-primary)' : '#64748B' }}>
                        {selectedExam} {selectedYear === 'All' ? 'All Years' : `Year ${selectedYear}`}
                      </span>
                      <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                        Past Questions
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* STEP 3: FITTED & PROFESSIONAL STICKY EXAM CONFIGURATION DOCK */}
          {selectedSubjects.length > 0 && (
            <div
              className="pro-floating-dock"
              style={{
                position: 'sticky',
                bottom: '20px',
                margin: '28px auto 0',
                width: 'fit-content',
                maxWidth: 'calc(100% - 32px)',
                zIndex: 100,
                padding: '8px 10px 8px 20px',
                borderRadius: '999px',
                backgroundColor: 'rgba(255, 255, 255, 0.96)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                boxShadow: '0 16px 40px rgba(15, 23, 42, 0.14), 0 4px 16px rgba(123, 47, 247, 0.08)',
                border: '1px solid rgba(226, 232, 240, 0.9)',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                boxSizing: 'border-box'
              }}
            >
              {/* Left: Selected Count Badge & Inline Subject Chips */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                <div style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#ffffff',
                  backgroundColor: 'var(--color-primary)',
                  padding: '5px 12px',
                  borderRadius: '20px',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  flexShrink: 0
                }}>
                  <CheckCircle2 size={13} color="#ffffff" />
                  <span>{selectedSubjects.length} {selectedSubjects.length === 1 ? 'Subject' : 'Subjects'}</span>
                </div>

                <div style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--color-primary)',
                  backgroundColor: '#F3E8FF',
                  padding: '4px 10px',
                  borderRadius: '16px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}>
                  {selectedYear === 'All' ? 'All Years' : `${selectedExam} ${selectedYear}`}
                </div>

                {/* Inline Subject Tags */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  maxWidth: '280px',
                  overflowX: 'auto',
                  paddingRight: '4px'
                }} className="custom-thin-scrollbar">
                  {selectedSubjects.map(subj => (
                    <span
                      key={subj}
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        backgroundColor: '#F3E8FF',
                        color: 'var(--color-primary)',
                        padding: '4px 10px',
                        borderRadius: '16px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {subj}
                      <X
                        size={11}
                        style={{ cursor: 'pointer' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSubjectSelection(subj);
                        }}
                      />
                    </span>
                  ))}
                </div>
              </div>

              {/* Vertical Separator Divider */}
              <div style={{ width: '1px', height: '24px', backgroundColor: '#E2E8F0', flexShrink: 0 }} />

              {/* Center: Sleek Duration Chip */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={14} color="var(--color-primary)" /> Time:
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#F8FAFC', padding: '3px 8px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                  <button
                    onClick={() => setCustomTime(prev => Math.max(1, prev - 1))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 700, color: 'var(--color-primary)', padding: '0 4px' }}
                  >-</button>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-main)', minWidth: '32px', textAlign: 'center' }}>
                    {customTime}h
                  </span>
                  <button
                    onClick={() => setCustomTime(prev => Math.min(10, prev + 1))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 700, color: 'var(--color-primary)', padding: '0 4px' }}
                  >+</button>
                </div>
              </div>

              {/* Vertical Separator Divider */}
              <div style={{ width: '1px', height: '24px', backgroundColor: '#E2E8F0', flexShrink: 0 }} />

              {/* Right: Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                <button
                  onClick={() => setSelectedSubjects([])}
                  style={{
                    background: 'none', border: 'none', fontSize: '12px',
                    color: 'var(--color-text-muted)', cursor: 'pointer',
                    fontWeight: 600, padding: '0 4px'
                  }}
                >
                  Clear
                </button>

                <button
                  onClick={handleStartExam}
                  style={{
                    padding: '10px 22px',
                    borderRadius: '20px',
                    background: 'var(--gradient-primary)',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 14px rgba(123, 47, 247, 0.3)',
                    whiteSpace: 'nowrap'
                  }}
                  className="header-hover-card"
                >
                  <Play size={14} fill="#ffffff" />
                  Start Exam
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
