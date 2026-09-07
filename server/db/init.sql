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
    correct INT NOT NULL
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

-- Seed Data: Users
INSERT INTO users (id, email, name, department, role) VALUES
('123', '123@institute.edu.in', 'Dr. John Doe', 'Computer Science & Engineering', 'faculty'),
('u-sarah', 's.smith@institute.edu.in', 'Dr. Sarah Smith', 'Biotechnology', 'faculty'),
('u-robert', 'r.miller@institute.edu.in', 'Prof. Robert Miller', 'Electrical Engineering', 'faculty'),
('u-anita', 'a.sharma@institute.edu.in', 'Dr. Anita Sharma', 'Physics & Materials Science', 'faculty'),
('u-chen', 'd.chen@institute.edu.in', 'Prof. David Chen', 'Mathematics & Computing', 'faculty'),
('admin', 'admin@institute.edu.in', 'Dean Academic Affairs (Admin)', 'Institute Administration', 'admin')
ON CONFLICT (id) DO NOTHING;

-- Seed Data: Course
INSERT INTO courses (id, title, description, total_modules, image) VALUES
('c1', 'Faculty Sensitization', 'Core principles of modern teaching, diversity, gender inclusivity, and academic integrity for higher education faculty.', 3, 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=2070&auto=format&fit=crop')
ON CONFLICT (id) DO NOTHING;

-- Seed Data: Modules
INSERT INTO modules (id, course_id, module_num, title, description, youtube_video_id, duration_seconds, passing_threshold) VALUES
('c1-m1', 'c1', 1, 'Inclusive Pedagogies & Diversity', 'Creating an equitable learning environment, understanding unconscious bias, and accommodating neurodiversity in higher education classrooms.', 'jNQXAC9IVRw', 600, 80),
('c1-m2', 'c1', 2, 'Ethics, Mental Health & Well-being', 'Recognizing student mental health stress, mentorship ethics, prevention of harassment, and constructive guidance.', 'M7lc1UVf-VE', 720, 80),
('c1-m3', 'c1', 3, 'Academic Integrity & Modern Assessment', 'Fair assessment methodologies, rubrics design, ethical AI utilization, and institutional honor codes.', 'tPEE9ZwTmy0', 900, 80)
ON CONFLICT (id) DO NOTHING;

-- Seed Data: Attempts for existing completed/in-progress faculty
-- Dr. Sarah Smith (Completed all 3 modules)
INSERT INTO assessment_attempts (user_id, course_id, module_id, module_num, attempt_number, score, total_questions, percentage, passed, timestamp) VALUES
('u-sarah', 'c1', 'c1-m1', 1, 1, 5, 5, 100, true, '2026-09-02 11:30:00'),
('u-sarah', 'c1', 'c1-m2', 2, 1, 3, 5, 60, false, '2026-09-03 14:10:00'),
('u-sarah', 'c1', 'c1-m2', 2, 2, 5, 5, 100, true, '2026-09-03 16:45:00'),
('u-sarah', 'c1', 'c1-m3', 3, 1, 4, 5, 80, true, '2026-09-04 10:20:00');

-- Prof. Robert Miller (Completed M1, in-progress M2)
INSERT INTO assessment_attempts (user_id, course_id, module_id, module_num, attempt_number, score, total_questions, percentage, passed, timestamp) VALUES
('u-robert', 'c1', 'c1-m1', 1, 1, 2, 5, 40, false, '2026-09-05 09:15:00'),
('u-robert', 'c1', 'c1-m1', 1, 2, 4, 5, 80, true, '2026-09-05 11:00:00'),
('u-robert', 'c1', 'c1-m2', 2, 1, 3, 5, 60, false, '2026-09-06 15:30:00');

-- Dr. Anita Sharma (Completed all 3 modules on 1st attempt)
INSERT INTO assessment_attempts (user_id, course_id, module_id, module_num, attempt_number, score, total_questions, percentage, passed, timestamp) VALUES
('u-anita', 'c1', 'c1-m1', 1, 1, 5, 5, 100, true, '2026-09-01 10:00:00'),
('u-anita', 'c1', 'c1-m2', 2, 1, 4, 5, 80, true, '2026-09-01 14:30:00'),
('u-anita', 'c1', 'c1-m3', 3, 1, 5, 5, 100, true, '2026-09-02 09:45:00');
