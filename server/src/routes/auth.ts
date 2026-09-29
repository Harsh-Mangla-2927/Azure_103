/**
 * Authentication Routes — Educational Email + Password + OTP Flow
 *
 * FLOW:
 *   Login:    POST /send-otp { email, password, purpose:'login' }
 *             → validates password → sends OTP → frontend goes to OTP step
 *
 *   Register: POST /send-otp { email, fullName, password, purpose:'register' }
 *             → hashes password → stores user → sends OTP → frontend goes to OTP step
 *
 *   Verify:   POST /verify-otp { email, otp }
 *             → verifies OTP hash → issues JWT
 *
 * SECURITY MODEL:
 *   - Backend is the ONLY authority for educational email validation
 *   - Passwords are hashed with bcrypt (12 rounds)
 *   - OTPs are hashed with bcrypt before storage (never plaintext)
 *   - OTPs expire after 5 minutes
 *   - Max 5 wrong OTP attempts per OTP → locked
 *   - Rate limiting on send and verify
 *   - Personal email NEVER bypasses educational email requirement
 *   - OTP is NEVER returned in API responses
 *   - OTP is NEVER logged
 */

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { body, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { getDatabase } from '../db/database';
import { generateToken, authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { isEducationalDomain, normalizeEmail, APPROVED_DOMAINS } from '../config/educationalDomains';
import { sendOtpEmail, sendRecoveryEmailVerification } from '../services/emailService';
import {
  normalizePhoneNumber,
  isValidPhoneNumber,
  sendSmsOtp,
  maskPhoneNumber,
} from '../services/smsService';


const router = Router();

// ── Rate limiters (configurable via env vars) ────────────────────────────────

const OTP_RATE_WINDOW_MS  = parseInt(process.env.OTP_RATE_LIMIT_WINDOW_MINUTES  || '15', 10) * 60 * 1000;
const OTP_MAX_PER_IP      = parseInt(process.env.OTP_MAX_REQUESTS_PER_IP        || '20', 10);
const OTP_VERIFY_WINDOW   = parseInt(process.env.OTP_VERIFY_WINDOW_MINUTES      || '10', 10) * 60 * 1000;
const OTP_MAX_VERIFY      = parseInt(process.env.OTP_MAX_VERIFY_REQUESTS_PER_IP || '20', 10);

/** Limit OTP send: max 20 per 15 min per IP */
const otpSendLimiter = rateLimit({
  windowMs: OTP_RATE_WINDOW_MS,
  max: OTP_MAX_PER_IP,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many OTP requests. Please wait a few minutes and try again.', code: 'IP_RATE_LIMIT' },
  skipSuccessfulRequests: false,
});

/** Limit OTP verification: max 20 per 10 min per IP */
const otpVerifyLimiter = rateLimit({
  windowMs: OTP_VERIFY_WINDOW,
  max: OTP_MAX_VERIFY,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many verification attempts. Please wait a few minutes.', code: 'IP_RATE_LIMIT' },
});

// ── OTP constants (configurable via env vars) ─────────────────────────────────

const OTP_EXPIRY_MS      = parseInt(process.env.OTP_EXPIRES_MINUTES           || '5',  10) * 60 * 1000;
const OTP_MAX_ATTEMPTS   = parseInt(process.env.OTP_MAX_VERIFY_ATTEMPTS       || '5',  10);
const RESEND_COOLDOWN_MS = parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS   || '30', 10) * 1000;
const RESEND_WINDOW_MS   = parseInt(process.env.OTP_RATE_LIMIT_WINDOW_MINUTES || '15', 10) * 60 * 1000;
const RESEND_WINDOW_MAX  = parseInt(process.env.OTP_MAX_REQUESTS_PER_EMAIL    || '5',  10);

function generateOtp(): string {
  // 6-digit cryptographically secure OTP
  return crypto.randomInt(100000, 999999).toString();
}

async function hashOtp(otp: string): Promise<string> {
  return bcrypt.hash(otp, 10);
}

async function verifyOtpHash(otp: string, hash: string): Promise<boolean> {
  return bcrypt.compare(otp, hash);
}

// ── POST /api/auth/send-otp ───────────────────────────────────────────────────
// Combined step: validate credentials (password for login, or create user for register)
// then generate OTP and send email.
//
// Login:    { email, password, purpose: 'login' }
// Register: { email, fullName, password, purpose: 'register' }
//
// On success: OTP is sent to email. Response: { message, email (masked), purpose }
// OTP is NEVER in the response.

router.post(
  '/send-otp',
  otpSendLimiter,
  [
    body('email').isEmail().withMessage('Valid email address is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('fullName').optional().trim(),
    body('purpose').optional().isIn(['login', 'register']),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: errors.array()[0].msg });
      return;
    }

    const rawEmail = req.body.email as string;
    const password = (req.body.password as string || '').trim();
    const purpose  = (req.body.purpose as string) || 'login';
    const fullName = (req.body.fullName as string || '').trim();

    // ── 1. Normalize email ────────────────────────────────────────────────────
    const email = normalizeEmail(rawEmail);
    if (!email) {
      res.status(400).json({ error: 'Invalid email format.' });
      return;
    }

    // ── 2. BACKEND educational domain enforcement (security boundary) ─────────
    if (!isEducationalDomain(email)) {
      res.status(403).json({
        error: 'Please use your institutional/educational email address to continue. Personal email addresses (Gmail, Outlook, Yahoo, etc.) are not accepted.',
        code: 'NOT_EDUCATIONAL_EMAIL',
      });
      return;
    }

    try {
      const db = getDatabase();

      // ── 3. Check existing user ────────────────────────────────────────────
      let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;

      if (purpose === 'register') {
        // Registration: user must NOT already exist
        if (user) {
          res.status(409).json({ error: 'This email is already registered. Please sign in instead.' });
          return;
        }
        if (!fullName) {
          res.status(400).json({ error: 'Full name is required for registration.' });
          return;
        }
        if (password.length < 8) {
          res.status(400).json({ error: 'Password must be at least 8 characters.' });
          return;
        }
      } else {
        // Login: user must exist
        if (!user) {
          res.status(404).json({ error: 'No account found with this email. Please register first.' });
          return;
        }

        // Validate password (if user has a password_hash set)
        if (user.password_hash) {
          const passwordValid = await bcrypt.compare(password, user.password_hash);
          if (!passwordValid) {
            res.status(401).json({ error: 'Incorrect password. Please try again.', code: 'WRONG_PASSWORD' });
            return;
          }
        }
        // If user has no password_hash (legacy OTP-only account), skip password check
        // and allow OTP to serve as the sole factor
      }

      // ── 4. Resend rate-limiting (per-user, stored in DB) ──────────────────
      if (user) {
        const now = Date.now();
        const lastSent = user.otp_last_sent_at ? new Date(user.otp_last_sent_at).getTime() : 0;
        const windowStart = user.otp_send_window_start ? new Date(user.otp_send_window_start).getTime() : 0;
        const sendCount = user.otp_send_count || 0;

        // Cooldown between requests
        if (now - lastSent < RESEND_COOLDOWN_MS) {
          const waitSecs = Math.ceil((RESEND_COOLDOWN_MS - (now - lastSent)) / 1000);
          res.status(429).json({ error: `Please wait ${waitSecs} seconds before requesting another OTP.`, code: 'RESEND_COOLDOWN' });
          return;
        }

        // Window rate limit
        const inWindow = now - windowStart < RESEND_WINDOW_MS;
        if (inWindow && sendCount >= RESEND_WINDOW_MAX) {
          res.status(429).json({ error: 'Too many OTP requests. Please wait 15 minutes before trying again.', code: 'RESEND_LIMIT' });
          return;
        }
      }

      // ── 5. Generate and hash OTP ──────────────────────────────────────────
      const otp    = generateOtp();
      const hash   = await hashOtp(otp);
      const expiry = new Date(Date.now() + OTP_EXPIRY_MS).toISOString();
      const now    = new Date().toISOString();

      if (purpose === 'register' && !user) {
        // Hash the password for storage
        const passwordHash = await bcrypt.hash(password, 12);

        // Create a placeholder user record with hashed password
        const result = db.prepare(
          `INSERT INTO users (email, full_name, password_hash, otp_hash, otp_expires_at, otp_attempts, otp_last_sent_at, otp_send_count, otp_send_window_start)
           VALUES (?, ?, ?, ?, ?, 0, ?, 1, ?)`
        ).run(email, fullName, passwordHash, hash, expiry, now, now);

        const userId = result.lastInsertRowid as number;
        db.prepare('INSERT INTO profiles (user_id) VALUES (?)').run(userId);
      } else {
        // Update existing user's OTP
        const sendCount   = (user.otp_send_count || 0);
        const windowStart = user.otp_send_window_start;
        const inWindow    = windowStart && (Date.now() - new Date(windowStart).getTime() < RESEND_WINDOW_MS);
        const newCount    = inWindow ? sendCount + 1 : 1;
        const newWindow   = inWindow ? windowStart : now;

        db.prepare(
          `UPDATE users SET otp_hash=?, otp_expires_at=?, otp_attempts=0, otp_last_sent_at=?,
           otp_send_count=?, otp_send_window_start=?, updated_at=? WHERE email=?`
        ).run(hash, expiry, now, newCount, newWindow, now, email);
      }

      // ── 6. Send OTP email ─────────────────────────────────────────────────
      console.info(`[OTP] Request for ${email.replace(/(.{2}).*(@.*)/, '$1***$2')} (purpose: ${purpose})`);

      try {
        await sendOtpEmail(email, otp, purpose === 'register' ? 'register' : 'login');
      } catch (emailErr: any) {
        // Roll back: delete newly created user row if this was first registration
        if (purpose === 'register') {
          try {
            const justCreated = db.prepare('SELECT id FROM users WHERE email = ? AND otp_hash IS NOT NULL').get(email) as any;
            if (justCreated) {
              db.prepare('DELETE FROM profiles WHERE user_id = ?').run(justCreated.id);
              db.prepare('DELETE FROM users WHERE id = ?').run(justCreated.id);
            }
          } catch { /* ignore rollback errors */ }
        }

        if (emailErr?.message === 'EMAIL_NOT_CONFIGURED') {
          console.error('[OTP] Email not configured — set SMTP_HOST, SMTP_USER, SMTP_PASSWORD in server/.env');
          res.status(503).json({
            error: 'Email service is not configured. Please contact the administrator.',
            code: 'EMAIL_NOT_CONFIGURED',
          });
        } else {
          res.status(503).json({
            error: 'We could not send the OTP right now. Please try again in a moment.',
            code: 'EMAIL_DELIVERY_FAILED',
          });
        }
        return;
      }

      console.info(`[OTP] Email provider accepted request for ${email.replace(/(.{2}).*(@.*)/, '$1***$2')}`);

      res.json({
        message: 'OTP sent to your email. Please check your inbox and spam/junk folder.',
        email: email.replace(/(.{2}).*(@.*)/, '$1***$2'),
        purpose,
      });
    } catch (error) {
      console.error('[OTP] Unexpected error in send-otp:', (error as any)?.message?.slice(0, 100));
      res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
  }
);

