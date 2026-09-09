import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Fallback seed structure if offline / before connection
const DEFAULT_COURSE_DATA = {
  id: 'c1',
  title: 'Faculty Sensitization',
  description: 'Core principles of modern teaching, diversity, gender inclusivity, and academic integrity for higher education faculty.',
  totalModules: 3,
  image: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=2070&auto=format&fit=crop',
  modules: {
    1: {
      id: 'c1-m1',
      moduleNum: 1,
      title: 'Inclusive Pedagogies & Classroom Diversity',
      description: 'Understanding cognitive diversity, overcoming subconscious bias, and building an open academic environment.',
      videoId: 'jNQXAC9IVRw',
      durationSeconds: 600,
      passingThreshold: 80,
      quiz: [
        { question: "What is the primary goal of this course module?", options: ["To skip videos", "To learn faculty sensitization", "To sleep", "Nothing"], correct: 1 },
        { question: "How often should faculty review inclusive learning material?", options: ["Never", "Regularly each semester", "Once a decade", "Only after complaints"], correct: 1 },
        { question: "What is the minimum passing score required on assessments?", options: ["50%", "60%", "80%", "100%"], correct: 2 },
        { question: "Who is the primary audience for faculty sensitization?", options: ["Undergrad students", "Faculty & Academic Staff", "Campus Visitors", "Contractors"], correct: 1 },
        { question: "What is required if a candidate fails the assessment?", options: ["Automatic pass", "Must review lecture content before reattempting", "Immediate suspension", "Written penalty"], correct: 1 }
      ]
    },
    2: {
      id: 'c1-m2',
      moduleNum: 2,
      title: 'Ethics, Mentorship & Student Well-being',
      description: 'Recognizing student mental health stress, mentorship ethics, prevention of harassment, and constructive guidance.',
      videoId: 'M7lc1UVf-VE',
      durationSeconds: 720,
      passingThreshold: 80,
      quiz: [
        { question: "What is the role of faculty when noticing acute student distress?", options: ["Ignore it", "Refer to institute counseling resources with empathy", "Penalize attendance", "Publicly discuss in class"], correct: 1 },
        { question: "Professional boundaries in faculty-student mentoring should be:", options: ["Flexible and informal", "Clearly maintained and respectful", "Non-existent", "Only maintained on campus"], correct: 1 },
        { question: "How can faculty promote open communication during office hours?", options: ["Keep door closed", "Provide an approachable, confidential atmosphere", "Ask students to email only", "Limit questions to 2 minutes"], correct: 1 },
        { question: "Confidentiality of student health disclosures is:", options: ["Optional", "Strictly mandatory under institute policy", "Shared with other students", "Published"], correct: 1 },
        { question: "Constructive feedback on assignments should focus on:", options: ["Personal criticism", "Actionable learning improvement", "Discouragement", "Arbitrary grades"], correct: 1 }
      ]
    },
    3: {
      id: 'c1-m3',
      moduleNum: 3,
      title: 'Academic Integrity & Fair Assessment',
      description: 'Fair assessment methodologies, rubrics design, ethical AI utilization, and institutional honor codes.',
      videoId: 'tPEE9ZwTmy0',
      durationSeconds: 900,
      passingThreshold: 80,
      quiz: [
        { question: "Clear transparent grading rubrics primarily benefit:", options: ["Nobody", "Both instructors and students for fair evaluation", "Only external auditors", "Finance department"], correct: 1 },
        { question: "When generative AI tools are used in coursework, faculty should:", options: ["Ignore policy", "Establish explicit ethical guidelines and attribution rules", "Ban all computers", "Pretend it does not exist"], correct: 1 },
        { question: "Academic integrity violations should be addressed according to:", options: ["Personal whim", "Established institutional committee due process", "Immediate public shame", "Ignored if senior student"], correct: 1 },
        { question: "Formative assessments are primarily intended to:", options: ["Provide ongoing learning feedback before finals", "Fail as many students as possible", "Rank students publicly", "Reduce grading time"], correct: 0 },
        { question: "Upon successfully completing all course modules, faculty receive:", options: ["Nothing", "An official Institute Verified Completion Certificate", "Course exemption", "A fine"], correct: 1 }
      ]
    }
  }
};

