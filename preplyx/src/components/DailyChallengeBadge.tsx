"use client";

import { useEffect, useState } from 'react';
import { Flame } from 'lucide-react';
import { getOverallStats } from '@/lib/storage';

export default function DailyChallengeBadge() {
  const [streak, setStreak] = useState<number>(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setStreak(getOverallStats().currentStreak);
  }, []);

  if (!mounted) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#FFF9E6', color: '#D97706', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, opacity: 0.5 }}>
        <Flame size={12} /> Loading...
      </span>
    );
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#FFF9E6', color: '#D97706', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600 }}>
      <Flame size={12} /> {streak}-Day Streak
    </span>
  );
}