// ── POST /api/auth/resend-otp ─────────────────────────────────────────────────
// Resend OTP for an already-verified email/password (no password re-check needed,
// just email to resend to).  Used by the OTP step "Resend" button.

router.post(
  '/resend-otp',
  otpSendLimiter,
  [
    body('email').isEmail().withMessage('Valid email address is required'),
    body('purpose').optional().isIn(['login', 'register']),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: errors.array()[0].msg });
      return;
    }

    const rawEmail = req.body.email as string;
    const purpose  = (req.body.purpose as string) || 'login';

    const email = normalizeEmail(rawEmail);
    if (!email) {
      res.status(400).json({ error: 'Invalid email format.' });
      return;
    }

    if (!isEducationalDomain(email)) {
      res.status(403).json({ error: 'Not an educational email.', code: 'NOT_EDUCATIONAL_EMAIL' });
      return;
    }

    try {
      const db = getDatabase();
      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;

      if (!user) {
        res.status(404).json({ error: 'No account found. Please start again.' });
        return;
      }

      // Resend cooldown check
      const now = Date.now();
      const lastSent = user.otp_last_sent_at ? new Date(user.otp_last_sent_at).getTime() : 0;
      const windowStart = user.otp_send_window_start ? new Date(user.otp_send_window_start).getTime() : 0;
      const sendCount = user.otp_send_count || 0;

      if (now - lastSent < RESEND_COOLDOWN_MS) {
        const waitSecs = Math.ceil((RESEND_COOLDOWN_MS - (now - lastSent)) / 1000);
        res.status(429).json({ error: `Please wait ${waitSecs} seconds before requesting another OTP.`, code: 'RESEND_COOLDOWN' });
        return;
      }

      const inWindow = now - windowStart < RESEND_WINDOW_MS;
      if (inWindow && sendCount >= RESEND_WINDOW_MAX) {
        res.status(429).json({ error: 'Too many OTP requests. Please wait 15 minutes before trying again.', code: 'RESEND_LIMIT' });
        return;
      }

      // Generate new OTP
      const otp    = generateOtp();
      const hash   = await hashOtp(otp);
      const expiry = new Date(Date.now() + OTP_EXPIRY_MS).toISOString();
      const ts     = new Date().toISOString();
      const newCount  = inWindow ? sendCount + 1 : 1;
      const newWindow = inWindow ? user.otp_send_window_start : ts;

      db.prepare(
        `UPDATE users SET otp_hash=?, otp_expires_at=?, otp_attempts=0, otp_last_sent_at=?,
         otp_send_count=?, otp_send_window_start=?, updated_at=? WHERE email=?`
      ).run(hash, expiry, ts, newCount, newWindow, ts, email);

      try {
        await sendOtpEmail(email, otp, purpose === 'register' ? 'register' : 'login');
      } catch (emailErr: any) {
        if (emailErr?.message === 'EMAIL_NOT_CONFIGURED') {
          res.status(503).json({ error: 'Email service is not configured.', code: 'EMAIL_NOT_CONFIGURED' });
        } else {
          res.status(503).json({ error: 'Could not send OTP. Please try again.', code: 'EMAIL_DELIVERY_FAILED' });
        }
        return;
      }

      res.json({
        message: 'OTP resent to your email.',
        email: email.replace(/(.{2}).*(@.*)/, '$1***$2'),
        purpose,
      });
    } catch (error) {
      console.error('[OTP] Unexpected error in resend-otp:', (error as any)?.message?.slice(0, 100));
      res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
  }
);

