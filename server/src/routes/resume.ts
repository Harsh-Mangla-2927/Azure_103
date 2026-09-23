import { Router, Response, Request } from 'express';
import path from 'path';
import fs from 'fs';
import { getDatabase } from '../db/database';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { uploadMiddleware } from '../middleware/upload';
import { extractTextFromResume } from '../services/resumeExtractor';

const router = Router();

// POST /api/resume/upload
router.post(
  '/upload',
  authenticateToken,
  (req: AuthenticatedRequest, res: Response): void => {
    uploadMiddleware.single('resume')(req as Request, res, async (err: any) => {
      if (err) {
        res.status(400).json({ error: err.message || 'File upload failed' });
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      const file = req.file;
      const userId = req.userId!;

      try {
        // Extract text from the resume
        let extractedText: string | null = null;
        let extractionError: string | null = null;

        try {
          const extracted = await extractTextFromResume(file.path, file.mimetype);
          extractedText = extracted.text;
        } catch (extractErr) {
          extractionError = (extractErr as Error).message;
          console.error('Text extraction failed:', extractionError);
        }

        const db = getDatabase();

        // Delete old resumes (keep only latest)
        const oldResumes = db.prepare('SELECT filename FROM resumes WHERE user_id = ?').all(userId) as any[];
        const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
        for (const old of oldResumes) {
          const oldPath = path.join(UPLOAD_DIR, old.filename);
          if (fs.existsSync(oldPath)) {
            try { fs.unlinkSync(oldPath); } catch {}
          }
        }
        db.prepare('DELETE FROM resumes WHERE user_id = ?').run(userId);

        // Insert new resume
        const result = db.prepare(`
          INSERT INTO resumes (user_id, filename, original_name, file_type, file_size, extracted_text)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(userId, file.filename, file.originalname, file.mimetype, file.size, extractedText);

        const resume = db.prepare('SELECT * FROM resumes WHERE id = ?').get(result.lastInsertRowid) as any;

        res.status(201).json({
          resume: {
            id: resume.id,
            originalName: resume.original_name,
            fileType: resume.file_type,
            fileSize: resume.file_size,
            uploadDate: resume.upload_date,
            extractedText: resume.extracted_text,
            extractionError,
          },
        });
      } catch (error) {
        console.error('Resume upload error:', error);
        // Clean up file on error
        if (fs.existsSync(file.path)) {
          try { fs.unlinkSync(file.path); } catch {}
        }
        res.status(500).json({ error: 'Failed to process resume' });
      }
    });
  }
);

// GET /api/resume
router.get('/', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const db = getDatabase();
    const resumes = db.prepare('SELECT * FROM resumes WHERE user_id = ? ORDER BY upload_date DESC').all(req.userId!) as any[];

    res.json({
      resumes: resumes.map(r => ({
        id: r.id,
        originalName: r.original_name,
        fileType: r.file_type,
        fileSize: r.file_size,
        uploadDate: r.upload_date,
        extractedText: r.extracted_text,
      })),
    });
  } catch (error) {
    console.error('Get resume error:', error);
    res.status(500).json({ error: 'Failed to load resumes' });
  }
});

// DELETE /api/resume/:id
router.delete('/:id', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const db = getDatabase();
    const resumeId = parseInt(req.params.id, 10);

    const resume = db.prepare('SELECT * FROM resumes WHERE id = ? AND user_id = ?').get(resumeId, req.userId!) as any;
    if (!resume) {
      res.status(404).json({ error: 'Resume not found' });
      return;
    }

    const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
    const filePath = path.join(UPLOAD_DIR, resume.filename);
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch {}
    }

    db.prepare('DELETE FROM resumes WHERE id = ? AND user_id = ?').run(resumeId, req.userId!);

    res.json({ message: 'Resume deleted successfully' });
  } catch (error) {
    console.error('Delete resume error:', error);
    res.status(500).json({ error: 'Failed to delete resume' });
  }
});

export default router;
