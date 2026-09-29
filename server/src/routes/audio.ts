import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { getDatabase } from '../db/database';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { generatePresentationScript } from '../services/azureAgent';

const router = Router();

// ── Supported TTS languages (browser Web Speech API) ─────────────────────────
// These are the languages broadly supported by Chrome/Edge Web Speech API.
// We do NOT claim universal support — only these are offered in the UI.
export const SUPPORTED_AUDIO_LANGUAGES = [
  { code: 'en',    bcp47: 'en-IN',  label: 'English',    flag: '🇺🇸' },
  { code: 'hi',    bcp47: 'hi-IN',  label: 'Hindi',      flag: '🇮🇳' },
  { code: 'te',    bcp47: 'te-IN',  label: 'Telugu',     flag: '🇮🇳' },
  { code: 'ta',    bcp47: 'ta-IN',  label: 'Tamil',      flag: '🇮🇳' },
  { code: 'kn',    bcp47: 'kn-IN',  label: 'Kannada',    flag: '🇮🇳' },
  { code: 'ml',    bcp47: 'ml-IN',  label: 'Malayalam',  flag: '🇮🇳' },
  { code: 'bn',    bcp47: 'bn-IN',  label: 'Bengali',    flag: '🇮🇳' },
  { code: 'mr',    bcp47: 'mr-IN',  label: 'Marathi',    flag: '🇮🇳' },
  { code: 'gu',    bcp47: 'gu-IN',  label: 'Gujarati',   flag: '🇮🇳' },
  { code: 'pa',    bcp47: 'pa-IN',  label: 'Punjabi',    flag: '🇮🇳' },
  { code: 'ar',    bcp47: 'ar-SA',  label: 'Arabic',     flag: '🇸🇦' },
  { code: 'fr',    bcp47: 'fr-FR',  label: 'French',     flag: '🇫🇷' },
  { code: 'es',    bcp47: 'es-ES',  label: 'Spanish',    flag: '🇪🇸' },
  { code: 'de',    bcp47: 'de-DE',  label: 'German',     flag: '🇩🇪' },
  { code: 'zh',    bcp47: 'zh-CN',  label: 'Chinese',    flag: '🇨🇳' },
  { code: 'ja',    bcp47: 'ja-JP',  label: 'Japanese',   flag: '🇯🇵' },
  { code: 'ko',    bcp47: 'ko-KR',  label: 'Korean',     flag: '🇰🇷' },
  { code: 'ru',    bcp47: 'ru-RU',  label: 'Russian',    flag: '🇷🇺' },
];

// ── GET /api/audio/languages ──────────────────────────────────────────────────
// Returns the list of supported TTS languages so the frontend builds its UI
// from real data rather than a hardcoded list.
router.get('/languages', authenticateToken, (_req, res: Response) => {
  res.json({ languages: SUPPORTED_AUDIO_LANGUAGES });
});

// ── POST /api/audio/generate-script ──────────────────────────────────────────
// Calls the Azure AI agent to generate a presentation script for the student.
router.post(
  '/generate-script',
  authenticateToken,
  [
    body('languageCode').trim().notEmpty().withMessage('languageCode is required'),
    body('language').trim().notEmpty().withMessage('language is required'),
  ],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { language, languageCode } = req.body;
    const userId = req.userId!;

    // Validate the requested language is actually supported
    const supported = SUPPORTED_AUDIO_LANGUAGES.find(l => l.code === languageCode);
    if (!supported) {
      res.status(400).json({
        error: `Language '${languageCode}' is not supported. Use GET /api/audio/languages for the supported list.`,
      });
      return;
    }

    try {
      const db = getDatabase();

      // Build student profile for script personalisation
      const user = db.prepare('SELECT full_name FROM users WHERE id = ?').get(userId) as any;
      const profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(userId) as any;
      const skills = db.prepare('SELECT name FROM skills WHERE user_id = ?').all(userId) as any[];
      const projects = db.prepare('SELECT name, description, technologies FROM projects WHERE user_id = ?').all(userId) as any[];
      const certifications = db.prepare('SELECT name, issuer, year FROM certifications WHERE user_id = ?').all(userId) as any[];

      const profileContext = {
        fullName: user?.full_name,
        university: profile?.university,
        degree: profile?.degree,
        branch: profile?.branch,
        graduationYear: profile?.graduation_year,
        cgpa: profile?.cgpa,
        backlogs: profile?.backlogs,
        preferredRole: profile?.preferred_role,
        targetCompany: profile?.target_company,
        skills: skills.map((s: any) => s.name),
        projects: projects.map((p: any) => ({ name: p.name, description: p.description, technologies: p.technologies })),
        certifications: certifications.map((c: any) => ({ name: c.name, issuer: c.issuer, year: c.year })),
      };

      const result = await generatePresentationScript(profileContext, language, languageCode);

      if (!result.content || result.content.trim().length < 10) {
        res.status(502).json({ error: 'Agent returned an empty script. Please try again.' });
        return;
      }

      res.json({
        script: result.content.trim(),
        language,
        languageCode,
        bcp47: supported.bcp47,
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      const err = error as Error;
      console.error('Audio script generation error:', err.message);
      res.status(503).json({
        error: 'Failed to generate script. Azure AI service may be unavailable.',
        details: err.message,
      });
    }
  }
);

export default router;