class DatabaseManager {
  constructor() {
    this.pool = null;
    this.usePostgres = false;
    this.initPromise = this.init();
  }

  async init() {
    try {
      const connectionString = process.env.DATABASE_URL;
      const isSsl = connectionString ? (connectionString.includes('sslmode=') || connectionString.includes('neon.tech') || connectionString.includes('supabase.com')) : false;

      const poolConfig = connectionString
        ? {
            connectionString,
            ssl: isSsl ? { rejectUnauthorized: false } : false,
            connectionTimeoutMillis: 10000
          }
        : {
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5432'),
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'faculty_course_portal',
            connectionTimeoutMillis: 5000
          };

      this.pool = new Pool(poolConfig);

      const res = await this.pool.query('SELECT NOW()');
      this.usePostgres = true;
      console.log('[DB] Connected to PostgreSQL cloud database successfully at ' + res.rows[0].now);

      await this.initSchema();
    } catch (err) {
      this.usePostgres = false;
      console.error('[DB] PostgreSQL connection failed. Error:', err.message);
    }
  }

  async initSchema() {
    if (!this.usePostgres || !this.pool) return;
    try {
      const initSqlPath = path.join(__dirname, 'init.sql');
      if (fs.existsSync(initSqlPath)) {
        const sql = fs.readFileSync(initSqlPath, 'utf8');
        await this.pool.query(sql);
        console.log('[DB] Tables and initial schema verified/created successfully.');
      }
    } catch (err) {
      console.error('[DB] Schema initialization error:', err.message);
    }
  }

  async ready() {
    await this.initPromise;
  }

  // --- Course APIs ---
  async getCourse(courseId = 'c1') {
    await this.ready();
    if (this.usePostgres) {
      try {
        const courseRes = await this.pool.query('SELECT * FROM courses WHERE id = $1', [courseId]);
        if (courseRes.rows.length === 0) {
          return DEFAULT_COURSE_DATA;
        }
        const course = courseRes.rows[0];

        const modRes = await this.pool.query('SELECT * FROM modules WHERE course_id = $1 ORDER BY module_num ASC', [courseId]);
        const quizRes = await this.pool.query(
          `SELECT q.* FROM quizzes q 
           JOIN modules m ON q.module_id = m.id 
           WHERE m.course_id = $1 
           ORDER BY q.module_id ASC, q.question_idx ASC`,
          [courseId]
        );

        const modulesObj = {};
        for (const m of modRes.rows) {
          const modQuizzes = quizRes.rows
            .filter(q => q.module_id === m.id)
            .map(q => ({
              question: q.question,
              options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
              correct: q.correct
            }));

          modulesObj[m.module_num] = {
            id: m.id,
            moduleNum: m.module_num,
            title: m.title,
            description: m.description,
            videoId: m.youtube_video_id,
            durationSeconds: m.duration_seconds,
            passingThreshold: m.passing_threshold,
            quiz: modQuizzes.length > 0 ? modQuizzes : (DEFAULT_COURSE_DATA.modules[m.module_num]?.quiz || [])
          };
        }

        return {
          id: course.id,
          title: course.title,
          description: course.description,
          totalModules: course.total_modules,
          image: course.image,
          modules: Object.keys(modulesObj).length > 0 ? modulesObj : DEFAULT_COURSE_DATA.modules
        };
      } catch (err) {
        console.error('[DB] getCourse query failed, falling back:', err.message);
      }
    }
    return DEFAULT_COURSE_DATA;
  }

