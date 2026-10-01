import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Trophy, Medal, Crown, TrendingUp, Search, 
  Flame, BookOpen, Sparkles, RefreshCw, Zap, 
  ShieldCheck, Info, ChevronRight, Filter, Target
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

interface LeaderboardEntry {
  rank: number;
  name: string;
  avatar?: string;
  points: number;
  exams?: number;
  streak?: number;
  school?: string;
  exam?: string;
  isCurrentUser?: boolean;
}

export default function Leaderboard() {
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const [timeFilter, setTimeFilter] = useState<'daily' | 'weekly' | 'monthly' | 'all'>('weekly');
  const [examFilter, setExamFilter] = useState<string>('all');
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showXpInfo, setShowXpInfo] = useState(false);

  const fetchLeaderboard = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);

      const [data, rank] = await Promise.all([
        api.getLeaderboard(token || '', timeFilter).catch(() => []),
        token ? api.getUserRank(token).catch(() => null) : Promise.resolve(null)
      ]);

      setLeaderboardData(Array.isArray(data) ? data : []);
      setUserRank(rank);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch leaderboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [token, timeFilter]);

  // Fallback demo data if backend returns empty list
  const effectiveLeaderboard = useMemo(() => {
    if (leaderboardData && leaderboardData.length > 0) {
      return leaderboardData.map((d, idx) => ({
        ...d,
        exam: d.exam || (idx % 3 === 0 ? 'JAMB' : idx % 3 === 1 ? 'WAEC' : 'NECO')
      }));
    }
    
    return [
      { rank: 1, name: 'Sarah Johnson', avatar: 'SJ', points: 2840, exams: 28, streak: 14, exam: 'JAMB', school: 'JAMB UTME' },
      { rank: 2, name: 'Emmanuel Okafor', avatar: 'EO', points: 2560, exams: 24, streak: 11, exam: 'WAEC', school: 'WAEC SSCE' },
      { rank: 3, name: 'Fatima Ahmed', avatar: 'FA', points: 2390, exams: 22, streak: 9, exam: 'JAMB', school: 'JAMB UTME' },
      { rank: 4, name: 'Chinedu Eze', avatar: 'CE', points: 2150, exams: 19, streak: 7, exam: 'POST-UTME', school: 'Post-UTME' },
      { rank: 5, name: 'Grace Adebayo', avatar: 'GA', points: 1980, exams: 18, streak: 8, exam: 'NECO', school: 'NECO SSCE' },
      { rank: 6, name: 'David Nnamdi', avatar: 'DN', points: 1820, exams: 16, streak: 5, exam: 'JAMB', school: 'JAMB UTME' },
      { rank: 7, name: user?.name || 'You (Student)', avatar: 'ST', points: userRank?.points || 1650, exams: userRank?.exams || 15, streak: userRank?.streak || 7, exam: 'JAMB', school: 'JAMB UTME', isCurrentUser: true },
      { rank: 8, name: 'Blessing Ibrahim', avatar: 'BI', points: 1540, exams: 14, streak: 6, exam: 'WAEC', school: 'WAEC SSCE' },
      { rank: 9, name: 'Olusegun Peters', avatar: 'OP', points: 1420, exams: 13, streak: 4, exam: 'POST-UTME', school: 'Post-UTME' },
      { rank: 10, name: 'Ngozi Onwudiwe', avatar: 'NO', points: 1310, exams: 12, streak: 10, exam: 'JAMB', school: 'JAMB UTME' }
    ];
  }, [leaderboardData, userRank, user]);

  // Filtered & sorted entries based on search input and exam category
  const filteredLeaderboard = useMemo(() => {
    let result = [...effectiveLeaderboard];

    // Exam Filter
    if (examFilter !== 'all') {
      result = result.filter(entry => {
        const itemExam = (entry.exam || entry.school || '').toUpperCase();
        return itemExam.includes(examFilter.toUpperCase());
      });
    }

    // Search Query Filter
    if (searchQuery.trim()) {
      result = result.filter(entry => 
        entry.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (entry.school && entry.school.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (entry.exam && entry.exam.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Re-assign rank numbers dynamically after filtering
    return result.map((item, idx) => ({ ...item, displayRank: idx + 1 }));
  }, [effectiveLeaderboard, examFilter, searchQuery]);

  // Top 3 Podium Winners
  const top3 = useMemo(() => {
    return {
      first: filteredLeaderboard[0] || null,
      second: filteredLeaderboard[1] || null,
      third: filteredLeaderboard[2] || null
    };
  }, [filteredLeaderboard]);

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Crown size={16} color="#f59e0b" />;
    if (rank === 2) return <Medal size={16} color="#94a3b8" />;
    if (rank === 3) return <Medal size={16} color="#d97706" />;
    return <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>#{rank}</span>;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '16px' }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '14px',
          background: 'linear-gradient(135deg, #4B0FA3 0%, #7B2FF7 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(123, 47, 247, 0.25)'
        }}>
          <Trophy size={24} color="#ffffff" />
        </div>
        <div style={{ textAlign: 'center' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>Loading Leaderboard Rankings</h3>
          <p style={{ fontSize: '13px', color: '#64748b' }}>Fetching candidate scores across Nigeria...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: '16px' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <p style={{ fontSize: '14px', color: '#ef4444', marginBottom: '12px' }}>{error}</p>
          <button
            onClick={() => fetchLeaderboard()}
            style={{
              padding: '8px 18px', borderRadius: '10px', backgroundColor: '#7B2FF7', color: '#fff',
              fontWeight: 600, border: 'none', cursor: 'pointer', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '8px'
            }}
          >
            <RefreshCw size={14} /> Refresh Leaderboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: '1000px', margin: '0 auto', boxSizing: 'border-box', animation: 'fadeIn 0.3s ease-out' }}>
      
      {/* ───── Top Header & Control Toolbar ───── */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '14px',
        marginBottom: '20px',
        paddingBottom: '16px',
        borderBottom: '1px solid #e2e8f0'
      }}>
        <div style={{ minWidth: '240px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', color: '#7B2FF7', backgroundColor: '#f3e8ff', padding: '2px 8px', borderRadius: '999px' }}>
              National Rankings
            </span>
            <span style={{ fontSize: '12px', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <ShieldCheck size={13} color="#10b981" /> Verified CBT
            </span>
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: 600, color: '#0f172a', letterSpacing: '-0.2px', margin: 0 }}>
            Student Leaderboard
          </h1>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '2px 0 0' }}>
            Compete with top JAMB, WAEC & Post-UTME candidates across Nigeria.
          </p>
        </div>

        {/* Toolbar Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          
          {/* Exam Sort Dropdown */}
          <div style={{ position: 'relative' }}>
            <select
              value={examFilter}
              onChange={(e) => setExamFilter(e.target.value)}
              style={{
                height: '36px',
                padding: '0 30px 0 12px',
                borderRadius: '9px',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                fontSize: '12.5px',
                fontWeight: 500,
                color: '#334155',
                cursor: 'pointer',
                outline: 'none',
                boxShadow: '0 1px 2px rgba(15,23,42,0.03)',
                appearance: 'none'
              }}
            >
              <option value="all">All Exam Types</option>
              <option value="JAMB">JAMB UTME</option>
              <option value="WAEC">WAEC SSCE</option>
              <option value="NECO">NECO SSCE</option>
              <option value="POST-UTME">Post-UTME</option>
            </select>
            <Filter size={13} color="#64748b" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          </div>

          {/* Timeframe Filter Pills */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            backgroundColor: '#ffffff',
            padding: '3px',
            borderRadius: '9px',
            border: '1px solid #cbd5e1',
            boxShadow: '0 1px 2px rgba(15,23,42,0.03)'
          }}>
            {(['daily', 'weekly', 'monthly', 'all'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeFilter(tf)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: timeFilter === tf ? 600 : 500,
                  color: timeFilter === tf ? '#ffffff' : '#64748b',
                  backgroundColor: timeFilter === tf ? '#7B2FF7' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  textTransform: 'capitalize'
                }}
              >
                {tf === 'all' ? 'All Time' : tf}
              </button>
            ))}
          </div>

          <button
            onClick={() => fetchLeaderboard(true)}
            disabled={refreshing}
            title="Refresh Leaderboard"
            style={{
              height: '36px',
              width: '36px',
              borderRadius: '9px',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#475569',
              boxShadow: '0 1px 2px rgba(15,23,42,0.03)',
              transition: 'all 0.2s ease'
            }}
          >
            <RefreshCw size={14} className={refreshing ? 'um-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ───── User Position Banner Card ───── */}
      <div style={{
        background: 'linear-gradient(135deg, #4B0FA3 0%, #7B2FF7 100%)',
        borderRadius: '14px',
        padding: '16px 20px',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        flexWrap: 'wrap',
        marginBottom: '24px',
        boxShadow: '0 4px 16px rgba(123, 47, 247, 0.18)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            fontWeight: 700,
            color: '#ffffff',
            flexShrink: 0
          }}>
            #{userRank?.rank || '7'}
          </div>
          <div>
            <div style={{ fontSize: '14.5px', fontWeight: 600 }}>
              Your Position: Rank #{userRank?.rank || '7'}
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.9)', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Zap size={13} color="#ffd700" fill="#ffd700" /> {userRank?.points || 1650} XP
              </span>
              <span style={{ opacity: 0.5 }}>•</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <BookOpen size={13} color="#e2e8f0" /> {userRank?.exams || 15} Tests
              </span>
              <span style={{ opacity: 0.5 }}>•</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Flame size={13} color="#ff9800" fill="#ff9800" /> {userRank?.streak || 7}d Streak
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            fontSize: '11.5px',
            fontWeight: 600,
            backgroundColor: 'rgba(255,255,255,0.2)',
            padding: '5px 12px',
            borderRadius: '999px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px'
          }}>
            <TrendingUp size={13} /> Gold Tier
          </span>
          <button
            onClick={() => setShowXpInfo(!showXpInfo)}
            style={{
              padding: '5px 12px',
              borderRadius: '999px',
              backgroundColor: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.3)',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Info size={12} /> XP Rules
          </button>
        </div>
      </div>

      {/* ───── XP Guide Box (Collapsible) ───── */}
      {showXpInfo && (
        <div style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '14px 18px',
          marginBottom: '24px',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={15} color="#7B2FF7" /> How XP & Rankings Work
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '10px', fontSize: '12px', color: '#475569' }}>
            <div style={{ backgroundColor: '#fff', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Target size={15} color="#10b981" /> <span><strong>+10 XP</strong> per correct answer</span>
            </div>
            <div style={{ backgroundColor: '#fff', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Trophy size={15} color="#f59e0b" /> <span><strong>+50 XP</strong> bonus for scores ≥80%</span>
            </div>
            <div style={{ backgroundColor: '#fff', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Flame size={15} color="#ef4444" fill="#ef4444" /> <span><strong>+20 XP</strong> daily streak bonus</span>
            </div>
          </div>
        </div>
      )}

      {/* ───── Top 3 Podium Winners Grid (Aligned 2nd, 1st, 3rd) ───── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
        alignItems: 'end',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {/* 2nd Place */}
        {top3.second && (
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            padding: '18px 16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(15,23,42,0.03)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <div style={{ position: 'relative', marginBottom: '10px' }}>
              <div style={{
                width: '52px', height: '52px', borderRadius: '50%',
                backgroundColor: '#f1f5f9', color: '#475569',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '17px', fontWeight: 600, border: '2px solid #94a3b8'
              }}>
                {top3.second.avatar || '2nd'}
              </div>
              <div style={{
                position: 'absolute', bottom: '-4px', right: '-4px',
                backgroundColor: '#ffffff', borderRadius: '50%', padding: '2px'
              }}>
                <Medal size={16} color="#94a3b8" />
              </div>
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', marginBottom: '2px' }}>
              {top3.second.name}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px' }}>
              {top3.second.exam ? `${top3.second.exam} Candidate` : (top3.second.school || 'Silver Contender')}
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#7B2FF7' }}>
              {top3.second.points.toLocaleString()} <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>XP</span>
            </div>
          </div>
        )}

        {/* 1st Place (Elevated Main Podium Winner) */}
        {top3.first && (
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '22px 18px',
            border: '2px solid #f59e0b',
            boxShadow: '0 8px 24px rgba(245, 158, 11, 0.15)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative'
          }}>
            <div style={{
              position: 'absolute', top: '-11px',
              backgroundColor: '#f59e0b', color: '#ffffff',
              fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px',
              padding: '2px 10px', borderRadius: '999px', textTransform: 'uppercase'
            }}>
              Champion (#1)
            </div>
            <div style={{ position: 'relative', marginBottom: '10px', marginTop: '4px' }}>
              <div style={{
                width: '60px', height: '60px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: '#ffffff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '16px', fontWeight: 700, boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
              }}>
                {top3.first.avatar || '1st'}
              </div>
              <div style={{ position: 'absolute', top: '-8px', right: '-6px' }}>
                <Crown size={20} color="#f59e0b" />
              </div>
            </div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', marginBottom: '2px' }}>
              {top3.first.name}
            </div>
            <div style={{ fontSize: '11.5px', color: '#d97706', fontWeight: 500, marginBottom: '8px' }}>
              {top3.first.exam ? `${top3.first.exam} Top Candidate` : (top3.first.school || 'National Champion')}
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#7B2FF7' }}>
              {top3.first.points.toLocaleString()} <span style={{ fontSize: '11.5px', color: '#94a3b8', fontWeight: 500 }}>XP</span>
            </div>
          </div>
        )}

        {/* 3rd Place */}
        {top3.third && (
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            padding: '18px 16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(15,23,42,0.03)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <div style={{ position: 'relative', marginBottom: '10px' }}>
              <div style={{
                width: '52px', height: '52px', borderRadius: '50%',
                backgroundColor: '#fff7ed', color: '#c2410c',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '17px', fontWeight: 600, border: '2px solid #fdba74'
              }}>
                {top3.third.avatar || '3rd'}
              </div>
              <div style={{
                position: 'absolute', bottom: '-4px', right: '-4px',
                backgroundColor: '#ffffff', borderRadius: '50%', padding: '2px'
              }}>
                <Medal size={16} color="#d97706" />
              </div>
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', marginBottom: '2px' }}>
              {top3.third.name}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px' }}>
              {top3.third.exam ? `${top3.third.exam} Candidate` : (top3.third.school || 'Bronze Contender')}
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#7B2FF7' }}>
              {top3.third.points.toLocaleString()} <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>XP</span>
            </div>
          </div>
        )}
      </div>

      {/* ───── Candidate List Table Container ───── */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(15,23,42,0.03)',
        padding: '20px',
        marginBottom: '24px'
      }}>
        
        {/* Header & Search Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          gap: '14px',
          flexWrap: 'wrap'
        }}>
          <div>
            <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', margin: 0 }}>
              {examFilter === 'all' ? 'Full Rankings' : `${examFilter} Candidate Rankings`}
            </h3>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0' }}>Sorted by accumulated practice XP points</p>
          </div>

          <div style={{ position: 'relative', width: '220px', maxWidth: '100%' }}>
            <input
              type="text"
              placeholder="Search candidate..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                height: '34px',
                padding: '0 12px 0 32px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '12px',
                color: '#0f172a',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
          </div>
        </div>

        {/* Candidate List Rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {filteredLeaderboard.map((student) => {
            const isSelf = student.isCurrentUser || student.name === user?.name;
            const displayRank = student.displayRank || student.rank;

            return (
              <div
                key={`${student.name}-${displayRank}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  backgroundColor: isSelf ? 'rgba(123, 47, 247, 0.05)' : displayRank <= 3 ? '#fafafa' : '#ffffff',
                  border: isSelf ? '1px solid #7B2FF7' : '1px solid #e2e8f0',
                  gap: '12px',
                  transition: 'all 0.15s ease'
                }}
              >
                {/* Left: Rank & Avatar & Name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {getRankBadge(displayRank)}
                  </div>

                  {(() => {
                    const currentUserAvatar = user?.avatar || (typeof window !== 'undefined' ? localStorage.getItem('preplyx_avatar') : null);
                    const avatarSrc = isSelf && currentUserAvatar ? currentUserAvatar : (student.avatar && (student.avatar.startsWith('http') || student.avatar.startsWith('data:')) ? student.avatar : null);

                    if (avatarSrc) {
                      return (
                        <img
                          src={avatarSrc}
                          alt={student.name}
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            flexShrink: 0,
                            border: isSelf ? '1.5px solid #7c3aed' : '1px solid #e2e8f0'
                          }}
                        />
                      );
                    }

                    return (
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: isSelf ? '#7B2FF7' : '#f1f5f9',
                        color: isSelf ? '#ffffff' : '#334155',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        flexShrink: 0
                      }}>
                        {student.avatar || student.name.substring(0, 2).toUpperCase()}
                      </div>
                    );
                  })()}

                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {student.name}
                      </span>
                      {isSelf && (
                        <span style={{ fontSize: '9.5px', fontWeight: 600, color: '#7B2FF7', backgroundColor: '#f3e8ff', padding: '1px 5px', borderRadius: '4px' }}>
                          You
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      {student.exam ? `${student.exam} Candidate` : (student.school || 'JAMB Candidate')}
                    </div>
                  </div>
                </div>

                {/* Right: Tests & Streak & XP Points */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
                  
                  {/* Streak & Tests */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11.5px', color: '#64748b' }}>
                    {student.streak !== undefined && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#d97706', fontWeight: 500 }}>
                        <Flame size={13} fill="#f59e0b" color="#f59e0b" /> {student.streak}d
                      </span>
                    )}
                    {student.exams !== undefined && (
                      <span>{student.exams} Tests</span>
                    )}
                  </div>

                  {/* XP Points */}
                  <div style={{ textAlign: 'right', minWidth: '65px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#7B2FF7' }}>
                      {student.points.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '9.5px', color: '#94a3b8', fontWeight: 500 }}>XP Points</div>
                  </div>

                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* ───── Quick Action Footer ───── */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '14px',
        padding: '16px 20px',
        border: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '9px', backgroundColor: 'rgba(123, 47, 247, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={17} color="#7B2FF7" />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>Want to climb higher up the leaderboard?</div>
            <div style={{ fontSize: '11.5px', color: '#64748b' }}>Complete daily practice sessions and maintain your study streak for extra XP.</div>
          </div>
        </div>

        <button
          onClick={() => navigate('/dashboard/practice')}
          style={{
            padding: '8px 16px',
            borderRadius: '9px',
            background: 'linear-gradient(135deg, #4B0FA3 0%, #7B2FF7 100%)',
            border: 'none',
            color: '#ffffff',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            boxShadow: '0 4px 12px rgba(123, 47, 247, 0.2)',
            transition: 'all 0.15s ease'
          }}
        >
          Earn XP Now <ChevronRight size={13} />
        </button>
      </div>

    </div>
  );
}

