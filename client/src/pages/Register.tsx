import React, { useState, FormEvent, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle, CheckCircle2, Mail, ShieldCheck, RefreshCw, Info,
  User, Eye, EyeOff, Lock, ChevronLeft,
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

// Steps: form → password → otp (email verified → JWT issued → onboarding)
type Step = 'form' | 'password' | 'otp';

const STEP_INDEX: Record<Step, number> = { form: 0, password: 1, otp: 2 };
const STEP_LABELS = ['Details', 'Password', 'Email OTP'];

export default function Register() {
  const { setAuth }  = useAuth() as any;
  const navigate     = useNavigate();

  const [step, setStep]                       = useState<Step>('form');
  const [fullName, setFullName]               = useState('');
  const [university, setUniversity]           = useState('');
  const [email, setEmail]                     = useState('');
  const [password, setPassword]               = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword]       = useState(false);
  const [showConfirm, setShowConfirm]         = useState(false);
  const [maskedEmail, setMaskedEmail]         = useState('');

  // Email OTP
  const [otp, setOtp]               = useState(['', '', '', '', '', '']);
  const [attemptsLeft, setAttemptsLeft] = useState(5);

  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [info, setInfo]         = useState('');
  const [cooldown, setCooldown] = useState(0);

  const otpRefs    = useRef<(HTMLInputElement | null)[]>([]);
  const cooldownId = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCooldown = (secs: number) => {
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

  // ── Step 1: Validate registration details ─────────────────────────────────
  const handleFormNext = (e?: FormEvent) => {
    e?.preventDefault();
    setError('');
    if (!fullName.trim()) { setError('Full name is required.'); return; }
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) { setError('Please enter a valid email address.'); return; }
    if (looksPersonal(trimmed)) { setError('Please use your institutional or university email address.'); return; }
    setStep('password');
  };

  // ── Step 2: Set password → send email OTP ────────────────────────────────
  const handlePasswordSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    clearMessages();
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      const res = await api.auth.sendOtp({
        email: email.trim().toLowerCase(), password,
        fullName: fullName.trim(), purpose: 'register',
      });
      setMaskedEmail(res.email);
      setInfo('OTP sent to your email. Please check your inbox and spam/junk folder.');
      setStep('otp');
      setAttemptsLeft(5);
      startCooldown(30);
      setTimeout(() => otpRefs.current[0]?.focus(), 120);
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.includes('EMAIL_NOT_CONFIGURED') || msg.includes('not configured')) {
        setError('Email service is not configured. Please contact the administrator.');
      } else if (msg.includes('EMAIL_DELIVERY_FAILED') || msg.includes('could not send')) {
        setError("We couldn't send the OTP right now. Please try again in a moment.");
      } else if (msg.includes('already registered')) {
        setError('This email is already registered. Please sign in instead.');
      } else {
        setError(msg);
      }
    } finally { setLoading(false); }
  };

  // ── Step 3: Verify Email OTP → issue JWT → go to onboarding ─────────────
  const handleVerifyEmailOtp = async (digits?: string[]) => {
    clearMessages();
    const otpStr = (digits || otp).join('');
    if (otpStr.length !== 6) { setError('Please enter all 6 digits.'); return; }
    setLoading(true);
    try {
      const res = await api.auth.verifyOtp({ email: email.trim().toLowerCase(), otp: otpStr });
      localStorage.setItem('cp_token', res.token);
      if (setAuth) setAuth({ user: res.user, isAuthenticated: true, onboardingCompleted: res.onboardingCompleted ?? false });
      navigate('/onboarding', { replace: true });
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
      } else { setError(msg); }
    } finally { setLoading(false); }
  };

  // ── Resend email OTP ──────────────────────────────────────────────────────
  const handleResendEmailOtp = async () => {
    setOtp(['', '', '', '', '', '']);
    clearMessages();
    setLoading(true);
    try {
      const res = await api.auth.resendOtp({ email: email.trim().toLowerCase(), purpose: 'register' });
      setMaskedEmail(res.email);
      setInfo('OTP resent. Please check your inbox and spam/junk folder.');
      setAttemptsLeft(5);
      startCooldown(30);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.includes('wait')) setError(msg);
      else setError("Couldn't resend OTP. Please try again.");
    } finally { setLoading(false); }
  };

  // ── OTP input helpers ─────────────────────────────────────────────────────
  const makeOtpHandlers = (
    arr: string[],
    setArr: React.Dispatch<React.SetStateAction<string[]>>,
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>,
    onComplete: (a: string[]) => void
  ) => ({
    onChange: (idx: number, value: string) => {
      if (!/^\d*$/.test(value)) return;
      const next = [...arr];
      next[idx] = value.slice(-1);
      setArr(next);
      if (value && idx < 5) refs.current[idx + 1]?.focus();
      if (next.every(d => d !== '') && next.join('').length === 6) setTimeout(() => onComplete(next), 80);
    },
    onKeyDown: (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace' && !arr[idx] && idx > 0) refs.current[idx - 1]?.focus();
      if (e.key === 'Enter') onComplete(arr);
    },
    onPaste: (e: React.ClipboardEvent) => {
      const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
      if (pasted.length === 6) {
        const a = pasted.split('');
        setArr(a);
        refs.current[5]?.focus();
        setTimeout(() => onComplete(a), 80);
      }
    },
  });

  const emailOtpH = makeOtpHandlers(otp, setOtp, otpRefs, handleVerifyEmailOtp);
  const stepIndex = STEP_INDEX[step];

  return (
    <div className="deco-bg" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
      <div style={{ width: '100%', maxWidth: 460 }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
          <div style={{ width: 24, height: 24, border: '1px solid #D4AF37', transform: 'rotate(45deg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 8, height: 8, background: '#D4AF37', transform: 'rotate(-45deg)' }} />
          </div>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <span className="heading-sm" style={{ fontSize: 11, color: 'var(--foreground)' }}>CAMPUS PLACEMENT AI</span>
          </Link>
        </div>

        <div className="deco-card deco-corners" style={{ padding: 28 }}>

          {/* ── 3-step progress indicator ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 20 }}>
            {STEP_LABELS.map((label, i) => (
              <React.Fragment key={i}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700, flexShrink: 0,
                    background: i < stepIndex ? 'rgba(212,175,55,0.2)' : i === stepIndex ? '#D4AF37' : '#1A1A1A',
                    color: i < stepIndex ? '#D4AF37' : i === stepIndex ? '#000' : 'var(--muted)',
                    border: i < stepIndex ? '1px solid rgba(212,175,55,0.4)' : 'none',
                    transition: 'all 0.3s ease',
                  }}>
                    {i < stepIndex ? <CheckCircle2 size={13} /> : i + 1}
                  </div>
                  <span style={{ fontSize: 8, color: i === stepIndex ? '#D4AF37' : 'var(--muted)', fontFamily: "'Josefin Sans',sans-serif", textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
                    {label}
                  </span>
                </div>
                {i < STEP_LABELS.length - 1 && (
                  <div style={{ flex: 1, height: 1, marginBottom: 16, background: i < stepIndex ? '#D4AF37' : '#2A2A2A', transition: 'background 0.3s ease' }} />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Heading */}
          <div style={{ marginBottom: 20 }}>
            <div className="label-deco" style={{ marginBottom: 4 }}>
              {step === 'form' ? 'Join the platform' :
               step === 'password' ? 'Secure your account' : 'Email verification'}
            </div>
            <h1 className="heading-lg" style={{ fontSize: '1rem', color: 'var(--foreground)' }}>
              {step === 'form' ? 'CREATE ACCOUNT' :
               step === 'password' ? 'SET PASSWORD' : 'VERIFY EMAIL'}
            </h1>
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

          {/* ── STEP 1: Registration form ── */}
          {step === 'form' && (
            <form onSubmit={handleFormNext} noValidate>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label htmlFor="reg-name" className="input-label">Full Name *</label>
                  <div style={{ position: 'relative' }}>
                    <User size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
                    <input
                      id="reg-name" type="text" className="input-deco" style={{ paddingLeft: 30 }}
                      placeholder="Your full name" value={fullName}
                      onChange={e => setFullName(e.target.value)} autoComplete="name" autoFocus
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="reg-university" className="input-label">University</label>
                  <input
                    id="reg-university" type="text" className="input-deco"
                    placeholder="Optional" value={university}
                    onChange={e => setUniversity(e.target.value)} autoComplete="organization"
                  />
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label htmlFor="reg-email" className="input-label">Institutional Email *</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
                  <input
                    id="reg-email" type="email" className="input-deco" style={{ paddingLeft: 30 }}
                    placeholder="student@university.edu.in"
                    value={email} onChange={e => setEmail(e.target.value)} autoComplete="email"
                  />
                </div>
                <p style={{ fontSize: 10, color: 'var(--muted)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <ShieldCheck size={9} style={{ color: '#D4AF37' }} />
                  Must be an institutional/university email address
                </p>
              </div>

              <button id="register-form-next" type="submit" className="btn-gold" style={{ width: '100%' }}>
                Continue →
              </button>
            </form>
          )}

          {/* ── STEP 2: Password setup ── */}
          {step === 'password' && (
            <form onSubmit={handlePasswordSubmit} noValidate>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', marginBottom: 16, background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.15)', borderRadius: 2 }}>
                <Mail size={12} style={{ color: '#D4AF37', flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: 'var(--foreground)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</span>
                <button type="button" onClick={() => { setStep('form'); setPassword(''); setConfirmPassword(''); clearMessages(); }}
                  style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 11, padding: '0 4px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 3 }}>
                  <ChevronLeft size={11} /> Change
                </button>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label htmlFor="reg-password" className="input-label">Password *</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
                  <input id="reg-password" type={showPassword ? 'text' : 'password'} className="input-deco"
                    style={{ paddingLeft: 36, paddingRight: 36 }} placeholder="Min. 8 characters"
                    value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" autoFocus required />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 2 }}>
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label htmlFor="reg-confirm-password" className="input-label">Confirm Password *</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
                  <input id="reg-confirm-password" type={showConfirm ? 'text' : 'password'} className="input-deco"
                    style={{ paddingLeft: 36, paddingRight: 36 }} placeholder="Repeat your password"
                    value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} autoComplete="new-password" required />
                  <button type="button" onClick={() => setShowConfirm(v => !v)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 2 }}>
                    {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {password && confirmPassword && password !== confirmPassword && (
                  <p style={{ fontSize: 10, color: '#CF6679', marginTop: 4 }}>Passwords do not match</p>
                )}
              </div>

              <button id="register-password-submit" type="submit" className="btn-gold" style={{ width: '100%' }} disabled={loading}>
                {loading ? 'Creating account...' : 'Create Account & Send OTP →'}
              </button>
              <button type="button" onClick={() => { setStep('form'); setPassword(''); setConfirmPassword(''); clearMessages(); }}
                className="btn-ghost" style={{ width: '100%', marginTop: 8, fontSize: 12 }}>
                <ChevronLeft size={12} /> Back
              </button>
            </form>
          )}

          {/* ── STEP 3: Email OTP ── */}
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

              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20 }} onPaste={emailOtpH.onPaste}>
                {otp.map((digit, idx) => (
                  <input key={idx} ref={el => { otpRefs.current[idx] = el; }} id={`reg-otp-${idx}`}
                    type="text" inputMode="numeric" maxLength={1} value={digit}
                    onChange={e => emailOtpH.onChange(idx, e.target.value)}
                    onKeyDown={e => emailOtpH.onKeyDown(idx, e)}
                    style={{
                      width: 44, height: 52, textAlign: 'center', fontSize: 20, fontWeight: 700,
                      border: digit ? '1px solid rgba(212,175,55,0.6)' : '1px solid #2A2A2A',
                      background: digit ? 'rgba(212,175,55,0.07)' : '#0D0D0D',
                      color: 'var(--foreground)', outline: 'none', borderRadius: 2, fontFamily: 'monospace', transition: 'all 0.15s ease',
                    }}
                    aria-label={`Email OTP digit ${idx + 1}`} />
                ))}
              </div>

              {attemptsLeft < 5 && attemptsLeft > 0 && (
                <p style={{ textAlign: 'center', fontSize: 11, color: '#D4AF37', marginBottom: 12 }}>
                  {attemptsLeft} attempt{attemptsLeft === 1 ? '' : 's'} remaining
                </p>
              )}

              <button id="register-verify-otp" onClick={() => handleVerifyEmailOtp()}
                disabled={loading || otp.join('').length !== 6}
                className="btn-gold" style={{ width: '100%', marginBottom: 16 }}>
                {loading ? 'Verifying...' : 'Verify & Complete Registration →'}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                <button type="button" onClick={() => { setStep('password'); setOtp(['','','','','','']); clearMessages(); }}
                  style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 0, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <ChevronLeft size={11} /> Back
                </button>
                <button type="button" onClick={handleResendEmailOtp} disabled={cooldown > 0 || loading}
                  style={{ background: 'none', border: 'none', cursor: cooldown > 0 ? 'not-allowed' : 'pointer', color: cooldown > 0 ? 'var(--muted)' : '#D4AF37', opacity: cooldown > 0 ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, padding: 0 }}>
                  <RefreshCw size={11} />
                  {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}
                </button>
              </div>
            </div>
          )}

          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)', marginTop: 20 }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#D4AF37', textDecoration: 'none' }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
