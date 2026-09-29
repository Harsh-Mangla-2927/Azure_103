import React, { useState, useEffect } from 'react';
import { Phone, ShieldCheck, RefreshCw, CheckCircle2, AlertCircle, ArrowRight, Smartphone } from 'lucide-react';
import { api } from '../lib/api';

interface PhoneVerificationCardProps {
  initialPhone?: string | null;
  isVerified?: boolean;
  onVerificationSuccess?: (maskedPhone: string) => void;
  compact?: boolean;
}

export function PhoneVerificationCard({
  initialPhone,
  isVerified = false,
  onVerificationSuccess,
  compact = false,
}: PhoneVerificationCardProps) {
  const [phone, setPhone] = useState(initialPhone || '');
  const [maskedPhone, setMaskedPhone] = useState(initialPhone || '');
  const [verified, setVerified] = useState(isVerified);
  const [step, setStep] = useState<'status' | 'input' | 'otp'>(isVerified ? 'status' : 'input');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    setVerified(isVerified);
    if (isVerified) {
      setStep('status');
      setMaskedPhone(initialPhone || '');
    }
  }, [isVerified, initialPhone]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!phone.trim()) {
      setError('Please enter a valid mobile number');
      return;
    }
    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await api.auth.sendPhoneOtp(phone.trim());
      setMaskedPhone(res.maskedPhone);
      setStep('otp');
      setCooldown(60);
      setSuccessMsg(res.message || `Verification code sent to ${res.maskedPhone}`);
    } catch (err: any) {
      setError(err.message || 'Failed to send SMS code. Please check the number.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0) return;
    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await api.auth.resendPhoneOtp();
      setCooldown(60);
      setSuccessMsg(res.message || 'New verification code sent successfully.');
    } catch (err: any) {
      setError(err.message || 'Failed to resend code.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      await api.auth.verifyPhoneOtp(otp.trim());
      setVerified(true);
      setStep('status');
      setSuccessMsg('Mobile number verified successfully! 🎉');
      if (onVerificationSuccess) {
        onVerificationSuccess(maskedPhone);
      }
    } catch (err: any) {
      setError(err.message || 'Invalid or expired OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`deco-card deco-corners ${compact ? 'p-3' : 'p-4'} space-y-3`}>
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="diamond-icon-sm text-gold">
            <Smartphone size={13} />
          </div>
          <div>
            <div className="label-deco text-[10px]">Security &amp; Alerts</div>
            <h3 className="font-heading text-xs tracking-wider text-foreground">
              MOBILE PHONE VERIFICATION
            </h3>
          </div>
        </div>
        {verified ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider bg-emerald-950/60 border border-emerald-500/40 text-emerald-400">
            <CheckCircle2 size={11} /> Verified
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider bg-amber-950/50 border border-amber-500/40 text-amber-400">
            <AlertCircle size={11} /> Unverified
          </span>
        )}
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="flex items-start gap-2 p-2.5 bg-red-950/40 border border-red-800/50 text-red-300 text-xs">
          <AlertCircle size={14} className="mt-0.5 flex-shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Success ── */}
      {successMsg && (
        <div className="flex items-start gap-2 p-2.5 bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 text-xs">
          <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ── STEP: status (already verified) ── */}
      {step === 'status' && verified && (
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between p-3 bg-[#111] border border-[#222]">
            <div className="flex items-center gap-2.5">
              <ShieldCheck size={16} className="text-emerald-400" />
              <div>
                <div className="text-xs font-medium text-foreground">{maskedPhone || phone}</div>
                <div className="text-[10px] text-muted">Active for placement interview notifications</div>
              </div>
            </div>
            <button
              onClick={() => {
                setStep('input');
                setError('');
                setSuccessMsg('');
              }}
              className="btn-ghost !text-[11px] !py-1 !px-2"
            >
              Update Number
            </button>
          </div>
        </div>
      )}

      {/* ── STEP: enter phone number ── */}
      {step === 'input' && (
        <form onSubmit={handleSendOtp} className="space-y-3 pt-1">
          <p className="text-[11px] text-muted leading-relaxed">
            Verify your mobile number to receive priority placement interview calls, drive updates, and 2-step verification alerts.
          </p>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                id="phone-otp-input"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="input-deco w-full font-mono text-xs pl-8"
                disabled={loading}
                autoComplete="tel"
              />
              <Phone size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-gold !text-xs !py-1.5 !px-3.5 flex items-center gap-1.5 whitespace-nowrap"
            >
              {loading ? (
                <RefreshCw size={12} className="animate-spin" />
              ) : (
                <>
                  <span>Send OTP</span>
                  <ArrowRight size={12} />
                </>
              )}
            </button>
          </div>

          {verified && (
            <button
              type="button"
              onClick={() => {
                setStep('status');
                setError('');
              }}
              className="text-[10px] text-muted hover:text-foreground underline"
            >
              Cancel
            </button>
          )}

          {/* Dev mode notice */}
          <div className="p-2.5 bg-amber-950/30 border border-amber-700/30 text-[10px] text-amber-300/90 leading-relaxed">
            <span className="font-semibold text-amber-400">📋 Dev Mode Notice:</span>{' '}
            If <span className="font-mono bg-black/30 px-0.5">SMS_OTP_DEV_MODE=true</span> is set in{' '}
            <span className="font-mono">server/.env</span>, the OTP will print to your{' '}
            <span className="font-semibold text-amber-200">server terminal</span> instead of being texted.
            Check the console window where <span className="font-mono">npm run dev</span> is running —
            look for a box labelled <span className="font-mono bg-black/30 px-0.5">OTP: xxxxxx</span>.
          </div>
        </form>
      )}

      {/* ── STEP: enter OTP code ── */}
      {step === 'otp' && (
        <form onSubmit={handleVerifyOtp} className="space-y-3 pt-1">
          <div className="text-[11px] text-muted">
            Enter the <span className="text-foreground font-semibold">6-digit verification code</span> sent to{' '}
            <strong className="text-foreground font-mono">{maskedPhone}</strong>:
          </div>

          <div className="flex gap-2">
            <input
              id="phone-otp-code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="• • • • • •"
              className="input-deco flex-1 text-center font-mono tracking-[0.5em] text-base font-bold"
              autoFocus
              autoComplete="one-time-code"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="btn-gold !text-xs !py-1.5 !px-4 flex items-center gap-1.5"
            >
              {loading ? <RefreshCw size={12} className="animate-spin" /> : 'Verify →'}
            </button>
          </div>

          {/* Dev mode reminder on OTP step */}
          <div className="p-2.5 bg-amber-950/30 border border-amber-700/30 text-[10px] text-amber-300/90 leading-relaxed">
            <span className="font-semibold text-amber-400">💡 Where's my OTP?</span>{' '}
            In dev mode, the OTP is printed to the{' '}
            <span className="font-semibold text-amber-200">server terminal</span> (not your phone).
            Look for a console box labelled{' '}
            <span className="font-mono bg-black/30 px-0.5">OTP: xxxxxx</span> and enter those 6 digits above.
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => {
                setStep('input');
                setOtp('');
                setError('');
                setSuccessMsg('');
              }}
              className="text-muted hover:text-foreground text-[10px] underline"
            >
              ← Change phone number
            </button>

            <button
              type="button"
              onClick={handleResendOtp}
              disabled={cooldown > 0 || loading}
              className={`text-[10px] ${
                cooldown > 0 ? 'text-muted cursor-not-allowed' : 'text-gold hover:underline'
              }`}
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend SMS code'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
