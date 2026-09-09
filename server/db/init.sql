-- Faculty Sensitisation Course Portal Database Schema

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    role VARCHAR(20) DEFAULT 'faculty', -- 'faculty' or 'admin'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS courses (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    total_modules INT DEFAULT 3,
    image TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS modules (
    id VARCHAR(50) PRIMARY KEY, -- e.g. 'c1-m1'
    course_id VARCHAR(50) REFERENCES courses(id) ON DELETE CASCADE,
    module_num INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    youtube_video_id VARCHAR(50) NOT NULL,
    duration_seconds INT DEFAULT 600,
    passing_threshold INT DEFAULT 80
);

CREATE TABLE IF NOT EXISTS quizzes (
    id SERIAL PRIMARY KEY,
    module_id VARCHAR(50) REFERENCES modules(id) ON DELETE CASCADE,
    question_idx INT NOT NULL,
    question TEXT NOT NULL,
    options JSONB NOT NULL,
    correct INT NOT NULL,
    UNIQUE(module_id, question_idx)
);

CREATE TABLE IF NOT EXISTS assessment_attempts (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    course_id VARCHAR(50) REFERENCES courses(id) ON DELETE CASCADE,
    module_id VARCHAR(50) REFERENCES modules(id) ON DELETE CASCADE,
    module_num INT NOT NULL,
    attempt_number INT NOT NULL,
    score INT NOT NULL,
    total_questions INT NOT NULL,
    percentage INT NOT NULL,
    passed BOOLEAN NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_progress (
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    module_id VARCHAR(50) REFERENCES modules(id) ON DELETE CASCADE,
    unlocked BOOLEAN DEFAULT FALSE,
    passed BOOLEAN DEFAULT FALSE,
    video_watched BOOLEAN DEFAULT FALSE,
    max_time_watched INT DEFAULT 0,
    PRIMARY KEY (user_id, module_id)
);

-- Seed Data: Course
INSERT INTO courses (id, title, description, total_modules, image) VALUES
('c1', 'Faculty Sensitization', 'Core principles of modern teaching, diversity, gender inclusivity, and academic integrity for higher education faculty.', 3, 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=2070&auto=format&fit=crop')
ON CONFLICT (id) DO NOTHING;

-- Seed Data: Modules
INSERT INTO modules (id, course_id, module_num, title, description, youtube_video_id, duration_seconds, passing_threshold) VALUES
('c1-m1', 'c1', 1, 'Inclusive Pedagogies & Classroom Diversity', 'Understanding cognitive diversity, overcoming subconscious bias, and building an open academic environment.', 'jNQXAC9IVRw', 600, 80),
('c1-m2', 'c1', 2, 'Ethics, Mentorship & Student Well-being', 'Recognizing student mental health stress, mentorship ethics, prevention of harassment, and constructive guidance.', 'M7lc1UVf-VE', 720, 80),
('c1-m3', 'c1', 3, 'Academic Integrity & Fair Assessment', 'Fair assessment methodologies, rubrics design, ethical AI utilization, and institutional honor codes.', 'tPEE9ZwTmy0', 900, 80)
ON CONFLICT (id) DO NOTHING;

-- Seed Data: Quizzes
INSERT INTO quizzes (module_id, question_idx, question, options, correct) VALUES
('c1-m1', 0, 'What is the primary goal of this course module?', '["To skip videos", "To learn faculty sensitization", "To sleep", "Nothing"]'::jsonb, 1),
('c1-m1', 1, 'How often should faculty review inclusive learning material?', '["Never", "Regularly each semester", "Once a decade", "Only after complaints"]'::jsonb, 1),
('c1-m1', 2, 'What is the minimum passing score required on assessments?', '["50%", "60%", "80%", "100%"]'::jsonb, 2),
('c1-m1', 3, 'Who is the primary audience for faculty sensitization?', '["Undergrad students", "Faculty & Academic Staff", "Campus Visitors", "Contractors"]'::jsonb, 1),
('c1-m1', 4, 'What is required if a candidate fails the assessment?', '["Automatic pass", "Must review lecture content before reattempting", "Immediate suspension", "Written penalty"]'::jsonb, 1),

('c1-m2', 0, 'What is the role of faculty when noticing acute student distress?', '["Ignore it", "Refer to institute counseling resources with empathy", "Penalize attendance", "Publicly discuss in class"]'::jsonb, 1),
('c1-m2', 1, 'Professional boundaries in faculty-student mentoring should be:', '["Flexible and informal", "Clearly maintained and respectful", "Non-existent", "Only maintained on campus"]'::jsonb, 1),
('c1-m2', 2, 'How can faculty promote open communication during office hours?', '["Keep door closed", "Provide an approachable, confidential atmosphere", "Ask students to email only", "Limit questions to 2 minutes"]'::jsonb, 1),
('c1-m2', 3, 'Confidentiality of student health disclosures is:', '["Optional", "Strictly mandatory under institute policy", "Shared with other students", "Published"]'::jsonb, 1),
('c1-m2', 4, 'Constructive feedback on assignments should focus on:', '["Personal criticism", "Actionable learning improvement", "Discouragement", "Arbitrary grades"]'::jsonb, 1),

('c1-m3', 0, 'Clear transparent grading rubrics primarily benefit:', '["Nobody", "Both instructors and students for fair evaluation", "Only external auditors", "Finance department"]'::jsonb, 1),
('c1-m3', 1, 'When generative AI tools are used in coursework, faculty should:', '["Ignore policy", "Establish explicit ethical guidelines and attribution rules", "Ban all computers", "Pretend it does not exist"]'::jsonb, 1),
('c1-m3', 2, 'Academic integrity violations should be addressed according to:', '["Personal whim", "Established institutional committee due process", "Immediate public shame", "Ignored if senior student"]'::jsonb, 1),
('c1-m3', 3, 'Formative assessments are primarily intended to:', '["Provide ongoing learning feedback before finals", "Fail as many students as possible", "Rank students publicly", "Reduce grading time"]'::jsonb, 0),
('c1-m3', 4, 'Upon successfully completing all course modules, faculty receive:', '["Nothing", "An official Institute Verified Completion Certificate", "Course exemption", "A fine"]'::jsonb, 1)
ON CONFLICT (module_id, question_idx) DO UPDATE SET
  question = EXCLUDED.question,
  options = EXCLUDED.options,
  correct = EXCLUDED.correct;

-- Seed Data: Admin Account
INSERT INTO users (id, email, name, department, role) VALUES
('admin', 'admin@institute.edu.in', 'Dean of Academic Affairs (Admin)', 'Institute Administration', 'admin')
ON CONFLICT (id) DO NOTHING;
