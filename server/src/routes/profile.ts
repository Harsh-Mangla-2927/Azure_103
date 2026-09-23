import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { getDatabase } from '../db/database';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// GET /api/profile
router.get('/', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const db = getDatabase();
    const userId = req.userId!;

    const user = db.prepare('SELECT id, email, full_name FROM users WHERE id = ?').get(userId) as any;
    const profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(userId) as any;
    const skills = db.prepare('SELECT * FROM skills WHERE user_id = ? ORDER BY category, name').all(userId) as any[];
    const projects = db.prepare('SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC').all(userId) as any[];
    const certifications = db.prepare('SELECT * FROM certifications WHERE user_id = ? ORDER BY year DESC').all(userId) as any[];

    res.json({
      user: { id: user.id, email: user.email, fullName: user.full_name },
      profile: profile || {},
      skills,
      projects,
      certifications,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

// PUT /api/profile
router.put('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const db = getDatabase();
  const userId = req.userId!;

  const { profile, skills, projects, certifications, fullName } = req.body;

  try {
    const updateProfile = db.transaction(() => {
      // Update user name if provided
      if (fullName) {
        db.prepare("UPDATE users SET full_name = ?, updated_at = datetime('now') WHERE id = ?").run(fullName, userId);
      }

      // Upsert profile (INSERT OR REPLACE handles missing row case)
      if (profile) {
        // First ensure profile row exists
        db.prepare(`
          INSERT OR IGNORE INTO profiles (user_id) VALUES (?)
        `).run(userId);

        db.prepare(`
          UPDATE profiles SET
            university = ?,
            degree = ?,
            branch = ?,
            graduation_year = ?,
            cgpa = ?,
            backlogs = ?,
            preferred_role = ?,
            target_company = ?,
            onboarding_completed = 1,
            updated_at = datetime('now')
          WHERE user_id = ?
        `).run(
          profile.university || null,
          profile.degree || null,
          profile.branch || null,
          profile.graduationYear || null,
          profile.cgpa !== undefined ? profile.cgpa : null,
          profile.backlogs !== undefined ? profile.backlogs : 0,
          profile.preferredRole || null,
          profile.targetCompany || null,
          userId
        );
      }

      // Replace skills
      if (skills !== undefined) {
        db.prepare('DELETE FROM skills WHERE user_id = ?').run(userId);
        for (const skill of skills) {
          if (skill.name?.trim()) {
            db.prepare('INSERT INTO skills (user_id, name, category) VALUES (?, ?, ?)').run(
              userId, skill.name.trim(), skill.category || 'other'
            );
          }
        }
      }

      // Replace projects
      if (projects !== undefined) {
        db.prepare('DELETE FROM projects WHERE user_id = ?').run(userId);
        for (const proj of projects) {
          if (proj.name?.trim()) {
            db.prepare('INSERT INTO projects (user_id, name, description, technologies) VALUES (?, ?, ?, ?)').run(
              userId, proj.name.trim(), proj.description || null, proj.technologies || null
            );
          }
        }
      }

      // Replace certifications
      if (certifications !== undefined) {
        db.prepare('DELETE FROM certifications WHERE user_id = ?').run(userId);
        for (const cert of certifications) {
          if (cert.name?.trim()) {
            db.prepare('INSERT INTO certifications (user_id, name, issuer, year) VALUES (?, ?, ?, ?)').run(
              userId, cert.name.trim(), cert.issuer || null, cert.year || null
            );
          }
        }
      }
    });

    updateProfile();
    res.json({ message: 'Profile updated successfully' });
  } catch (error: any) {
    console.error('Update profile error:', error?.message || error);
    res.status(500).json({ error: `Failed to update profile: ${error?.message || 'Unknown error'}` });
  }
});


// POST /api/profile/complete-onboarding
router.post('/complete-onboarding', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const db = getDatabase();
    db.prepare('UPDATE profiles SET onboarding_completed = 1 WHERE user_id = ?').run(req.userId!);
    res.json({ message: 'Onboarding completed' });
  } catch (error) {
    console.error('Complete onboarding error:', error);
    res.status(500).json({ error: 'Failed to complete onboarding' });
  }
});

export default router;
