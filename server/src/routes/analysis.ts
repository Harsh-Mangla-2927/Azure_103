import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { getDatabase } from '../db/database';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import {
  runEligibilityAnalysis,
  runSkillGapAnalysis,
  runPreparationPlan,
  StudentProfileContext,
} from '../services/azureAgent';

const router = Router();

function buildProfileContext(userId: number): StudentProfileContext {
  const db = getDatabase();
  const user = db.prepare('SELECT full_name FROM users WHERE id = ?').get(userId) as any;
  const profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(userId) as any;
  const skills = db.prepare('SELECT name FROM skills WHERE user_id = ?').all(userId) as any[];
  const projects = db.prepare('SELECT name, description, technologies FROM projects WHERE user_id = ?').all(userId) as any[];
  const certifications = db.prepare('SELECT name, issuer, year FROM certifications WHERE user_id = ?').all(userId) as any[];
  const resume = db.prepare('SELECT extracted_text FROM resumes WHERE user_id = ? ORDER BY upload_date DESC LIMIT 1').get(userId) as any;

  return {
    fullName: user?.full_name,
    university: profile?.university,
    degree: profile?.degree,
    branch: profile?.branch,
    graduationYear: profile?.graduation_year,
    cgpa: profile?.cgpa,
    backlogs: profile?.backlogs,
    preferredRole: profile?.preferred_role,
    targetCompany: profile?.target_company,
    skills: skills.map(s => s.name),
    projects: projects.map(p => ({ name: p.name, description: p.description, technologies: p.technologies })),
    certifications: certifications.map(c => ({ name: c.name, issuer: c.issuer, year: c.year })),
    resumeText: resume?.extracted_text || undefined,
  };
}

// POST /api/analysis/eligibility
router.post(
  '/eligibility',
  authenticateToken,
  [
    body('targetCompany').trim().notEmpty().withMessage('Target company is required'),
    body('targetRole').trim().notEmpty().withMessage('Target role is required'),
  ],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { targetCompany, targetRole } = req.body;
    const userId = req.userId!;

    try {
      const profile = buildProfileContext(userId);
      const result = await runEligibilityAnalysis(profile, targetCompany, targetRole);

      const db = getDatabase();
      db.prepare(`
        INSERT INTO analyses (user_id, type, target_company, target_role, result)
        VALUES (?, 'eligibility', ?, ?, ?)
      `).run(userId, targetCompany, targetRole, result.content);

      res.json({
        analysis: result.content,
        targetCompany,
        targetRole,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const err = error as Error;
      console.error('Eligibility analysis error:', err.message);
      res.status(503).json({
        error: 'Unable to reach the placement intelligence service. Please try again.',
        details: err.message,
      });
    }
  }
);

// POST /api/analysis/skill-gap
router.post(
  '/skill-gap',
  authenticateToken,
  [
    body('targetCompany').trim().notEmpty().withMessage('Target company is required'),
    body('targetRole').trim().notEmpty().withMessage('Target role is required'),
  ],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { targetCompany, targetRole } = req.body;
    const userId = req.userId!;

    try {
      const profile = buildProfileContext(userId);
      const result = await runSkillGapAnalysis(profile, targetCompany, targetRole);

      const db = getDatabase();
      db.prepare(`
        INSERT INTO analyses (user_id, type, target_company, target_role, result)
        VALUES (?, 'skill-gap', ?, ?, ?)
      `).run(userId, targetCompany, targetRole, result.content);

      res.json({
        analysis: result.content,
        targetCompany,
        targetRole,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const err = error as Error;
      console.error('Skill gap analysis error:', err.message);
      res.status(503).json({
        error: 'Unable to reach the placement intelligence service. Please try again.',
        details: err.message,
      });
    }
  }
);

// POST /api/analysis/preparation
router.post(
  '/preparation',
  authenticateToken,
  [
    body('targetCompany').trim().notEmpty().withMessage('Target company is required'),
    body('targetRole').trim().notEmpty().withMessage('Target role is required'),
  ],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { targetCompany, targetRole } = req.body;
    const userId = req.userId!;

    try {
      const profile = buildProfileContext(userId);
      const result = await runPreparationPlan(profile, targetCompany, targetRole);

      const db = getDatabase();
      db.prepare(`
        INSERT INTO analyses (user_id, type, target_company, target_role, result)
        VALUES (?, 'preparation', ?, ?, ?)
      `).run(userId, targetCompany, targetRole, result.content);

      db.prepare(`
        INSERT INTO preparation_plans (user_id, target_company, target_role, plan_data)
        VALUES (?, ?, ?, ?)
      `).run(userId, targetCompany, targetRole, result.content);

      res.json({
        plan: result.content,
        targetCompany,
        targetRole,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const err = error as Error;
      console.error('Preparation plan error:', err.message);
      res.status(503).json({
        error: 'Unable to reach the placement intelligence service. Please try again.',
        details: err.message,
      });
    }
  }
);

// GET /api/analysis/history
router.get('/history', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const db = getDatabase();
    const history = db.prepare(`
      SELECT id, type, target_company, target_role, result, created_at
      FROM analyses
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 20
    `).all(req.userId!) as any[];

    res.json({ history });
  } catch (error) {
    console.error('Analysis history error:', error);
    res.status(500).json({ error: 'Failed to load analysis history' });
  }
});

export default router;
