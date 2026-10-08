"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type User = {
  _id: string;
  name: string;
  email: string;
  full_name?: string;
  phone?: string;
  exam_type?: string;
  targetExam?: string;
  targetScore?: number;
  subjects?: string[];
  diagnosticCompleted?: boolean;
  dailyStudyMinutes?: number;
  readinessScore?: number;
  avatar?: string;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  login: (userData: User, token: string, rememberMe?: boolean) => void;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

import { API_BASE_URL } from '../config/api';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for saved token on load (either localStorage or sessionStorage)
    const savedToken = localStorage.getItem('preplyx_token') || sessionStorage.getItem('preplyx_token');
    if (savedToken) {
      setToken(savedToken);
      fetch(`${API_BASE_URL}/auth/profile`, {
        headers: { Authorization: `Bearer ${savedToken}` }
      })
      .then(res => {
        if (!res.ok) {
          if (res.status === 401) {
            localStorage.removeItem('preplyx_token');
            sessionStorage.removeItem('preplyx_token');
            setToken(null);
            setUser(null);
          }
          throw new Error('Failed to fetch profile');
        }
        return res.json();
      })
      .then(data => setUser(data))
      .catch(() => {
        localStorage.removeItem('preplyx_token');
        sessionStorage.removeItem('preplyx_token');
        setToken(null);
      })
      .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = (userData: User, newToken: string, rememberMe: boolean = false) => {
    setUser(userData);
    setToken(newToken);
    if (rememberMe) {
      localStorage.setItem('preplyx_token', newToken);
      sessionStorage.removeItem('preplyx_token');
    } else {
      sessionStorage.setItem('preplyx_token', newToken);
      localStorage.removeItem('preplyx_token');
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('preplyx_token');
    sessionStorage.removeItem('preplyx_token');
  };

  const updateUser = (userData: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...userData } as User : null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
