import { useState, useEffect } from 'react';
import { 
  Moon, Sun, Bell, Globe, Shield, Lock, User, Palette, BookOpen, 
  Volume2, VolumeX, Save, CheckCircle2, RefreshCw, X, ShieldCheck, 
  SlidersHorizontal, Building2, Key, ChevronRight, Sparkles, Smartphone, Mail, Play
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { getStoredSettings, saveStoredSettings } from '../lib/storage';
import { testSound, isSoundEnabled, setSoundEnabled } from '../lib/soundEffects';

export default function Settings() {
  const [activeTab, setActiveTab] = useState<'appearance' | 'exam' | 'notifications' | 'account'>('appearance');

  // Form & Setting states initialized from local storage
  const stored = getStoredSettings();
  const [darkMode, setDarkMode] = useState(stored.darkMode);
  const [notifications, setNotifications] = useState(stored.notifications);
  const [emailNotifications, setEmailNotifications] = useState(stored.emailNotifications);
  const [soundEffects, setSoundEffects] = useState(stored.soundEffects);
  const [autoSaveSession, setAutoSaveSession] = useState(stored.autoSaveSession);
  const [fontSize, setFontSize] = useState<'standard' | 'large' | 'xlarge'>(stored.fontSize);
  const [examType, setExamType] = useState('JAMB');
  const [questionCount, setQuestionCount] = useState(stored.questionCount);
  const [language, setLanguage] = useState(stored.language);

  // User Profile fields
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPhone, setUserPhone] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const { token, user } = useAuth();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  useEffect(() => {
    const loadSettings = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        const data = await api.getUserProfile(token);
        
        if (data) {
          setUserName(data.name || user?.name || '');
          setUserEmail(data.email || user?.email || '');
          setUserPhone(data.phone || '');
          setExamType(data.exam_type || 'JAMB');

          if (data.settings) {
            setDarkMode(data.settings.darkMode || false);
            setNotifications(data.settings.notifications !== false);
            setEmailNotifications(data.settings.emailNotifications !== false);
            setSoundEffects(data.settings.soundEffects !== false);
            setAutoSaveSession(data.settings.autoSaveSession !== false);
            setLanguage(data.settings.language || 'English');
            setFontSize(data.settings.fontSize || 'standard');
            setQuestionCount(data.settings.questionCount || '40');
            saveStoredSettings(data.settings);
          }
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [token]);

  const handleSaveSettings = async () => {
    // 1. Update Preferences locally first
    const newSettings = {
      darkMode,
      notifications,
      emailNotifications,
      soundEffects,
      autoSaveSession,
      language,
      fontSize,
      questionCount
    };
    saveStoredSettings(newSettings);

    if (!token) {
      showToast('Preferences saved locally!');
      return;
    }
    setSaving(true);

    try {
      // Update Profile (name, phone, exam_type)
      await api.updateUserProfile(token, {
        name: userName,
        phone: userPhone,
        exam_type: examType
      }).catch(() => null);

      await api.updateUserSettings(token, newSettings).catch(() => null);

      showToast('Settings & preferences saved successfully!');
    } catch (err) {
      showToast('Preferences updated locally!');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '16px' }}>
        <div style={{
          width: '56px', height: '56px', borderRadius: '16px', backgroundColor: 'rgba(123, 47, 247, 0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <SlidersHorizontal size={28} color="#7B2FF7" style={{ animation: 'pulse 1.5s infinite' }} />
        </div>
        <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Loading Settings & Preferences...</p>
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)', paddingBottom: '40px', width: '100%' }}>
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="wallet-toast">
          <CheckCircle2 size={18} color="#4ade80" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Action Bar (Full Container Width) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text-main)', letterSpacing: '-0.5px', margin: 0 }}>
              Settings & Preferences
            </h1>
            <span style={{
              fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
              backgroundColor: 'rgba(123, 47, 247, 0.1)', color: '#7B2FF7', padding: '3px 10px', borderRadius: '20px'
            }}>
              PREPLYX ENGINE v2.4
            </span>
          </div>
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', margin: 0 }}>
            Manage your interface appearance, CBT exam setup, study alerts, and account security.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            style={{
              padding: '10px 20px', borderRadius: '12px', background: 'var(--gradient-primary)',
              color: '#ffffff', border: 'none', fontSize: '13px', fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
              boxShadow: '0 4px 14px rgba(123, 47, 247, 0.35)', transition: 'all 0.2s ease',
              opacity: saving ? 0.8 : 1
            }}
          >
            {saving ? (
              <>
                <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Full-Width 2-Column Grid */}
      <div className="settings-layout-grid">
        
        {/* Left Category Tabs Navigation (Sidebar) */}
        <div style={{
          backgroundColor: '#ffffff', borderRadius: '20px', padding: '14px',
          border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-soft)',
          display: 'flex', flexDirection: 'column', gap: '6px'
        }}>
          <button
            onClick={() => setActiveTab('appearance')}
            style={{
              padding: '12px 14px', borderRadius: '12px', border: 'none',
              fontSize: '13px', fontWeight: 700, cursor: 'pointer', textAlign: 'left',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              backgroundColor: activeTab === 'appearance' ? 'rgba(123, 47, 247, 0.08)' : 'transparent',
              color: activeTab === 'appearance' ? '#7B2FF7' : '#475569',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Palette size={18} color={activeTab === 'appearance' ? '#7B2FF7' : '#64748b'} />
              <span>Appearance</span>
            </div>
            <ChevronRight size={15} opacity={activeTab === 'appearance' ? 1 : 0.4} />
          </button>

          <button
            onClick={() => setActiveTab('exam')}
            style={{
              padding: '12px 14px', borderRadius: '12px', border: 'none',
              fontSize: '13px', fontWeight: 700, cursor: 'pointer', textAlign: 'left',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              backgroundColor: activeTab === 'exam' ? 'rgba(123, 47, 247, 0.08)' : 'transparent',
              color: activeTab === 'exam' ? '#7B2FF7' : '#475569',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <BookOpen size={18} color={activeTab === 'exam' ? '#7B2FF7' : '#64748b'} />
              <span>CBT Exam Setup</span>
            </div>
            <ChevronRight size={15} opacity={activeTab === 'exam' ? 1 : 0.4} />
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            style={{
              padding: '12px 14px', borderRadius: '12px', border: 'none',
              fontSize: '13px', fontWeight: 700, cursor: 'pointer', textAlign: 'left',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              backgroundColor: activeTab === 'notifications' ? 'rgba(123, 47, 247, 0.08)' : 'transparent',
              color: activeTab === 'notifications' ? '#7B2FF7' : '#475569',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Bell size={18} color={activeTab === 'notifications' ? '#7B2FF7' : '#64748b'} />
              <span>Notifications</span>
            </div>
            <ChevronRight size={15} opacity={activeTab === 'notifications' ? 1 : 0.4} />
          </button>

          <button
            onClick={() => setActiveTab('account')}
            style={{
              padding: '12px 14px', borderRadius: '12px', border: 'none',
              fontSize: '13px', fontWeight: 700, cursor: 'pointer', textAlign: 'left',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              backgroundColor: activeTab === 'account' ? 'rgba(123, 47, 247, 0.08)' : 'transparent',
              color: activeTab === 'account' ? '#7B2FF7' : '#475569',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldCheck size={18} color={activeTab === 'account' ? '#7B2FF7' : '#64748b'} />
              <span>Account & Security</span>
            </div>
            <ChevronRight size={15} opacity={activeTab === 'account' ? 1 : 0.4} />
          </button>
        </div>

        {/* Right Active Panel Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* TAB 1: APPEARANCE */}
          {activeTab === 'appearance' && (
            <div style={{
              backgroundColor: '#ffffff', borderRadius: '22px', padding: '26px',
              border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-soft)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '22px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                <Palette size={20} color="#7B2FF7" />
                <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Appearance & Theme Settings</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                {/* Dark Mode Toggle */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '2px' }}>Dark Theme Interface</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Switch dashboard visuals to dark mode for comfortable night studying.</div>
                  </div>

                  <button
                    onClick={() => {
                      const nextState = !darkMode;
                      setDarkMode(nextState);
                      const updated = saveStoredSettings({ darkMode: nextState });
                      if (token) {
                        api.updateUserSettings(token, updated).catch(() => null);
                      }
                      showToast(nextState ? 'Dark Mode Activated' : 'Light Mode Activated');
                    }}
                    style={{
                      padding: '8px 18px', borderRadius: '20px', border: 'none',
                      backgroundColor: darkMode ? '#7B2FF7' : '#e2e8f0',
                      color: darkMode ? '#ffffff' : '#475569',
                      fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '6px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {darkMode ? <Moon size={14} /> : <Sun size={14} />}
                    {darkMode ? 'Dark Theme Active' : 'Light Mode Active'}
                  </button>
                </div>

                <div style={{ borderTop: '1px solid #f8fafc' }} />

                {/* Font Size Selector */}
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>CBT Reading Text Size</div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '14px' }}>Adjust question font sizing inside practice CBT exam runners.</div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: '10px' }}>
                    {(['standard', 'large', 'xlarge'] as const).map(size => (
                      <button
                        key={size}
                        onClick={() => {
                          setFontSize(size);
                          const updated = saveStoredSettings({ fontSize: size });
                          if (token) {
                            api.updateUserSettings(token, updated).catch(() => null);
                          }
                          showToast(`Font Size updated to ${size}`);
                        }}
                        style={{
                          padding: '12px', borderRadius: '12px', border: '2px solid',
                          borderColor: fontSize === size ? '#7B2FF7' : '#e2e8f0',
                          backgroundColor: fontSize === size ? 'rgba(123, 47, 247, 0.05)' : '#f8fafc',
                          color: fontSize === size ? '#7B2FF7' : '#475569',
                          fontSize: '12px', fontWeight: 700, textTransform: 'capitalize', cursor: 'pointer',
                          textAlign: 'center'
                        }}
                      >
                        {size === 'standard' ? 'Standard (14px)' : size === 'large' ? 'Large (16px)' : 'Extra Large (18px)'}
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: CBT EXAM SETUP */}
          {activeTab === 'exam' && (
            <div style={{
              backgroundColor: '#ffffff', borderRadius: '22px', padding: '26px',
              border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-soft)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '22px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                <BookOpen size={20} color="#7B2FF7" />
                <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', margin: 0 }}>CBT Exam Defaults & Audio</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                {/* Target Exam Selector */}
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>Primary Exam Category</div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px' }}>Sets default question bank when launching quick practice exams.</div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 120px), 1fr))', gap: '10px' }}>
                    {['JAMB', 'WAEC', 'NECO', 'POST-UTME'].map(type => (
                      <button
                        key={type}
                        onClick={() => {
                          setExamType(type);
                          if (token) {
                            api.updateUserProfile(token, { exam_type: type }).catch(() => null);
                          }
                          showToast(`Default Exam set to ${type}`);
                        }}
                        style={{
                          padding: '12px', borderRadius: '12px', border: '2px solid',
                          borderColor: examType === type ? '#7B2FF7' : '#e2e8f0',
                          backgroundColor: examType === type ? '#7B2FF7' : '#f8fafc',
                          color: examType === type ? '#ffffff' : '#334155',
                          fontSize: '13px', fontWeight: 600, cursor: 'pointer'
                        }}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #f8fafc' }} />

                {/* CBT Sound Effects */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '2px' }}>CBT Audio Effects</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Play subtle audio feedback for answer selection and exam timer warnings.</div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {soundEffects && (
                      <button
                        onClick={() => testSound()}
                        title="Click to test sound effect"
                        style={{
                          padding: '8px 14px', borderRadius: '20px', border: '1px solid #cbd5e1',
                          backgroundColor: '#f8fafc', color: '#7B2FF7',
                          fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: '5px'
                        }}
                      >
                        <Play size={13} /> Test Audio
                      </button>
                    )}

                    <button
                      onClick={() => {
                        const nextState = !soundEffects;
                        setSoundEffects(nextState);
                        setSoundEnabled(nextState);
                        const updated = saveStoredSettings({ soundEffects: nextState });
                        if (token) {
                          api.updateUserSettings(token, updated).catch(() => null);
                        }
                        if (nextState) {
                          testSound();
                        }
                        showToast(nextState ? 'Sound Effects Enabled' : 'Sound Muted');
                      }}
                      style={{
                        padding: '8px 18px', borderRadius: '20px', border: 'none',
                        backgroundColor: soundEffects ? '#16a34a' : '#e2e8f0',
                        color: soundEffects ? '#ffffff' : '#475569',
                        fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '6px'
                      }}
                    >
                      {soundEffects ? <Volume2 size={15} /> : <VolumeX size={15} />}
                      {soundEffects ? 'Sound Enabled' : 'Muted'}
                    </button>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #f8fafc' }} />

                {/* Auto Save Session Progress */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '2px' }}>Auto-Save Practice State</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Automatically save unanswered & answered questions continuously so progress is never lost.</div>
                  </div>

                  <button
                    onClick={() => {
                      const nextState = !autoSaveSession;
                      setAutoSaveSession(nextState);
                      const updated = saveStoredSettings({ autoSaveSession: nextState });
                      if (token) {
                        api.updateUserSettings(token, updated).catch(() => null);
                      }
                      showToast(nextState ? 'Auto-Save Session Enabled' : 'Auto-Save Disabled');
                    }}
                    style={{
                      padding: '8px 18px', borderRadius: '20px', border: 'none',
                      backgroundColor: autoSaveSession ? '#16a34a' : '#e2e8f0',
                      color: autoSaveSession ? '#ffffff' : '#475569',
                      fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '6px'
                    }}
                  >
                    <Save size={14} />
                    {autoSaveSession ? 'Active' : 'Disabled'}
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* TAB 3: NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div style={{
              backgroundColor: '#ffffff', borderRadius: '22px', padding: '26px',
              border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-soft)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '22px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                <Bell size={20} color="#7B2FF7" />
                <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Study Notifications & Reminders</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                {/* Push Reminders */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '2px' }}>Daily Practice Prompts</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Receive daily evening study reminders to keep your streak active.</div>
                  </div>

                  <button
                    onClick={() => {
                      const nextState = !notifications;
                      setNotifications(nextState);
                      const updated = saveStoredSettings({ notifications: nextState });
                      if (token) {
                        api.updateUserSettings(token, updated).catch(() => null);
                      }
                      showToast(nextState ? 'Daily Practice Reminders Enabled' : 'Reminders Turned Off');
                    }}
                    style={{
                      padding: '8px 18px', borderRadius: '20px', border: 'none',
                      backgroundColor: notifications ? '#16a34a' : '#e2e8f0',
                      color: notifications ? '#ffffff' : '#475569',
                      fontSize: '12px', fontWeight: 700, cursor: 'pointer'
                    }}
                  >
                    {notifications ? 'Enabled' : 'Off'}
                  </button>
                </div>

                <div style={{ borderTop: '1px solid #f8fafc' }} />

                {/* Email Performance Reports */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '2px' }}>Weekly Performance Email</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Get a weekly summary breakdown of your subject mastery and score trends.</div>
                  </div>

                  <button
                    onClick={() => {
                      const nextState = !emailNotifications;
                      setEmailNotifications(nextState);
                      const updated = saveStoredSettings({ emailNotifications: nextState });
                      if (token) {
                        api.updateUserSettings(token, updated).catch(() => null);
                      }
                      showToast(nextState ? 'Weekly Email Reports Enabled' : 'Email Reports Turned Off');
                    }}
                    style={{
                      padding: '8px 18px', borderRadius: '20px', border: 'none',
                      backgroundColor: emailNotifications ? '#16a34a' : '#e2e8f0',
                      color: emailNotifications ? '#ffffff' : '#475569',
                      fontSize: '12px', fontWeight: 700, cursor: 'pointer'
                    }}
                  >
                    {emailNotifications ? 'Enabled' : 'Off'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ACCOUNT & SECURITY */}
          {activeTab === 'account' && (
            <div style={{
              backgroundColor: '#ffffff', borderRadius: '22px', padding: '26px',
              border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-soft)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '22px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                <ShieldCheck size={20} color="#7B2FF7" />
                <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Account Details & Security</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {/* Full Name */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Full Name</label>
                  <input
                    type="text"
                    value={userName}
                    onChange={e => setUserName(e.target.value)}
                    style={{
                      width: '100%', padding: '11px 14px', borderRadius: '10px',
                      border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none',
                      backgroundColor: '#ffffff', color: '#0f172a'
                    }}
                  />
                </div>

                {/* Email Address */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Email Address</label>
                  <input
                    type="email"
                    value={userEmail}
                    disabled
                    style={{
                      width: '100%', padding: '11px 14px', borderRadius: '10px',
                      border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none',
                      backgroundColor: '#f8fafc', color: '#64748b', cursor: 'not-allowed'
                    }}
                  />
                </div>

                {/* Phone Number */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Phone Number</label>
                  <input
                    type="text"
                    value={userPhone}
                    onChange={e => setUserPhone(e.target.value)}
                    placeholder="Enter phone number (e.g. 08012345678)"
                    style={{
                      width: '100%', padding: '11px 14px', borderRadius: '10px',
                      border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none',
                      backgroundColor: '#ffffff', color: '#0f172a'
                    }}
                  />
                </div>

                <div style={{ borderTop: '1px solid #f8fafc', marginTop: '6px' }} />

                {/* Security Status Box */}
                <div style={{ padding: '16px', borderRadius: '14px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <ShieldCheck size={22} color="#16a34a" />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#14532d' }}>Account Protection Active</div>
                      <div style={{ fontSize: '11px', color: '#166534' }}>Your account is secured with JWT authentication encryption.</div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}



        </div>

      </div>

    </div>
  );
}
