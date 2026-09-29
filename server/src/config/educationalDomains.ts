/**
 * Educational Domain Allowlist
 * ─────────────────────────────────────────────────────────────────────────────
 * SECURITY RULE: Backend is the ONLY authority.
 * Frontend validation is UX only — never a security boundary.
 *
 * To add more institutions: append to APPROVED_DOMAINS below,
 * OR set env var EXTRA_EDU_DOMAINS=domain1.ac.in,domain2.edu.in
 */

// ── Core blocklist: personal / commercial email providers ────────────────────
const PERSONAL_PROVIDERS = new Set([
  'gmail.com', 'googlemail.com',
  'yahoo.com', 'yahoo.in', 'yahoo.co.in', 'yahoo.co.uk', 'ymail.com', 'rocketmail.com',
  'outlook.com', 'hotmail.com', 'hotmail.in', 'live.com', 'live.in', 'msn.com',
  'icloud.com', 'me.com', 'mac.com',
  'aol.com', 'protonmail.com', 'proton.me',
  'zoho.com', 'rediffmail.com', 'inbox.com',
  'mail.com', 'yandex.com', 'yandex.ru',
  'tutanota.com', 'fastmail.com',
  'qq.com', '163.com', '126.com',
]);

// ── Suffix patterns that indicate educational / institutional domains ─────────
// These are NECESSARY but NOT sufficient — domain must pass full suffix check
const EDU_SUFFIXES = [
  '.edu',
  '.edu.in',
  '.ac.in',
  '.ac.uk',
  '.ac.nz',
  '.ac.za',
  '.edu.au',
  '.edu.sg',
  '.edu.my',
  '.edu.ph',
  '.edu.pk',
  '.edu.np',
  '.edu.bd',
  '.edu.lk',
  '.nic.in',      // govt institutions
];

// ── Explicitly approved domains ───────────────────────────────────────────────
// Add any institution whose domain doesn't end with a known EDU_SUFFIX
const APPROVED_DOMAINS: Set<string> = new Set([
  // Chitkara University
  'chitkara.edu.in',
  'chitkara.ac.in',
  // Common pattern colleges
  'iit.ac.in',
  'iitb.ac.in', 'iitd.ac.in', 'iitm.ac.in', 'iitkgp.ac.in',
  'iitk.ac.in', 'iith.ac.in', 'iitbbs.ac.in',
  'nit.ac.in', 'nitk.ac.in', 'nitp.ac.in',
  'bits-pilani.ac.in', 'pilani.bits-pilani.ac.in',
  'goa.bits-pilani.ac.in', 'hyderabad.bits-pilani.ac.in',
  'vit.ac.in', 'vitbhopal.ac.in', 'vitap.ac.in',
  'manipal.edu', 'manipal.edu.in',
  'christuniversity.in',
  'srm.edu.in', 'srmist.edu.in',
  'amity.edu', 'amity.edu.in',
  'lpu.in',
  'thapar.edu',
  'upes.ac.in',
  'dtu.ac.in', 'nsut.ac.in', 'igdtuw.ac.in',
  'iiit.ac.in', 'iiitd.ac.in', 'iiith.ac.in',
  'pes.edu',
  'reva.edu.in',
  'msrit.edu', 'msruas.ac.in',
  'bmsce.ac.in',
  'pesit.edu',
  'sastra.ac.in', 'sastra.edu',
  'annauniv.edu',
  'psgtech.ac.in',
  'gitam.edu',
  'vignan.ac.in',
  'aucegypt.edu',
  // Add more as needed
]);

// Load any extra domains from env
const extraFromEnv = (process.env.EXTRA_EDU_DOMAINS || '')
  .split(',')
  .map(d => d.trim().toLowerCase())
  .filter(Boolean);
extraFromEnv.forEach(d => APPROVED_DOMAINS.add(d));

// ── Validation logic ──────────────────────────────────────────────────────────

/** Normalize an email: trim, lowercase, validate format, return null if invalid */
export function normalizeEmail(raw: string): string | null {
  const email = (raw || '').trim().toLowerCase();
  // Basic RFC-5322 simplified validation
  const emailRegex = /^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/;
  if (!emailRegex.test(email)) return null;
  return email;
}

/** Extract the exact domain from a normalized email. Prevents bypass via subdomains. */
function extractDomain(email: string): string {
  return email.split('@')[1] ?? '';
}

/**
 * Returns true if the domain is an approved educational domain.
 *
 * Anti-bypass: checks the EXACT domain, not "contains".
 *   student@chitkara.edu.in.fake.com  → domain = chitkara.edu.in.fake.com → NOT approved ✓
 *   student@chitkara.edu.in           → domain = chitkara.edu.in           → approved ✓
 */
export function isEducationalDomain(email: string): boolean {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;

  const domain = extractDomain(normalized);
  if (!domain) return false;

  // Block explicitly personal providers
  if (PERSONAL_PROVIDERS.has(domain)) return false;

  // Exact match in approved list
  if (APPROVED_DOMAINS.has(domain)) return true;

  // Suffix match (domain must END with an edu suffix)
  for (const suffix of EDU_SUFFIXES) {
    if (domain === suffix.slice(1)) return true;          // e.g. domain IS "edu.in"
    if (domain.endsWith(suffix)) return true;             // e.g. "university.ac.in"
  }

  return false;
}

export { PERSONAL_PROVIDERS, APPROVED_DOMAINS, EDU_SUFFIXES };
