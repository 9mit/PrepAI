/**
 * Authenticated API client — obtains a short-lived guest JWT from the backend
 * and attaches it to all protected requests. Token lives in sessionStorage only.
 */

const API_URL = import.meta.env.VITE_API_URL || '';
const TOKEN_KEY = 'prepai_access_token';
const EXP_KEY = 'prepai_access_exp';

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

function readCachedToken(): string | null {
  const token = sessionStorage.getItem(TOKEN_KEY);
  const exp = Number(sessionStorage.getItem(EXP_KEY) || 0);
  if (!token || !exp || Date.now() >= exp - 30_000) {
    return null;
  }
  return token;
}

function cacheToken(token: string, expiresIn: number): void {
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(EXP_KEY, String(Date.now() + expiresIn * 1000));
}

export async function ensureAccessToken(): Promise<string> {
  const cached = readCachedToken();
  if (cached) return cached;

  const response = await fetch(`${API_URL}/auth/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  if (!response.ok) {
    throw new Error('Failed to obtain API access token');
  }
  const data = (await response.json()) as TokenResponse;
  cacheToken(data.access_token, data.expires_in);
  return data.access_token;
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await ensureAccessToken();
  const headers = new Headers(init.headers || {});
  if (!headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const response = await fetch(`${API_URL}${path}`, { ...init, headers });

  // One retry on 401 with a fresh token
  if (response.status === 401) {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(EXP_KEY);
    const fresh = await ensureAccessToken();
    headers.set('Authorization', `Bearer ${fresh}`);
    return fetch(`${API_URL}${path}`, { ...init, headers });
  }
  return response;
}

export function apiUrl(path: string): string {
  return `${API_URL}${path}`;
}
