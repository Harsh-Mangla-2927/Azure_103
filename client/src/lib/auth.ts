import { User } from '../types';

const TOKEN_KEY = 'cp_token';
const USER_KEY = 'cp_user';
const ONBOARDING_KEY = 'cp_onboarding';

export function saveAuth(token: string, user: User, onboardingCompleted: boolean): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.setItem(ONBOARDING_KEY, onboardingCompleted ? '1' : '0');
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function getOnboardingCompleted(): boolean {
  return localStorage.getItem(ONBOARDING_KEY) === '1';
}

export function setOnboardingCompleted(): void {
  localStorage.setItem(ONBOARDING_KEY, '1');
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(ONBOARDING_KEY);
}

export function isAuthenticated(): boolean {
  return !!getToken() && !!getUser();
}
