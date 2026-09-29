import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { saveAuth, getToken, getUser, getOnboardingCompleted, clearAuth, setOnboardingCompleted } from '../lib/auth';
import { api } from '../lib/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  onboardingCompleted: boolean;
  loading: boolean;
  /** Called by Login/Register pages after receiving JWT from verifyOtp */
  setAuth: (data: { user: User; isAuthenticated: boolean; onboardingCompleted?: boolean }) => void;
  logout: () => void;
  completeOnboarding: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Always start unauthenticated — validate against /auth/me before trusting any cached state
  const [user, setUser]                      = useState<User | null>(null);
  const [onboardingCompleted, setOnboarding] = useState(false);
  // loading=true until /auth/me resolves (or no token exists)
  const [loading, setLoading]                = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    api.auth.me()
      .then((data) => {
        setUser(data.user as User);
        setOnboarding(data.onboardingCompleted);
        saveAuth(token, data.user as User, data.onboardingCompleted);
      })
      .catch(() => {
        // Token invalid or expired — clear everything
        clearAuth();
        setUser(null);
        setOnboarding(false);
      })
      .finally(() => setLoading(false));
  }, []);

  /** Called by Login/Register pages after successful verifyOtp */
  const setAuth = useCallback(({ user: u, onboardingCompleted: oc }: { user: User; isAuthenticated: boolean; onboardingCompleted?: boolean }) => {
    const token = localStorage.getItem('cp_token') || '';
    const completed = oc ?? false;
    setUser(u);
    setOnboarding(completed);
    saveAuth(token, u, completed);
  }, []);

  const logout = useCallback(() => {
    api.auth.logout().catch(() => {});
    clearAuth();
    setUser(null);
    setOnboarding(false);
  }, []);

  const completeOnboarding = useCallback(() => {
    setOnboardingCompleted();
    setOnboarding(true);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, onboardingCompleted, loading, setAuth, logout, completeOnboarding }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
