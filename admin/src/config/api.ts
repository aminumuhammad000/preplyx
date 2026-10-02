export const getApiBaseUrl = (): string => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL as string;
  if (typeof window !== 'undefined' && window.location && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return 'https://api.preplyx.com.ng/api';
  }
  return 'http://localhost:5004/api';
};

export const API_BASE_URL = getApiBaseUrl();

/**
 * Returns authorization and content-type headers for admin API requests.
 */
export const getAdminAuthHeaders = (): Record<string, string> => {
  const token = typeof window !== 'undefined'
    ? (localStorage.getItem('adminToken') || localStorage.getItem('preplyx_token') || '')
    : '';

  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};
