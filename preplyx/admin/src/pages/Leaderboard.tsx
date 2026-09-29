import React, { useState, useEffect, useMemo } from 'react';
import { 
  Trophy, Crown, Flame, Search, RefreshCw, 
  Users, Zap, BookOpen, Download
} from 'lucide-react';
import './Leaderboard.css';

import { API_BASE_URL } from '../config/api';

interface LeaderboardEntry {
  rank: number;
  userId?: string;
  name: string;
  email?: string;
  avatar?: string;
  points: number;
  exams?: number;
  streak?: number;
  exam?: string;
  school?: string;
}

export const Leaderboard: React.FC = () => {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<'daily' | 'weekly' | 'monthly' | 'all'>('weekly');
  const [examFilter, setExamFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLeaderboard = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);

      const res = await fetch(`${API_BASE_URL}/leaderboard?filter=${timeFilter}`);
      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }
      const data = await res.json();
      setLeaderboardData(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      console.error('Leaderboard fetch error:', err);
      setError('Unable to fetch live leaderboard from server');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [timeFilter]);

  // Filtered leaderboard entries
  const filteredData = useMemo(() => {
    let list = [...leaderboardData];

    if (examFilter !== 'all') {
      list = list.filter(item => (item.exam || item.school || '').toUpperCase().includes(examFilter.toUpperCase()));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(item => 
        item.name.toLowerCase().includes(q) || 
        (item.email && item.email.toLowerCase().includes(q))
      );
    }

    return list.map((item, idx) => ({ ...item, displayRank: idx + 1 }));
  }, [leaderboardData, examFilter, searchQuery]);

  // Top 3 Podium
  const top3 = useMemo(() => ({
    first: filteredData[0] || null,
    second: filteredData[1] || null,
    third: filteredData[2] || null
  }), [filteredData]);

  // Summary Metrics
  const stats = useMemo(() => {
    const totalCandidates = filteredData.length;
    const topScore = filteredData[0]?.points || 0;
    const totalTests = filteredData.reduce((sum, item) => sum + (item.exams || 0), 0);
    const avgScore = totalCandidates > 0 ? Math.round(filteredData.reduce((sum, item) => sum + item.points, 0) / totalCandidates) : 0;
    return { totalCandidates, topScore, totalTests, avgScore };
  }, [filteredData]);

  const exportCSV = () => {
    const headers = ['Rank', 'Candidate Name', 'Email', 'Exam Type', 'XP Points', 'Tests Completed', 'Streak (Days)'];
    const rows = filteredData.map(item => [
      item.displayRank,
      `"${item.name}"`,
      `"${item.email || ''}"`,
      `"${item.exam || 'JAMB'}"`,
      item.points,
      item.exams || 0,
      item.streak || 0
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `preplyx_leaderboard_${timeFilter}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="admin-leaderboard-container">
      {/* Top Header */}
      <div className="leaderboard-header">
        <div className="leaderboard-title">
          <h1>
            <Trophy size={26} color="#7B2FF7" /> Student Leaderboard Management
          </h1>
          <p className="leaderboard-subtitle">
            Live rankings synchronized with real practice sessions & candidate XP scores across Nigeria.
          </p>
        </div>

        <div className="leaderboard-actions">
          <button className="btn-refresh" onClick={() => fetchLeaderboard(true)} disabled={refreshing}>
            <RefreshCw size={15} className={refreshing ? 'um-spin' : ''} />
            Refresh Data
          </button>
          <button 
            className="btn-refresh" 
            onClick={exportCSV} 
            style={{ backgroundColor: '#7B2FF7', color: '#ffffff', border: 'none' }}
          >
            <Download size={15} /> Export CSV
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="leaderboard-stats-grid">
        <div className="leaderboard-stat-card">
          <div className="stat-icon-wrapper" style={{ backgroundColor: '#f3e8ff', color: '#7B2FF7' }}>
            <Users size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.totalCandidates}</div>
            <div className="stat-label">Ranked Candidates</div>
          </div>
        </div>

        <div className="leaderboard-stat-card">
          <div className="stat-icon-wrapper" style={{ backgroundColor: '#fef3c7', color: '#d97706' }}>
            <Crown size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.topScore.toLocaleString()} XP</div>
            <div className="stat-label">Highest Score</div>
          </div>
        </div>

        <div className="leaderboard-stat-card">
          <div className="stat-icon-wrapper" style={{ backgroundColor: '#dcfce7', color: '#10b981' }}>
            <BookOpen size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.totalTests}</div>
            <div className="stat-label">Tests Completed</div>
          </div>
        </div>

        <div className="leaderboard-stat-card">
          <div className="stat-icon-wrapper" style={{ backgroundColor: '#e0f2fe', color: '#0284c7' }}>
            <Zap size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{stats.avgScore.toLocaleString()} XP</div>
            <div className="stat-label">Average Candidate XP</div>
          </div>
        </div>
      </div>

      {/* Top 3 Champion Podium */}
      {filteredData.length >= 3 && (
        <div className="podium-section">
          {/* 2nd Place */}
          {top3.second && (
            <div className="podium-card">
              <div className="podium-avatar" style={{ background: '#f1f5f9', color: '#475569', border: '2px solid #94a3b8' }}>
                {top3.second.avatar || '2nd'}
              </div>
              <div className="podium-name">{top3.second.name}</div>
              <div className="podium-exam">{top3.second.exam || 'JAMB'} Candidate</div>
              <div className="podium-points">{top3.second.points.toLocaleString()} XP</div>
            </div>
          )}

          {/* 1st Place */}
          {top3.first && (
            <div className="podium-card first-place">
              <span className="podium-crown">Champion (#1)</span>
              <div className="podium-avatar">
                {top3.first.avatar || '1st'}
              </div>
              <div className="podium-name">{top3.first.name}</div>
              <div className="podium-exam" style={{ color: '#d97706', fontWeight: 600 }}>
                {top3.first.exam || 'JAMB'} Top Candidate
              </div>
              <div className="podium-points" style={{ fontSize: '20px' }}>
                {top3.first.points.toLocaleString()} XP
              </div>
            </div>
          )}

          {/* 3rd Place */}
          {top3.third && (
            <div className="podium-card">
              <div className="podium-avatar" style={{ background: '#fff7ed', color: '#c2410c', border: '2px solid #fdba74' }}>
                {top3.third.avatar || '3rd'}
              </div>
              <div className="podium-name">{top3.third.name}</div>
              <div className="podium-exam">{top3.third.exam || 'WAEC'} Candidate</div>
              <div className="podium-points">{top3.third.points.toLocaleString()} XP</div>
            </div>
          )}
        </div>
      )}

      {/* Leaderboard Table Container */}
      <div className="leaderboard-table-card">
        <div className="table-toolbar">
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text-primary, #0f172a)' }}>
              Full Leaderboard Rankings
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary, #64748b)' }}>
              Showing live candidate scores fetched directly from the database server.
            </span>
          </div>

          <div className="search-filter-box">
            <div className="search-input-wrapper">
              <input
                type="text"
                placeholder="Search candidate or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search size={14} />
            </div>

            <select
              className="select-filter"
              value={examFilter}
              onChange={(e) => setExamFilter(e.target.value)}
            >
              <option value="all">All Exam Categories</option>
              <option value="JAMB">JAMB UTME</option>
              <option value="WAEC">WAEC SSCE</option>
              <option value="NECO">NECO SSCE</option>
            </select>

            <select
              className="select-filter"
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value as any)}
            >
              <option value="weekly">This Week</option>
              <option value="daily">Today</option>
              <option value="monthly">This Month</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
            <RefreshCw size={24} className="um-spin" style={{ margin: '0 auto 12px' }} />
            <div>Loading live leaderboard from server...</div>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '30px 0', color: '#ef4444' }}>
            <p>{error}</p>
            <button className="btn-refresh" onClick={() => fetchLeaderboard()}>Retry</button>
          </div>
        ) : filteredData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
            No candidate rankings matched your filter.
          </div>
        ) : (
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Candidate</th>
                <th>Exam Category</th>
                <th>XP Points</th>
                <th>Tests Completed</th>
                <th>Study Streak</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((item) => (
                <tr key={`${item.name}-${item.displayRank}`}>
                  <td>
                    <span className="rank-badge" style={{
                      backgroundColor: item.displayRank === 1 ? '#fef3c7' : item.displayRank === 2 ? '#f1f5f9' : item.displayRank === 3 ? '#fff7ed' : 'transparent',
                      color: item.displayRank === 1 ? '#d97706' : item.displayRank === 2 ? '#475569' : item.displayRank === 3 ? '#c2410c' : '#64748b'
                    }}>
                      #{item.displayRank}
                    </span>
                  </td>
                  <td>
                    <div className="candidate-cell">
                      <div className="candidate-avatar">
                        {item.avatar || item.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="candidate-name">{item.name}</div>
                        {item.email && <div className="candidate-email">{item.email}</div>}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="badge-exam">
                      {item.exam || 'JAMB'}
                    </span>
                  </td>
                  <td>
                    <strong style={{ color: '#7B2FF7', fontSize: '14px' }}>
                      {item.points.toLocaleString()} XP
                    </strong>
                  </td>
                  <td>
                    <span style={{ fontWeight: 500 }}>{item.exams || 0} Sessions</span>
                  </td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#d97706', fontWeight: 600 }}>
                      <Flame size={14} fill="#f59e0b" color="#f59e0b" /> {item.streak || 0}d
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
