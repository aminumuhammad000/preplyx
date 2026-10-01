// API utility functions to connect to backend server

import { API_BASE_URL } from '../config/api';

// Helper function to check if backend is available
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL.replace('/api', '')}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

export interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
}

export interface ExamData {
  subjects: string[];
  color: string;
  years: string;
  desc: string;
  questionCount?: string;
  displayName?: string;
}

export interface Question {
  id?: string;
  exam: string;
  subject: string;
  year?: string;
  text: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
}

class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        let message = `HTTP error! status: ${response.status}`;
        try {
          const parsed = JSON.parse(errorText);
          message = parsed?.meta?.error?.message ?? parsed?.error ?? parsed?.message ?? errorText;
        } catch {
          message = errorText || message;
        }
        throw new Error(`HTTP ${response.status}: ${message}`);
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      
      // Provide more specific error messages
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Unable to connect to backend server. Please ensure the backend is running on ' + API_BASE_URL);
      }
      
      throw error;
    }
  }

  // Exam endpoints
  async getExams(): Promise<Record<string, ExamData>> {
    return this.request<Record<string, ExamData>>('/exams');
  }

  async getExamSubjects(exam: string): Promise<ExamData> {
    return this.request<ExamData>(`/exams/${exam}/subjects`);
  }

  async getSubjectCategories(): Promise<Record<string, string[]>> {
    return this.request<Record<string, string[]>>('/exams/categories');
  }

  async getSubjectIcons(): Promise<Record<string, string>> {
    return this.request<Record<string, string>>('/exams/icons');
  }

  async getSubjectTips(): Promise<Record<string, string>> {
    return this.request<Record<string, string>>('/exams/tips');
  }

  async getExamAvailability(): Promise<Record<string, {
    hasQuestions: boolean;
    totalCount: number;
    years: string[];
    subjects: string[];
    subjectYears: Record<string, string[]>;
    topics: Record<string, string[]>;
  }>> {
    return this.request('/exams/availability');
  }

  // Question endpoints
  async getQuestions(params: {
    exam?: string;
    subject?: string;
    year?: string;
    limit?: number;
  }, token?: string): Promise<Question[]> {
    const queryParams = new URLSearchParams();
    if (params.exam) queryParams.append('exam', params.exam);
    if (params.subject) queryParams.append('subject', params.subject);
    if (params.year) queryParams.append('year', params.year);
    if (params.limit) queryParams.append('limit', params.limit.toString());

    const endpoint = `/questions?${queryParams.toString()}`;
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return this.request<Question[]>(endpoint, { headers });
  }

  // Auth endpoints
  async register(userData: {
    name: string;
    email: string;
    password: string;
  }): Promise<{ token: string; user: any }> {
    return this.request<{ token: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async login(credentials: {
    email: string;
    password: string;
  }): Promise<{ token: string; user: any }> {
    return this.request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  // Data endpoints
  async getStats(token: string): Promise<{
    questionsAnswered: number;
    averageAccuracy: number;
    studyTimeSeconds: number;
    currentStreak: number;
    monthlyStreak: number;
  }> {
    return this.request('/data/stats', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async getSessions(token: string): Promise<any[]> {
    return this.request('/data/sessions', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async getSubjectMastery(token: string): Promise<{
    subject: string;
    mastery: number;
    averageScore: number;
    totalSessions: number;
    fill: string;
  }[]> {
    return this.request('/data/subject-mastery', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  // Wallet endpoints
  async getWallet(token: string): Promise<{
    balance: number;
    totalFunded: number;
    totalSpent: number;
    welcomeBonus: number;
  }> {
    return this.request('/wallet', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async getTransactions(token: string): Promise<any[]> {
    return this.request('/wallet/transactions', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async deductWallet(token: string, amount: number, description?: string): Promise<any> {
    return this.request('/wallet/deduct', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ amount, description }),
    });
  }

  async getVirtualAccount(token: string): Promise<{
    bankName: string | null;
    accountName: string | null;
    accountNumber: string | null;
    hasVirtualAccount?: boolean;
  }> {
    return this.request('/wallet/virtual-account', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async createVirtualAccount(token: string): Promise<{
    bankName: string;
    accountName: string;
    accountNumber: string;
    username?: string;
  }> {
    return this.request('/wallet/virtual-account', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  // Leaderboard endpoints
  async getLeaderboard(token: string, filter: string = 'weekly'): Promise<any[]> {
    return this.request(`/leaderboard?filter=${filter}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async getUserRank(token: string): Promise<{
    rank: number | null;
    points: number;
    exams: number;
    streak: number;
  }> {
    return this.request('/leaderboard/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  // Session endpoints
  async startSession(token: string, data: {
    exam: string;
    subject: string;
    year?: string;
    limit?: number;
  }): Promise<{
    success: boolean;
    sessionId: string;
    questions: any[];
  }> {
    return this.request('/sessions/start', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
  }

  async submitSession(token: string, payload: {
    sessionId?: string;
    exam?: string;
    subject?: string;
    timeSpentSeconds?: number;
    answers: Array<{ questionId: string; selectedAnswer: string; confidence?: string }> | Record<string, string>;
    confidences?: Record<string, string>;
  }): Promise<{
    success: boolean;
    sessionId: string;
    score: number;
    total: number;
    percentage: number;
    correctCount: number;
    incorrectCount: number;
    unansweredCount: number;
    timeSpentSeconds: number;
    details: any[];
  }> {
    return this.request('/sessions/submit', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
  }

  async saveSession(token: string, sessionData: any): Promise<any> {
    return this.request('/sessions/submit', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(sessionData),
    });
  }

  async getSession(token: string, sessionId: string): Promise<any> {
    return this.request(`/sessions/${sessionId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async getReviewedQuestions(token: string): Promise<any[]> {
    return this.request('/sessions/reviewed-questions', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async getSessionAnalytics(token: string): Promise<{
    totalSessions: number;
    averageScore: number;
    totalTimeSpent: number;
    streak: number;
    activeDates: string[];
  }> {
    return this.request('/sessions/analytics', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  // User profile endpoints
  async getUserProfile(token: string): Promise<{
    _id: string;
    name: string;
    email: string;
    phone?: string;
    exam_type?: string;
    settings?: any;
    achievements?: any[];
    notifications?: any[];
  }> {
    return this.request('/user/profile', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async updateUserProfile(token: string, profileData: {
    name?: string;
    email?: string;
    phone?: string;
    exam_type?: string;
    password?: string;
    avatar?: string;
  }): Promise<any> {
    return this.request('/user/profile', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(profileData),
    });
  }

  async updateUserSettings(token: string, settings: any): Promise<any> {
    return this.request('/user/settings', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ settings }),
    });
  }

  // Admin endpoints
  async adminLogin(data: { email?: string; password?: string; pin?: string }): Promise<{
    token: string;
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      isAdmin: boolean;
    };
  }> {
    return this.request('/admin/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getAdminDashboard(token?: string): Promise<any> {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return this.request('/admin/dashboard', { headers });
  }

  async getAdminUsers(token?: string): Promise<any[]> {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return this.request('/admin/users', { headers });
  }

  async updateUserStatus(id: string, status: string, token?: string): Promise<any> {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return this.request(`/admin/users/${id}/status`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ status })
    });
  }

  async deleteAdminUser(id: string, token?: string): Promise<any> {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return this.request(`/admin/users/${id}`, {
      method: 'DELETE',
      headers
    });
  }

  async getAdminQuestions(params: { exam?: string; subject?: string; search?: string; page?: number; limit?: number }, token?: string): Promise<{ questions: any[]; total: number; page: number; totalPages: number }> {
    const queryParams = new URLSearchParams();
    if (params.exam) queryParams.append('exam', params.exam);
    if (params.subject) queryParams.append('subject', params.subject);
    if (params.search) queryParams.append('search', params.search);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());

    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    return this.request(`/admin/questions?${queryParams.toString()}`, { headers });
  }

  async createAdminQuestion(data: {
    exam: string;
    subject: string;
    text: string;
    options: string[];
    correctAnswer: string;
    explanation?: string;
  }, token?: string): Promise<any> {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return this.request('/admin/questions', {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });
  }

  async deleteAdminQuestion(id: string, token?: string): Promise<any> {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return this.request(`/admin/questions/${id}`, {
      method: 'DELETE',
      headers
    });
  }

  async getAdminSettings(token?: string): Promise<any> {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return this.request('/admin/settings', { headers });
  }

  async updateAdminSettings(settings: any, token?: string): Promise<any> {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return this.request('/admin/settings', {
      method: 'POST',
      headers,
      body: JSON.stringify(settings)
    });
  }

  // AI Tutor endpoints
  async askAiTutor(prompt: string, context?: any, token?: string): Promise<{ response: string }> {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return this.request<{ response: string }>('/ai/tutor', {
      method: 'POST',
      headers,
      body: JSON.stringify({ prompt, context })
    });
  }

  // Achievement endpoints
  async getAchievements(token: string): Promise<{
    achievements: any[];
    progress: {
      totalAchievements: number;
      unlocked: number;
      points: number;
      level: number;
    };
  }> {
    return this.request('/achievements', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async unlockAchievement(token: string, achievementId: number): Promise<any> {
    return this.request('/achievements/unlock', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ achievementId }),
    });
  }

  async updateAchievementProgress(token: string, achievementId: number, progress: number): Promise<any> {
    return this.request('/achievements/progress', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ achievementId, progress }),
    });
  }

  // Notification endpoints
  async getNotifications(token: string): Promise<any[]> {
    return this.request('/notifications', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async addNotification(token: string, notification: {
    type: string;
    title: string;
    message: string;
  }): Promise<any> {
    return this.request('/notifications', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(notification),
    });
  }

  async markNotificationAsRead(token: string, notificationId: number): Promise<any> {
    return this.request(`/notifications/${notificationId}/read`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async markAllNotificationsAsRead(token: string): Promise<any> {
    return this.request('/notifications/read-all', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async deleteNotification(token: string, notificationId: number): Promise<any> {
    return this.request(`/notifications/${notificationId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async clearAllNotifications(token: string): Promise<any> {
    return this.request('/notifications', {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  // Preplyx Onboarding & Target Planning Endpoints
  async setupTargetAndPlan(token: string, data: {
    targetExam: string;
    targetScore: number;
    examDate?: string;
    targetCourse?: string;
    targetInstitution?: string;
    subjects: string[];
    dailyStudyMinutes?: number;
    confidenceLevel?: string;
  }): Promise<any> {
    return this.request('/onboarding/setup', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
  }

  async getDiagnostic(token: string): Promise<any[]> {
    return this.request('/onboarding/diagnostic', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async completeDiagnostic(token: string, answers: Record<string, string>, confidenceMap?: Record<string, string>): Promise<{
    score: number;
    total: number;
    percentage: number;
    strongestSubject: string;
    weakestSubject: string;
    biggestOpportunityTopic: string;
    currentReadiness: number;
    targetScore: number;
    recommendedFirstMission: {
      subject: string;
      topic: string;
      questionCount: number;
      description: string;
    };
  }> {
    return this.request('/onboarding/diagnostic/complete', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ answers, confidenceMap }),
    });
  }

  async getDailyMission(token: string): Promise<{
    targetExam: string;
    targetScore: number;
    readinessScore: number;
    completedCount: number;
    totalCount: number;
    items: Array<{
      id: string;
      title: string;
      description: string;
      subject?: string;
      topic?: string;
      targetCount?: number;
      estimatedMinutes: number;
      completed: boolean;
      actionUrl: string;
      type: string;
    }>;
  }> {
    return this.request('/onboarding/mission', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async getReadinessScore(token: string): Promise<{
    exam: string;
    targetScore: number;
    estimatedCurrentScore: number;
    targetGap: number;
    overallReadiness: number;
    breakdown: Array<{
      metric: string;
      score: number;
      status: string;
      description: string;
    }>;
    actionPlan: string;
  }> {
    return this.request('/onboarding/readiness', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  // Preplyx Mistake Intelligence Endpoints
  async logMistake(token: string, data: {
    exam: string;
    subject: string;
    topic?: string;
    subtopic?: string;
    questionId: string;
    questionText: string;
    options: string[];
    selectedAnswer: string;
    correctAnswer: string;
    confidence?: string;
    difficulty?: string;
    timeSpentSeconds?: number;
  }): Promise<any> {
    return this.request('/mistakes/log', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
  }

  async getMistakes(token: string, params?: {
    exam?: string;
    subject?: string;
    dueOnly?: boolean;
    mastered?: boolean;
    limit?: number;
  }): Promise<{
    mistakes: any[];
    totalDue: number;
    totalUnmastered: number;
  }> {
    const q = new URLSearchParams();
    if (params?.exam) q.append('exam', params.exam);
    if (params?.subject) q.append('subject', params.subject);
    if (params?.dueOnly !== undefined) q.append('dueOnly', String(params.dueOnly));
    if (params?.mastered !== undefined) q.append('mastered', String(params.mastered));
    if (params?.limit) q.append('limit', String(params.limit));

    return this.request(`/mistakes?${q.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async explainWhyWrong(
    payloadOrToken:
      | {
          questionId?: string;
          questionText?: string;
          selectedAnswer: string;
          correctAnswer?: string;
          subject?: string;
          topic?: string;
          options?: string[];
        }
      | string,
    tokenOrPayload?: any
  ): Promise<{
    success: boolean;
    data: {
      correctAnswer: string;
      relevantConcept: string;
      whySelectedIsIncorrect: string;
      whySelectedIsTempting: string;
      correctReasoning: string;
      simpleExplanation: string;
      example: string;
      trapType?: string;
      similarPracticeQuestion?: any;
    };
  }> {
    let payload: any;
    let token: string | undefined;

    if (typeof payloadOrToken === 'string') {
      token = payloadOrToken;
      payload = tokenOrPayload;
    } else {
      payload = payloadOrToken;
      token = tokenOrPayload;
    }

    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res: any = await this.request('/mistakes/why-wrong', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (res && res.data) {
      return res;
    }
    return { success: true, data: res };
  }

  async reviewMistake(token: string, id: string, isCorrect: boolean): Promise<any> {
    return this.request(`/mistakes/${id}/review`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ isCorrect }),
    });
  }

  // Preplyx Question Error Reporting
  async submitQuestionReport(
    tokenOrReport: string | any,
    reportOrToken?: any
  ): Promise<any> {
    let token: string | undefined;
    let report: any;

    if (typeof tokenOrReport === 'string') {
      token = tokenOrReport;
      report = reportOrToken;
    } else {
      report = tokenOrReport;
      token = reportOrToken;
    }

    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    // Canonicalize reportType and userNotes
    const payload = {
      ...report,
      reportType: report.reportType || report.issueType || 'other',
      userNotes: report.userNotes || report.description || 'Content issue flagged by student',
    };

    return this.request('/question-reports', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
  }
}

export const api = new ApiClient();