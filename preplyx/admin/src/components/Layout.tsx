import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  Library, 
  FileQuestion, 
  MonitorPlay, 
  Wallet, 
  Bot, 
  BarChart3, 
  Trophy,
  Bell, 
  Headset, 
  Settings,
  LogOut,
  Sun,
  Moon,
  Menu
} from 'lucide-react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import logoSvg from '../assets/logo.svg';
import './Layout.css';

interface NavGroup {
  section: string;
  items: {
    name: string;
    path: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
  }[];
}

const navGroups: NavGroup[] = [
  {
    section: 'OVERVIEW',
    items: [
      { name: 'Dashboard', path: '/', icon: LayoutDashboard },
      { name: 'Analytics', path: '/analytics', icon: BarChart3 },
      { name: 'Leaderboard', path: '/leaderboard', icon: Trophy },
    ]
  },
  {
    section: 'MANAGEMENT',
    items: [
      { name: 'User Management', path: '/users', icon: Users },
      { name: 'Exam Management', path: '/exams', icon: BookOpen },
      { name: 'Subject Management', path: '/subjects', icon: Library },
      { name: 'Question Bank', path: '/questions', icon: FileQuestion },
      { name: 'CBT Simulation', path: '/simulation', icon: MonitorPlay },
    ]
  },
  {
    section: 'SYSTEM & TOOLS',
    items: [
      { name: 'Wallet & Payments', path: '/wallet', icon: Wallet },
      { name: 'AI Assistant', path: '/ai-assistant', icon: Bot },
      { name: 'Notifications', path: '/notifications', icon: Bell },
      { name: 'Support Center', path: '/support', icon: Headset },
      { name: 'Settings', path: '/settings', icon: Settings },
    ]
  }
];

export const Layout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('adminTheme') as 'dark' | 'light') || 'dark';
  });

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('adminSidebarCollapsed') === 'true';
  });

  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) {
        setMobileOpen(false);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (isMobile) {
      setMobileOpen(false);
    }
  }, [location.pathname, isMobile]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.className = theme === 'light' ? 'light-theme' : 'dark-theme';
    localStorage.setItem('adminTheme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const toggleSidebar = () => {
    if (isMobile) {
      setMobileOpen(prev => !prev);
    } else {
      setCollapsed(prev => {
        const next = !prev;
        localStorage.setItem('adminSidebarCollapsed', String(next));
        return next;
      });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    localStorage.removeItem('preplyx_token');
    navigate('/login');
  };

  const adminUserStr = localStorage.getItem('adminUser');
  const adminUser = adminUserStr ? JSON.parse(adminUserStr) : null;
  const adminName = adminUser?.name || 'Super Admin';

  return (
    <div className="app-container">
      {/* Mobile Drawer Overlay Backdrop */}
      {isMobile && mobileOpen && (
        <div className="sidebar-mobile-backdrop" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo-container">
            <img src={logoSvg} alt="Preplyx Logo" className="sidebar-logo" />
            <div className="sidebar-brand-text">
              <span className="sidebar-brand-name">Preplyx Admin</span>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navGroups.map((group) => (
            <div key={group.section} className="sidebar-group">
              <div className="sidebar-section-title">{group.section}</div>
              {group.items.map((item) => {
                const isActive = location.pathname === item.path || 
                  (item.path !== '/' && location.pathname.startsWith(item.path));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    title={collapsed ? item.name : undefined}
                    className={`nav-item ${isActive ? 'active' : ''}`}
                    onClick={() => { if (isMobile) setMobileOpen(false); }}
                  >
                    <Icon size={16} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn" title={collapsed ? 'Logout' : undefined} onClick={handleLogout}>
            <LogOut size={15} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Thin Topbar Header */}
        <header className="topbar">
          <div className="topbar-welcome">
            <button
              className="icon-btn sidebar-toggle-btn"
              title={isMobile ? (mobileOpen ? 'Close Menu' : 'Open Menu') : (collapsed ? 'Expand Sidebar' : 'Collapse Sidebar')}
              onClick={toggleSidebar}
            >
              <Menu size={16} />
            </button>
            <h2 className="welcome-title">Welcome back, {adminName}</h2>
          </div>
          <div className="topbar-actions">
            <button
              className="icon-btn"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              onClick={toggleTheme}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <button
              className="icon-btn"
              title="Notifications"
              onClick={() => navigate('/notifications')}
            >
              <Bell size={15} />
            </button>
            <button
              className="profile-icon-btn"
              title={`My Profile (${adminName})`}
              onClick={() => navigate('/profile')}
            >
              <div className="avatar">{adminName.charAt(0).toUpperCase()}</div>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
