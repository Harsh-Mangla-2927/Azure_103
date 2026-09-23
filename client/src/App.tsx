import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { AppShell } from './components/layout/AppShell';
import { LoadingState } from './components/ui/LoadingState';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Resume from './pages/Resume';
import Eligibility from './pages/Eligibility';
import SkillGap from './pages/SkillGap';
import Preparation from './pages/Preparation';
import Assistant from './pages/Assistant';
import Settings from './pages/Settings';

function ProtectedRoute() {
  const { isAuthenticated, loading, onboardingCompleted } = useAuth();
  if (loading) {
    return (
      <div className="deco-bg min-h-screen flex items-center justify-center">
        <LoadingState message="Loading Campus Placement AI..." size="lg" />
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!onboardingCompleted) return <Navigate to="/onboarding" replace />;
  return <Outlet />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading, onboardingCompleted } = useAuth();
  if (loading) {
    return (
      <div className="deco-bg min-h-screen flex items-center justify-center">
        <LoadingState message="Loading..." size="md" />
      </div>
    );
  }
  if (isAuthenticated) {
    return <Navigate to={onboardingCompleted ? '/dashboard' : '/onboarding'} replace />;
  }
  return <>{children}</>;
}

function OnboardingRoute() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

      {/* Onboarding */}
      <Route element={<OnboardingRoute />}>
        <Route path="/onboarding" element={<Onboarding />} />
      </Route>

      {/* Protected app routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/resume" element={<Resume />} />
          <Route path="/eligibility" element={<Eligibility />} />
          <Route path="/skill-gap" element={<SkillGap />} />
          <Route path="/preparation" element={<Preparation />} />
          <Route path="/assistant" element={<Assistant />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
