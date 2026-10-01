import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { 
  LayoutDashboard, BookOpen, Wallet, LineChart, LogOut, Settings, 
  Trophy, Award, Bell, CheckSquare, Menu, X, User, Users,
  ChevronDown, ChevronLeft, PanelLeft, History as HistoryIcon, Brain
} from 'lucide-react';
import StreakWidget from './StreakWidget';

import logoSvg from '../assets/logo.svg';

export default function DashboardLayout() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;
  
  // Mobile drawer state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Desktop collapsible sidebar state (persisted in localStorage)
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('preplyx_sidebar_collapsed') === 'true';
    }
    return false;
  });

  const [unreadCount, setUnreadCount] = useState(0);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpen(false);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Automatically collapse sidebar in when navigating to exam pages for maximum focus
  const isExamPage = pathname.includes('/practice/') || pathname.includes('/multi-subject-exam');

  useEffect(() => {
    if (isExamPage) {
      setIsCollapsed(true);
      setSidebarOpen(false);
    } else if (typeof window !== 'undefined') {
      const storedCollapsed = localStorage.getItem('preplyx_sidebar_collapsed') === 'true';
      setIsCollapsed(storedCollapsed);
    }
  }, [isExamPage, pathname]);

  const toggleSidebarCollapse = () => {
    if (isMobile) {
      setSidebarOpen(prev => !prev);
    } else {
      setIsCollapsed(prev => {
        const next = !prev;
        localStorage.setItem('preplyx_sidebar_collapsed', String(next));
        return next;
      });
    }
  };

  useEffect(() => {
    if (!user && typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('preplyx_token');
      if (!storedToken) {
        navigate('/login');
      }
    }
  }, [user, navigate]);

  // Fetch notifications & wallet balance
  useEffect(() => {
    const fetchHeaderData = async () => {
      const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('preplyx_token') : null);
      if (!authToken) return;
      
      try {
        const notifs = await api.getNotifications(authToken);
        if (Array.isArray(notifs)) {
          const unread = notifs.filter((n: any) => n.unread).length;
          setUnreadCount(unread);
        }
      } catch (err) {
        console.error('Failed to fetch unread notification count:', err);
      }

      try {
        const walletData = await api.getWallet(authToken);
        if (walletData && typeof walletData.balance === 'number') {
          setWalletBalance(walletData.balance);
        }
      } catch (err) {
        // Fallback gracefully
      }
    };

    fetchHeaderData();
    const interval = setInterval(fetchHeaderData, 15000);
    return () => clearInterval(interval);
  }, [token, pathname]);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getPageInfo = (path: string) => {
    if (path === '/dashboard') return { title: 'Dashboard', badge: 'Overview' };
    if (path.startsWith('/dashboard/mistakes')) return { title: 'Mistake Intelligence', badge: 'Fix & Retest' };
    if (path.startsWith('/dashboard/challenge')) return { title: 'Challenge a Friend', badge: '1v1 Battle' };
    if (path.startsWith('/dashboard/practice')) return { title: 'Practice CBT', badge: 'Exam Runner' };
    if (path.startsWith('/dashboard/history')) return { title: 'Exam History', badge: 'Sessions Log' };
    if (path.startsWith('/dashboard/analytics')) return { title: 'Analytics', badge: 'Performance' };
    if (path.startsWith('/dashboard/leaderboard')) return { title: 'Leaderboard', badge: 'Rankings' };
    if (path.startsWith('/dashboard/review')) return { title: 'Question Review', badge: 'Re-evaluation' };
    if (path.startsWith('/dashboard/wallet')) return { title: 'My Wallet', badge: 'Balance' };
    if (path.startsWith('/dashboard/achievements')) return { title: 'Achievements', badge: 'Rewards' };
    if (path.startsWith('/dashboard/notifications')) return { title: 'Notifications', badge: 'Alerts' };
    if (path.startsWith('/dashboard/settings')) return { title: 'Settings', badge: 'Account' };
    if (path.startsWith('/dashboard/profile')) return { title: 'Student Profile', badge: 'My Info' };
    return { title: 'Dashboard', badge: 'Portal' };
  };

  const pageInfo = getPageInfo(pathname);

  const navLinks = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Practice CBT', href: '/dashboard/practice', icon: BookOpen },
    { name: 'Mistake Intelligence', href: '/dashboard/mistakes', icon: Brain },
    { name: 'Exam History', href: '/dashboard/history', icon: HistoryIcon },
    { name: 'Challenge Friend', href: '/dashboard/challenge', icon: Users },
    { name: 'Analytics', href: '/dashboard/analytics', icon: LineChart },
    { name: 'Leaderboard', href: '/dashboard/leaderboard', icon: Trophy },
    { name: 'Question Review', href: '/dashboard/review', icon: CheckSquare },
    { name: 'Wallet', href: '/dashboard/wallet', icon: Wallet },
    { name: 'Achievements', href: '/dashboard/achievements', icon: Award },
    { name: 'Notifications', href: '/dashboard/notifications', icon: Bell },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ];

  const formattedBalance = walletBalance !== null
    ? `₦${walletBalance.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : '₦500.00';

  const userInitials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'ST';

  // Computed Sidebar Width
  const currentSidebarWidth = isMobile ? '260px' : (isCollapsed ? '64px' : '200px');

  const userAvatar = user?.avatar || (typeof window !== 'undefined' ? localStorage.getItem('preplyx_avatar') : null);

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'linear-gradient(135deg, #f8f6ff 0%, #f5f7ff 100%)', overflow: 'hidden' }}>
      
      {/* Mobile Backdrop Overlay */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            zIndex: 9998,
            backdropFilter: 'blur(6px)',
            animation: 'fadeIn 0.2s ease-out',
          }}
        />
      )}

      {/* ── Sidebar Navigation ── */}
      <aside
        style={{
          width: currentSidebarWidth,
          minWidth: currentSidebarWidth,
          maxWidth: currentSidebarWidth,
          background: 'linear-gradient(180deg, #1a1535 0%, #120f2d 60%, #0e0b24 100%)',
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          position: isMobile ? 'fixed' : 'relative',
          left: isMobile ? (sidebarOpen ? '0' : '-100%') : '0',
          top: 0,
          zIndex: isMobile ? 9999 : 10,
          transition: 'width 0.28s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.28s cubic-bezier(0.4, 0, 0.2, 1), max-width 0.28s cubic-bezier(0.4, 0, 0.2, 1), left 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: isMobile
            ? '12px 0 40px rgba(0,0,0,0.45)'
            : '4px 0 24px rgba(0,0,0,0.18)',
          overflow: 'hidden',
          borderRight: '1px solid rgba(255,255,255,0.05)'
        }}
      >
        {/* ── Brand Header ── */}
        <div style={{
          height: '60px',
          minHeight: '60px',
          padding: isMobile ? '0 16px' : (isCollapsed ? '0 12px' : '0 16px'),
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed && !isMobile ? 'center' : 'space-between',
          boxSizing: 'border-box'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px', overflow: 'hidden' }}>
            <img
              src={logoSvg}
              alt="Preplyx logo"
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '9px',
                objectFit: 'contain',
                flexShrink: 0,
                transition: 'all 0.28s ease'
              }}
            />
            {(!isCollapsed || isMobile) && (
              <div style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff', letterSpacing: '-0.3px', lineHeight: 1 }}>Preplyx</div>
              </div>
            )}
          </div>

          {/* Desktop Collapse Button */}
          {!isMobile && !isCollapsed && (
            <button
              onClick={toggleSidebarCollapse}
              title="Collapse Sidebar"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '26px', height: '26px', borderRadius: '7px',
                backgroundColor: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.09)',
                cursor: 'pointer', color: 'rgba(255,255,255,0.5)',
                transition: 'all 0.18s ease', flexShrink: 0
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.13)'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
            >
              <ChevronLeft size={14} />
            </button>
          )}

          {/* Mobile Close Button */}
          {isMobile && (
            <button
              onClick={() => setSidebarOpen(false)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '7px', borderRadius: '9px',
                backgroundColor: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.09)',
                cursor: 'pointer', color: 'rgba(255,255,255,0.6)',
                transition: 'all 0.18s ease',
              }}
            >
              <X size={17} />
            </button>
          )}
        </div>

        {/* ── Navigation Items ── */}
        <nav
          className="custom-thin-scrollbar"
          style={{
            padding: isCollapsed && !isMobile ? '12px 8px' : '12px 8px',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            overflowY: 'auto',
            overflowX: 'hidden'
          }}
        >
          {navLinks.map(({ name, href, icon: Icon }) => {
            const isActive = href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);
            const isMini = isCollapsed && !isMobile;

            return (
              <Link
                key={href}
                to={href}
                title={isMini ? name : undefined}
                onClick={() => isMobile && setSidebarOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: isMini ? 'center' : 'flex-start',
                  gap: '10px',
                  padding: isMini ? '9px 0' : (isMobile ? '10px 10px' : '9px 10px'),
                  borderRadius: '10px',
                  fontSize: isMobile ? '13.5px' : '12.5px',
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? '#ffffff' : 'rgba(255,255,255,0.48)',
                  backgroundColor: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                  textDecoration: 'none',
                  transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)';
                    e.currentTarget.style.color = 'rgba(255,255,255,0.8)';
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'rgba(255,255,255,0.48)';
                  }
                }}
              >
                {/* Active left accent bar */}
                {isActive && (
                  <span style={{
                    position: 'absolute',
                    left: 0,
                    top: '20%',
                    bottom: '20%',
                    width: '3px',
                    borderRadius: '0 3px 3px 0',
                    backgroundColor: '#a78bfa',
                    animation: 'slideInBar 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
                  }} />
                )}

                {/* Icon */}
                <Icon
                  size={isMobile ? 17 : (isMini ? 19 : 16)}
                  style={{
                    color: isActive ? '#c4b5fd' : 'rgba(255,255,255,0.4)',
                    flexShrink: 0,
                    transition: 'color 0.18s ease, transform 0.18s ease',
                  }}
                />

                {/* Label */}
                {(!isMini || isMobile) && (
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                    {name}
                  </span>
                )}

                {/* Mini active dot */}
                {isMini && isActive && (
                  <span style={{
                    position: 'absolute',
                    right: '5px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '4px',
                    height: '4px',
                    borderRadius: '50%',
                    backgroundColor: '#a78bfa',
                  }} />
                )}
              </Link>
            );
          })}
        </nav>

        {/* ── Footer: User Chip + Logout ── */}
        <div style={{
          padding: isCollapsed && !isMobile ? '10px 8px' : '10px 8px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}>
          {/* Muted ghost logout button */}
          <button
            onClick={handleLogout}
            title={isCollapsed && !isMobile ? 'Logout' : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: isCollapsed && !isMobile ? 'center' : 'flex-start',
              gap: '9px',
              padding: isCollapsed && !isMobile ? '9px 0' : (isMobile ? '10px 10px' : '9px 10px'),
              borderRadius: '10px',
              width: '100%',
              fontSize: isMobile ? '13px' : '12.5px',
              fontWeight: 500,
              color: 'rgba(248,113,113,0.55)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.18s ease',
              letterSpacing: '0.01em',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.08)';
              e.currentTarget.style.color = 'rgba(248,113,113,0.85)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'rgba(248,113,113,0.55)';
            }}
          >
            <LogOut
              size={isMobile ? 16 : (isCollapsed && !isMobile ? 16 : 14)}
              style={{ flexShrink: 0, opacity: 0.7 }}
            />
            {(!isCollapsed || isMobile) && <span>Log out</span>}
          </button>
        </div>
      </aside>


      {/* Main App Workspace */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', width: '100%' }}>
        <header style={{
          height: '60px',
          minHeight: '60px',
          padding: isMobile ? '0 14px' : '0 24px',
          borderBottom: '1px solid rgba(109, 40, 217, 0.08)',
          backgroundColor: 'rgba(255, 255, 255, 0.88)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 4px 20px rgba(15, 23, 42, 0.03)',
          display: 'flex',
          alignItems: 'center',
          boxSizing: 'border-box'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: isMobile ? '8px' : '16px' }}>
            
            {/* Left: Desktop & Mobile Sidebar Toggle Button + Page Title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '14px', minWidth: 0 }}>
              
              {/* Universal Modern Sidebar Toggle Button */}
              <button
                onClick={toggleSidebarCollapse}
                title={isMobile ? (sidebarOpen ? 'Close Menu' : 'Open Menu') : (isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar')}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '8px', borderRadius: '10px', backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s ease',
                  minHeight: '38px', minWidth: '38px', flexShrink: 0, boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
                }}
                className="header-hover-card"
              >
                {isMobile ? (
                  <Menu size={18} color="#475569" />
                ) : (
                  <PanelLeft size={18} color="var(--color-primary)" style={{
                    transition: 'transform 0.3s ease',
                    transform: isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)'
                  }} />
                )}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                <h1 className="header-page-title" style={{
                  fontSize: isMobile ? '14px' : '16px',
                  fontWeight: 600,
                  color: '#0f172a',
                  letterSpacing: '-0.2px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  margin: 0,
                  lineHeight: 1.2
                }}>
                  {pageInfo.title}
                </h1>
                {!isMobile && (
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 500,
                    color: '#7c3aed',
                    backgroundColor: '#f3e8ff',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    border: '1px solid rgba(124, 58, 237, 0.15)',
                    whiteSpace: 'nowrap'
                  }}>
                    {pageInfo.badge}
                  </span>
                )}
              </div>
            </div>

            {/* Right: Header Micro-Cards */}
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '6px' : '10px', flexShrink: 0 }}>
              
              {/* Notifications Link */}
              <Link
                to="/dashboard/notifications"
                className="header-hover-card"
                title="Notifications"
                style={{
                  position: 'relative',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
                  color: '#475569',
                  textDecoration: 'none',
                  flexShrink: 0,
                }}
              >
                <Bell size={17} color="#475569" />
                {unreadCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-2px',
                      right: '-2px',
                      backgroundColor: '#ef4444',
                      color: '#ffffff',
                      fontSize: '10px',
                      fontWeight: 700,
                      minWidth: '18px',
                      height: '18px',
                      borderRadius: '999px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 4px',
                      border: '2px solid #ffffff',
                      boxShadow: '0 1px 4px rgba(239, 68, 68, 0.3)',
                      lineHeight: 1,
                    }}
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>

              {/* Streak Widget Card */}
              <Link to="/dashboard/achievements" style={{ cursor: 'pointer', textDecoration: 'none' }}>
                <StreakWidget />
              </Link>

              {/* Wallet Micro-Card Pill */}
              <Link 
                to="/dashboard/wallet"
                className="header-hover-card"
                title="Wallet Balance"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  height: '38px',
                  padding: '0 10px 0 5px',
                  borderRadius: '999px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #ddd6fe',
                  boxShadow: '0 1px 3px rgba(124, 58, 237, 0.06)',
                  textDecoration: 'none',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              >
                <div style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Wallet size={13} style={{ color: '#ffffff' }} />
                </div>
                <span className="wallet-pill-text" style={{ fontSize: isMobile ? '11px' : '12px', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>
                  {formattedBalance}
                </span>
              </Link>

              {/* Profile Card & Interactive Dropdown */}
              <div ref={profileRef} style={{ position: 'relative' }}>
                <button 
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="header-hover-card"
                  title="Account Menu"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    height: '38px',
                    padding: isMobile ? '0 6px 0 4px' : '0 10px 0 4px',
                    borderRadius: '999px',
                    backgroundColor: '#ffffff',
                    border: profileDropdownOpen ? '1px solid #7c3aed' : '1px solid #e2e8f0',
                    boxShadow: profileDropdownOpen ? '0 0 0 2px rgba(124, 58, 237, 0.12)' : '0 1px 3px rgba(15, 23, 42, 0.04)',
                    cursor: 'pointer',
                    outline: 'none',
                    flexShrink: 0
                  }}
                >
                  <div style={{ position: 'relative', width: '28px', height: '28px' }}>
                    {userAvatar ? (
                      <img
                        src={userAvatar}
                        alt="User Profile"
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '1.5px solid #7c3aed'
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: 700,
                        flexShrink: 0
                      }}>
                        {userInitials}
                      </div>
                    )}
                    {/* Online Dot */}
                    <span style={{
                      position: 'absolute',
                      bottom: '0',
                      right: '0',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: '#22c55e',
                      border: '1.5px solid #ffffff'
                    }} />
                  </div>

                  <ChevronDown 
                    size={14} 
                    color="#64748b" 
                    style={{ 
                      transition: 'transform 0.2s ease', 
                      transform: profileDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      marginLeft: '1px'
                    }} 
                  />
                </button>

                {/* Profile Interactive Dropdown Menu */}
                {profileDropdownOpen && (
                  <div 
                    className="dropdown-menu-animate"
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      right: 0,
                      width: '250px',
                      backgroundColor: '#ffffff',
                      borderRadius: '16px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)',
                      padding: '12px',
                      zIndex: 1000,
                    }}
                  >
                    {/* Dropdown User Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 8px 12px', borderBottom: '1px solid #f1f5f9' }}>
                      {userAvatar ? (
                        <img
                          src={userAvatar}
                          alt="User Profile"
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '1.5px solid #7c3aed'
                          }}
                        />
                      ) : (
                        <div style={{
                          width: '36px', height: '36px', borderRadius: '50%',
                          background: 'linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)',
                          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '13px', fontWeight: 700
                        }}>
                          {userInitials}
                        </div>
                      )}
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {user?.name || 'Student'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {user?.email || 'student@preplyx.com'}
                        </div>
                      </div>
                    </div>

                    {/* Quick Menu Items */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingTop: '8px' }}>
                      <Link
                        to="/dashboard/profile"
                        onClick={() => setProfileDropdownOpen(false)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '10px',
                          padding: '9px 10px', borderRadius: '10px',
                          fontSize: '13px', fontWeight: 600, color: '#334155',
                          textDecoration: 'none', transition: 'background-color 0.15s ease'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <User size={15} color="#7c3aed" />
                        <span>My Profile</span>
                      </Link>

                      <Link
                        to="/dashboard/wallet"
                        onClick={() => setProfileDropdownOpen(false)}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '9px 10px', borderRadius: '10px',
                          fontSize: '13px', fontWeight: 600, color: '#334155',
                          textDecoration: 'none', transition: 'background-color 0.15s ease'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <Wallet size={15} color="#7c3aed" />
                          <span>Wallet & Balance</span>
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#6d28d9', backgroundColor: '#f3e8ff', padding: '2px 6px', borderRadius: '6px' }}>
                          {formattedBalance}
                        </span>
                      </Link>

                      <Link
                        to="/dashboard/achievements"
                        onClick={() => setProfileDropdownOpen(false)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '10px',
                          padding: '9px 10px', borderRadius: '10px',
                          fontSize: '13px', fontWeight: 600, color: '#334155',
                          textDecoration: 'none', transition: 'background-color 0.15s ease'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <Award size={15} color="#7c3aed" />
                        <span>Achievements</span>
                      </Link>

                      <Link
                        to="/dashboard/settings"
                        onClick={() => setProfileDropdownOpen(false)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '10px',
                          padding: '9px 10px', borderRadius: '10px',
                          fontSize: '13px', fontWeight: 600, color: '#334155',
                          textDecoration: 'none', transition: 'background-color 0.15s ease'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <Settings size={15} color="#7c3aed" />
                        <span>Account Settings</span>
                      </Link>

                      <div style={{ height: '1px', backgroundColor: '#f1f5f9', margin: '4px 0' }} />

                      <button
                        onClick={handleLogout}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '10px',
                          padding: '9px 10px', borderRadius: '10px', width: '100%',
                          fontSize: '13px', fontWeight: 600, color: '#ef4444',
                          backgroundColor: 'transparent', border: 'none', cursor: 'pointer',
                          transition: 'background-color 0.15s ease'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fef2f2')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <LogOut size={15} color="#ef4444" />
                        <span>Log Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '20px 16px' : '28px 32px' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
