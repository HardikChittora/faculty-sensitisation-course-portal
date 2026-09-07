import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { dbManager } from './db/db.js';
import { authenticateZimbra } from './auth/zimbraAuth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// --- Authentication (Zimbra Mail) ---
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const authResult = await authenticateZimbra(email, password);
    if (!authResult.success) {
      return res.status(401).json({ error: authResult.message });
    }

    return res.json({
      user: authResult.user,
      token: 'jwt-session-token-' + Date.now()
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal authentication error' });
  }
});

// --- Course & Content Management ---
app.get('/api/courses', async (req, res) => {
  try {
    const course = await dbManager.getCourse();
    res.json(course);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch course data' });
  }
});

app.put('/api/courses/:courseId/modules/:moduleNum', async (req, res) => {
  try {
    const { courseId, moduleNum } = req.params;
    const updates = req.body;
    const updatedMod = await dbManager.updateModuleContent(courseId, parseInt(moduleNum, 10), updates);
    if (!updatedMod) {
      return res.status(404).json({ error: 'Module not found' });
    }
    res.json({ message: 'Module updated successfully', module: updatedMod });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update module' });
  }
});

// --- Admin Analytics & Attempts Drilldown ---
app.get('/api/admin/faculty-records', async (req, res) => {
  try {
    const records = await dbManager.getFacultyRecords();
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch faculty records' });
  }
});

app.get('/api/admin/faculty/:userId/attempts', async (req, res) => {
  try {
    const { userId } = req.params;
    const attempts = await dbManager.getUserAttempts(userId);
    res.json(attempts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user attempts' });
  }
});

app.get('/api/admin/analytics', async (req, res) => {
  try {
    const records = await dbManager.getFacultyRecords();
    const totalEnrolled = records.length;
    const completedCount = records.filter(r => r.isCompleted).length;
    const inProgressCount = records.filter(r => !r.isCompleted && r.completedModulesCount > 0).length;
    const notStartedCount = records.filter(r => r.completedModulesCount === 0).length;
    const completionRate = totalEnrolled > 0 ? Math.round((completedCount / totalEnrolled) * 100) : 0;
    
    const totalAttempts = records.reduce((sum, r) => sum + r.totalAttempts, 0);
    const avgAttempts = totalEnrolled > 0 ? (totalAttempts / totalEnrolled).toFixed(1) : 0;

    res.json({
      totalEnrolled,
      completedCount,
      inProgressCount,
      notStartedCount,
      completionRate,
      totalAttempts,
      avgAttempts
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to calculate analytics' });
  }
});

// --- Faculty Progress & Attempt Submission ---
app.get('/api/progress/:userId/:courseId', async (req, res) => {
  try {
    const { userId, courseId } = req.params;
    const progress = await dbManager.getUserProgress(userId, courseId);
    res.json(progress);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user progress' });
  }
});

app.put('/api/progress/:userId/:modKey', async (req, res) => {
  try {
    const { userId, modKey } = req.params;
    const updates = req.body;
    const progress = await dbManager.updateUserProgress(userId, modKey, updates);
    res.json(progress);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

app.post('/api/progress/attempt', async (req, res) => {
  try {
    const { userId, courseId, moduleNum, score, totalQuestions, passed } = req.body;
    const attempt = await dbManager.recordAttempt({
      userId,
      courseId,
      moduleNum,
      score,
      totalQuestions,
      passed
    });
    res.json({ success: true, attempt });
  } catch (err) {
    res.status(500).json({ error: 'Failed to record attempt' });
  }
});

app.post('/api/admin/reset-defaults', async (req, res) => {
  try {
    await dbManager.resetDefaults();
    res.json({ message: 'Reset to default data complete' });
  } catch (err) {
    res.status(500).json({ error: 'Reset failed' });
  }
});

// Serve frontend in production
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, '../dist');

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });
}

app.listen(PORT, () => {
  console.log(`[API Server] Faculty Portal backend running on http://localhost:${PORT}`);
  console.log(`[Zimbra] Zimbra Mail Auth configured for host: ${process.env.ZIMBRA_HOST || 'mail.institute.edu.in'}`);
});