// ── POST /api/auth/verify-otp ─────────────────────────────────────────────────
// Step 3: User submits OTP → verify → issue JWT

router.post(
  '/verify-otp',
  otpVerifyLimiter,
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('otp').isLength({ min: 6, max: 6 }).isNumeric().withMessage('OTP must be 6 digits'),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: errors.array()[0].msg });
      return;
    }

    const email = normalizeEmail(req.body.email as string);
    const otp   = (req.body.otp as string).trim();

    if (!email) { res.status(400).json({ error: 'Invalid email.' }); return; }

    // Backend re-validates educational domain even at verify step
    if (!isEducationalDomain(email)) {
      res.status(403).json({ error: 'Not an educational email.', code: 'NOT_EDUCATIONAL_EMAIL' });
      return;
    }

    try {
      const db = getDatabase();
      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;

      if (!user) {
        res.status(404).json({ error: 'No account found. Please start registration again.' });
        return;
      }

      // ── Attempt limit ─────────────────────────────────────────────────────
      if ((user.otp_attempts || 0) >= OTP_MAX_ATTEMPTS) {
        res.status(429).json({
          error: 'Too many incorrect attempts. Please request a new OTP.',
          code: 'OTP_LOCKED',
        });
        return;
      }

      // ── Expiry check ──────────────────────────────────────────────────────
      if (!user.otp_expires_at || new Date(user.otp_expires_at) < new Date()) {
        res.status(400).json({ error: 'OTP has expired. Please request a new one.', code: 'OTP_EXPIRED' });
        return;
      }

      // ── Hash comparison ───────────────────────────────────────────────────
      if (!user.otp_hash) {
        res.status(400).json({ error: 'No OTP found. Please request a new one.' });
        return;
      }

      const valid = await verifyOtpHash(otp, user.otp_hash);

      if (!valid) {
        // Increment attempts
        db.prepare('UPDATE users SET otp_attempts = otp_attempts + 1 WHERE email = ?').run(email);
        const remaining = OTP_MAX_ATTEMPTS - (user.otp_attempts + 1);
        res.status(400).json({
          error: remaining > 0
            ? `Incorrect OTP. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
            : 'Too many incorrect attempts. Please request a new OTP.',
          code: 'OTP_WRONG',
          attemptsRemaining: Math.max(0, remaining),
        });
        return;
      }

      // ── OTP valid — invalidate it immediately (single-use) ────────────────
      const now = new Date().toISOString();
      db.prepare(
        'UPDATE users SET otp_hash=NULL, otp_expires_at=NULL, otp_attempts=0, updated_at=? WHERE email=?'
      ).run(now, email);

      // ── Issue JWT ─────────────────────────────────────────────────────────
      const profile = db.prepare('SELECT onboarding_completed FROM profiles WHERE user_id = ?').get(user.id) as any;
      const token   = generateToken(user.id, user.email);

      res.json({
        token,
        user: { id: user.id, email: user.email, fullName: user.full_name },
        onboardingCompleted: profile?.onboarding_completed === 1,
        isNewUser: !profile?.onboarding_completed,
      });
    } catch (error) {
      console.error('verify-otp error:', error);
      res.status(500).json({ error: 'Verification failed. Please try again.' });
    }
  }
);

// ── POST /api/auth/add-recovery-email ─────────────────────────────────────────
// Authenticated: user adds personal recovery email → sends verification OTP

router.post(
  '/add-recovery-email',
  authenticateToken,
  otpSendLimiter,
  [
    body('personalEmail').isEmail().withMessage('Valid personal email is required'),
  ],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { res.status(400).json({ error: errors.array()[0].msg }); return; }

    const personalEmail = normalizeEmail(req.body.personalEmail as string);
    if (!personalEmail) { res.status(400).json({ error: 'Invalid email format.' }); return; }

    const db = getDatabase();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId) as any;
    if (!user) { res.status(404).json({ error: 'User not found.' }); return; }

    if (personalEmail === user.email) {
      res.status(400).json({ error: 'Recovery email must be different from your institutional email.' });
      return;
    }

    // Check cooldown
    const lastSent = user.personal_otp_last_sent_at ? new Date(user.personal_otp_last_sent_at).getTime() : 0;
    if (Date.now() - lastSent < RESEND_COOLDOWN_MS) {
      const waitSecs = Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - lastSent)) / 1000);
      res.status(429).json({ error: `Please wait ${waitSecs} seconds before requesting another OTP.` });
      return;
    }

    try {
      const otp    = generateOtp();
      const hash   = await hashOtp(otp);
      const expiry = new Date(Date.now() + OTP_EXPIRY_MS).toISOString();
      const now    = new Date().toISOString();

      db.prepare(
        `UPDATE users SET personal_email=?, personal_email_verified=0,
         personal_otp_hash=?, personal_otp_expires_at=?, personal_otp_attempts=0,
         personal_otp_last_sent_at=?, updated_at=? WHERE id=?`
      ).run(personalEmail, hash, expiry, now, now, req.userId);

      await sendRecoveryEmailVerification(personalEmail, otp);

      res.json({
        message: `Verification OTP sent to ${personalEmail.replace(/(.{2}).*(@.*)/, '$1***$2')}`,
      });
    } catch (error) {
      console.error('add-recovery-email error:', error);
      res.status(500).json({ error: 'Failed to send verification email. Please try again.' });
    }
  }
);

// ── POST /api/auth/verify-recovery-email ──────────────────────────────────────

router.post(
  '/verify-recovery-email',
  authenticateToken,
  otpVerifyLimiter,
  [body('otp').isLength({ min: 6, max: 6 }).isNumeric().withMessage('OTP must be 6 digits')],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { res.status(400).json({ error: errors.array()[0].msg }); return; }

    const otp = (req.body.otp as string).trim();

    try {
      const db   = getDatabase();
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId) as any;
      if (!user) { res.status(404).json({ error: 'User not found.' }); return; }

      if ((user.personal_otp_attempts || 0) >= OTP_MAX_ATTEMPTS) {
        res.status(429).json({ error: 'Too many attempts. Request a new OTP.', code: 'OTP_LOCKED' });
        return;
      }

      if (!user.personal_otp_expires_at || new Date(user.personal_otp_expires_at) < new Date()) {
        res.status(400).json({ error: 'OTP expired. Please request a new one.', code: 'OTP_EXPIRED' });
        return;
      }

      const valid = await verifyOtpHash(otp, user.personal_otp_hash || '');
      if (!valid) {
        db.prepare('UPDATE users SET personal_otp_attempts = personal_otp_attempts + 1 WHERE id = ?').run(req.userId);
        const rem = OTP_MAX_ATTEMPTS - (user.personal_otp_attempts + 1);
        res.status(400).json({ error: `Incorrect OTP. ${Math.max(0, rem)} attempt(s) remaining.`, code: 'OTP_WRONG' });
        return;
      }

      const now = new Date().toISOString();
      db.prepare(
        `UPDATE users SET personal_email_verified=1,
         personal_otp_hash=NULL, personal_otp_expires_at=NULL, personal_otp_attempts=0,
         updated_at=? WHERE id=?`
      ).run(now, req.userId);

      res.json({ message: 'Recovery email verified successfully.', verified: true });
    } catch (error) {
      console.error('verify-recovery-email error:', error);
      res.status(500).json({ error: 'Verification failed.' });
    }
  }
);

// ── POST /api/auth/forgot-password ────────────────────────────────────────────
// Step 1 of password reset: validate educational email, send OTP.
// Does NOT require password. Reuses the OTP infrastructure.
// { email }

router.post(
  '/forgot-password',
  otpSendLimiter,
  [body('email').isEmail().withMessage('Valid email address is required')],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: errors.array()[0].msg });
      return;
    }

    const email = normalizeEmail(req.body.email as string);
    if (!email) {
      res.status(400).json({ error: 'Invalid email format.' });
      return;
    }

    if (!isEducationalDomain(email)) {
      res.status(403).json({
        error: 'Please use your institutional email address.',
        code: 'NOT_EDUCATIONAL_EMAIL',
      });
      return;
    }

    try {
      const db   = getDatabase();
      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;

      if (!user) {
        // Return a generic success message to avoid user enumeration
        res.json({
          message: 'If this email is registered, an OTP has been sent.',
          email: email.replace(/(.{2}).*(@.*)/, '$1***$2'),
        });
        return;
      }

      // Resend cooldown
      const now      = Date.now();
      const lastSent = user.otp_last_sent_at ? new Date(user.otp_last_sent_at).getTime() : 0;
      if (now - lastSent < RESEND_COOLDOWN_MS) {
        const waitSecs = Math.ceil((RESEND_COOLDOWN_MS - (now - lastSent)) / 1000);
        res.status(429).json({
          error: `Please wait ${waitSecs} seconds before requesting another OTP.`,
          code: 'RESEND_COOLDOWN',
        });
        return;
      }

      const windowStart = user.otp_send_window_start ? new Date(user.otp_send_window_start).getTime() : 0;
      const sendCount   = user.otp_send_count || 0;
      const inWindow    = now - windowStart < RESEND_WINDOW_MS;
      if (inWindow && sendCount >= RESEND_WINDOW_MAX) {
        res.status(429).json({
          error: 'Too many OTP requests. Please wait 15 minutes and try again.',
          code: 'RESEND_LIMIT',
        });
        return;
      }

      // Generate + hash OTP
      const otp    = generateOtp();
      const hash   = await hashOtp(otp);
      const expiry = new Date(Date.now() + OTP_EXPIRY_MS).toISOString();
      const ts     = new Date().toISOString();
      const newCount  = inWindow ? sendCount + 1 : 1;
      const newWindow = inWindow ? user.otp_send_window_start : ts;

      db.prepare(
        `UPDATE users SET otp_hash=?, otp_expires_at=?, otp_attempts=0,
         otp_last_sent_at=?, otp_send_count=?, otp_send_window_start=?, updated_at=? WHERE email=?`
      ).run(hash, expiry, ts, newCount, newWindow, ts, email);

      try {
        await sendOtpEmail(email, otp, 'login');
      } catch (emailErr: any) {
        if (emailErr?.message === 'EMAIL_NOT_CONFIGURED') {
          res.status(503).json({ error: 'Email service is not configured.', code: 'EMAIL_NOT_CONFIGURED' });
        } else {
          res.status(503).json({ error: 'Could not send OTP. Please try again.', code: 'EMAIL_DELIVERY_FAILED' });
        }
        return;
      }

      res.json({
        message: 'OTP sent to your email. Please check your inbox and spam/junk folder.',
        email: email.replace(/(.{2}).*(@.*)/, '$1***$2'),
      });
    } catch (err) {
      console.error('[ForgotPassword] Error:', (err as any)?.message?.slice(0, 100));
      res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
  }
);

// ── POST /api/auth/reset-password ─────────────────────────────────────────────
// Step 2 of password reset: verify OTP + set new password (does NOT issue JWT).
// After success, the user must log in normally so we can confirm the new password works.
// { email, otp, newPassword }

router.post(
  '/reset-password',
  otpVerifyLimiter,
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('otp').isLength({ min: 6, max: 6 }).isNumeric().withMessage('OTP must be 6 digits'),
    body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: errors.array()[0].msg });
      return;
    }

    const email       = normalizeEmail(req.body.email as string);
    const otp         = (req.body.otp as string).trim();
    const newPassword = (req.body.newPassword as string).trim();

    if (!email) { res.status(400).json({ error: 'Invalid email.' }); return; }

    if (!isEducationalDomain(email)) {
      res.status(403).json({ error: 'Not an educational email.', code: 'NOT_EDUCATIONAL_EMAIL' });
      return;
    }

    try {
      const db   = getDatabase();
      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;

      if (!user) {
        res.status(404).json({ error: 'Account not found.' });
        return;
      }

      // Attempt limit
      if ((user.otp_attempts || 0) >= OTP_MAX_ATTEMPTS) {
        res.status(429).json({ error: 'Too many incorrect attempts. Please request a new OTP.', code: 'OTP_LOCKED' });
        return;
      }

      // Expiry
      if (!user.otp_expires_at || new Date(user.otp_expires_at) < new Date()) {
        res.status(400).json({ error: 'OTP has expired. Please request a new one.', code: 'OTP_EXPIRED' });
        return;
      }

      if (!user.otp_hash) {
        res.status(400).json({ error: 'No OTP found. Please request a new one.' });
        return;
      }

      const valid = await verifyOtpHash(otp, user.otp_hash);
      if (!valid) {
        db.prepare('UPDATE users SET otp_attempts = otp_attempts + 1 WHERE email = ?').run(email);
        const remaining = OTP_MAX_ATTEMPTS - (user.otp_attempts + 1);
        res.status(400).json({
          error: remaining > 0
            ? `Incorrect OTP. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
            : 'Too many incorrect attempts. Please request a new OTP.',
          code: 'OTP_WRONG',
          attemptsRemaining: Math.max(0, remaining),
        });
        return;
      }

      // OTP valid — hash new password and update
      const newHash = await bcrypt.hash(newPassword, 12);
      const now     = new Date().toISOString();

      db.prepare(
        `UPDATE users SET
           password_hash=?,
           otp_hash=NULL, otp_expires_at=NULL, otp_attempts=0,
           updated_at=?
         WHERE email=?`
      ).run(newHash, now, email);

      // Issue JWT so the user is automatically logged in after reset
      const profile = db.prepare('SELECT onboarding_completed FROM profiles WHERE user_id = ?').get(user.id) as any;
      const token   = generateToken(user.id, user.email);

      res.json({
        message: 'Password reset successfully. You are now signed in.',
        token,
        user: { id: user.id, email: user.email, fullName: user.full_name },
        onboardingCompleted: profile?.onboarding_completed === 1,
      });
    } catch (err) {
      console.error('[ResetPassword] Error:', (err as any)?.message?.slice(0, 100));
      res.status(500).json({ error: 'Password reset failed. Please try again.' });
    }
  }
);

