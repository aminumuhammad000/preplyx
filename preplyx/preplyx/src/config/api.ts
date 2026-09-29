export const getApiBaseUrl = (): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) {
    return import.meta.env.VITE_API_URL as string;
  }
  if (typeof window !== 'undefined' && window.location && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return 'https://api.preplyx.com.ng/api';
  }
  return 'http://localhost:5004/api';
};

export const API_BASE_URL = getApiBaseUrl();
