import React, { useState, FormEvent, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle, CheckCircle2, Mail, ShieldCheck, RefreshCw, Info,
  Eye, EyeOff, Lock, ChevronLeft, KeyRound,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../hooks/useAuth';

const BLOCKED_PERSONAL = [
  'gmail.com','googlemail.com','yahoo.com','yahoo.in','yahoo.co.in',
  'outlook.com','hotmail.com','hotmail.in','live.com','live.in','msn.com',
  'icloud.com','me.com','mac.com','aol.com','protonmail.com','proton.me',
  'rediffmail.com','zoho.com','yandex.com','yandex.ru','fastmail.com',
];
function looksPersonal(email: string): boolean {
  const domain = email.trim().toLowerCase().split('@')[1] || '';
  return BLOCKED_PERSONAL.includes(domain);
}

// Steps:
//  Normal login:       email → password → otp
//  Forgot password:    email → forgot_otp → reset_password
type Step = 'email' | 'password' | 'otp' | 'forgot_otp' | 'reset_password';

export default function Login() {
  const { setAuth }  = useAuth() as any;
  const navigate     = useNavigate();

  const [step, setStep]               = useState<Step>('email');
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState('');

  // OTP (login flow)
  const [otp, setOtp]                 = useState(['', '', '', '', '', '']);
  // OTP (forgot-password flow)
  const [forgotOtp, setForgotOtp]     = useState(['', '', '', '', '', '']);
  // Reset password
  const [newPassword, setNewPassword]       = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNew, setShowNew]               = useState(false);
  const [showConfirmNew, setShowConfirmNew] = useState(false);

  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [info, setInfo]               = useState('');
  const [cooldown, setCooldown]       = useState(0);
  const [attemptsLeft, setAttemptsLeft] = useState(5);

  const otpRefs       = useRef<(HTMLInputElement | null)[]>([]);
  const forgotOtpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const cooldownId    = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCooldown = (secs = 30) => {
    setCooldown(secs);
    if (cooldownId.current) clearInterval(cooldownId.current);
    cooldownId.current = setInterval(() => {
      setCooldown(p => {
        if (p <= 1) { clearInterval(cooldownId.current!); return 0; }
        return p - 1;
      });
    }, 1000);
  };

  const clearMessages = () => { setError(''); setInfo(''); };

  // ─────────────────────────────────────────────────────────────────────────────
  // Normal login flow
  // ─────────────────────────────────────────────────────────────────────────────

  const handleEmailNext = (e?: FormEvent) => {
    e?.preventDefault();
    clearMessages();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError('Please enter a valid email address.'); return;
    }
    if (looksPersonal(trimmed)) {
      setError('Please use your institutional or university email address. Personal email addresses (Gmail, Outlook, etc.) are not accepted.');
      return;
    }
    setStep('password');
  };

  const handlePasswordSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    clearMessages();
    if (!password.trim()) { setError('Please enter your password.'); return; }
    setLoading(true);
    try {
      const res = await api.auth.sendOtp({ email: email.trim().toLowerCase(), password, purpose: 'login' });
      setMaskedEmail(res.email);
      setInfo('OTP sent to your email. Please check your inbox and spam/junk folder.');
      setStep('otp');
      setAttemptsLeft(5);
      startCooldown(30);
      setTimeout(() => otpRefs.current[0]?.focus(), 120);
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.includes('EMAIL_NOT_CONFIGURED')) setError('Email service is not configured. Please contact the administrator.');
      else if (msg.includes('EMAIL_DELIVERY_FAILED')) setError("We couldn't send the OTP right now. Please try again in a moment.");
      else if (msg.includes('Incorrect password') || msg.includes('WRONG_PASSWORD')) setError('Incorrect password. Please try again.');
      else if (msg.includes('No account found')) setError('No account found with this email. Please register first.');
      else setError(msg);
    } finally { setLoading(false); }
  };

  const handleVerifyOtp = async (digits?: string[]) => {
    clearMessages();
    const otpStr = (digits || otp).join('');
    if (otpStr.length !== 6) { setError('Please enter all 6 digits.'); return; }
    setLoading(true);
    try {
      const res = await api.auth.verifyOtp({ email: email.trim().toLowerCase(), otp: otpStr });
      localStorage.setItem('cp_token', res.token);
      if (setAuth) setAuth({ user: res.user, isAuthenticated: true, onboardingCompleted: res.onboardingCompleted });
      navigate(res.onboardingCompleted ? '/dashboard' : '/onboarding', { replace: true });
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.includes('expired')) setError('This OTP has expired. Please request a new one.');
      else if (msg.includes('Incorrect') || msg.includes('attempt')) {
        setError(msg);
        const m = msg.match(/(\d+) attempt/);
        if (m) setAttemptsLeft(parseInt(m[1], 10));
      } else if (msg.includes('Too many')) {
        setError('Too many verification attempts. Please request a new OTP.');
        setAttemptsLeft(0);
      } else setError(msg);
    } finally { setLoading(false); }
  };

  const handleOtpChange = (idx: number, value: string, refs: React.MutableRefObject<(HTMLInputElement | null)[]>, arr: string[], setArr: (v: string[]) => void, onComplete: (a: string[]) => void) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...arr];
    next[idx] = value.slice(-1);
    setArr(next);
    if (value && idx < 5) refs.current[idx + 1]?.focus();
    if (next.every(d => d !== '') && next.join('').length === 6) setTimeout(() => onComplete(next), 80);
  };

  const handleOtpKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>, refs: React.MutableRefObject<(HTMLInputElement | null)[]>, arr: string[], onEnter: () => void) => {
    if (e.key === 'Backspace' && !arr[idx] && idx > 0) refs.current[idx - 1]?.focus();
    if (e.key === 'Enter') onEnter();
  };

  const handleOtpPaste = (e: React.ClipboardEvent, refs: React.MutableRefObject<(HTMLInputElement | null)[]>, setArr: (v: string[]) => void, onComplete: (a: string[]) => void) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const arr = pasted.split('');
      setArr(arr);
      refs.current[5]?.focus();
      setTimeout(() => onComplete(arr), 80);
    }
  };

  const handleResend = async () => {
    setOtp(['', '', '', '', '', '']);
    clearMessages();
    setLoading(true);
    try {
      const res = await api.auth.resendOtp({ email: email.trim().toLowerCase(), purpose: 'login' });
      setMaskedEmail(res.email);
      setInfo('OTP resent. Please check your inbox and spam/junk folder.');
      setAttemptsLeft(5);
      startCooldown(30);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg.includes('wait') ? msg : "Couldn't resend OTP. Please try again.");
    } finally { setLoading(false); }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Forgot password flow
  // ─────────────────────────────────────────────────────────────────────────────

  const handleForgotPassword = async () => {
    clearMessages();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError('Please enter your email first, then click Forgot Password.'); return;
    }
    setLoading(true);
    try {
      const res = await api.auth.forgotPassword(trimmed);
      setMaskedEmail(res.email);
      setInfo('Password reset OTP sent. Please check your inbox and spam/junk folder.');
      setForgotOtp(['', '', '', '', '', '']);
      setStep('forgot_otp');
      setAttemptsLeft(5);
      startCooldown(30);
      setTimeout(() => forgotOtpRefs.current[0]?.focus(), 120);
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.includes('EMAIL_NOT_CONFIGURED')) setError('Email service is not configured. Please contact the administrator.');
      else if (msg.includes('wait')) setError(msg);
      else setError("Couldn't send OTP. Please try again.");
    } finally { setLoading(false); }
  };

  const handleVerifyForgotOtp = async (digits?: string[]) => {
    clearMessages();
    const otpStr = (digits || forgotOtp).join('');
    if (otpStr.length !== 6) { setError('Please enter all 6 digits.'); return; }
    // Just move to reset_password step — actual OTP is verified when setting new password
    clearMessages();
    setStep('reset_password');
    setNewPassword('');
    setConfirmNewPassword('');
  };

  const handleResetPassword = async (e?: FormEvent) => {
    e?.preventDefault();
    clearMessages();
    if (newPassword.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (newPassword !== confirmNewPassword) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      const res = await api.auth.resetPassword({
        email: email.trim().toLowerCase(),
        otp: forgotOtp.join(''),
        newPassword,
      });
      // Auto-login after successful reset
      localStorage.setItem('cp_token', res.token);
      if (setAuth) setAuth({ user: res.user, isAuthenticated: true, onboardingCompleted: res.onboardingCompleted });
      navigate(res.onboardingCompleted ? '/dashboard' : '/onboarding', { replace: true });
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.includes('expired')) {
        setError('OTP has expired. Please request a new password reset OTP.');
        setStep('forgot_otp');
      } else if (msg.includes('Incorrect') || msg.includes('attempt')) {
        setError(msg);
        setStep('forgot_otp');
        const m = msg.match(/(\d+) attempt/);
        if (m) setAttemptsLeft(parseInt(m[1], 10));
      } else setError(msg);
    } finally { setLoading(false); }
  };

  const handleResendForgotOtp = async () => {
    setForgotOtp(['', '', '', '', '', '']);
    clearMessages();
    setLoading(true);
    try {
      const res = await api.auth.forgotPassword(email.trim().toLowerCase());
      setMaskedEmail(res.email);
      setInfo('New reset OTP sent. Please check your inbox and spam/junk folder.');
      setAttemptsLeft(5);
      startCooldown(30);
      setTimeout(() => forgotOtpRefs.current[0]?.focus(), 100);
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg.includes('wait') ? msg : "Couldn't resend OTP. Please try again.");
    } finally { setLoading(false); }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Step indicator logic
  // ─────────────────────────────────────────────────────────────────────────────

  const isForgotFlow = step === 'forgot_otp' || step === 'reset_password';
  const stepIndex = step === 'email' ? 0 : step === 'password' ? 1 : isForgotFlow ? 1 : 2;

  const stepTitle: Record<Step, string> = {
    email: 'SIGN IN',
    password: 'ENTER PASSWORD',
    otp: 'VERIFY EMAIL',
    forgot_otp: 'VERIFY YOUR EMAIL',
    reset_password: 'SET NEW PASSWORD',
  };

  // OTP render helper
  const renderOtpBoxes = (
    arr: string[],
    setArr: (v: string[]) => void,
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>,
    idPrefix: string,
    onComplete: (a: string[]) => void,
    onEnter: () => void
  ) => (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20 }}
      onPaste={e => handleOtpPaste(e, refs, setArr, onComplete)}
    >
      {arr.map((digit, idx) => (
        <input
          key={idx}
          ref={el => { refs.current[idx] = el; }}
          id={`${idPrefix}-${idx}`}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={e => handleOtpChange(idx, e.target.value, refs, arr, setArr, onComplete)}
          onKeyDown={e => handleOtpKeyDown(idx, e, refs, arr, onEnter)}
          style={{
            width: 44, height: 52, textAlign: 'center', fontSize: 20, fontWeight: 700,
            border: digit ? '1px solid rgba(212,175,55,0.6)' : '1px solid #2A2A2A',
            background: digit ? 'rgba(212,175,55,0.07)' : '#0D0D0D',
            color: 'var(--foreground)', outline: 'none', borderRadius: 2,
            fontFamily: 'monospace', transition: 'all 0.15s ease',
          }}
          aria-label={`OTP digit ${idx + 1}`}
        />
      ))}
    </div>
  );

  return (
    <div className="deco-bg" style={{ minHeight: '100vh', display: 'flex' }}>

      {/* Left decorative panel */}
      <div className="auth-left-panel">
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ width: 320, height: 320, borderRadius: '50%', border: '1px solid rgba(212,175,55,0.06)', boxShadow: '0 0 100px rgba(212,175,55,0.06) inset' }} />
        </div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 28, height: 28, border: '1px solid #D4AF37', transform: 'rotate(45deg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 10, height: 10, background: '#D4AF37', transform: 'rotate(-45deg)' }} />
            </div>
            <span className="label-deco" style={{ letterSpacing: '0.3em' }}>Campus Placement AI</span>
          </div>
        </div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2 className="heading-display" style={{ fontSize: '2.5rem', lineHeight: 1.15, marginBottom: 16 }}>
            PLACEMENT<br /><span style={{ color: '#D4AF37' }}>INTELLIGENCE</span><br />PLATFORM
          </h2>
          <div className="gold-line" style={{ marginBottom: 16, maxWidth: 120 }} />
          <p className="text-muted" style={{ fontSize: 13, lineHeight: 1.7, maxWidth: 280 }}>
            AI-powered eligibility analysis, skill gap intelligence, and personalized preparation — all in one platform.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12 }}>
            <ShieldCheck size={12} style={{ color: '#D4AF37', flexShrink: 0 }} />
            <span className="text-muted" style={{ fontSize: 11 }}>Institutional email verification required</span>
          </div>
        </div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, maxWidth: 300 }}>
            {['Eligibility Analysis', 'Skill Gap Intelligence', 'Preparation Plans'].map((item, i) => (
              <div key={i} className="deco-card" style={{ padding: '10px', textAlign: 'center' }}>
                <div className="phase-number" style={{ fontSize: 10, marginBottom: 4 }}>{['I', 'II', 'III'][i]}</div>
                <div className="text-muted" style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', lineHeight: 1.4 }}>{item}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 24px' }}>
        <div style={{ width: '100%', maxWidth: 380 }}>

          {/* Mobile logo */}
          <div className="auth-mobile-logo">
            <div style={{ width: 24, height: 24, border: '1px solid #D4AF37', transform: 'rotate(45deg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 8, height: 8, background: '#D4AF37', transform: 'rotate(-45deg)' }} />
            </div>
            <span className="heading-sm" style={{ fontSize: 11, color: 'var(--foreground)' }}>CAMPUS PLACEMENT AI</span>
          </div>

          <div className="deco-card deco-corners" style={{ padding: 28 }}>

            {/* Step indicator — 3 circles for normal flow */}
            {!isForgotFlow && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
                {[0, 1, 2].map((i) => (
                  <React.Fragment key={i}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, flexShrink: 0,
                      background: i < stepIndex ? 'rgba(212,175,55,0.2)' : i === stepIndex ? '#D4AF37' : '#1A1A1A',
                      color: i < stepIndex ? '#D4AF37' : i === stepIndex ? '#000' : 'var(--muted)',
                      transition: 'all 0.3s ease',
                    }}>
                      {i < stepIndex ? <CheckCircle2 size={14} /> : i + 1}
                    </div>
                    {i < 2 && <div style={{ flex: 1, height: 1, background: i < stepIndex ? '#D4AF37' : '#2A2A2A', transition: 'background 0.3s ease' }} />}
                  </React.Fragment>
                ))}
              </div>
            )}

            {/* Forgot flow badge */}
            {isForgotFlow && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, padding: '6px 10px', background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 2 }}>
                <KeyRound size={13} style={{ color: '#D4AF37', flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: '#D4AF37', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Password Reset</span>
              </div>
            )}

            <div style={{ marginBottom: 24 }}>
              <div className="label-deco" style={{ marginBottom: 4 }}>{isForgotFlow ? 'Reset access' : 'Welcome back'}</div>
              <h1 className="heading-lg" style={{ fontSize: '1rem', color: 'var(--foreground)' }}>{stepTitle[step]}</h1>
              <div className="gold-line" style={{ marginTop: 8 }} />
            </div>

            {/* Error */}
            {error && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', marginBottom: 16, border: '1px solid rgba(139,26,26,0.5)', background: 'rgba(139,26,26,0.08)', borderRadius: 2 }}>
                <AlertCircle size={14} style={{ color: '#CF6679', flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 12, color: '#CF6679', lineHeight: 1.5 }}>{error}</span>
              </div>
            )}

            {/* Info */}
            {info && !error && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', marginBottom: 16, border: '1px solid rgba(76,175,80,0.3)', background: 'rgba(76,175,80,0.07)', borderRadius: 2 }}>
                <CheckCircle2 size={14} style={{ color: '#4CAF7A', flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 12, color: '#4CAF7A', lineHeight: 1.5 }}>{info}</span>
              </div>
            )}

            {/* ── STEP: email ── */}
            {step === 'email' && (
              <form onSubmit={handleEmailNext} noValidate>
                <div style={{ marginBottom: 16 }}>
                  <label htmlFor="login-email" className="input-label">Institutional Email Address</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
                    <input
                      id="login-email"
                      type="email"
                      className="input-deco"
                      style={{ paddingLeft: 36 }}
                      placeholder="student@university.edu.in"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      autoComplete="email"
                      autoFocus
                      required
                    />
                  </div>
                  <p style={{ fontSize: 10, color: 'var(--muted)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <ShieldCheck size={9} style={{ color: '#D4AF37' }} />
                    Only institutional/university emails are accepted
                  </p>
                </div>
                <button id="login-email-next" type="submit" className="btn-gold" style={{ width: '100%', marginTop: 4 }}>
                  Continue →
                </button>
              </form>
            )}

            {/* ── STEP: password ── */}
            {step === 'password' && (
              <form onSubmit={handlePasswordSubmit} noValidate>
                {/* Email banner */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', marginBottom: 16, background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.15)', borderRadius: 2 }}>
                  <Mail size={12} style={{ color: '#D4AF37', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: 'var(--foreground)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</span>
                  <button type="button" onClick={() => { setStep('email'); setPassword(''); clearMessages(); }}
                    style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 11, padding: '0 4px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 3 }}>
                    <ChevronLeft size={11} /> Change
                  </button>
                </div>

                <div style={{ marginBottom: 8 }}>
                  <label htmlFor="login-password" className="input-label">Password</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      className="input-deco"
                      style={{ paddingLeft: 36, paddingRight: 36 }}
                      placeholder="Your password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      autoComplete="current-password"
                      autoFocus
                      required
                    />
                    <button type="button" onClick={() => setShowPassword(v => !v)}
                      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 2 }}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}>
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                {/* Forgot password link */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                  <button
                    type="button"
                    id="login-forgot-password"
                    onClick={handleForgotPassword}
                    disabled={loading}
                    style={{ background: 'none', border: 'none', color: '#D4AF37', cursor: 'pointer', fontSize: 11, padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <KeyRound size={10} /> Forgot Password?
                  </button>
                </div>

                <button id="login-password-submit" type="submit" className="btn-gold" style={{ width: '100%' }} disabled={loading}>
                  {loading ? 'Verifying...' : 'Sign In →'}
                </button>
                <button type="button" onClick={() => { setStep('email'); setPassword(''); clearMessages(); }}
                  className="btn-ghost" style={{ width: '100%', marginTop: 8, fontSize: 12 }}>
                  <ChevronLeft size={12} /> Back
                </button>
              </form>
            )}

            {/* ── STEP: otp (login flow) ── */}
            {step === 'otp' && (
              <div>
                <div style={{ background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 2, padding: '10px 12px', marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Info size={12} style={{ color: '#D4AF37', flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: '#D4AF37', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>Check your email</span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
                    OTP sent to <strong style={{ color: 'var(--foreground)' }}>{maskedEmail || email.replace(/(.{2}).*(@.*)/, '$1***$2')}</strong>
                    <br />Check your inbox and spam/junk folder.
                  </p>
                </div>

                {renderOtpBoxes(otp, setOtp, otpRefs, 'otp', handleVerifyOtp, () => handleVerifyOtp())}

                {attemptsLeft < 5 && attemptsLeft > 0 && (
                  <p style={{ textAlign: 'center', fontSize: 11, color: '#D4AF37', marginBottom: 12 }}>
                    {attemptsLeft} attempt{attemptsLeft === 1 ? '' : 's'} remaining
                  </p>
                )}

                <button id="login-verify-otp" onClick={() => handleVerifyOtp()} disabled={loading || otp.join('').length !== 6}
                  className="btn-gold" style={{ width: '100%', marginBottom: 16 }}>
                  {loading ? 'Verifying...' : 'Verify & Sign In'}
                </button>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                  <button type="button" onClick={() => { setStep('password'); setOtp(['','','','','','']); clearMessages(); }}
                    style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 0, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <ChevronLeft size={11} /> Back
                  </button>
                  <button type="button" onClick={handleResend} disabled={cooldown > 0 || loading}
                    style={{ background: 'none', border: 'none', cursor: cooldown > 0 ? 'not-allowed' : 'pointer', color: cooldown > 0 ? 'var(--muted)' : '#D4AF37', opacity: cooldown > 0 ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, padding: 0 }}>
                    <RefreshCw size={11} />{cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP: forgot_otp ── */}
            {step === 'forgot_otp' && (
              <div>
                <div style={{ background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 2, padding: '10px 12px', marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Info size={12} style={{ color: '#D4AF37', flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: '#D4AF37', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>Password reset OTP</span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
                    OTP sent to <strong style={{ color: 'var(--foreground)' }}>{maskedEmail || email.replace(/(.{2}).*(@.*)/, '$1***$2')}</strong>
                    <br />Check your inbox and spam/junk folder.
                  </p>
                </div>

                {renderOtpBoxes(forgotOtp, setForgotOtp, forgotOtpRefs, 'forgot-otp', handleVerifyForgotOtp, () => handleVerifyForgotOtp())}

                {attemptsLeft < 5 && attemptsLeft > 0 && (
                  <p style={{ textAlign: 'center', fontSize: 11, color: '#D4AF37', marginBottom: 12 }}>
                    {attemptsLeft} attempt{attemptsLeft === 1 ? '' : 's'} remaining
                  </p>
                )}

                <button id="forgot-verify-otp" onClick={() => handleVerifyForgotOtp()} disabled={loading || forgotOtp.join('').length !== 6}
                  className="btn-gold" style={{ width: '100%', marginBottom: 16 }}>
                  {loading ? 'Verifying...' : 'Verify OTP →'}
                </button>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                  <button type="button" onClick={() => { setStep('password'); setForgotOtp(['','','','','','']); clearMessages(); }}
                    style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 0, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <ChevronLeft size={11} /> Back
                  </button>
                  <button type="button" onClick={handleResendForgotOtp} disabled={cooldown > 0 || loading}
                    style={{ background: 'none', border: 'none', cursor: cooldown > 0 ? 'not-allowed' : 'pointer', color: cooldown > 0 ? 'var(--muted)' : '#D4AF37', opacity: cooldown > 0 ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, padding: 0 }}>
                    <RefreshCw size={11} />{cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP: reset_password ── */}
            {step === 'reset_password' && (
              <form onSubmit={handleResetPassword} noValidate>
                {/* Email banner */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', marginBottom: 16, background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.15)', borderRadius: 2 }}>
                  <Mail size={12} style={{ color: '#D4AF37', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: 'var(--foreground)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</span>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label htmlFor="new-password" className="input-label">New Password</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
                    <input
                      id="new-password"
                      type={showNew ? 'text' : 'password'}
                      className="input-deco"
                      style={{ paddingLeft: 36, paddingRight: 36 }}
                      placeholder="Min. 8 characters"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      autoFocus autoComplete="new-password" required
                    />
                    <button type="button" onClick={() => setShowNew(v => !v)}
                      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 2 }}>
                      {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label htmlFor="confirm-new-password" className="input-label">Confirm New Password</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
                    <input
                      id="confirm-new-password"
                      type={showConfirmNew ? 'text' : 'password'}
                      className="input-deco"
                      style={{ paddingLeft: 36, paddingRight: 36 }}
                      placeholder="Repeat new password"
                      value={confirmNewPassword}
                      onChange={e => setConfirmNewPassword(e.target.value)}
                      autoComplete="new-password" required
                    />
                    <button type="button" onClick={() => setShowConfirmNew(v => !v)}
                      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 2 }}>
                      {showConfirmNew ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {newPassword && confirmNewPassword && newPassword !== confirmNewPassword && (
                    <p style={{ fontSize: 10, color: '#CF6679', marginTop: 4 }}>Passwords do not match</p>
                  )}
                </div>

                <button id="reset-password-submit" type="submit" className="btn-gold" style={{ width: '100%' }} disabled={loading}>
                  {loading ? 'Resetting...' : 'Reset Password & Sign In →'}
                </button>
                <button type="button" onClick={() => { setStep('forgot_otp'); clearMessages(); }}
                  className="btn-ghost" style={{ width: '100%', marginTop: 8, fontSize: 12 }}>
                  <ChevronLeft size={12} /> Back
                </button>
              </form>
            )}

            <div className="gold-divider" style={{ margin: '20px 0 0' }}>
              <span className="label-deco" style={{ padding: '0 8px', background: 'var(--card)' }}>or</span>
            </div>
            <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)', marginTop: 16 }}>
              No account?{' '}
              <Link to="/register" style={{ color: '#D4AF37', textDecoration: 'none' }}>Create account</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
