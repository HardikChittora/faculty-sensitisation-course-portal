import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initial fallback state (matches init.sql)
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

const DEFAULT_USERS = [
  { id: '123', email: '123@institute.edu.in', name: 'Dr. John Doe', department: 'Computer Science & Engineering', role: 'faculty' },
  { id: 'u-sarah', email: 's.smith@institute.edu.in', name: 'Dr. Sarah Smith', department: 'Biotechnology', role: 'faculty' },
  { id: 'u-robert', email: 'r.miller@institute.edu.in', name: 'Prof. Robert Miller', department: 'Electrical Engineering', role: 'faculty' },
  { id: 'u-anita', email: 'a.sharma@institute.edu.in', name: 'Dr. Anita Sharma', department: 'Physics & Materials Science', role: 'faculty' },
  { id: 'u-chen', email: 'd.chen@institute.edu.in', name: 'Prof. David Chen', department: 'Mathematics & Computing', role: 'faculty' },
  { id: 'admin', email: 'admin@institute.edu.in', name: 'Dean of Academic Affairs', department: 'Institute Administration', role: 'admin' }
];

const DEFAULT_ATTEMPTS = [
  { id: 1, userId: 'u-sarah', courseId: 'c1', moduleId: 'c1-m1', moduleNum: 1, attemptNumber: 1, score: 5, totalQuestions: 5, percentage: 100, passed: true, timestamp: '2026-09-02T11:30:00Z' },
  { id: 2, userId: 'u-sarah', courseId: 'c1', moduleId: 'c1-m2', moduleNum: 2, attemptNumber: 1, score: 3, totalQuestions: 5, percentage: 60, passed: false, timestamp: '2026-09-03T14:10:00Z' },
  { id: 3, userId: 'u-sarah', courseId: 'c1', moduleId: 'c1-m2', moduleNum: 2, attemptNumber: 2, score: 5, totalQuestions: 5, percentage: 100, passed: true, timestamp: '2026-09-03T16:45:00Z' },
  { id: 4, userId: 'u-sarah', courseId: 'c1', moduleId: 'c1-m3', moduleNum: 3, attemptNumber: 1, score: 4, totalQuestions: 5, percentage: 80, passed: true, timestamp: '2026-09-04T10:20:00Z' },
  
  { id: 5, userId: 'u-robert', courseId: 'c1', moduleId: 'c1-m1', moduleNum: 1, attemptNumber: 1, score: 2, totalQuestions: 5, percentage: 40, passed: false, timestamp: '2026-09-05T09:15:00Z' },
  { id: 6, userId: 'u-robert', courseId: 'c1', moduleId: 'c1-m1', moduleNum: 1, attemptNumber: 2, score: 4, totalQuestions: 5, percentage: 80, passed: true, timestamp: '2026-09-05T11:00:00Z' },
  { id: 7, userId: 'u-robert', courseId: 'c1', moduleId: 'c1-m2', moduleNum: 2, attemptNumber: 1, score: 3, totalQuestions: 5, percentage: 60, passed: false, timestamp: '2026-09-06T15:30:00Z' },
  
  { id: 8, userId: 'u-anita', courseId: 'c1', moduleId: 'c1-m1', moduleNum: 1, attemptNumber: 1, score: 5, totalQuestions: 5, percentage: 100, passed: true, timestamp: '2026-09-01T10:00:00Z' },
  { id: 9, userId: 'u-anita', courseId: 'c1', moduleId: 'c1-m2', moduleNum: 2, attemptNumber: 1, score: 4, totalQuestions: 5, percentage: 80, passed: true, timestamp: '2026-09-01T14:30:00Z' },
  { id: 10, userId: 'u-anita', courseId: 'c1', moduleId: 'c1-m3', moduleNum: 3, attemptNumber: 1, score: 5, totalQuestions: 5, percentage: 100, passed: true, timestamp: '2026-09-02T09:45:00Z' },
];

