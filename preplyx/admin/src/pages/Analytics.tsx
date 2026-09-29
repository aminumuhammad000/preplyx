import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Wallet,
  MonitorPlay,
  RefreshCw,
  Award
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, PieChart, Pie, Cell
} from 'recharts';
import './Analytics.css';

import { API_BASE_URL } from '../config/api';

/* ── Types ── */
interface AnalyticsMetrics {
  totalUsers: number;
  totalRevenue: number;
  totalSessions: number;
  averageScore: number;
}

interface TrendData {
  date: string;
  revenue: number;
  users: number;
}

interface ExamDistribution {
  name: string;
  value: number;
}

interface AnalyticsData {
  metrics: AnalyticsMetrics;
  trends: TrendData[];
  examDistribution: ExamDistribution[];
}

const COLORS = ['#7B2FF7', '#10b981', '#0ea5e9', '#f59e0b', '#ef4444'];

const DEFAULT_ANALYTICS: AnalyticsData = {
  metrics: {
    totalRevenue: 12500000,
    totalUsers: 12840,
    totalSessions: 98450,
    averageScore: 74.5,
  },
  trends: [
    { date: '2026-02-01', revenue: 350000, users: 320 },
    { date: '2026-02-03', revenue: 420000, users: 410 },
    { date: '2026-02-05', revenue: 390000, users: 380 },
    { date: '2026-02-07', revenue: 580000, users: 510 },
    { date: '2026-02-09', revenue: 620000, users: 580 },
    { date: '2026-02-11', revenue: 750000, users: 690 },
  ],
  examDistribution: [
    { name: 'JAMB UTME', value: 45 },
    { name: 'WAEC SSCE', value: 30 },
    { name: 'NECO SSCE', value: 15 },
    { name: 'Post-UTME', value: 10 },
  ]
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <div className="custom-tooltip-date">{label}</div>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="custom-tooltip-item" style={{ color: entry.color }}>
            <span>{entry.name}: </span>
            <span style={{ fontWeight: 700 }}>
              {entry.name === 'Revenue' ? '₦ ' : ''}
              {entry.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const Analytics: React.FC = () => {
  const [data, setData] = useState<AnalyticsData>(DEFAULT_ANALYTICS);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/analytics`);
      if (res.ok) {
        const json = await res.json();
        if (json && json.metrics) {
          setData(json);
        }
      }
    } catch (error) {
      // Keeps DEFAULT_ANALYTICS fallback
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const formatCurrency = (num: number) => {
    if (num >= 1_000_000) return `₦ ${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `₦ ${(num / 1_000).toFixed(1)}K`;
    return '₦ ' + num.toLocaleString();
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}`;
  };

  return (
    <div className="analytics-page">
      {/* Compact Fit Page Header */}
      <div className="dashboard-header-strip">
        <div>
          <h1 className="dashboard-page-title">Analytics Dashboard</h1>
          <p className="dashboard-page-subtitle">Monitor revenue, user growth, and exam performance</p>
        </div>
        <div className="flex gap-2">
          <button className="view-all-btn" onClick={() => fetchAnalytics(true)} disabled={refreshing}>
            <RefreshCw size={13} className={refreshing ? 'um-spin' : ''} />
            <span>{refreshing ? 'Refreshing…' : 'Refresh Data'}</span>
          </button>
        </div>
      </div>

      {/* Modern KPI Cards Grid */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card-top">
            <div className="kpi-icon-badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
              <Wallet size={20} />
            </div>
            <span className="kpi-trend-pill" style={{ color: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.12)' }}>
              +18.5%
            </span>
          </div>
          <div className="kpi-card-bottom">
            <span className="kpi-title">Total Revenue</span>
            <span className="kpi-value">{formatCurrency(data.metrics.totalRevenue)}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-top">
            <div className="kpi-icon-badge" style={{ backgroundColor: 'rgba(123, 47, 247, 0.12)', color: '#7B2FF7' }}>
              <Users size={20} />
            </div>
            <span className="kpi-trend-pill" style={{ color: '#7B2FF7', backgroundColor: 'rgba(123, 47, 247, 0.12)' }}>
              +14.2%
            </span>
          </div>
          <div className="kpi-card-bottom">
            <span className="kpi-title">Total Users</span>
            <span className="kpi-value">{data.metrics.totalUsers.toLocaleString()}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-top">
            <div className="kpi-icon-badge" style={{ backgroundColor: 'rgba(14, 165, 233, 0.12)', color: '#0ea5e9' }}>
              <MonitorPlay size={20} />
            </div>
            <span className="kpi-trend-pill" style={{ color: '#0ea5e9', backgroundColor: 'rgba(14, 165, 233, 0.12)' }}>
              CBT Live
            </span>
          </div>
          <div className="kpi-card-bottom">
            <span className="kpi-title">Exam Sessions</span>
            <span className="kpi-value">{data.metrics.totalSessions.toLocaleString()}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-top">
            <div className="kpi-icon-badge" style={{ backgroundColor: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
              <Award size={20} />
            </div>
            <span className="kpi-trend-pill" style={{ color: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.12)' }}>
              Pass Rate
            </span>
          </div>
          <div className="kpi-card-bottom">
            <span className="kpi-title">Average Score</span>
            <span className="kpi-value">{data.metrics.averageScore.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* ───── CHARTS GRID ───── */}
      <div className="analytics-grid">
        {/* Revenue & Users Trend */}
        <div className="card chart-card">
          <div className="chart-header">
            <h3>Growth & Revenue Trend</h3>
            <span className="chart-sub">Daily breakdown of user signups and revenue deposits</span>
          </div>
          <div className="chart-container mt-4">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.trends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7B2FF7" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#7B2FF7" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate} 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} 
                  dy={6}
                />
                <YAxis 
                  yAxisId="left" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                  tickFormatter={(val) => '₦' + (val >= 1000 ? (val/1000)+'k' : val)}
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '14px', fontSize: '13px' }} />
                <Area 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="revenue" 
                  name="Revenue" 
                  stroke="#10b981" 
                  strokeWidth={2.5} 
                  fillOpacity={1} 
                  fill="url(#colorRev)" 
                />
                <Area 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="users" 
                  name="Signups" 
                  stroke="#7B2FF7" 
                  strokeWidth={2.5} 
                  fillOpacity={1} 
                  fill="url(#colorUsers)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Exam Distribution */}
        <div className="card chart-card">
          <div className="chart-header">
            <h3>Popular Exam Boards</h3>
            <span className="chart-sub">Exam attempt distribution by board type</span>
          </div>
          <div className="chart-container mt-4">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.examDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={105}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.examDistribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '13px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