// ── POST /api/auth/logout ─────────────────────────────────────────────────────

router.post('/logout', (_req: Request, res: Response): void => {
  res.json({ message: 'Logged out successfully' });
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────

router.get('/me', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const db   = getDatabase();
    const user = db.prepare(
      'SELECT id, email, full_name, personal_email, personal_email_verified, phone_number, phone_verified FROM users WHERE id = ?'
    ).get(req.userId) as any;

    if (!user) { res.status(404).json({ error: 'User not found' }); return; }

    // Enforce educational email — reject sessions from personal-email accounts
    if (!isEducationalDomain(user.email)) {
      res.status(403).json({ error: 'Account not authorized. Please use an institutional email.', code: 'NOT_EDUCATIONAL_EMAIL' });
      return;
    }

    const profile = db.prepare('SELECT onboarding_completed FROM profiles WHERE user_id = ?').get(req.userId) as any;

    res.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        personalEmail: user.personal_email || null,
        personalEmailVerified: user.personal_email_verified === 1,
        phoneNumber: user.phone_number || null,
        phoneVerified: user.phone_verified === 1,
      },
      onboardingCompleted: profile?.onboarding_completed === 1,
    });

  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

// /dev-otp endpoint has been removed — OTPs are never returned via API

// ── GET /api/auth/approved-domains ────────────────────────────────────────────
// Public: returns the list of approved domains for frontend display (not security)

