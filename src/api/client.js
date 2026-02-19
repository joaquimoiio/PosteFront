import { API_BASE } from '../utils/constants';

function getTenantId() {
  return localStorage.getItem('poste-tenant') || 'vermelho';
}

export async function apiRequest(endpoint, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': getTenantId(),
        ...options.headers,
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(errorText || `HTTP ${response.status}`);
    }

    const contentType = response.headers.get('Content-Type') || '';
    if (contentType.includes('application/json')) {
      return await response.json();
    }
    return {};
  } catch (error) {
    clearTimeout(timeout);
    if (error.name === 'AbortError') throw new Error('Timeout — verifique sua conexão');
    throw error;
  }
}
