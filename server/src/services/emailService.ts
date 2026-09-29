/**
 * Email Service — OTP delivery via Nodemailer (SMTP)
 *
 * Required environment variables:
 *   SMTP_HOST      SMTP server hostname     e.g. smtp.gmail.com
 *   SMTP_PORT      SMTP port                e.g. 587 (STARTTLS) or 465 (SSL)
 *   SMTP_SECURE    Use SSL (port 465)       e.g. false
 *   SMTP_USER      SMTP username/email
 *   SMTP_PASSWORD  SMTP password / App Password
 *   SMTP_FROM      Sender name + address   e.g. "Campus Placement AI <noreply@yourapp.com>"
 *
 * Gmail setup (recommended for demo):
 *   1. Enable 2-Step Verification on Google Account
 *   2. Generate an App Password: Google Account → Security → App Passwords
 *   3. Set SMTP_USER=youremail@gmail.com, SMTP_PASSWORD=<16-char app password>
 *   4. Set SMTP_HOST=smtp.gmail.com, SMTP_PORT=587, SMTP_SECURE=false
 *
 * SECURITY RULES:
 *   - OTP is NEVER logged, stored in plaintext, or returned in API responses
 *   - SMTP credentials are NEVER logged or exposed
 *   - This module throws on delivery failure so the route can return a real error
 */

import nodemailer, { Transporter } from 'nodemailer';

let _transporter: Transporter | null = null;
let _smtpReady = false;

export function isSmtpConfigured(): boolean {
  return !!(
    process.env.SMTP_HOST?.trim() &&
    process.env.SMTP_USER?.trim() &&
    process.env.SMTP_PASSWORD?.trim()
  );
}

function getTransporter(): Transporter {
  if (_transporter) return _transporter;

  if (!isSmtpConfigured()) {
    // No SMTP — we cannot send email. Throw immediately so the route returns a real error.
    // Do NOT fall back to a console/dev-only mode that hides the failure from the user.
    throw new Error('EMAIL_NOT_CONFIGURED');
  }

  const port   = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true';

  _transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST!.trim(),
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER!.trim(),
      pass: process.env.SMTP_PASSWORD!.replace(/\s+/g, ''),
    },
    tls: { rejectUnauthorized: false },
  });

  _smtpReady = true;
  return _transporter;
}

function getFrom(): string {
  return process.env.SMTP_FROM?.trim() || 'Campus Placement AI <noreply@campusplacementai.com>';
}

function buildOtpEmail(otp: string, purposeLabel: string): { subject: string; html: string; text: string } {
  const subject = `Campus Placement AI — Your ${purposeLabel} OTP`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#0A0A0A;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;padding:40px 20px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#111111;border:1px solid #2A2A2A;border-radius:4px;overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="padding:28px 32px 0;border-bottom:1px solid #1E1E1E;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="width:20px;height:20px;border:1.5px solid #D4AF37;transform:rotate(45deg);display:inline-block;"></td>
                <td style="padding-left:10px;color:#D4AF37;font-size:10px;letter-spacing:3px;text-transform:uppercase;font-weight:bold;vertical-align:middle;">
                  CAMPUS PLACEMENT AI
                </td>
              </tr>
            </table>
            <div style="height:20px;"></div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <h2 style="margin:0 0 8px;color:#F5F0E8;font-size:18px;font-weight:bold;text-transform:uppercase;letter-spacing:2px;">
              ${purposeLabel}
            </h2>
            <div style="width:40px;height:2px;background:#D4AF37;margin-bottom:24px;"></div>

            <p style="margin:0 0 20px;color:#9A9A9A;font-size:13px;line-height:1.7;">
              Hello,
            </p>
            <p style="margin:0 0 24px;color:#9A9A9A;font-size:13px;line-height:1.7;">
              Your verification code for Campus Placement AI is:
            </p>

            <!-- OTP Box -->
            <div style="background:#0A0A0A;border:1px solid #D4AF37;border-radius:4px;padding:24px;text-align:center;margin:0 0 24px;">
              <span style="font-size:40px;font-weight:bold;letter-spacing:12px;color:#D4AF37;font-family:Courier New,monospace;">
                ${otp}
              </span>
            </div>

            <p style="margin:0 0 8px;color:#9A9A9A;font-size:13px;line-height:1.7;">
              This code expires in <strong style="color:#D4AF37;">5 minutes</strong> and can only be used once.
            </p>
            <p style="margin:0 0 24px;color:#9A9A9A;font-size:13px;line-height:1.7;">
              Please check your <strong>inbox</strong> and <strong>spam/junk folder</strong> if you do not see this email.
            </p>
            <p style="margin:0;color:#6A6A6A;font-size:12px;line-height:1.6;">
              If you did not request this code, you can safely ignore this email. Never share this code with anyone.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #1E1E1E;">
            <p style="margin:0;color:#4A4A4A;font-size:11px;">
              Campus Placement AI &nbsp;&middot;&nbsp; Institutional Access Only &nbsp;&middot;&nbsp; Powered by Azure AI Foundry
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `Campus Placement AI — ${purposeLabel}

Your verification code is: ${otp}

This code expires in 5 minutes and can only be used once.
Please check your inbox and spam/junk folder.

If you did not request this code, you can safely ignore this email.
Never share this code with anyone.

— Campus Placement AI Team`;

  return { subject, html, text };
}

export async function sendOtpEmail(
  to: string,
  otp: string,
  purpose: 'login' | 'register' | 'recovery' = 'login'
): Promise<void> {
  console.info(`[OTP] Email send initiated for ${to.replace(/(.{2}).*(@.*)/, '$1***$2')}`);

  const transporter = getTransporter(); // throws EMAIL_NOT_CONFIGURED if SMTP not set

  const purposeLabel =
    purpose === 'register' ? 'Account Verification' :
    purpose === 'recovery' ? 'Recovery Email Verification' : 'Sign In';

  const { subject, html, text } = buildOtpEmail(otp, purposeLabel);

  try {
    const info = await transporter.sendMail({ from: getFrom(), to, subject, html, text });
    // Log only safe metadata — never log OTP or credentials
    console.info(`[OTP] Email provider accepted request — MessageId: ${info.messageId}`);
  } catch (err: any) {
    // Log safe diagnostics only
    console.error(`[OTP] Email provider rejected request: ${err?.code || err?.message?.slice(0, 80) || 'unknown error'}`);

    if (err?.code === 'EAUTH') {
      console.error('[OTP] SMTP authentication failed. Check SMTP_USER and SMTP_PASSWORD in server/.env');
    } else if (err?.code === 'ECONNECTION' || err?.code === 'ENOTFOUND') {
      console.error('[OTP] Cannot connect to SMTP server. Check SMTP_HOST and SMTP_PORT in server/.env');
    } else if (err?.responseCode >= 500) {
      console.error('[OTP] SMTP server rejected the message. Sender may not be verified.');
    }

    // Re-throw so the route returns a real error to the user
    throw new Error('EMAIL_DELIVERY_FAILED');
  }
}

export async function sendRecoveryEmailVerification(to: string, otp: string): Promise<void> {
  return sendOtpEmail(to, otp, 'recovery');
}
