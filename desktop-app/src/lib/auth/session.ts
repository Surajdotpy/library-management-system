import type { User } from '@/types';

const TOKEN_STORAGE_KEY = 'token';
const USER_STORAGE_KEY = 'user';

interface StoredSession {
  token: string;
  user: User;
}

function hasSecureSessionBridge(): boolean {
  return typeof window !== 'undefined' && window.authSession != null;
}

function clearLegacySessionCache(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
}

function getSecureSession(): StoredSession | null {
  if (!hasSecureSessionBridge()) {
    return null;
  }

  clearLegacySessionCache();
  return window.authSession.getSession();
}

export function getStoredToken(): string | null {
  if (hasSecureSessionBridge()) {
    return getSecureSession()?.token ?? null;
  }

  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function getStoredUser(): User | null {
  if (hasSecureSessionBridge()) {
    return getSecureSession()?.user ?? null;
  }

  const rawUser = localStorage.getItem(USER_STORAGE_KEY);

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser) as User;
  } catch (error) {
    console.error('Failed to parse stored user session.', error);
    clearStoredSession();
    return null;
  }
}

export function setStoredSession(token: string, user: User): void {
  if (hasSecureSessionBridge()) {
    window.authSession.setSession(token, user);
    clearLegacySessionCache();
    return;
  }

  localStorage.setItem(TOKEN_STORAGE_KEY, token);
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

export function clearStoredSession(): void {
  if (hasSecureSessionBridge()) {
    window.authSession.clearSession();
  }

  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
}