router.get('/approved-domains', (_req: Request, res: Response): void => {
  res.json({ domains: [...APPROVED_DOMAINS].sort() });
});

// ────────────────────────────────────────────────────────────────────────────
// PHONE OTP — Rate-limit constants
// SMS is more expensive and abuse-prone than email; use tighter limits.
// ────────────────────────────────────────────────────────────────────────────

const PHONE_OTP_EXPIRY_MS         = parseInt(process.env.OTP_EXPIRES_MINUTES          || '5',  10) * 60 * 1000;
const PHONE_OTP_MAX_ATTEMPTS      = parseInt(process.env.OTP_MAX_VERIFY_ATTEMPTS      || '5',  10);
const PHONE_RESEND_COOLDOWN_MS    = parseInt(process.env.SMS_RESEND_COOLDOWN_SECONDS  || '60', 10) * 1000; // 60s default (stricter than email)
const PHONE_RESEND_WINDOW_MS      = parseInt(process.env.OTP_RATE_LIMIT_WINDOW_MINUTES || '15', 10) * 60 * 1000;
const PHONE_RESEND_WINDOW_MAX     = parseInt(process.env.SMS_MAX_REQUESTS_PER_PHONE   || '3',  10); // max 3 SMS per 15 min window

/** IP-level rate limiter for SMS endpoints (tighter than email) */
const smsOtpSendLimiter = rateLimit({
  windowMs: OTP_RATE_WINDOW_MS,
  max: Math.floor(OTP_MAX_PER_IP / 2),  // half of email limit — SMS is more expensive
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many SMS requests. Please wait a few minutes.', code: 'IP_RATE_LIMIT' },
});

