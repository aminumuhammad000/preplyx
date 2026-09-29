export const API_BASE = '/api';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getVirtualAccount() {
  const response = await fetch(`${API_BASE}/wallet/virtual-account`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to fetch virtual account');
  return response.json();
}

export async function createVirtualAccount() {
  const response = await fetch(`${API_BASE}/wallet/virtual-account`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    credentials: 'include',
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.message || 'Failed to create virtual account');
  }
  return response.json();
}
