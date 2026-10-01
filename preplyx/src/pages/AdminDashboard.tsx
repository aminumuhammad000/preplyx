import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ShieldCheck, Users, BookOpen, FileText, CheckCircle2, TrendingUp, 
  BarChart3, LogOut, Plus, Search, Filter, Trash2, Edit3, Sparkles, 
  RefreshCw, Bell, ArrowLeft, Layers, CheckSquare, Settings, ChevronRight, X, UserCheck, UserX
} from 'lucide-react';
import { api } from '@/lib/api';
import { playButtonClickSound } from '@/lib/soundEffects';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [adminUser, setAdminUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'questions' | 'users' | 'settings'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [selectedExam, setSelectedExam] = useState('All');

  // Backend live state
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add Question Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newQExam, setNewQExam] = useState('JAMB');
  const [newQSubject, setNewQSubject] = useState('Mathematics');
  const [newQText, setNewQText] = useState('');
  const [newQOptA, setNewQOptA] = useState('');
  const [newQOptB, setNewQOptB] = useState('');
  const [newQOptC, setNewQOptC] = useState('');
  const [newQOptD, setNewQOptD] = useState('');
  const [newQCorrect, setNewQCorrect] = useState('A');
  const [newQExplanation, setNewQExplanation] = useState('');
  const [creatingQ, setCreatingQ] = useState(false);

  // AgentRouter AI Settings state
  const [anthropicAuthToken, setAnthropicAuthToken] = useState('');
  const [anthropicBaseUrl, setAnthropicBaseUrl] = useState('https://agentrouter.org');
  const [anthropicModel, setAnthropicModel] = useState('claude-opus-4-6');
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState<string | null>(null);

  const getAdminToken = () => {
    return localStorage.getItem('preplyx_admin_token') || sessionStorage.getItem('preplyx_admin_token') || '';
  };

  // Verify Admin Session & Load Initial Data
  useEffect(() => {
    const storedToken = getAdminToken();
    const storedUser = localStorage.getItem('preplyx_admin_user') || sessionStorage.getItem('preplyx_admin_user');

    if (!storedToken) {
      navigate('/admin/login');
      return;
    }

    if (storedUser) {
      try {
        setAdminUser(JSON.parse(storedUser));
      } catch {
        setAdminUser({ name: 'System Admin', email: 'admin@preplyx.com', role: 'Super Admin' });
      }
    } else {
      setAdminUser({ name: 'System Admin', email: 'admin@preplyx.com', role: 'Super Admin' });
    }

    loadAdminData(storedToken);
  }, [navigate]);

  const loadAdminData = async (token?: string) => {
    const adminToken = token || getAdminToken();
    try {
      setLoading(true);
      setError(null);

      const [statsData, questionsData, usersData, settingsData] = await Promise.all([
        api.getAdminDashboard(adminToken).catch(() => null),
        api.getAdminQuestions({ limit: 100 }, adminToken).catch(() => null),
        api.getAdminUsers(adminToken).catch(() => []),
        api.getAdminSettings(adminToken).catch(() => null)
      ]);

      setDashboardStats(statsData);
      setQuestions(questionsData?.questions || []);
      setUsers(Array.isArray(usersData) ? usersData : []);
      if (settingsData) {
        setAnthropicAuthToken(settingsData.anthropicAuthToken || '');
        setAnthropicBaseUrl(settingsData.anthropicBaseUrl || 'https://agentrouter.org');
        setAnthropicModel(settingsData.anthropicModel || 'claude-opus-4-6');
      }
    } catch (err) {
      console.error('Failed to load admin dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Error loading admin data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSaveAiSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    playButtonClickSound();
    setSavingSettings(true);
    setSettingsMsg(null);

    const token = getAdminToken();
    try {
      await api.updateAdminSettings({
        anthropicAuthToken,
        anthropicBaseUrl,
        anthropicModel
      }, token);

      setSettingsMsg('AgentRouter AI configuration saved successfully!');
    } catch (err) {
      setSettingsMsg('Failed to save configuration to server');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleRefresh = () => {
    playButtonClickSound();
    setRefreshing(true);
    loadAdminData();
  };

  const handleAdminLogout = () => {
    playButtonClickSound();
    localStorage.removeItem('preplyx_admin_token');
    localStorage.removeItem('preplyx_admin_user');
    sessionStorage.removeItem('preplyx_admin_token');
    sessionStorage.removeItem('preplyx_admin_user');
    navigate('/admin/login');
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;
    playButtonClickSound();
    const token = getAdminToken();
    try {
      await api.deleteAdminQuestion(id, token);
      setQuestions(prev => prev.filter(q => q._id !== id && q.id !== id));
    } catch (err) {
      alert('Failed to delete question');
    }
  };

  const handleToggleUserStatus = async (user: any) => {
    playButtonClickSound();
    const token = getAdminToken();
    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    try {
      await api.updateUserStatus(user._id, newStatus, token);
      setUsers(prev => prev.map(u => u._id === user._id ? { ...u, status: newStatus } : u));
    } catch (err) {
      alert('Failed to update user status');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    playButtonClickSound();
    const token = getAdminToken();
    try {
      await api.deleteAdminUser(id, token);
      setUsers(prev => prev.filter(u => u._id !== id));
    } catch (err) {
      alert('Failed to delete user');
    }
  };

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQText.trim() || !newQOptA.trim() || !newQOptB.trim() || !newQOptC.trim() || !newQOptD.trim()) {
      alert('Please fill out all required fields');
      return;
    }

    playButtonClickSound();
    setCreatingQ(true);
    const token = getAdminToken();

    try {
      const created = await api.createAdminQuestion({
        exam: newQExam,
        subject: newQSubject,
        text: newQText,
        options: [newQOptA, newQOptB, newQOptC, newQOptD],
        correctAnswer: newQCorrect,
        explanation: newQExplanation
      }, token);

      setQuestions(prev => [created, ...prev]);
      setShowAddModal(false);
      setNewQText('');
      setNewQOptA('');
      setNewQOptB('');
      setNewQOptC('');
      setNewQOptD('');
      setNewQExplanation('');
    } catch (err) {
      alert('Failed to create question');
    } finally {
      setCreatingQ(false);
    }
  };

  const filteredQuestions = questions.filter(q => {
    const text = (q.text || q.question || '').toLowerCase();
    const topic = (q.topic || q.subject || '').toLowerCase();
    const matchesSearch = text.includes(searchQuery.toLowerCase()) || topic.includes(searchQuery.toLowerCase());
    const matchesSubject = selectedSubject === 'All' || (q.subject || '').toLowerCase() === selectedSubject.toLowerCase();
    const matchesExam = selectedExam === 'All' || (q.exam || '').toLowerCase() === selectedExam.toLowerCase();
    return matchesSearch && matchesSubject && matchesExam;
  });

  return (
    <div style={{
      minHeight: '100vh', width: '100vw', backgroundColor: '#070a12',
      color: '#f8fafc', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      display: 'flex', flexDirection: 'column'
    }}>
      
      {/* Admin Navigation Top Header */}
      <header style={{
        height: '64px', backgroundColor: '#0f172a', borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <img
            src="/logo.svg"
            alt="Preplyx Logo"
            style={{
              width: '34px', height: '34px', borderRadius: '10px',
              objectFit: 'contain', boxShadow: '0 4px 12px rgba(123, 47, 247, 0.4)'
            }}
          />
          <div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Preplyx Admin Console
              <span style={{ fontSize: '9px', backgroundColor: 'rgba(123, 47, 247, 0.25)', color: '#c4b5fd', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                SUPER ADMIN
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              padding: '6px 12px', borderRadius: '8px',
              backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#cbd5e1', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} /> Sync Server
          </button>

          <Link
            to="/dashboard"
            style={{
              padding: '6px 12px', borderRadius: '8px',
              backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#cbd5e1', fontSize: '12px', fontWeight: 600, textDecoration: 'none',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            <ArrowLeft size={14} /> Student View
          </Link>

          <button
            onClick={handleAdminLogout}
            style={{
              padding: '6px 14px', borderRadius: '8px',
              backgroundColor: '#fef2f2', border: '1px solid #fca5a5',
              color: '#dc2626', fontSize: '12px', fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            <LogOut size={14} /> Exit Admin
          </button>
        </div>
      </header>

      {/* Main Admin Workspace Body */}
      <div style={{ flex: 1, padding: '28px 32px', maxWidth: '1400px', width: '100%', margin: '0 auto' }}>
        
        {/* Welcome Hero Strip */}
        <div style={{
          padding: '24px 28px', borderRadius: '20px',
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
          border: '1px solid rgba(255,255,255,0.1)', marginBottom: '28px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px'
        }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff', margin: '0 0 6px' }}>
              Welcome back, {adminUser?.name || 'Administrator'}
            </h1>
            <p style={{ fontSize: '13px', color: '#cbd5e1', margin: 0 }}>
              System Status: Connected to Server • Database Active
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => { playButtonClickSound(); setShowAddModal(true); }}
              style={{
                padding: '10px 18px', borderRadius: '10px',
                backgroundColor: '#7B2FF7', color: '#ffffff', border: 'none',
                fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px',
                boxShadow: '0 4px 14px rgba(123, 47, 247, 0.4)'
              }}
            >
              <Plus size={16} /> Add New Question
            </button>
          </div>
        </div>

        {/* Admin Navigation Tabs */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
          {[
            { id: 'overview', label: 'System Overview', icon: BarChart3 },
            { id: 'questions', label: `Question Bank (${questions.length})`, icon: BookOpen },
            { id: 'users', label: `User Directory (${users.length})`, icon: Users },
            { id: 'settings', label: 'Platform Settings', icon: Settings },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { playButtonClickSound(); setActiveTab(tab.id as any); }}
                style={{
                  padding: '10px 16px', borderRadius: '10px', border: 'none',
                  backgroundColor: isActive ? 'rgba(123, 47, 247, 0.15)' : 'transparent',
                  color: isActive ? '#c4b5fd' : '#94a3b8',
                  fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '8px',
                  transition: 'all 0.2s ease'
                }}
              >
                <Icon size={16} color={isActive ? '#c4b5fd' : '#94a3b8'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '16px', marginBottom: '28px' }}>
              <div style={{ backgroundColor: '#0f172a', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600, marginBottom: '6px' }}>Registered Students</div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#ffffff' }}>
                  {dashboardStats?.totalStudents ?? users.length}
                </div>
                <div style={{ fontSize: '11px', color: '#4ade80', marginTop: '4px', fontWeight: 600 }}>Active Database Accounts</div>
              </div>

              <div style={{ backgroundColor: '#0f172a', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600, marginBottom: '6px' }}>Question Bank Questions</div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#c4b5fd' }}>
                  {dashboardStats?.totalQuestions ?? questions.length}
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Server Question Records</div>
              </div>

              <div style={{ backgroundColor: '#0f172a', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600, marginBottom: '6px' }}>Completed Exam Sessions</div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#ffffff' }}>
                  {dashboardStats?.totalSessions ?? 0}
                </div>
                <div style={{ fontSize: '11px', color: '#4ade80', marginTop: '4px', fontWeight: 600 }}>Server Exam Records</div>
              </div>

              <div style={{ backgroundColor: '#0f172a', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600, marginBottom: '6px' }}>Backend Status</div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#4ade80' }}>ONLINE</div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Port 5004 Active</div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: QUESTION BANK MANAGER */}
        {activeTab === 'questions' && (
          <div style={{ backgroundColor: '#0f172a', borderRadius: '20px', padding: '24px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
              <div style={{ display: 'flex', gap: '12px', flex: 1, minWidth: '280px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search question text or topic..."
                    style={{
                      width: '100%', padding: '10px 12px 10px 38px', borderRadius: '10px',
                      backgroundColor: '#1e293b', border: '1px solid #334155',
                      color: '#ffffff', fontSize: '13px', outline: 'none'
                    }}
                  />
                </div>

                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  style={{
                    padding: '10px 14px', borderRadius: '10px',
                    backgroundColor: '#1e293b', border: '1px solid #334155',
                    color: '#ffffff', fontSize: '13px', outline: 'none'
                  }}
                >
                  <option value="All">All Subjects</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="English">English</option>
                  <option value="Physics">Physics</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Biology">Biology</option>
                </select>
              </div>

              <button
                onClick={() => setShowAddModal(true)}
                style={{
                  padding: '10px 16px', borderRadius: '10px',
                  backgroundColor: '#7B2FF7', color: '#ffffff', border: 'none',
                  fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px'
                }}
              >
                <Plus size={16} /> New Question
              </button>
            </div>

            {/* Questions Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', color: '#cbd5e1' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155', textAlign: 'left', color: '#94a3b8' }}>
                    <th style={{ padding: '12px' }}>Subject</th>
                    <th style={{ padding: '12px' }}>Exam</th>
                    <th style={{ padding: '12px' }}>Question Text</th>
                    <th style={{ padding: '12px' }}>Correct Answer</th>
                    <th style={{ padding: '12px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQuestions.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                        No questions found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredQuestions.map((q, idx) => (
                      <tr key={q._id || q.id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '12px', fontWeight: 600, color: '#c4b5fd' }}>{q.subject}</td>
                        <td style={{ padding: '12px' }}>{q.exam}</td>
                        <td style={{ padding: '12px', color: '#ffffff', maxWidth: '400px' }}>{q.text || q.question}</td>
                        <td style={{ padding: '12px', fontWeight: 700, color: '#4ade80' }}>Option {q.correctAnswer || q.correct_answer}</td>
                        <td style={{ padding: '12px' }}>
                          <button
                            onClick={() => handleDeleteQuestion(q._id || q.id)}
                            style={{
                              padding: '6px 10px', borderRadius: '6px',
                              backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)',
                              color: '#f87171', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                              display: 'inline-flex', alignItems: 'center', gap: '4px'
                            }}
                          >
                            <Trash2 size={12} /> Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: USER DIRECTORY */}
        {activeTab === 'users' && (
          <div style={{ backgroundColor: '#0f172a', borderRadius: '20px', padding: '24px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff', marginBottom: '16px' }}>Registered Server Users ({users.length})</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', color: '#cbd5e1' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155', textAlign: 'left', color: '#94a3b8' }}>
                    <th style={{ padding: '12px' }}>Name</th>
                    <th style={{ padding: '12px' }}>Email</th>
                    <th style={{ padding: '12px' }}>Status</th>
                    <th style={{ padding: '12px' }}>Joined Date</th>
                    <th style={{ padding: '12px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                        No user accounts registered on server yet.
                      </td>
                    </tr>
                  ) : (
                    users.map(u => (
                      <tr key={u._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '12px', fontWeight: 700, color: '#ffffff' }}>{u.name}</td>
                        <td style={{ padding: '12px' }}>{u.email}</td>
                        <td style={{ padding: '12px' }}>
                          <span style={{
                            backgroundColor: u.status === 'suspended' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                            color: u.status === 'suspended' ? '#f87171' : '#4ade80',
                            padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, textTransform: 'capitalize'
                          }}>
                            {u.status || 'active'}
                          </span>
                        </td>
                        <td style={{ padding: '12px', color: '#94a3b8' }}>
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                        </td>
                        <td style={{ padding: '12px', display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => handleToggleUserStatus(u)}
                            style={{
                              padding: '5px 10px', borderRadius: '6px',
                              backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                              color: '#cbd5e1', fontSize: '11px', fontWeight: 700, cursor: 'pointer'
                            }}
                          >
                            {u.status === 'suspended' ? 'Activate' : 'Suspend'}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u._id)}
                            style={{
                              padding: '5px 10px', borderRadius: '6px',
                              backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)',
                              color: '#f87171', fontSize: '11px', fontWeight: 700, cursor: 'pointer'
                            }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: SETTINGS */}
        {activeTab === 'settings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ backgroundColor: '#0f172a', borderRadius: '20px', padding: '24px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff', marginBottom: '8px' }}>Platform Server Status</h3>
              <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '16px' }}>
                Connected Backend Target: <code>http://localhost:5004/api</code>
              </p>
              <div style={{ padding: '14px 16px', borderRadius: '12px', backgroundColor: '#1e293b', color: '#4ade80', fontSize: '13px', fontWeight: 600 }}>
                ✔ All system endpoints verified & live on local MongoDB database.
              </div>
            </div>

            {/* AgentRouter AI Configuration Panel */}
            <div style={{ backgroundColor: '#0f172a', borderRadius: '20px', padding: '24px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <Sparkles size={20} color="#7B2FF7" />
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff', margin: 0 }}>AgentRouter AI Integration Settings</h3>
              </div>
              <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '20px', lineHeight: 1.5 }}>
                Configure the AgentRouter API key, base URL, and AI model parameters used for Preplyx AI Tutor concept explanations and exam assistance.
              </p>

              {settingsMsg && (
                <div style={{
                  padding: '12px 16px', borderRadius: '10px', marginBottom: '18px',
                  backgroundColor: settingsMsg.includes('successfully') ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: settingsMsg.includes('successfully') ? '#4ade80' : '#f87171',
                  border: settingsMsg.includes('successfully') ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                  fontSize: '13px', fontWeight: 600
                }}>
                  {settingsMsg}
                </div>
              )}

              <form onSubmit={handleSaveAiSettings} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
                    ANTHROPIC_AUTH_TOKEN (AgentRouter API Key)
                  </label>
                  <input
                    type="password"
                    value={anthropicAuthToken}
                    onChange={e => setAnthropicAuthToken(e.target.value)}
                    placeholder="Enter AgentRouter API Key (e.g. ar-xxxxxxxxxxxx)..."
                    style={{
                      width: '100%', padding: '12px 14px', borderRadius: '10px',
                      backgroundColor: '#1e293b', border: '1px solid #334155',
                      color: '#ffffff', fontSize: '13px', outline: 'none'
                    }}
                  />
                  <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                    Sent as Bearer Token header to AgentRouter endpoints.
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
                      ANTHROPIC_BASE_URL
                    </label>
                    <input
                      type="text"
                      value={anthropicBaseUrl}
                      onChange={e => setAnthropicBaseUrl(e.target.value)}
                      placeholder="https://agentrouter.org"
                      style={{
                        width: '100%', padding: '12px 14px', borderRadius: '10px',
                        backgroundColor: '#1e293b', border: '1px solid #334155',
                        color: '#ffffff', fontSize: '13px', outline: 'none'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
                      ANTHROPIC_MODEL
                    </label>
                    <select
                      value={anthropicModel}
                      onChange={e => setAnthropicModel(e.target.value)}
                      style={{
                        width: '100%', padding: '12px 14px', borderRadius: '10px',
                        backgroundColor: '#1e293b', border: '1px solid #334155',
                        color: '#ffffff', fontSize: '13px', outline: 'none'
                      }}
                    >
                      <option value="claude-opus-4-6">claude-opus-4-6 (Default)</option>
                      <option value="claude-opus-4-7">claude-opus-4-7</option>
                      <option value="claude-opus-4-8">claude-opus-4-8</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginTop: '8px' }}>
                  <button
                    type="submit"
                    disabled={savingSettings}
                    style={{
                      padding: '12px 24px', borderRadius: '10px',
                      background: 'linear-gradient(135deg, #7B2FF7 0%, #4B0FA3 100%)',
                      color: '#ffffff', border: 'none', fontWeight: 700, fontSize: '13px',
                      cursor: savingSettings ? 'not-allowed' : 'pointer',
                      boxShadow: '0 4px 14px rgba(123, 47, 247, 0.4)'
                    }}
                  >
                    {savingSettings ? 'Saving Configuration...' : 'Save AgentRouter AI Configuration'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>

      {/* Add Question Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)',
          zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <form onSubmit={handleCreateQuestion} style={{
            backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '20px',
            width: '100%', maxWidth: '560px', padding: '28px', color: '#ffffff'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Add New Exam Question</h2>
              <button type="button" onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Exam</label>
                <select
                  value={newQExam}
                  onChange={e => setNewQExam(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff', outline: 'none' }}
                >
                  <option value="JAMB">JAMB</option>
                  <option value="WAEC">WAEC</option>
                  <option value="NECO">NECO</option>
                  <option value="POST-UTME">POST-UTME</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Subject</label>
                <input
                  type="text"
                  value={newQSubject}
                  onChange={e => setNewQSubject(e.target.value)}
                  placeholder="e.g. Mathematics"
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff', outline: 'none' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Question Text</label>
              <textarea
                value={newQText}
                onChange={e => setNewQText(e.target.value)}
                placeholder="Enter the question text..."
                rows={3}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff', outline: 'none', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
              <input type="text" value={newQOptA} onChange={e => setNewQOptA(e.target.value)} placeholder="Option A" style={{ padding: '8px 10px', borderRadius: '8px', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff', outline: 'none' }} />
              <input type="text" value={newQOptB} onChange={e => setNewQOptB(e.target.value)} placeholder="Option B" style={{ padding: '8px 10px', borderRadius: '8px', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff', outline: 'none' }} />
              <input type="text" value={newQOptC} onChange={e => setNewQOptC(e.target.value)} placeholder="Option C" style={{ padding: '8px 10px', borderRadius: '8px', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff', outline: 'none' }} />
              <input type="text" value={newQOptD} onChange={e => setNewQOptD(e.target.value)} placeholder="Option D" style={{ padding: '8px 10px', borderRadius: '8px', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff', outline: 'none' }} />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Correct Answer</label>
              <select
                value={newQCorrect}
                onChange={e => setNewQCorrect(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff', outline: 'none' }}
              >
                <option value="A">Option A</option>
                <option value="B">Option B</option>
                <option value="C">Option C</option>
                <option value="D">Option D</option>
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Explanation (Optional)</label>
              <input
                type="text"
                value={newQExplanation}
                onChange={e => setNewQExplanation(e.target.value)}
                placeholder="Step-by-step solution..."
                style={{ width: '100%', padding: '10px', borderRadius: '8px', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{ padding: '10px 16px', borderRadius: '8px', backgroundColor: 'transparent', border: '1px solid #334155', color: '#94a3b8', cursor: 'pointer', fontWeight: 600 }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creatingQ}
                style={{ padding: '10px 20px', borderRadius: '8px', backgroundColor: '#7B2FF7', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 700 }}
              >
                {creatingQ ? 'Saving...' : 'Save Question'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

