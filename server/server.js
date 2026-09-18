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

import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// --- Authentication ---
// Admin Login
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

// Faculty OTP Request
app.post('/api/auth/request-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    let fullEmail = email.trim().toLowerCase();
    let username = fullEmail;
    
    // Auto-append domain if missing
    const domain = process.env.ZIMBRA_DOMAIN || 'iitkgp.ac.in';
    if (fullEmail.includes('@')) {
      username = fullEmail.split('@')[0];
    } else {
      fullEmail = `${fullEmail}@${domain}`;
    }

    // Validate domain
    if (!fullEmail.endsWith(domain)) {
      return res.status(400).json({ error: `Email must end in ${domain}` });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    const saved = await dbManager.saveOtp(fullEmail, otp, expiresAt);
    if (!saved) return res.status(500).json({ error: 'Failed to generate OTP' });

    console.log(`[OTP] Generated for ${fullEmail}: ${otp}`);

    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      await transporter.sendMail({
        from: `"Faculty Portal" <${process.env.SMTP_USER}>`,
        to: fullEmail,
        subject: 'Your Login Verification Code - Faculty Portal',
        html: `<p>Your verification code for the Faculty Sensitisation Portal is:</p>
               <h2 style="font-size:36px;letter-spacing:8px;">${otp}</h2>
               <p>This code will expire in 5 minutes. Do not share it with anyone.</p>`
      });
      console.log(`[OTP] Email sent via SMTP to ${fullEmail}`);
    } else {
      console.warn('[OTP] SMTP credentials missing. OTP logged to console only:', otp);
    }

    res.json({ message: 'OTP sent successfully', email: fullEmail });
  } catch (err) {
    // Log detailed SendGrid error if available
    if (err.response && err.response.body && err.response.body.errors) {
      console.error('OTP SendGrid error details:', JSON.stringify(err.response.body.errors));
    } else {
      console.error('OTP request error:', err);
    }
    res.status(500).json({ error: 'Failed to request OTP' });
  }
});

// Faculty OTP Verify
app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required' });

    const isValid = await dbManager.verifyOtp(email, otp);
    if (!isValid) return res.status(401).json({ error: 'Invalid or expired OTP' });

    const username = email.split('@')[0];
    
    // Find or create user
    let user = await dbManager.getUserById(email);
    if (!user) {
      user = await dbManager.createUserIfNotExists({
        id: username,
        email: email,
        name: `Prof. ${username}`, // Might want a better formatter
        department: 'Higher Education Faculty',
        role: 'faculty'
      });
    }

    res.json({
      user: { ...user, authMethod: 'Email-OTP' },
      token: 'jwt-session-token-' + Date.now()
    });
  } catch (err) {
    console.error('OTP verify error:', err);
    res.status(500).json({ error: 'Failed to verify OTP' });
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

app.post('/api/courses/:courseId/modules', async (req, res) => {
  try {
    const { courseId } = req.params;
    const newMod = await dbManager.addModule(courseId);
    if (!newMod) {
      return res.status(500).json({ error: 'Failed to create new module' });
    }
    res.json({ message: 'Module created successfully', module: newMod });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create module' });
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
  app.use((req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(distPath, 'index.html'));
    } else {
      res.status(404).json({ error: 'Endpoint not found' });
    }
  });
}

app.listen(PORT, () => {
  console.log(`[API Server] Faculty Portal backend running on http://localhost:${PORT}`);
  console.log(`[Zimbra] Zimbra Mail Auth configured for host: ${process.env.ZIMBRA_HOST || 'mail.institute.edu.in'}`);
});
