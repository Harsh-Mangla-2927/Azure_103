import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { saveAuth, getToken, getUser, getOnboardingCompleted, clearAuth, setOnboardingCompleted } from '../lib/auth';
import { api } from '../lib/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  onboardingCompleted: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; confirmPassword: string; fullName: string; university?: string }) => Promise<void>;
  logout: () => void;
  completeOnboarding: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(getUser());
  const [onboardingCompleted, setOnboarding] = useState(getOnboardingCompleted());
  const [loading, setLoading] = useState(!!getToken());

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    // Verify token is still valid
    api.auth.me()
      .then((data) => {
        setUser(data.user);
        setOnboarding(data.onboardingCompleted);
        saveAuth(token, data.user, data.onboardingCompleted);
      })
      .catch(() => {
        clearAuth();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.auth.login({ email, password });
    saveAuth(data.token, data.user, data.onboardingCompleted);
    setUser(data.user);
    setOnboarding(data.onboardingCompleted);
  }, []);

  const register = useCallback(async (payload: { email: string; password: string; confirmPassword: string; fullName: string; university?: string }) => {
    const data = await api.auth.register(payload);
    saveAuth(data.token, data.user, false);
    setUser(data.user);
    setOnboarding(false);
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
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, onboardingCompleted, loading, login, register, logout, completeOnboarding }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