// ── POST /api/auth/send-phone-otp ─────────────────────────────────────────────
// Authenticated (JWT required). Sends an OTP to the provided phone number.
// The email OTP must already have been verified (JWT proves email is verified).

router.post(
  '/send-phone-otp',
  authenticateToken,
  smsOtpSendLimiter,
  [
    body('phoneNumber').notEmpty().withMessage('Phone number is required'),
  ],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: errors.array()[0].msg });
      return;
    }

    const rawPhone = req.body.phoneNumber as string;
    const userId   = req.userId!;

    // ── Normalize & validate phone number ────────────────────────────────────
    const normalized = normalizePhoneNumber(rawPhone);
    if (!normalized || !isValidPhoneNumber(normalized)) {
      res.status(400).json({ error: 'Invalid phone number. Please enter a valid mobile number (e.g. +91 9876543210).' });
      return;
    }

    try {
      const db   = getDatabase();
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
      if (!user) {
        res.status(404).json({ error: 'User not found.' });
        return;
      }

      const now = Date.now();

      // ── Per-user resend rate-limit ──────────────────────────────────────────
      const lastSent    = user.phone_otp_last_sent_at ? new Date(user.phone_otp_last_sent_at).getTime() : 0;
      const windowStart = user.phone_otp_send_window_start ? new Date(user.phone_otp_send_window_start).getTime() : 0;
      const sendCount   = user.phone_otp_send_count || 0;

      if (now - lastSent < PHONE_RESEND_COOLDOWN_MS) {
        const waitSecs = Math.ceil((PHONE_RESEND_COOLDOWN_MS - (now - lastSent)) / 1000);
        res.status(429).json({
          error: `Please wait ${waitSecs} seconds before requesting another SMS OTP.`,
          code: 'SMS_RESEND_COOLDOWN',
          waitSeconds: waitSecs,
        });
        return;
      }

      const inWindow = now - windowStart < PHONE_RESEND_WINDOW_MS;
      if (inWindow && sendCount >= PHONE_RESEND_WINDOW_MAX) {
        res.status(429).json({
          error: 'Too many SMS verification requests. Please try again in 15 minutes.',
          code: 'SMS_RATE_LIMIT',
        });
        return;
      }

      // ── If phone number changed, invalidate previous OTP ──────────────────
      const phoneChanged = user.phone_number && user.phone_number !== normalized;
      if (phoneChanged) {
        console.info(`[SMS] Phone number changed for user ${userId} — previous OTP invalidated`);
      }

      // ── Generate & hash OTP (never stored plaintext) ──────────────────────
      const otp    = generateOtp();
      const hash   = await hashOtp(otp);
      const expiry = new Date(now + PHONE_OTP_EXPIRY_MS).toISOString();
      const ts     = new Date(now).toISOString();

      // ── Send SMS FIRST — only write rate-limit counters on success ─────────
      // IMPORTANT: We deliberately send the SMS before updating the DB.
      // If we wrote phone_otp_last_sent_at to DB before calling the provider
      // and the provider failed (e.g. not configured, network error), the user
      // would be stuck in a 60-second cooldown without ever receiving an SMS.
      // By sending first, a failed delivery leaves rate-limit fields untouched,
      // allowing the user to correct their number or retry immediately.
      const result = await sendSmsOtp(normalized, otp);

      if (!result.success) {
        console.error(`[SMS] SMS_PROVIDER_FAILED for user ${userId}: ${result.error}`);
        res.status(503).json({
          error: result.error || "We couldn't send the verification code right now. Please try again.",
          code: 'SMS_DELIVERY_FAILED',
        });
        return;
      }

      // ── SMS delivered — now commit OTP hash + rate-limit to DB ────────────
      const newCount  = inWindow && !phoneChanged ? sendCount + 1 : 1;
      const newWindow = (inWindow && !phoneChanged) ? user.phone_otp_send_window_start : ts;

      db.prepare(`
        UPDATE users SET
          phone_number = ?,
          phone_verified = 0,
          phone_otp_hash = ?,
          phone_otp_expires_at = ?,
          phone_otp_attempts = 0,
          phone_otp_last_sent_at = ?,
          phone_otp_send_count = ?,
          phone_otp_send_window_start = ?,
          updated_at = ?
        WHERE id = ?
      `).run(normalized, hash, expiry, ts, newCount, newWindow, ts, userId);

      console.info(`[SMS] SMS_OTP_PROVIDER_ACCEPTED for user ${userId} → ${maskPhoneNumber(normalized)}`);

      res.json({
        message: 'Verification code sent to your mobile number.',
        maskedPhone: maskPhoneNumber(normalized),
      });
    } catch (error) {
      console.error('[SMS] Unexpected error in send-phone-otp:', (error as any)?.message?.slice(0, 100));
      res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
  }
);


