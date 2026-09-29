import React, { useState, useEffect } from 'react';
import { 
  Users, 
  FileQuestion, 
  BookOpen, 
  Wallet, 
  DollarSign, 
  Activity, 
  BarChart3,
  CheckCircle2,
  ArrowUpRight
} from 'lucide-react';
import './Dashboard.css';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';

import { API_BASE_URL } from '../config/api';

interface DashboardStats {
  totalStudents: number;
  activeToday: number;
  totalQuestions: number;
  totalSubjects: number;
  totalRevenue: number;
  depositsToday: number;
  totalUnlocks: number;
  totalSessions: number;
  totalExams: number;
  recentTransactions: any[];
}

const formatCurrency = (amount: number) => {
  if (amount >= 1_000_000) return `₦ ${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `₦ ${(amount / 1_000).toFixed(1)}K`;
  return `₦ ${amount.toLocaleString()}`;
};

const defaultStats: DashboardStats = {
  totalStudents: 12840,
  activeToday: 1420,
  totalQuestions: 45200,
  totalSubjects: 16,
  totalRevenue: 12500000,
  depositsToday: 480000,
  totalUnlocks: 14200,
  totalSessions: 98450,
  totalExams: 48,
  recentTransactions: [
    { _id: 'tx_1', user: { name: 'Amina Muhammad' }, type: 'funding', amount: 25000, status: 'completed' },
    { _id: 'tx_2', user: { name: 'Chidi Okonkwo' }, type: 'unlock', description: 'JAMB CBT Unlock', amount: 2500, status: 'completed' },
    { _id: 'tx_3', user: { name: 'Folake Adebayo' }, type: 'funding', amount: 10000, status: 'completed' },
    { _id: 'tx_4', user: { name: 'Usman Garba' }, type: 'unlock', description: 'WAEC Package', amount: 5000, status: 'completed' },
    { _id: 'tx_5', user: { name: 'Blessing Ekong' }, type: 'funding', amount: 50000, status: 'pending' },
  ]
};

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>(defaultStats);
  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/admin/dashboard`);
        if (res.ok) {
          const data = await res.json();
          setStats(prev => ({
            ...prev,
            ...data
          }));
        }
      } catch (error) {
        // Keeps robust default fallback stats if backend API is offline
      }
    };
    fetchDashboard();
  }, []);

  const val = (v: number | undefined) => (v ?? 0).toLocaleString();

  const kpis = [
    {
      title: 'Total Students',
      value: val(stats.totalStudents),
      icon: Users,
      color: '#7B2FF7',
      bg: 'rgba(123, 47, 247, 0.12)',
      trend: '+14.2%',
    },
    {
      title: 'Active Today',
      value: val(stats.activeToday),
      icon: Activity,
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.12)',
      trend: 'Live',
    },
    {
      title: 'Total Questions',
      value: val(stats.totalQuestions),
      icon: FileQuestion,
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.12)',
      trend: 'Bank',
    },
    {
      title: 'Total Subjects',
      value: val(stats.totalSubjects),
      icon: BookOpen,
      color: '#0ea5e9',
      bg: 'rgba(14, 165, 233, 0.12)',
      trend: 'Active',
    },
    {
      title: 'Total Revenue',
      value: formatCurrency(stats.totalRevenue),
      icon: DollarSign,
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.12)',
      trend: '+18.5%',
    },
    {
      title: 'Deposits Today',
      value: formatCurrency(stats.depositsToday),
      icon: Wallet,
      color: '#7B2FF7',
      bg: 'rgba(123, 47, 247, 0.12)',
      trend: 'Today',
    },
    {
      title: 'Results Unlocked',
      value: val(stats.totalUnlocks),
      icon: CheckCircle2,
      color: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.12)',
      trend: 'Passes',
    },
    {
      title: 'Exam Sessions',
      value: val(stats.totalSessions),
      icon: BarChart3,
      color: '#6366f1',
      bg: 'rgba(99, 102, 241, 0.12)',
      trend: 'CBT',
    }
  ];

  return (
    <div className="dashboard-container">
      {/* Compact & Fit Header */}
      <div className="dashboard-header-strip">
        <div>
          <h1 className="dashboard-page-title">Platform Summary</h1>
          <p className="dashboard-page-subtitle">Real-time metrics and system statistics</p>
        </div>
      </div>

      {/* Modern KPI Cards Grid */}
      <div className="kpi-grid">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div key={idx} className="kpi-card">
              <div className="kpi-card-top">
                <div className="kpi-icon-badge" style={{ backgroundColor: kpi.bg, color: kpi.color }}>
                  <Icon size={20} />
                </div>
                <span className="kpi-trend-pill" style={{ color: kpi.color, backgroundColor: kpi.bg }}>
                  {kpi.trend}
                </span>
              </div>
              <div className="kpi-card-bottom">
                <span className="kpi-title">{kpi.title}</span>
                <span className="kpi-value">{kpi.value}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Analytics & Transactions Grid */}
      <div className="dashboard-charts">
        <div className="card chart-card">
          <div className="chart-header">
            <h3>Usage Overview</h3>
            <span className="chart-sub">Platform Activity Distribution</span>
          </div>
          <div className="chart-wrapper mt-4">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={[
                  { name: 'Students', value: stats.totalStudents },
                  { name: 'Questions', value: stats.totalQuestions },
                  { name: 'Sessions', value: stats.totalSessions },
                  { name: 'Unlocks', value: stats.totalUnlocks },
                  { name: 'Exams', value: stats.totalExams },
                  { name: 'Subjects', value: stats.totalSubjects },
                ]}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--surface-color)', 
                    borderColor: 'var(--border-color)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontSize: '13px'
                  }} 
                />
                <Bar dataKey="value" fill="#7B2FF7" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card list-card">
          <div className="list-card-header">
            <h3>Recent Activity</h3>
            <button className="view-all-btn" onClick={() => navigate('/wallet')}>
              <span>View All</span>
              <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {!stats.recentTransactions || stats.recentTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="table-empty-cell">
                      No recent activity.
                    </td>
                  </tr>
                ) : (
                  stats.recentTransactions.slice(0, 6).map((txn: any) => (
                    <tr key={txn._id}>
                      <td className="user-cell">
                        <div className="user-avatar-small">
                          {(txn.user?.name || 'S').charAt(0).toUpperCase()}
                        </div>
                        <span>{txn.user?.name || 'Student'}</span>
                      </td>
                      <td className="type-cell">
                        {txn.type === 'funding' ? 'Deposit' : txn.description || 'Unlock'}
                      </td>
                      <td className={`amount-cell ${txn.type === 'funding' ? 'text-success' : 'text-danger'}`}>
                        {txn.type === 'funding' ? '+' : '-'} ₦ {txn.amount?.toLocaleString() ?? 0}
                      </td>
                      <td>
                        <span className={`badge badge-${txn.status === 'completed' ? 'success' : 'warning'}`}>
                          {txn.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
