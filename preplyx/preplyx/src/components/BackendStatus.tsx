"use client";
import { useState, useEffect } from 'react';
import { Server, ServerOff, AlertTriangle } from 'lucide-react';
import { checkBackendHealth } from '@/lib/api';

export default function BackendStatus() {
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  useEffect(() => {
    const checkStatus = async () => {
      const isOnline = await checkBackendHealth();
      setBackendStatus(isOnline ? 'online' : 'offline');
    };

    checkStatus();
    // Check every 30 seconds
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  if (backendStatus === 'checking') {
    return null; // Don't show anything while checking
  }

  if (backendStatus === 'offline') {
    return (
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        backgroundColor: '#fee2e2',
        border: '1px solid #dc2626',
        borderRadius: '12px',
        padding: '16px',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: '0 4px 12px rgba(220, 38, 38, 0.2)',
        maxWidth: '400px'
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '8px',
          backgroundColor: '#dc2626',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <ServerOff size={18} color="#fff" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#dc2626', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangle size={14} />
            Backend Offline
          </div>
          <div style={{ fontSize: '12px', color: '#991b1b', lineHeight: 1.4 }}>
            Backend server is not running. Start it with: <code style={{ backgroundColor: '#fecaca', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>cd backend && npm start</code>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
