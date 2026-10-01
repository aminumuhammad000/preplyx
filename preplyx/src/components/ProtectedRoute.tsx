import { ReactNode } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }: { children?: ReactNode }) {
  const { user, token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F8F8FC',
        color: '#7B2FF7',
        fontFamily: 'sans-serif',
        fontSize: '16px',
        fontWeight: 700
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #7B2FF7 0%, #4B0FA3 100%)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
            fontSize: '20px',
            fontWeight: 900
          }}>
            P
          </div>
          <div>Authenticating...</div>
        </div>
      </div>
    );
  }

  // If no token or no user loaded, enforce redirect to login
  const hasToken = token || (typeof window !== 'undefined' && (localStorage.getItem('preplyx_token') || sessionStorage.getItem('preplyx_token')));

  if (!hasToken) {
    return <Navigate to="/login" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
