import React, { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('Please enter email and password.'); return; }
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError((err as Error).message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="deco-bg min-h-screen flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex flex-col justify-between w-2/5 xl:w-1/2 p-12 border-r border-[#1A1A1A] relative overflow-hidden">
        {/* Background geometric */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
          <div
            className="w-80 h-80 rounded-full border"
            style={{ borderColor: 'rgba(212,175,55,0.06)', boxShadow: '0 0 100px rgba(212,175,55,0.06) inset' }}
          />
          <div
            className="absolute w-56 h-56 rounded-full border"
            style={{ borderColor: 'rgba(212,175,55,0.04)' }}
          />
          <div
            className="absolute w-32 h-32 border border-gold"
            style={{ transform: 'rotate(45deg)', opacity: 0.04 }}
          />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 border border-gold flex items-center justify-center" style={{ transform: 'rotate(45deg)' }}>
              <div className="w-2.5 h-2.5 bg-gold" style={{ transform: 'rotate(-45deg)' }} />
            </div>
            <span className="label-deco tracking-[0.3em]">Campus Placement AI</span>
          </div>
        </div>

        <div className="relative z-10">
          <h2 className="heading-display text-foreground leading-tight mb-4" style={{ fontSize: '2.5rem' }}>
            PLACEMENT<br />
            <span className="text-gold">INTELLIGENCE</span><br />
            PLATFORM
          </h2>
          <div className="gold-line mb-4 max-w-[120px]" />
          <p className="text-muted text-sm leading-relaxed max-w-xs">
            AI-powered eligibility analysis, skill gap intelligence, and personalized preparation — all in one platform.
          </p>
        </div>

        <div className="relative z-10">
          <div className="grid grid-cols-3 gap-3 max-w-xs">
            {['Eligibility Analysis', 'Skill Gap Intelligence', 'Preparation Plans'].map((item, i) => (
              <div key={i} className="deco-card p-2.5 text-center">
                <div className="phase-number text-[10px] mb-1">{['I', 'II', 'III'][i]}</div>
                <div className="text-muted text-[9px] leading-tight tracking-wider uppercase">{item}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right login form */}
      <div className="flex-1 flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center justify-center gap-2 mb-8 lg:hidden">
            <div className="w-6 h-6 border border-gold flex items-center justify-center" style={{ transform: 'rotate(45deg)' }}>
              <div className="w-2 h-2 bg-gold" style={{ transform: 'rotate(-45deg)' }} />
            </div>
            <span className="heading-sm text-foreground text-[11px]">CAMPUS PLACEMENT AI</span>
          </div>

          <div className="deco-card deco-corners p-7 animate-slide-up">
            {/* Header */}
            <div className="mb-6">
              <div className="label-deco mb-1">Welcome back</div>
              <h1 className="heading-lg text-foreground text-[1rem]">SIGN IN</h1>
              <div className="gold-line mt-2" />
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-3 mb-4 border border-red-800/50 bg-red-900/10 text-red-400">
                <AlertCircle size={14} className="flex-shrink-0" />
                <span className="text-xs">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div>
                <label htmlFor="login-email" className="input-label">Email Address</label>
                <input
                  id="login-email"
                  type="email"
                  className="input-deco"
                  placeholder="student@university.edu"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>

              <div>
                <label htmlFor="login-password" className="input-label">Password</label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    className="input-deco pr-10"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <button
                id="login-submit"
                type="submit"
                className="btn-gold w-full mt-2"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <div className="gold-divider mt-5">
              <span className="label-deco px-2 bg-card">or</span>
            </div>

            <p className="text-center text-muted text-xs mt-4">
              No account?{' '}
              <Link to="/register" className="text-gold hover:text-gold-light transition-colors">
                Create account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
