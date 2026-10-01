import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import DashboardLayout from './components/DashboardLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Practice from './pages/Practice';
import MultiSubjectExam from './pages/MultiSubjectExam';
import CbtExamRunner from './pages/CbtExamRunner';
import Result from './pages/Result';
import Review from './pages/Review';
import Leaderboard from './pages/Leaderboard';
import Analytics from './pages/Analytics';
import Achievements from './pages/Achievements';
import Wallet from './pages/Wallet';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Notifications from './pages/Notifications';
import History from './pages/History';
import Challenge from './pages/Challenge';
import Onboarding from './pages/Onboarding';
import MistakeCenter from './pages/MistakeCenter';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import { getStoredSettings } from './lib/storage';

export default function App() {
  useEffect(() => {
    // Automatically apply stored dark mode theme on app boot
    getStoredSettings();
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
          <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />

          {/* Protected Student Dashboard Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="categories" element={<Navigate to="/dashboard/practice" replace />} />
              <Route path="practice" element={<Practice />} />
              <Route path="practice/:exam/:subject" element={<CbtExamRunner />} />
              <Route path="multi-subject-exam" element={<MultiSubjectExam />} />
              <Route path="challenge" element={<Challenge />} />
              <Route path="mistakes" element={<MistakeCenter />} />
              <Route path="onboarding" element={<Onboarding />} />
              <Route path="history" element={<History />} />
              <Route path="result" element={<Result />} />
              <Route path="review" element={<Review />} />
              <Route path="leaderboard" element={<Leaderboard />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="achievements" element={<Achievements />} />
              <Route path="wallet" element={<Wallet />} />
              <Route path="profile" element={<Profile />} />
              <Route path="settings" element={<Settings />} />
              <Route path="notifications" element={<Notifications />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
