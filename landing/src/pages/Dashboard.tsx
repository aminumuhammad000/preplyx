import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

import { API_BASE_URL } from '../config/api';

const Dashboard = () => {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch real data from server for the dashboard
    const fetchDashboardData = async () => {
      try {
        const { data } = await axios.get(`${API_BASE_URL}/auth/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setProfileData(data);
      } catch (error) {
        console.error('Failed to fetch dashboard data', error);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchDashboardData();
    }
  }, [token]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading your secure dashboard...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm px-8 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-primary">Preplyx Dashboard</h1>
        <div className="flex items-center gap-4">
          <span className="text-text-dark font-medium">Hello, {user?.name}</span>
          <button 
            onClick={handleLogout}
            className="px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary hover:text-white transition"
          >
            Logout
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-8 py-12">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 mb-8">
          <h2 className="text-2xl font-bold text-text-dark mb-4">Your Profile Details (Fetched from Server)</h2>
          <div className="grid grid-cols-2 gap-4 max-w-lg">
            <div className="text-text-muted">Name</div>
            <div className="font-medium">{profileData?.name}</div>
            <div className="text-text-muted">Email</div>
            <div className="font-medium">{profileData?.email}</div>
            <div className="text-text-muted">User ID</div>
            <div className="font-medium text-sm font-mono">{profileData?._id}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-lg mb-2">My Courses</h3>
            <p className="text-text-muted">You are not enrolled in any courses yet.</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-lg mb-2">Recent Activity</h3>
            <p className="text-text-muted">No recent activity.</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-lg mb-2">Account Status</h3>
            <p className="text-green-600 font-medium">Active & Secure</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