  async updateModuleContent(courseId, modNum, updates) {
    await this.ready();
    const modId = `${courseId}-m${modNum}`;

    if (this.usePostgres) {
      try {
        const videoId = updates.videoId || updates.youtube_video_id;
        const passingThreshold = updates.passingThreshold || updates.passing_threshold;

        await this.pool.query(
          `UPDATE modules 
           SET title = COALESCE($1, title),
               description = COALESCE($2, description),
               youtube_video_id = COALESCE($3, youtube_video_id),
               passing_threshold = COALESCE($4, passing_threshold)
           WHERE id = $5`,
          [updates.title, updates.description, videoId, passingThreshold, modId]
        );

        if (Array.isArray(updates.quiz)) {
          await this.pool.query('DELETE FROM quizzes WHERE module_id = $1', [modId]);
          for (let i = 0; i < updates.quiz.length; i++) {
            const q = updates.quiz[i];
            await this.pool.query(
              'INSERT INTO quizzes (module_id, question_idx, question, options, correct) VALUES ($1, $2, $3, $4, $5)',
              [modId, i, q.question, JSON.stringify(q.options), q.correct]
            );
          }
        }

        const res = await this.pool.query('SELECT * FROM modules WHERE id = $1', [modId]);
        return res.rows[0];
      } catch (err) {
        console.error('[DB] updateModuleContent query failed:', err.message);
      }
    }
    return null;
  }

  // --- Users & Directory APIs ---
  async getAllUsers() {
    await this.ready();
    if (this.usePostgres) {
      try {
        const res = await this.pool.query('SELECT * FROM users ORDER BY created_at DESC');
        return res.rows;
      } catch (err) {
        console.error('[DB] getAllUsers query failed:', err.message);
      }
    }
    return [];
  }

  async getUserById(idOrEmail) {
    await this.ready();
    if (this.usePostgres) {
      try {
        const res = await this.pool.query(
          'SELECT * FROM users WHERE id = $1 OR LOWER(email) = LOWER($1)',
          [idOrEmail.trim()]
        );
        return res.rows[0] || null;
      } catch (err) {
        console.error('[DB] getUserById query failed:', err.message);
      }
    }
    return null;
  }

  async createUserIfNotExists(userData) {
    await this.ready();
    const { id, email, name, department, role } = userData;
    if (this.usePostgres) {
      try {
        const res = await this.pool.query(
          `INSERT INTO users (id, email, name, department, role)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (id) DO UPDATE SET 
             name = EXCLUDED.name, 
             department = EXCLUDED.department
           RETURNING *`,
          [id, email.toLowerCase(), name, department || 'Faculty', role || 'faculty']
        );

        const createdUser = res.rows[0];

        // Initialize progress for module 1 (unlocked), 2, 3
        await this.pool.query(
          `INSERT INTO user_progress (user_id, module_id, unlocked, passed, video_watched, max_time_watched)
           VALUES 
             ($1, 'c1-m1', true, false, false, 0),
             ($1, 'c1-m2', false, false, false, 0),
             ($1, 'c1-m3', false, false, false, 0)
           ON CONFLICT (user_id, module_id) DO NOTHING`,
          [createdUser.id]
        );

        return createdUser;
      } catch (err) {
        console.error('[DB] createUserIfNotExists query failed:', err.message);
      }
    }
    return userData;
  }

  // --- Admin Analytics & Real Faculty Drilldown ---
  async getFacultyRecords() {
    await this.ready();
    if (this.usePostgres) {
      try {
        const query = `
          SELECT 
            u.id, 
            u.name, 
            u.email, 
            u.department,
            3 AS "totalModules",
            COALESCE(SUM(CASE WHEN p.passed = true THEN 1 ELSE 0 END), 0)::int AS "completedModulesCount",
            COALESCE(COUNT(DISTINCT a.id), 0)::int AS "totalAttempts",
            MAX(a.timestamp) AS "latestAttemptDate"
          FROM users u
          LEFT JOIN user_progress p ON u.id = p.user_id
          LEFT JOIN assessment_attempts a ON u.id = a.user_id
          WHERE u.role = 'faculty'
          GROUP BY u.id, u.name, u.email, u.department, u.created_at
          ORDER BY u.created_at DESC;
        `;
        const res = await this.pool.query(query);
        return res.rows.map(r => {
          const completedCount = Number(r.completedModulesCount);
          const totalMods = 3;
          return {
            id: r.id,
            name: r.name,
            email: r.email,
            department: r.department,
            totalModules: totalMods,
            completedModulesCount: completedCount,
            progressPercent: Math.round((completedCount / totalMods) * 100),
            totalAttempts: Number(r.totalAttempts),
            isCompleted: completedCount >= totalMods,
            latestAttemptDate: r.latestAttemptDate
          };
        });
      } catch (err) {
        console.error('[DB] getFacultyRecords query failed:', err.message);
      }
    }
    return [];
  }