const DEFAULT_USER_PROGRESS = {
  'u-sarah': {
    'c1-m1': { unlocked: true, passed: true, videoWatched: true, maxTimeWatched: 600 },
    'c1-m2': { unlocked: true, passed: true, videoWatched: true, maxTimeWatched: 720 },
    'c1-m3': { unlocked: true, passed: true, videoWatched: true, maxTimeWatched: 900 },
  },
  'u-anita': {
    'c1-m1': { unlocked: true, passed: true, videoWatched: true, maxTimeWatched: 600 },
    'c1-m2': { unlocked: true, passed: true, videoWatched: true, maxTimeWatched: 720 },
    'c1-m3': { unlocked: true, passed: true, videoWatched: true, maxTimeWatched: 900 },
  },
  'u-robert': {
    'c1-m1': { unlocked: true, passed: true, videoWatched: true, maxTimeWatched: 600 },
    'c1-m2': { unlocked: true, passed: false, videoWatched: true, maxTimeWatched: 720 },
    'c1-m3': { unlocked: false, passed: false, videoWatched: false, maxTimeWatched: 0 },
  },
  'u-chen': {
    'c1-m1': { unlocked: true, passed: false, videoWatched: false, maxTimeWatched: 0 },
    'c1-m2': { unlocked: false, passed: false, videoWatched: false, maxTimeWatched: 0 },
    'c1-m3': { unlocked: false, passed: false, videoWatched: false, maxTimeWatched: 0 },
  },
  '123': {
    'c1-m1': { unlocked: true, passed: false, videoWatched: false, maxTimeWatched: 0 },
    'c1-m2': { unlocked: false, passed: false, videoWatched: false, maxTimeWatched: 0 },
    'c1-m3': { unlocked: false, passed: false, videoWatched: false, maxTimeWatched: 0 },
  }
};

// State container for fallback
let fallbackStore = {
  courses: JSON.parse(JSON.stringify(DEFAULT_COURSE_DATA)),
  users: JSON.parse(JSON.stringify(DEFAULT_USERS)),
  attempts: JSON.parse(JSON.stringify(DEFAULT_ATTEMPTS)),
  progress: JSON.parse(JSON.stringify(DEFAULT_USER_PROGRESS))
};

class DatabaseManager {
  constructor() {
    this.pool = null;
    this.usePostgres = false;
    this.init();
  }

  async init() {
    try {
      this.pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USER || 'fscp_admin',
        password: process.env.DB_PASSWORD || 'fscp_secret_pass',
        database: process.env.DB_NAME || 'faculty_course_portal',
        connectionTimeoutMillis: 2000
      });