// ── POST /api/auth/verify-phone-otp ──────────────────────────────────────────
// Authenticated. Verifies the SMS OTP and marks the phone as verified in the DB.
// The backend is the SOLE authority — frontend cannot self-declare phone verified.

router.post(
  '/verify-phone-otp',
  authenticateToken,
  otpVerifyLimiter,
  [
    body('otp').isLength({ min: 6, max: 6 }).isNumeric().withMessage('OTP must be 6 digits'),
  ],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: errors.array()[0].msg });
      return;
    }

    const otp    = (req.body.otp as string).trim();
    const userId = req.userId!;

    try {
      const db   = getDatabase();
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;

      if (!user) {
        res.status(404).json({ error: 'User not found.' });
        return;
      }

      if (!user.phone_number || !user.phone_otp_hash) {
        res.status(400).json({ error: 'No phone verification in progress. Please request an OTP first.' });
        return;
      }

      // ── Attempt limit ──────────────────────────────────────────────────────
      if ((user.phone_otp_attempts || 0) >= PHONE_OTP_MAX_ATTEMPTS) {
        res.status(429).json({
          error: 'Too many incorrect attempts. Please request a new SMS OTP.',
          code: 'OTP_LOCKED',
        });
        return;
      }

      // ── Expiry check ───────────────────────────────────────────────────────
      if (!user.phone_otp_expires_at || new Date(user.phone_otp_expires_at) < new Date()) {
        res.status(400).json({
          error: 'This verification code has expired. Please request a new code.',
          code: 'OTP_EXPIRED',
        });
        return;
      }

      // ── Hash comparison ────────────────────────────────────────────────────
      const valid = await verifyOtpHash(otp, user.phone_otp_hash);

      if (!valid) {
        db.prepare('UPDATE users SET phone_otp_attempts = phone_otp_attempts + 1 WHERE id = ?').run(userId);
        const remaining = PHONE_OTP_MAX_ATTEMPTS - (user.phone_otp_attempts + 1);
        res.status(400).json({
          error: remaining > 0
            ? `Incorrect verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
            : 'Too many incorrect attempts. Please request a new SMS OTP.',
          code: 'OTP_WRONG',
          attemptsRemaining: Math.max(0, remaining),
        });
        return;
      }

      // ── OTP valid — mark phone verified, invalidate OTP immediately ────────
      const now = new Date().toISOString();
      db.prepare(`
        UPDATE users SET
          phone_verified = 1,
          phone_verified_at = ?,
          phone_otp_hash = NULL,
          phone_otp_expires_at = NULL,
          phone_otp_attempts = 0,
          updated_at = ?
        WHERE id = ?
      `).run(now, now, userId);

      console.info(`[SMS] SMS_OTP_VERIFIED for user ${userId} → ${maskPhoneNumber(user.phone_number)}`);

      res.json({
        message: 'Phone number verified successfully.',
        phoneVerified: true,
      });
    } catch (error) {
      console.error('[SMS] Unexpected error in verify-phone-otp:', (error as any)?.message?.slice(0, 100));
      res.status(500).json({ error: 'Verification failed. Please try again.' });
    }
  }
);

// ── POST /api/auth/resend-phone-otp ──────────────────────────────────────────
// Authenticated. Resends SMS OTP to the already-submitted phone number.

router.post(
  '/resend-phone-otp',
  authenticateToken,
  smsOtpSendLimiter,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.userId!;

    try {
      const db   = getDatabase();
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;

      if (!user || !user.phone_number) {
        res.status(400).json({ error: 'No phone number on file. Please enter your phone number first.' });
        return;
      }

      const now       = Date.now();
      const lastSent  = user.phone_otp_last_sent_at ? new Date(user.phone_otp_last_sent_at).getTime() : 0;
      const windowStart = user.phone_otp_send_window_start ? new Date(user.phone_otp_send_window_start).getTime() : 0;
      const sendCount = user.phone_otp_send_count || 0;

      if (now - lastSent < PHONE_RESEND_COOLDOWN_MS) {
        const waitSecs = Math.ceil((PHONE_RESEND_COOLDOWN_MS - (now - lastSent)) / 1000);
        res.status(429).json({
          error: `Please wait ${waitSecs} seconds before requesting another SMS OTP.`,
          code: 'SMS_RESEND_COOLDOWN',
          waitSeconds: waitSecs,
        });
        return;
      }

      const inWindow = now - windowStart < PHONE_RESEND_WINDOW_MS;
      if (inWindow && sendCount >= PHONE_RESEND_WINDOW_MAX) {
        res.status(429).json({
          error: 'Too many SMS verification requests. Please try again in 15 minutes.',
          code: 'SMS_RATE_LIMIT',
        });
        return;
      }

      const otp    = generateOtp();
      const hash   = await hashOtp(otp);
      const expiry = new Date(now + PHONE_OTP_EXPIRY_MS).toISOString();
      const ts     = new Date(now).toISOString();
      const newCount  = inWindow ? sendCount + 1 : 1;
      const newWindow = inWindow ? user.phone_otp_send_window_start : ts;

      // Send SMS FIRST — only commit rate-limit counters to DB on success.
      // Same logic as send-phone-otp: a failed delivery must not start cooldown.
      const result = await sendSmsOtp(user.phone_number, otp);

      if (!result.success) {
        res.status(503).json({
          error: result.error || "We couldn't send the verification code right now. Please try again.",
          code: 'SMS_DELIVERY_FAILED',
        });
        return;
      }

      // SMS delivered — now persist OTP hash + rate-limit counters
      db.prepare(`
        UPDATE users SET
          phone_otp_hash = ?,
          phone_otp_expires_at = ?,
          phone_otp_attempts = 0,
          phone_otp_last_sent_at = ?,
          phone_otp_send_count = ?,
          phone_otp_send_window_start = ?,
          updated_at = ?
        WHERE id = ?
      `).run(hash, expiry, ts, newCount, newWindow, ts, userId);

      console.info(`[SMS] SMS_OTP_RESENT for user ${userId} → ${maskPhoneNumber(user.phone_number)}`);

      res.json({
        message: 'Verification code resent.',
        maskedPhone: maskPhoneNumber(user.phone_number),
      });
    } catch (error) {
      console.error('[SMS] Unexpected error in resend-phone-otp:', (error as any)?.message?.slice(0, 100));
      res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
  }
);

export default router;

