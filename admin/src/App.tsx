import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';

// Pages
import { Dashboard } from './pages/Dashboard';
import { Users } from './pages/Users';
import { Exams } from './pages/Exams';
import { Subjects } from './pages/Subjects';
import { Questions } from './pages/Questions';
import { Simulation } from './pages/Simulation';
import { Wallet } from './pages/Wallet';
import { AIAssistant } from './pages/AIAssistant';
import { Analytics } from './pages/Analytics';
import { Notifications } from './pages/Notifications';
import { Support } from './pages/Support';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { Profile } from './pages/Profile';
import { Leaderboard } from './pages/Leaderboard';

// Protected Route wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem('adminToken');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

// Redirect authenticated users away from login page
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem('adminToken');
  if (token) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Navigate to="/" replace />} />
          <Route path="users" element={<Users />} />
          <Route path="leaderboard" element={<Leaderboard />} />
          <Route path="exams" element={<Exams />} />
          <Route path="subjects" element={<Subjects />} />
          <Route path="questions" element={<Questions />} />
          <Route path="simulation" element={<Simulation />} />
          <Route path="wallet" element={<Wallet />} />
          <Route path="ai-assistant" element={<AIAssistant />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="support" element={<Support />} />
          <Route path="settings" element={<Settings />} />
          <Route path="profile" element={<Profile />} />
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
