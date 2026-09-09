// Frontend API Service with local cache fallback

const API_BASE = '/api';

// Fallback in-memory state if server is not reached
const LOCAL_STORAGE_KEY_COURSE = 'fscp_course_content';
const LOCAL_STORAGE_KEY_ATTEMPTS = 'fscp_attempts_log';
const LOCAL_STORAGE_KEY_PROGRESS = 'fscp_users_progress';

const DEFAULT_COURSE = {
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

export async function loginWithZimbra(email, password) {
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Authentication failed');
    return data;
  } catch (err) {
    console.error('[API] Login request failed:', err.message);
    throw err;
  }
}

export async function fetchCourseData() {
  try {
    const res = await fetch(`${API_BASE}/courses`);
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem(LOCAL_STORAGE_KEY_COURSE, JSON.stringify(data));
      return data;
    }
  } catch (e) {
    // ignore and use local cache
  }
  const cached = localStorage.getItem(LOCAL_STORAGE_KEY_COURSE);
  return cached ? JSON.parse(cached) : DEFAULT_COURSE;
}

export async function updateModuleContent(courseId, modNum, updates) {
  try {
    const res = await fetch(`${API_BASE}/courses/${courseId}/modules/${modNum}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (res.ok) {
      const data = await res.json();
      return data.module;
    }
  } catch (e) {
    // fallback
  }

  const cached = localStorage.getItem(LOCAL_STORAGE_KEY_COURSE);
  const course = cached ? JSON.parse(cached) : JSON.parse(JSON.stringify(DEFAULT_COURSE));
  if (course.modules && course.modules[modNum]) {
    course.modules[modNum] = { ...course.modules[modNum], ...updates };
    localStorage.setItem(LOCAL_STORAGE_KEY_COURSE, JSON.stringify(course));
    return course.modules[modNum];
  }
  return null;
}

export async function fetchAdminAnalytics() {
  try {
    const res = await fetch(`${API_BASE}/admin/analytics`);
    if (res.ok) return await res.json();
  } catch (e) {
    // fallback to calculating from live records
  }

  const records = await fetchFacultyRecords();
  const totalEnrolled = records.length;
  const completedCount = records.filter(r => r.isCompleted).length;
  const inProgressCount = records.filter(r => !r.isCompleted && r.completedModulesCount > 0).length;
  const notStartedCount = records.filter(r => r.completedModulesCount === 0).length;
  const completionRate = totalEnrolled > 0 ? Math.round((completedCount / totalEnrolled) * 100) : 0;
  const totalAttempts = records.reduce((sum, r) => sum + (r.totalAttempts || 0), 0);
  const avgAttempts = totalEnrolled > 0 ? (totalAttempts / totalEnrolled).toFixed(1) : '0';

  return {
    totalEnrolled,
    completedCount,
    inProgressCount,
    notStartedCount,
    completionRate,
    totalAttempts,
    avgAttempts
  };
}

export async function fetchFacultyRecords() {
  try {
    const res = await fetch(`${API_BASE}/admin/faculty-records`);
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn('[API] Failed to fetch faculty records from server:', e.message);
  }
  return [];
}

export async function fetchFacultyAttempts(userId) {
  try {
    const res = await fetch(`${API_BASE}/admin/faculty/${userId}/attempts`);
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn('[API] Failed to fetch faculty attempts:', e.message);
  }
  return [];
}

export async function recordQuizAttempt({ userId, courseId, moduleNum, score, totalQuestions, passed }) {
  try {
    const res = await fetch(`${API_BASE}/progress/attempt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, courseId, moduleNum, score, totalQuestions, passed })
    });
    if (res.ok) return await res.json();
  } catch (e) {
    // local fallback
  }

  const attempts = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_ATTEMPTS) || JSON.stringify(DEFAULT_ATTEMPTS));
  const userAttempts = attempts.filter(a => a.userId === userId && a.moduleNum === moduleNum);
  const newAttempt = {
    id: attempts.length + 1,
    userId,
    courseId: courseId || 'c1',
    moduleId: `${courseId || 'c1'}-m${moduleNum}`,
    moduleNum,
    attemptNumber: userAttempts.length + 1,
    score,
    totalQuestions,
    percentage: Math.round((score / totalQuestions) * 100),
    passed,
    timestamp: new Date().toISOString()
  };
  attempts.push(newAttempt);
  localStorage.setItem(LOCAL_STORAGE_KEY_ATTEMPTS, JSON.stringify(attempts));

  // Update progress
  const progress = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_PROGRESS) || '{}');
  if (!progress[userId]) progress[userId] = {};
  const modKey = `${courseId || 'c1'}-m${moduleNum}`;
  progress[userId][modKey] = {
    ...(progress[userId][modKey] || {}),
    passed: passed ? true : (progress[userId][modKey]?.passed || false),
    videoWatched: true
  };
  if (passed) {
    const nextKey = `${courseId || 'c1'}-m${moduleNum + 1}`;
    if (progress[userId][nextKey]) progress[userId][nextKey].unlocked = true;
  }
  localStorage.setItem(LOCAL_STORAGE_KEY_PROGRESS, JSON.stringify(progress));

  return { success: true, attempt: newAttempt };
}

export async function fetchUserProgress(userId, courseId = 'c1') {
  try {
    const res = await fetch(`${API_BASE}/progress/${userId}/${courseId}`);
    if (res.ok) return await res.json();
  } catch (e) {
    // local fallback
  }

  const stored = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_PROGRESS) || '{}');
  if (!stored[userId]) {
    stored[userId] = {
      [`${courseId}-m1`]: { unlocked: true, passed: false, videoWatched: false, maxTimeWatched: 0 },
      [`${courseId}-m2`]: { unlocked: false, passed: false, videoWatched: false, maxTimeWatched: 0 },
      [`${courseId}-m3`]: { unlocked: false, passed: false, videoWatched: false, maxTimeWatched: 0 },
    };
    localStorage.setItem(LOCAL_STORAGE_KEY_PROGRESS, JSON.stringify(stored));
  }
  return stored[userId];
}

export async function updateUserProgressApi(userId, modKey, updates) {
  try {
    const res = await fetch(`${API_BASE}/progress/${userId}/${modKey}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (res.ok) return await res.json();
  } catch (e) {
    // fallback
  }

  const stored = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_PROGRESS) || '{}');
  if (!stored[userId]) stored[userId] = {};
  stored[userId][modKey] = { ...(stored[userId][modKey] || {}), ...updates };
  if (updates.passed) {
    const parts = modKey.split('-m');
    const nextKey = `${parts[0]}-m${parseInt(parts[1]) + 1}`;
    if (stored[userId][nextKey]) stored[userId][nextKey].unlocked = true;
  }
  localStorage.setItem(LOCAL_STORAGE_KEY_PROGRESS, JSON.stringify(stored));
  return stored[userId];
}

export async function resetAllDataToDefaults() {
  try {
    await fetch(`${API_BASE}/admin/reset-defaults`, { method: 'POST' });
  } catch (e) {}
  localStorage.removeItem(LOCAL_STORAGE_KEY_COURSE);
  localStorage.removeItem(LOCAL_STORAGE_KEY_ATTEMPTS);
  localStorage.removeItem(LOCAL_STORAGE_KEY_PROGRESS);
}
