import React, { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, Check } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

function getPasswordStrength(pw: string): { level: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { level: score, label: 'Weak', color: '#CF6679' };
  if (score === 2) return { level: score, label: 'Fair', color: '#D4AF37' };
  if (score === 3) return { level: score, label: 'Good', color: '#7BAFD4' };
  return { level: score, label: 'Strong', color: '#4CAF7A' };
}

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ fullName: '', email: '', university: '', password: '', confirmPassword: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState('');

  const strength = getPasswordStrength(form.password);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.fullName.trim()) e.fullName = 'Full name is required';
    if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) e.email = 'Valid email required';
    if (form.password.length < 6) e.password = 'Minimum 6 characters';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    return e;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    setGlobalError('');
    try {
      await register({
        fullName: form.fullName,
        email: form.email,
        password: form.password,
        confirmPassword: form.confirmPassword,
        university: form.university || undefined,
      });
      navigate('/onboarding');
    } catch (err) {
      setGlobalError((err as Error).message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="deco-bg min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md animate-slide-up">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-6 h-6 border border-gold flex items-center justify-center" style={{ transform: 'rotate(45deg)' }}>
            <div className="w-2 h-2 bg-gold" style={{ transform: 'rotate(-45deg)' }} />
          </div>
          <Link to="/" className="heading-sm text-foreground text-[11px]">CAMPUS PLACEMENT AI</Link>
        </div>

        <div className="deco-card deco-corners p-7">
          <div className="mb-5">
            <div className="label-deco mb-1">Join the platform</div>
            <h1 className="heading-lg text-foreground text-[1rem]">CREATE ACCOUNT</h1>
            <div className="gold-line mt-2" />
          </div>

          {globalError && (
            <div className="flex items-center gap-2 p-3 mb-4 border border-red-800/50 bg-red-900/10 text-red-400">
              <AlertCircle size={14} className="flex-shrink-0" />
              <span className="text-xs">{globalError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Full Name + University row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="reg-name" className="input-label">Full Name *</label>
                <input
                  id="reg-name"
                  type="text"
                  className={`input-deco ${errors.fullName ? 'border-red-700' : ''}`}
                  placeholder="Your full name"
                  value={form.fullName}
                  onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                  autoComplete="name"
                />
                {errors.fullName && <p className="input-error">{errors.fullName}</p>}
              </div>
              <div>
                <label htmlFor="reg-university" className="input-label">University</label>
                <input
                  id="reg-university"
                  type="text"
                  className="input-deco"
                  placeholder="Optional"
                  value={form.university}
                  onChange={e => setForm(f => ({ ...f, university: e.target.value }))}
                  autoComplete="organization"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="reg-email" className="input-label">Email Address *</label>
              <input
                id="reg-email"
                type="email"
                className={`input-deco ${errors.email ? 'border-red-700' : ''}`}
                placeholder="student@uni.edu"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                autoComplete="email"
              />
              {errors.email && <p className="input-error">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="reg-password" className="input-label">Password *</label>
              <div className="relative">
                <input
                  id="reg-password"
                  type={showPw ? 'text' : 'password'}
                  className={`input-deco pr-10 ${errors.password ? 'border-red-700' : ''}`}
                  placeholder="Min. 6 characters"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                  aria-label="Toggle password visibility"
                >
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {form.password && (
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="flex gap-1 flex-1">
                    {[1, 2, 3, 4].map(i => (
                      <div
                        key={i}
                        className="h-0.5 flex-1 transition-all duration-300"
                        style={{ background: i <= strength.level ? strength.color : '#2A2A2A' }}
                      />
                    ))}
                  </div>
                  <span className="text-[10px]" style={{ color: strength.color }}>{strength.label}</span>
                </div>
              )}
              {errors.password && <p className="input-error">{errors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="reg-confirm" className="input-label">Confirm Password *</label>
              <div className="relative">
                <input
                  id="reg-confirm"
                  type="password"
                  className={`input-deco pr-10 ${errors.confirmPassword ? 'border-red-700' : ''}`}
                  placeholder="Repeat password"
                  value={form.confirmPassword}
                  onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                  autoComplete="new-password"
                />
                {form.confirmPassword && form.password === form.confirmPassword && (
                  <Check size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-green-400" />
                )}
              </div>
              {errors.confirmPassword && <p className="input-error">{errors.confirmPassword}</p>}
            </div>

            <button
              id="register-submit"
              type="submit"
              className="btn-gold w-full mt-2"
              disabled={loading}
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-muted text-xs mt-4">
            Already have an account?{' '}
            <Link to="/login" className="text-gold hover:text-gold-light transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
