import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { getDatabase } from '../db/database';
import { generateToken, authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// POST /api/auth/register
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('fullName').trim().notEmpty().withMessage('Full name is required'),
    body('confirmPassword').custom((value, { req }) => {
      if (value !== req.body.password) throw new Error('Passwords do not match');
      return true;
    }),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { email, password, fullName, university } = req.body;

    try {
      const db = getDatabase();
      const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
      if (existingUser) {
        res.status(409).json({ error: 'Email already registered' });
        return;
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const result = db.prepare(
        'INSERT INTO users (email, password_hash, full_name) VALUES (?, ?, ?)'
      ).run(email, passwordHash, fullName);

      const userId = result.lastInsertRowid as number;

      // Create empty profile
      db.prepare(
        'INSERT INTO profiles (user_id, university) VALUES (?, ?)'
      ).run(userId, university || null);

      const token = generateToken(userId, email);

      res.status(201).json({
        token,
        user: { id: userId, email, fullName },
        isNewUser: true,
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { email, password } = req.body;

    try {
      const db = getDatabase();
      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;

      if (!user) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }

      const passwordMatch = await bcrypt.compare(password, user.password_hash);
      if (!passwordMatch) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }

      const profile = db.prepare('SELECT onboarding_completed FROM profiles WHERE user_id = ?').get(user.id) as any;
      const token = generateToken(user.id, user.email);

      res.json({
        token,
        user: { id: user.id, email: user.email, fullName: user.full_name },
        onboardingCompleted: profile?.onboarding_completed === 1,
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed. Please try again.' });
    }
  }
);

// POST /api/auth/logout
router.post('/logout', (_req: Request, res: Response): void => {
  res.json({ message: 'Logged out successfully' });
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const db = getDatabase();
    const user = db.prepare('SELECT id, email, full_name FROM users WHERE id = ?').get(req.userId) as any;
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const profile = db.prepare('SELECT onboarding_completed FROM profiles WHERE user_id = ?').get(req.userId) as any;
    res.json({
      user: { id: user.id, email: user.email, fullName: user.full_name },
      onboardingCompleted: profile?.onboarding_completed === 1,
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

export default router;
