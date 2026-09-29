"use client";

import { useEffect, useState } from 'react';
import { Flame } from 'lucide-react';
import { getOverallStats, trackDailyActivity, OverallStats } from '@/lib/storage';

export default function StreakWidget() {
  const [stats, setStats] = useState<OverallStats | null>(null);
  const [mounted, setMounted] = useState(false);

  const loadStats = () => {
    setStats(getOverallStats());
  };

  useEffect(() => {
    setMounted(true);
    loadStats();
  }, []);

  const handleTrackStreak = () => {
    trackDailyActivity();
    loadStats(); // Refresh streak counter
  };

  if (!mounted || !stats) {
    return (
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        height: '38px', padding: '0 12px', borderRadius: '999px',
        backgroundColor: '#fff', border: '1px solid rgba(239, 68, 68, 0.18)',
        boxShadow: '0 2px 8px rgba(239, 68, 68, 0.06)',
        opacity: 0.85
      }}>
        <div style={{
          width: '24px', height: '24px', borderRadius: '50%',
          backgroundColor: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Flame size={13} style={{ color: '#ef4444' }} />
        </div>
        <span style={{ fontSize: '12px', fontWeight: 700, color: '#ef4444' }}>...</span>
      </div>
    );
  }

  return (
    <button 
      onClick={handleTrackStreak}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '8px',
        height: '38px', padding: '0 12px 0 6px', borderRadius: '999px',
        backgroundColor: '#ffffff',
        border: '1px solid #ffedd5',
        boxShadow: '0 1px 3px rgba(249, 115, 22, 0.06)', cursor: 'pointer',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        outline: 'none',
        userSelect: 'none'
      }}
      className="streak-nav-btn header-hover-card"
      title="Click to track today's activity!"
    >
      <div style={{
        width: '26px', height: '26px', borderRadius: '50%',
        backgroundColor: '#fff7ed',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0
      }}>
        <Flame size={14} style={{ color: '#ea580c' }} />
      </div>
      <span style={{ fontSize: '12px', fontWeight: 800, color: '#c2410c', letterSpacing: '-0.2px', whiteSpace: 'nowrap' }}>
        {stats.currentStreak} <span className="streak-label-text">Day{stats.currentStreak !== 1 ? 's' : ''} Streak</span>
      </span>
    </button>
  );
}