  async getUserAttempts(userId) {
    await this.ready();
    if (this.usePostgres) {
      try {
        const res = await this.pool.query(
          `SELECT 
             id, 
             user_id AS "userId", 
             course_id AS "courseId", 
             module_id AS "moduleId", 
             module_num AS "moduleNum", 
             attempt_number AS "attemptNumber", 
             score, 
             total_questions AS "totalQuestions", 
             percentage, 
             passed, 
             timestamp 
           FROM assessment_attempts 
           WHERE user_id = $1 
           ORDER BY timestamp DESC`,
          [userId]
        );
        return res.rows;
      } catch (err) {
        console.error('[DB] getUserAttempts query failed:', err.message);
      }
    }
    return [];
  }

  async recordAttempt({ userId, courseId = 'c1', moduleNum, score, totalQuestions, passed }) {
    await this.ready();
    const moduleId = `${courseId}-m${moduleNum}`;
    const percentage = Math.round((score / totalQuestions) * 100);

    if (this.usePostgres) {
      try {
        // Ensure user exists first
        const userCheck = await this.pool.query('SELECT id FROM users WHERE id = $1', [userId]);
        if (userCheck.rows.length === 0) {
          await this.createUserIfNotExists({
            id: userId,
            email: `${userId}@institute.edu.in`,
            name: `Prof. ${userId}`,
            department: 'Faculty',
            role: 'faculty'
          });
        }

        // Calculate attempt number
        const countRes = await this.pool.query(
          'SELECT COUNT(*)::int AS count FROM assessment_attempts WHERE user_id = $1 AND module_id = $2',
          [userId, moduleId]
        );
        const attemptNumber = (countRes.rows[0]?.count || 0) + 1;

        const insertRes = await this.pool.query(
          `INSERT INTO assessment_attempts 
             (user_id, course_id, module_id, module_num, attempt_number, score, total_questions, percentage, passed)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING id, user_id AS "userId", course_id AS "courseId", module_id AS "moduleId", module_num AS "moduleNum", attempt_number AS "attemptNumber", score, total_questions AS "totalQuestions", percentage, passed, timestamp`,
          [userId, courseId, moduleId, moduleNum, attemptNumber, score, totalQuestions, percentage, Boolean(passed)]
        );

        // Update progress for this module
        await this.pool.query(
          `INSERT INTO user_progress (user_id, module_id, unlocked, passed, video_watched, max_time_watched)
           VALUES ($1, $2, true, $3, true, 600)
           ON CONFLICT (user_id, module_id) DO UPDATE SET 
             passed = user_progress.passed OR EXCLUDED.passed,
             video_watched = true`,
          [userId, moduleId, Boolean(passed)]
        );

        // If passed, unlock next module
        if (passed && moduleNum < 3) {
          const nextModId = `${courseId}-m${moduleNum + 1}`;
          await this.pool.query(
            `INSERT INTO user_progress (user_id, module_id, unlocked, passed, video_watched, max_time_watched)
             VALUES ($1, $2, true, false, false, 0)
             ON CONFLICT (user_id, module_id) DO UPDATE SET unlocked = true`,
            [userId, nextModId]
          );
        }

        return insertRes.rows[0];
      } catch (err) {
        console.error('[DB] recordAttempt query failed:', err.message);
      }
    }

    return {
      id: Date.now(),
      userId,
      courseId,
      moduleId,
      moduleNum,
      attemptNumber: 1,
      score,
      totalQuestions,
      percentage,
      passed,
      timestamp: new Date().toISOString()
    };
  }

