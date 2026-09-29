/**
 * SMS Service — Fast2SMS Provider (100% FREE for India)
 * =======================================================
 * Provider: Fast2SMS (https://www.fast2sms.com)
 *
 * WHY Fast2SMS:
 *   - Designed specifically for Indian (+91) mobile numbers
 *   - FREE plan with credits on signup
 *   - Dedicated OTP route (no DLT registration required)
 *   - Simple REST API — no SDK needed, just fetch/https
 *   - No FROM number purchase required
 *
 * Setup (one-time, takes 2 minutes):
 *   1. Sign up at https://www.fast2sms.com (free)
 *   2. Go to: Dev API → API Keys
 *   3. Copy your API key
 *   4. Paste into server/.env:
 *      FAST2SMS_API_KEY=your_api_key_here
 *
 * Environment variables:
 *   FAST2SMS_API_KEY  — Required. Your Fast2SMS API key.
 *
 * Optional dev mode:
 *   SMS_OTP_DEV_MODE=true  — Print OTP to server console instead of sending SMS.
 *                            NEVER enable in production.
 */

import https from 'https';

const FAST2SMS_API_KEY = process.env.FAST2SMS_API_KEY;
const SMS_DEV_MODE     = process.env.SMS_OTP_DEV_MODE === 'true' &&
                         process.env.NODE_ENV !== 'production';

export interface SmsSendResult {
  success: boolean;
  requestId?: string;
  error?: string;
}

/**
 * Normalize a phone number to 10-digit Indian format for Fast2SMS.
 * Fast2SMS expects a 10-digit number (without country code) for Indian numbers.
 *
 * Accepts:
 *   9876543210          → 9876543210
 *   +91 9876543210      → 9876543210
 *   91-9876543210       → 9876543210
 *   09876543210         → 9876543210
 *   +919876543210       → 9876543210
 */
export function normalizePhoneNumber(raw: string): string | null {
  if (!raw) return null;

  // Strip all spaces, dashes, parentheses
  let cleaned = raw.replace(/[\s\-().]/g, '');

  // Remove leading +91 or 0091
  if (cleaned.startsWith('+91')) cleaned = cleaned.slice(3);
  else if (cleaned.startsWith('0091')) cleaned = cleaned.slice(4);
  else if (cleaned.startsWith('91') && cleaned.length === 12) cleaned = cleaned.slice(2);
  // Remove leading 0 (STD code style: 0XXXXXXXXXX)
  else if (cleaned.startsWith('0') && cleaned.length === 11) cleaned = cleaned.slice(1);

  // Must be exactly 10 digits starting with 6-9 (valid Indian mobile)
  if (/^[6-9]\d{9}$/.test(cleaned)) return cleaned;

  return null;
}

/**
 * Check whether a normalized phone number is a valid Indian mobile number.
 */
export function isValidPhoneNumber(normalized: string): boolean {
  return /^[6-9]\d{9}$/.test(normalized);
}

/**
 * Mask a phone number for safe display in UI / logs.
 * 9876543210  →  ******3210
 * +91 9876543210  →  +91 ******3210
 */
export function maskPhoneNumber(phone: string): string {
  if (!phone) return '***';
  // If it's a 10-digit Indian number
  if (/^[6-9]\d{9}$/.test(phone)) return `+91 ******${phone.slice(-4)}`;
  // Generic
  if (phone.length >= 6) return phone.slice(0, 3) + '******' + phone.slice(-4);
  return '***';
}

/**
 * Send OTP via Fast2SMS OTP API.
 *
 * SECURITY:
 *   - The OTP is NEVER included in logs.
 *   - The API key is NEVER exposed in responses or logs.
 *   - On failure, returns a user-safe message — no raw provider errors exposed.
 */
export async function sendSmsOtp(toNumber: string, otp: string): Promise<SmsSendResult> {
  const maskedTo = maskPhoneNumber(toNumber);

  // ── DEVELOPMENT MODE ──────────────────────────────────────────────────────
  if (SMS_DEV_MODE) {
    console.warn('╔══════════════════════════════════════════════════╗');
    console.warn('║         SMS DEV MODE — NOT sending real SMS       ║');
    console.warn('╠══════════════════════════════════════════════════╣');
    console.warn(`║  To: ${maskedTo.padEnd(44)} ║`);
    console.warn(`║  OTP: ${otp}                                         ║`);
    console.warn('║  Set SMS_OTP_DEV_MODE=false for production        ║');
    console.warn('╚══════════════════════════════════════════════════╝');
    return { success: true, requestId: 'DEV_MODE' };
  }

  // ── PRODUCTION: FAST2SMS API ──────────────────────────────────────────────
  if (!FAST2SMS_API_KEY) {
    console.error('[SMS] Fast2SMS not configured. Set FAST2SMS_API_KEY in server/.env');
    console.error('[SMS] Get your FREE API key at: https://www.fast2sms.com → Dev API → API Keys');
    return {
      success: false,
      error: 'SMS service is not configured. Please contact the administrator or skip phone verification.',
    };
  }

  return new Promise((resolve) => {
    const params = new URLSearchParams({
      authorization: FAST2SMS_API_KEY!,
      route:         'otp',
      variables_values: otp,
      numbers:       toNumber,
      flash:         '0',
    });

    const options: https.RequestOptions = {
      hostname: 'www.fast2sms.com',
      path:     `/dev/bulkV2?${params.toString()}`,
      method:   'GET',
      headers: {
        'cache-control': 'no-cache',
        'authorization': FAST2SMS_API_KEY!,
      },
      timeout: 10000,  // 10 second timeout
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);

          // Fast2SMS success: { return: true, request_id: '...', message: [...] }
          if (json.return === true) {
            console.info(`[SMS] SMS_OTP_SENT to ${maskedTo} — request_id: ${json.request_id}`);
            resolve({ success: true, requestId: json.request_id });
            return;
          }

          // Fast2SMS failure: { return: false, message: '...' }
          const providerMsg = Array.isArray(json.message) ? json.message[0] : json.message;
          console.error(`[SMS] Fast2SMS FAILED for ${maskedTo} — ${providerMsg}`);

          // Map provider messages to user-safe text
          let userMsg = "We couldn't send the verification code right now. Please try again.";

          if (typeof providerMsg === 'string') {
            const pm = providerMsg.toLowerCase();
            if (pm.includes('invalid mobile') || pm.includes('not valid')) {
              userMsg = 'Invalid mobile number. Please check the number and try again.';
            } else if (pm.includes('balance') || pm.includes('credit')) {
              userMsg = 'SMS service is temporarily unavailable. Please try again later.';
            } else if (pm.includes('invalid authorization') || pm.includes('api key')) {
              console.error('[SMS] Invalid Fast2SMS API key — check FAST2SMS_API_KEY in server/.env');
              userMsg = 'SMS service configuration error. Please contact the administrator.';
            }
          }

          resolve({ success: false, error: userMsg });
        } catch {
          console.error('[SMS] Fast2SMS response parse error:', data.slice(0, 200));
          resolve({ success: false, error: "We couldn't send the verification code right now. Please try again." });
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      console.error(`[SMS] Fast2SMS request timed out for ${maskedTo}`);
      resolve({ success: false, error: 'SMS request timed out. Please check your connection and try again.' });
    });

    req.on('error', (err) => {
      console.error(`[SMS] Fast2SMS network error for ${maskedTo}:`, err.message);
      resolve({ success: false, error: "We couldn't send the verification code right now. Please try again." });
    });

    req.end();
  });
}
