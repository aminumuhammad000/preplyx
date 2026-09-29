import { useState, useEffect } from 'react';
import { Bell, Clock, Wallet, Trophy, CheckCircle, X, Filter, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function Notifications() {
  const [filter, setFilter] = useState<'all' | 'unread' | 'exam' | 'wallet' | 'achievement'>('all');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!token) return;
      
      try {
        setLoading(true);
        const data = await api.getNotifications(token);
        setNotifications(data);
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [token]);

  const iconMap: any = {
    Clock, Bell, Wallet, Trophy, CheckCircle
  };

  const filteredNotifications = (notifications || []).filter((notif) => {
    if (filter === 'all') return true;
    if (filter === 'unread') return notif.unread;
    return notif.type === filter;
  });

  const handleMarkAsRead = async (notificationId: number) => {
    if (!token) return;
    try {
      await api.markNotificationAsRead(token, notificationId);
      setNotifications((notifications || []).map(n => 
        n.id === notificationId ? { ...n, unread: false } : n
      ));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleDeleteNotification = async (notificationId: number) => {
    if (!token) return;
    try {
      await api.deleteNotification(token, notificationId);
      setNotifications((notifications || []).filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const handleClearAll = async () => {
    if (!token) return;
    try {
      await api.clearAllNotifications(token);
      setNotifications([]);
    } catch (error) {
      console.error('Failed to clear notifications:', error);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <Bell size={48} color="#e2e8f0" style={{ marginBottom: '16px' }} />
          <p style={{ fontSize: '16px', color: '#94a3b8' }}>Loading notifications...</p>
        </div>
      </div>
    );
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'exam': return '#7B2FF7';
      case 'wallet': return '#10b981';
      case 'achievement': return '#f59e0b';
      default: return '#64748b';
    }
  };

  const getTypeBg = (type: string) => {
    switch (type) {
      case 'exam': return '#f5f3ff';
      case 'wallet': return '#f0fdf4';
      case 'achievement': return '#fef3c7';
      default: return '#f8fafc';
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '4px' }}>
            Notifications
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
            Stay updated with exam reminders and alerts
          </p>
        </div>
        <button onClick={handleClearAll} style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 16px',
          borderRadius: '8px',
          background: '#fef2f2',
          color: '#ef4444',
          fontSize: '13px',
          fontWeight: 600,
          border: '1px solid #fecaca',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}>
          <Trash2 size={16} />
          Clear All
        </button>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {[
          { key: 'all', label: 'All', count: (notifications || []).length },
          { key: 'unread', label: 'Unread', count: (notifications || []).filter(n => n.unread).length },
          { key: 'exam', label: 'Exam', count: (notifications || []).filter(n => n.type === 'exam').length },
          { key: 'wallet', label: 'Wallet', count: (notifications || []).filter(n => n.type === 'wallet').length },
          { key: 'achievement', label: 'Achievements', count: (notifications || []).filter(n => n.type === 'achievement').length },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setFilter(item.key as any)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              background: filter === item.key ? 'var(--gradient-primary)' : '#fff',
              color: filter === item.key ? '#fff' : 'var(--color-text-main)',
              fontSize: '13px',
              fontWeight: 600,
              border: filter === item.key ? 'none' : '1px solid var(--glass-border)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Filter size={14} />
            {item.label}
            {item.count > 0 && (
              <span style={{
                fontSize: '11px',
                padding: '2px 6px',
                borderRadius: '10px',
                backgroundColor: filter === item.key ? 'rgba(255,255,255,0.2)' : '#f8fafc',
                color: filter === item.key ? '#fff' : '#64748b'
              }}>
                {item.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: 'var(--shadow-soft)',
        border: '1px solid var(--glass-border)'
      }}>
        {filteredNotifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Bell size={48} color="#e2e8f0" style={{ marginBottom: '16px' }} />
            <p style={{ fontSize: '16px', color: '#94a3b8', marginBottom: '8px' }}>No notifications found</p>
            <p style={{ fontSize: '13px', color: '#cbd5e1' }}>Check back later for updates</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(filteredNotifications || []).map((notification) => {
              const IconComponent = iconMap[notification.icon] || Bell;
              return (
                <div
                  key={notification.id}
                  onClick={() => notification.unread && handleMarkAsRead(notification.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '16px',
                    padding: '16px',
                    borderRadius: '12px',
                    backgroundColor: notification.unread ? '#f8fafc' : '#fff',
                    border: notification.unread ? '1px solid #e2e8f0' : '1px solid var(--glass-border)',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    cursor: notification.unread ? 'pointer' : 'default'
                  }}
                >
                  {notification.unread && (
                    <div style={{
                      position: 'absolute',
                      top: '16px',
                      right: '16px',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: '#7B2FF7'
                    }} />
                  )}
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    backgroundColor: getTypeBg(notification.type),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <IconComponent size={24} color={getTypeColor(notification.type)} />
                  </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-main)' }}>
                      {notification.title}
                    </h4>
                    <span style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: getTypeBg(notification.type),
                      color: getTypeColor(notification.type),
                      fontWeight: 600,
                      textTransform: 'capitalize'
                    }}>
                      {notification.type}
                    </span>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>
                    {notification.message}
                  </p>
                  <p style={{ fontSize: '12px', color: '#94a3b8' }}>
                    {notification.time}
                  </p>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteNotification(notification.id);
                  }}
                  style={{
                    padding: '8px',
                    borderRadius: '6px',
                    background: 'transparent',
                    color: '#94a3b8',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            );
          })}
          </div>
        )}
      </div>
    </div>
  );
}
