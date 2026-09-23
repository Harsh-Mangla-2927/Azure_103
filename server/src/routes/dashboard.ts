import { Router, Response } from 'express';
import { getDatabase } from '../db/database';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// GET /api/dashboard
router.get('/', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const db = getDatabase();
    const userId = req.userId!;

    const user = db.prepare('SELECT full_name, email FROM users WHERE id = ?').get(userId) as any;
    const profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(userId) as any;
    const skills = db.prepare('SELECT COUNT(*) as count FROM skills WHERE user_id = ?').get(userId) as any;
    const projects = db.prepare('SELECT COUNT(*) as count FROM projects WHERE user_id = ?').get(userId) as any;
    const certifications = db.prepare('SELECT COUNT(*) as count FROM certifications WHERE user_id = ?').get(userId) as any;
    const resume = db.prepare('SELECT id, original_name, upload_date FROM resumes WHERE user_id = ? ORDER BY upload_date DESC LIMIT 1').get(userId) as any;
    const recentAnalyses = db.prepare(`
      SELECT type, target_company, target_role, created_at
      FROM analyses
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 5
    `).all(userId) as any[];

    // Calculate profile completion
    let completionScore = 0;
    const checks = [
      user?.full_name,
      profile?.university,
      profile?.degree,
      profile?.branch,
      profile?.graduation_year,
      profile?.cgpa !== null && profile?.cgpa !== undefined,
      profile?.backlogs !== null,
      profile?.preferred_role,
      profile?.target_company,
      skills.count > 0,
      projects.count > 0,
      certifications.count > 0,
      resume !== null,
    ];
    completionScore = Math.round((checks.filter(Boolean).length / checks.length) * 100);

    // Placement readiness: simple heuristic
    let readiness = 'Not assessed';
    if (resume && skills.count >= 3 && profile?.cgpa) {
      readiness = profile.cgpa >= 7.5 && profile.backlogs === 0 ? 'Good' : 
                  profile.cgpa >= 6.0 ? 'Fair' : 'Needs improvement';
    }

    res.json({
      user: { fullName: user?.full_name, email: user?.email },
      profile,
      metrics: {
        profileCompletion: completionScore,
        skillsCount: skills.count,
        projectsCount: projects.count,
        certificationsCount: certifications.count,
        hasResume: resume !== null,
        placementReadiness: readiness,
      },
      resume: resume ? {
        originalName: resume.original_name,
        uploadDate: resume.upload_date,
      } : null,
      recentActivity: recentAnalyses.map((a: any) => ({
        type: a.type,
        targetCompany: a.target_company,
        targetRole: a.target_role,
        timestamp: a.created_at,
      })),
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to load dashboard data' });
  }
});

export default router;
