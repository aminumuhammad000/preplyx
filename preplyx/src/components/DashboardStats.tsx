"use client";

import { useEffect, useState } from 'react';
import { Target, CheckCircle2, Clock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export interface OverallStats {
  questionsAnswered: number;
  averageAccuracy: number;
  studyTimeSeconds: number;
  currentStreak: number;
  monthlyStreak: number;
}

import { API_BASE_URL } from '../config/api';

export default function DashboardStats() {
  const [stats, setStats] = useState<OverallStats | null>(null);
  const [mounted, setMounted] = useState(false);
  const { token } = useAuth();

  useEffect(() => {
    setMounted(true);
    if (token) {
      fetch(`${API_BASE_URL}/data/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.error(err));
    }
  }, [token]);

  if (!mounted || !stats) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '16px', marginBottom: '28px' }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ borderRadius: '14px', padding: '16px 18px', backgroundColor: '#fff', border: '1px solid #f1f5f9', opacity: 0.6 }}>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>Loading stat...</div>
          </div>
        ))}
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    if (seconds === 0) return '0h 0m';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const statItems = [
    { label: 'Questions Answered', value: stats.questionsAnswered.toString(), icon: <Target size={18} color="#7c3aed" />, bg: '#f3e8ff' },
    { label: 'Average Accuracy', value: `${stats.averageAccuracy}%`, icon: <CheckCircle2 size={18} color="#16a34a" />, bg: '#dcfce7' },
    { label: 'Study Time', value: formatTime(stats.studyTimeSeconds), icon: <Clock size={18} color="#d97706" />, bg: '#fef3c7' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '16px', marginBottom: '28px' }}>
      {statItems.map(stat => (
        <div key={stat.label} className="header-hover-card" style={{
          borderRadius: '14px', padding: '16px 18px',
          backgroundColor: '#fff', boxShadow: 'none',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <div style={{ padding: '7px', borderRadius: '10px', backgroundColor: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {stat.icon}
            </div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stat.label}</div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a' }}>
            {stat.value}
          </div>
        </div>
      ))}
    </div>
  );
}