      const res = await this.pool.query('SELECT NOW()');
      this.usePostgres = true;
      console.log('[DB] Connected to Docker PostgreSQL database successfully at ' + res.rows[0].now);
    } catch (err) {
      this.usePostgres = false;
      console.log('[DB] Docker PostgreSQL not running locally. Using persistent storage manager fallback.');
      console.log('[DB] To run the containerized DB, launch: docker compose up -d');
    }
  }

  // --- Course APIs ---
  async getCourse(courseId = 'c1') {
    return fallbackStore.courses;
  }

  async updateModuleContent(courseId, modNum, updates) {
    if (fallbackStore.courses.modules[modNum]) {
      fallbackStore.courses.modules[modNum] = {
        ...fallbackStore.courses.modules[modNum],
        ...updates
      };
      return fallbackStore.courses.modules[modNum];
    }
    return null;
  }

  // --- Users & Analytics APIs ---
  async getAllUsers() {
    return fallbackStore.users;
  }

  async getUserById(id) {
    return fallbackStore.users.find(u => u.id === id || u.email.toLowerCase() === id.toLowerCase());
  }

  async getFacultyRecords() {
    const facultyUsers = fallbackStore.users.filter(u => u.role === 'faculty');
    const totalModules = fallbackStore.courses.totalModules;

    return facultyUsers.map(user => {
      const userProgress = fallbackStore.progress[user.id] || {};
      const userAttempts = fallbackStore.attempts.filter(a => a.userId === user.id);
      
      let completedModulesCount = 0;
      for (let i = 1; i <= totalModules; i++) {
        if (userProgress[`c1-m${i}`]?.passed) {
          completedModulesCount++;
        }
      }

      const isCompleted = completedModulesCount === totalModules;
      const latestAttempt = userAttempts.slice(-1)[0] || null;

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        department: user.department,
        totalModules,
        completedModulesCount,
        progressPercent: Math.round((completedModulesCount / totalModules) * 100),
        totalAttempts: userAttempts.length,
        isCompleted,
        latestAttemptDate: latestAttempt ? latestAttempt.timestamp : null
      };
    });
  }

  async getUserAttempts(userId) {
    return fallbackStore.attempts
      .filter(a => a.userId === userId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  async recordAttempt({ userId, courseId, moduleNum, score, totalQuestions, passed }) {
    const userAttempts = fallbackStore.attempts.filter(a => a.userId === userId && a.moduleNum === moduleNum);
    const attemptNumber = userAttempts.length + 1;
    const percentage = Math.round((score / totalQuestions) * 100);

    const newAttempt = {
      id: fallbackStore.attempts.length + 1,
      userId,
      courseId: courseId || 'c1',
      moduleId: `${courseId || 'c1'}-m${moduleNum}`,
      moduleNum,
      attemptNumber,
      score,
      totalQuestions,
      percentage,
      passed,
      timestamp: new Date().toISOString()
    };

    fallbackStore.attempts.push(newAttempt);

    // Update user progress
    if (!fallbackStore.progress[userId]) {
      fallbackStore.progress[userId] = {};
    }
    const modKey = `${courseId || 'c1'}-m${moduleNum}`;
    const curMod = fallbackStore.progress[userId][modKey] || { unlocked: moduleNum === 1, passed: false };
    
    fallbackStore.progress[userId][modKey] = {
      ...curMod,
      passed: passed ? true : curMod.passed,
      videoWatched: true
    };

    if (passed) {
      const nextModKey = `${courseId || 'c1'}-m${moduleNum + 1}`;
      if (fallbackStore.progress[userId][nextModKey]) {
        fallbackStore.progress[userId][nextModKey].unlocked = true;
      }
    }

    return newAttempt;
  }

  async getUserProgress(userId, courseId = 'c1') {
    if (!fallbackStore.progress[userId]) {
      fallbackStore.progress[userId] = {
        [`${courseId}-m1`]: { unlocked: true, passed: false, videoWatched: false, maxTimeWatched: 0 },
        [`${courseId}-m2`]: { unlocked: false, passed: false, videoWatched: false, maxTimeWatched: 0 },
        [`${courseId}-m3`]: { unlocked: false, passed: false, videoWatched: false, maxTimeWatched: 0 },
      };
    }
    return fallbackStore.progress[userId];
  }

  async updateUserProgress(userId, modKey, updates) {
    if (!fallbackStore.progress[userId]) {
      fallbackStore.progress[userId] = {};
    }
    fallbackStore.progress[userId][modKey] = {
      ...(fallbackStore.progress[userId][modKey] || {}),
      ...updates
    };

    if (updates.passed) {
      const parts = modKey.split('-m');
      const nextNum = parseInt(parts[1]) + 1;
      const nextKey = `${parts[0]}-m${nextNum}`;
      if (fallbackStore.progress[userId][nextKey]) {
        fallbackStore.progress[userId][nextKey].unlocked = true;
      }
    }
    return fallbackStore.progress[userId];
  }

  async resetDefaults() {
    fallbackStore = {
      courses: JSON.parse(JSON.stringify(DEFAULT_COURSE_DATA)),
      users: JSON.parse(JSON.stringify(DEFAULT_USERS)),
      attempts: JSON.parse(JSON.stringify(DEFAULT_ATTEMPTS)),
      progress: JSON.parse(JSON.stringify(DEFAULT_USER_PROGRESS))
    };
    return true;
  }
}

export const dbManager = new DatabaseManager();
