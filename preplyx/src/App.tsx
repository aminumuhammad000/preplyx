import { useEffect } from 'react';
import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom';
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
import Offline from './pages/Offline';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import { getStoredSettings } from './lib/storage';

// Wrapper to apply side-effects at boot inside the router context
function AppRoot() {
  useEffect(() => {
    // Automatically apply stored dark mode theme on app boot
    getStoredSettings();
  }, []);

  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}

const router = createBrowserRouter([
  {
    element: <AppRoot />,
    children: [
      { path: '/', element: <Navigate to="/dashboard" replace /> },
      { path: '/login', element: <Login /> },
      { path: '/register', element: <Register /> },
      { path: '/forgot-password', element: <ForgotPassword /> },
      { path: '/onboarding', element: <ProtectedRoute><Onboarding /></ProtectedRoute> },
      { path: '/admin', element: <Navigate to="/admin/login" replace /> },
      { path: '/admin/login', element: <AdminLogin /> },
      { path: '/admin/dashboard', element: <AdminDashboard /> },

      // Protected Student Dashboard Routes
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: '/dashboard',
            element: <DashboardLayout />,
            children: [
              { index: true, element: <Dashboard /> },
              { path: 'categories', element: <Navigate to="/dashboard/practice" replace /> },
              { path: 'practice', element: <Practice /> },
              { path: 'practice/:exam/:subject', element: <CbtExamRunner /> },
              { path: 'multi-subject-exam', element: <MultiSubjectExam /> },
              { path: 'challenge', element: <Challenge /> },
              { path: 'mistakes', element: <MistakeCenter /> },
              { path: 'onboarding', element: <Onboarding /> },
              { path: 'history', element: <History /> },
              { path: 'result', element: <Result /> },
              { path: 'review', element: <Review /> },
              { path: 'leaderboard', element: <Leaderboard /> },
              { path: 'analytics', element: <Analytics /> },
              { path: 'achievements', element: <Achievements /> },
              { path: 'wallet', element: <Wallet /> },
              { path: 'profile', element: <Profile /> },
              { path: 'settings', element: <Settings /> },
              { path: 'notifications', element: <Notifications /> },
              { path: 'offline', element: <Offline /> },
            ],
          },
        ],
      },

      { path: '*', element: <Navigate to="/dashboard" replace /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
