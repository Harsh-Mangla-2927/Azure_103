import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { getDatabase } from '../db/database';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { sendToAzureAgent, StudentProfileContext } from '../services/azureAgent';

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
    skills: skills.map((s: any) => s.name),
    projects: projects.map((p: any) => ({ name: p.name, description: p.description, technologies: p.technologies })),
    certifications: certifications.map((c: any) => ({ name: c.name, issuer: c.issuer, year: c.year })),
    resumeText: resume?.extracted_text || undefined,
  };
}

// POST /api/chat
router.post(
  '/',
  authenticateToken,
  [body('message').trim().notEmpty().withMessage('Message is required')],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { message } = req.body;
    const userId = req.userId!;

    try {
      const db = getDatabase();

      // Get recent conversation history
      const history = db.prepare(`
        SELECT role, content FROM chat_messages
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 10
      `).all(userId) as any[];
      const conversationHistory = history.reverse();

      // Build profile context
      const profile = buildProfileContext(userId);

      // Send to Azure agent
      const result = await sendToAzureAgent(message, profile, conversationHistory);

      // Save user message
      db.prepare("INSERT INTO chat_messages (user_id, role, content) VALUES (?, 'user', ?)").run(userId, message);
      // Save assistant response
      db.prepare("INSERT INTO chat_messages (user_id, role, content) VALUES (?, 'assistant', ?)").run(userId, result.content);

      res.json({
        response: result.content,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const err = error as Error;
      console.error('Chat error:', err.message);
      res.status(503).json({
        error: 'Unable to reach the placement intelligence service. Please try again.',
        details: err.message,
      });
    }
  }
);

// GET /api/chat/history
router.get('/history', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const db = getDatabase();
    const messages = db.prepare(`
      SELECT id, role, content, created_at
      FROM chat_messages
      WHERE user_id = ?
      ORDER BY created_at ASC
      LIMIT 100
    `).all(req.userId!) as any[];

    res.json({ messages });
  } catch (error) {
    console.error('Chat history error:', error);
    res.status(500).json({ error: 'Failed to load chat history' });
  }
});

// DELETE /api/chat/history
router.delete('/history', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const db = getDatabase();
    db.prepare('DELETE FROM chat_messages WHERE user_id = ?').run(req.userId!);
    res.json({ message: 'Chat history cleared' });
  } catch (error) {
    console.error('Clear chat error:', error);
    res.status(500).json({ error: 'Failed to clear chat history' });
  }
});

export default router;