  // --- Faculty Progress State ---
  async getUserProgress(userId, courseId = 'c1') {
    await this.ready();
    const defaultProgress = {
      [`${courseId}-m1`]: { unlocked: true, passed: false, videoWatched: false, maxTimeWatched: 0 },
      [`${courseId}-m2`]: { unlocked: false, passed: false, videoWatched: false, maxTimeWatched: 0 },
      [`${courseId}-m3`]: { unlocked: false, passed: false, videoWatched: false, maxTimeWatched: 0 }
    };

    if (this.usePostgres) {
      try {
        const res = await this.pool.query(
          'SELECT module_id, unlocked, passed, video_watched, max_time_watched FROM user_progress WHERE user_id = $1',
          [userId]
        );

        if (res.rows.length === 0) {
          // Initialize for user
          await this.createUserIfNotExists({
            id: userId,
            email: `${userId}@institute.edu.in`,
            name: `Prof. ${userId}`,
            department: 'Faculty',
            role: 'faculty'
          });
          return defaultProgress;
        }

        const progressMap = { ...defaultProgress };
        for (const row of res.rows) {
          progressMap[row.module_id] = {
            unlocked: Boolean(row.unlocked),
            passed: Boolean(row.passed),
            videoWatched: Boolean(row.video_watched),
            maxTimeWatched: Number(row.max_time_watched) || 0
          };
        }
        return progressMap;
      } catch (err) {
        console.error('[DB] getUserProgress query failed:', err.message);
      }
    }

    return defaultProgress;
  }

  async updateUserProgress(userId, modKey, updates) {
    await this.ready();
    if (this.usePostgres) {
      try {
        const existing = await this.pool.query(
          'SELECT * FROM user_progress WHERE user_id = $1 AND module_id = $2',
          [userId, modKey]
        );

        const curUnlocked = existing.rows[0]?.unlocked ?? (modKey.endsWith('-m1'));
        const curPassed = existing.rows[0]?.passed ?? false;
        const curVideoWatched = existing.rows[0]?.video_watched ?? false;
        const curMaxTime = existing.rows[0]?.max_time_watched ?? 0;

        const newUnlocked = updates.unlocked !== undefined ? Boolean(updates.unlocked) : curUnlocked;
        const newPassed = updates.passed !== undefined ? (curPassed || Boolean(updates.passed)) : curPassed;
        const newVideoWatched = updates.videoWatched !== undefined ? Boolean(updates.videoWatched) : curVideoWatched;
        const newMaxTime = updates.maxTimeWatched !== undefined ? Math.max(curMaxTime, Number(updates.maxTimeWatched)) : curMaxTime;

        await this.pool.query(
          `INSERT INTO user_progress (user_id, module_id, unlocked, passed, video_watched, max_time_watched)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (user_id, module_id) DO UPDATE SET 
             unlocked = EXCLUDED.unlocked,
             passed = EXCLUDED.passed,
             video_watched = EXCLUDED.video_watched,
             max_time_watched = EXCLUDED.max_time_watched`,
          [userId, modKey, newUnlocked, newPassed, newVideoWatched, newMaxTime]
        );

        if (newPassed) {
          const parts = modKey.split('-m');
          const nextNum = parseInt(parts[1], 10) + 1;
          if (nextNum <= 3) {
            const nextKey = `${parts[0]}-m${nextNum}`;
            await this.pool.query(
              `INSERT INTO user_progress (user_id, module_id, unlocked, passed, video_watched, max_time_watched)
               VALUES ($1, $2, true, false, false, 0)
               ON CONFLICT (user_id, module_id) DO UPDATE SET unlocked = true`,
              [userId, nextKey]
            );
          }
        }

        return await this.getUserProgress(userId);
      } catch (err) {
        console.error('[DB] updateUserProgress query failed:', err.message);
      }
    }

    return null;
  }

  async resetDefaults() {
    await this.ready();
    if (this.usePostgres) {
      try {
        await this.pool.query('TRUNCATE TABLE assessment_attempts, user_progress CASCADE');
        await this.initSchema();
        return true;
      } catch (err) {
        console.error('[DB] resetDefaults query failed:', err.message);
      }
    }
    return true;
  }
}

export const dbManager = new DatabaseManager();
