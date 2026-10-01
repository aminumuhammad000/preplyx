export interface ActiveSession {
  sessionId?: string;
  exam: string;
  subject: string;
  subjects?: string[];
  currentSubjectIndex?: number;
  currentSubject?: string;
  currentQIndex: number;
  answers: Record<string, string> | Record<number, string>;
  flagged: string[];
  timeLeft?: number;
  lastAccessed?: number;
  timestamp?: number;
  totalQ: number;
}

export interface CompletedSession {
  id: string;
  exam: string;
  subject: string;
  score: number;
  total: number;
  pct: number;
  date: number;
  status?: 'completed' | 'timed_out' | 'in_progress' | 'abandoned_0_answers';
  answeredCount?: number;
  timeSpentSeconds?: number;
  answers?: Record<string, string>;
  confidences?: Record<string, string>;
  questions?: any[];
  subjectResults?: Record<string, { score: number; total: number; pct: number }>;
  details?: {
    questionId: string;
    questionText: string;
    userAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    explanation?: string;
  }[];
}

export interface OverallStats {
  questionsAnswered: number;
  averageAccuracy: number;
  studyTimeSeconds: number;
  currentStreak: number;
  monthlyStreak: number;
}

export interface UserSettings {
  darkMode: boolean;
  notifications: boolean;
  emailNotifications: boolean;
  soundEffects: boolean;
  autoSaveSession: boolean;
  language: string;
  fontSize: 'standard' | 'large' | 'xlarge';
  questionCount: string;
}

const SETTINGS_KEY = 'preplyx_settings';

export const DEFAULT_SETTINGS: UserSettings = {
  darkMode: false,
  notifications: true,
  emailNotifications: true,
  soundEffects: true,
  autoSaveSession: true,
  language: 'English',
  fontSize: 'standard',
  questionCount: '40'
};

export function applyDarkMode(enabled: boolean) {
  if (typeof window === 'undefined') return;
  if (enabled) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export function applyFontSize(size: 'standard' | 'large' | 'xlarge') {
  if (typeof window === 'undefined') return;
  document.documentElement.classList.remove('font-standard', 'font-large', 'font-xlarge');
  document.documentElement.classList.add(`font-${size}`);
}

export function getStoredSettings(): UserSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    const settings = raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
    applyDarkMode(settings.darkMode);
    applyFontSize(settings.fontSize);
    return settings;
  } catch (e) {
    return DEFAULT_SETTINGS;
  }
}

export function saveStoredSettings(settings: Partial<UserSettings>): UserSettings {
  const current = getStoredSettings();
  const updated = { ...current, ...settings };
  if (typeof window !== 'undefined') {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    if (updated.darkMode !== undefined) applyDarkMode(updated.darkMode);
    if (updated.fontSize !== undefined) applyFontSize(updated.fontSize);
  }
  return updated;
}

const ACTIVE_SESSION_KEY = 'preplyx_active_session';
const COMPLETED_SESSIONS_KEY = 'preplyx_completed_sessions';
const ACTIVE_DAYS_KEY = 'preplyx_active_days';

export function trackDailyActivity() {
  if (typeof window === 'undefined') return;
  const today = new Date().toISOString().split('T')[0];
  const activeDaysStr = localStorage.getItem(ACTIVE_DAYS_KEY);
  let activeDays: string[] = activeDaysStr ? JSON.parse(activeDaysStr) : [];
  
  if (!activeDays.includes(today)) {
    activeDays.push(today);
    localStorage.setItem(ACTIVE_DAYS_KEY, JSON.stringify(activeDays));
  }
}

export function getActiveDays(): string[] {
  if (typeof window === 'undefined') return [];
  const activeDaysStr = localStorage.getItem(ACTIVE_DAYS_KEY);
  return activeDaysStr ? JSON.parse(activeDaysStr) : [];
}

export function saveActiveSession(session: ActiveSession) {
  if (typeof window === 'undefined') return;
  const settings = getStoredSettings();
  if (settings.autoSaveSession !== false) {
    const updatedSession = {
      ...session,
      lastAccessed: Date.now(),
      timestamp: session.timestamp || Date.now()
    };
    localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(updatedSession));
  }
}

export function getActiveSession(): ActiveSession | null {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem(ACTIVE_SESSION_KEY);
  return data ? JSON.parse(data) : null;
}

export function clearActiveSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACTIVE_SESSION_KEY);
}

export function saveCompletedSession(session: CompletedSession) {
  if (typeof window === 'undefined') return;
  const sessions = getCompletedSessions();
  const filtered = sessions.filter(s => s.id !== session.id);
  filtered.unshift(session);
  localStorage.setItem(COMPLETED_SESSIONS_KEY, JSON.stringify(filtered));
  localStorage.setItem(`completed_${session.id}`, JSON.stringify(session));
  localStorage.setItem('preplyx_latest_session', JSON.stringify(session));
}

export function getCompletedSessions(): CompletedSession[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(COMPLETED_SESSIONS_KEY);
  return data ? JSON.parse(data) : [];
}

export function getCompletedSessionById(id?: string | null): CompletedSession | null {
  if (typeof window === 'undefined') return null;

  if (id) {
    // 1. Direct key check
    const direct = localStorage.getItem(`completed_${id}`);
    if (direct) {
      try { return JSON.parse(direct); } catch (e) {}
    }

    // 2. Array search
    const sessions = getCompletedSessions();
    const found = sessions.find(s => s.id === id);
    if (found) return found;
  }

  // 3. Fallback to latest session
  const latest = localStorage.getItem('preplyx_latest_session');
  if (latest) {
    try { return JSON.parse(latest); } catch (e) {}
  }

  // 4. Return first session in list if any
  const sessions = getCompletedSessions();
  if (sessions.length > 0) return sessions[0];

  return null;
}

export function getOverallStats(): OverallStats {
  const sessions = getCompletedSessions();
  if (sessions.length === 0) {
    return { questionsAnswered: 0, averageAccuracy: 0, studyTimeSeconds: 0, currentStreak: 0, monthlyStreak: 0 };
  }

  let totalQuestions = 0;
  let totalScore = 0;

  sessions.forEach(s => {
    totalQuestions += s.total;
    totalScore += s.score;
  });

  const accuracy = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0;
  const studyTimeSeconds = totalQuestions * 60;

  const activeDays = getActiveDays();
  const uniqueDays = new Set<string>(activeDays);
  
  sessions.forEach(s => {
    const d = new Date(s.date);
    uniqueDays.add(d.toISOString().split('T')[0]);
  });

  const currentMonthDays = new Set<string>();
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  Array.from(uniqueDays).forEach(dateString => {
    const d = new Date(dateString);
    if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
      currentMonthDays.add(dateString);
    }
  });

  const sortedDays = Array.from(uniqueDays).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  
  let currentStreak = 0;
  const todayStr = now.toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  if (sortedDays.includes(todayStr) || sortedDays.includes(yesterdayStr)) {
    let checkDate = new Date(sortedDays[0]);
    currentStreak = 1;
    for (let i = 1; i < sortedDays.length; i++) {
      const prevDate = new Date(sortedDays[i]);
      const diffTime = Math.abs(checkDate.getTime() - prevDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      
      if (diffDays === 1) {
        currentStreak++;
        checkDate = prevDate;
      } else {
        break;
      }
    }
  }

  return {
    questionsAnswered: totalQuestions,
    averageAccuracy: accuracy,
    studyTimeSeconds,
    currentStreak,
    monthlyStreak: currentMonthDays.size
  };
}
