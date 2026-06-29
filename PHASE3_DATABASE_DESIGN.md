# PHASE 3 — DATABASE DESIGN
## Royal Crystal Academy — School Management System
### PostgreSQL Schema, ERD Reference & Data Dictionary

---

## OVERVIEW

This document defines the complete relational database schema for the Royal Crystal Academy
School Management System. It is the blueprint for Phase 4 (Node.js backend).

**Database:** PostgreSQL 15+  
**Charset:** UTF-8  
**Session:** 2025/2026  
**Total tables:** 23  

---

## NAMING CONVENTIONS

| Convention | Example |
|---|---|
| Table names | `snake_case`, plural | `students`, `payment_records` |
| Column names | `snake_case` | `admission_no`, `class_name` |
| Primary keys | `id SERIAL PRIMARY KEY` |
| Foreign keys | `table_name_id` | `student_id`, `user_id` |
| Timestamps | `created_at`, `updated_at` TIMESTAMPTZ |
| Soft delete | `deleted_at TIMESTAMPTZ` (NULL = active) |
| Booleans | `is_active`, `is_published` |

---

## TABLES

---

### 1. `classes`
Defines all 12 classes in the school.

```sql
CREATE TABLE classes (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(30) NOT NULL UNIQUE,   -- 'Basic 3', 'Nursery 1', etc.
  code        VARCHAR(10) NOT NULL UNIQUE,   -- 'BS3', 'NS1'
  level       VARCHAR(20) NOT NULL,          -- 'nursery', 'basic'
  ict_group   VARCHAR(10),                   -- 'GROUP1' (B3-4), 'GROUP2' (B5-6), NULL (others)
  sort_order  SMALLINT NOT NULL DEFAULT 0,   -- for display ordering
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Seed data
INSERT INTO classes (name, code, level, ict_group, sort_order) VALUES
  ('Pre-Nursery 1', 'PN1', 'nursery', NULL, 1),
  ('Pre-Nursery 2', 'PN2', 'nursery', NULL, 2),
  ('Nursery 1',     'NS1', 'nursery', NULL, 3),
  ('Nursery 2',     'NS2', 'nursery', NULL, 4),
  ('Nursery 3',     'NS3', 'nursery', NULL, 5),
  ('Basic 1A',      'B1A', 'basic',   NULL, 6),
  ('Basic 1B',      'B1B', 'basic',   NULL, 7),
  ('Basic 2',       'BS2', 'basic',   NULL, 8),
  ('Basic 3',       'BS3', 'basic',   'GROUP1', 9),
  ('Basic 4',       'BS4', 'basic',   'GROUP1', 10),
  ('Basic 5',       'BS5', 'basic',   'GROUP2', 11),
  ('Basic 6',       'BS6', 'basic',   'GROUP2', 12);
```

---

### 2. `subjects`
All 19 subjects taught at the school.

```sql
CREATE TABLE subjects (
  id          SERIAL PRIMARY KEY,
  code        VARCHAR(10) NOT NULL UNIQUE,   -- 'eng', 'mth', 'sci', etc.
  name        VARCHAR(60) NOT NULL,          -- 'English Language', 'Mathematics'
  sort_order  SMALLINT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO subjects (code, name, sort_order) VALUES
  ('eng',   'English Language',    1),
  ('comp',  'Comprehension',        2),
  ('phon',  'Phonics',              3),
  ('spell', 'Spelling/Dictation',   4),
  ('igbo',  'Asusu Igbo',           5),
  ('mth',   'Mathematics',          6),
  ('sci',   'Basic Science',        7),
  ('hec',   'Home Economics',       8),
  ('soc',   'Social Studies',       9),
  ('crk',   'C.R.K',               10),
  ('agric', 'Agric Science',       11),
  ('phe',   'Health Education',    12),
  ('vr',    'Verbal Reasoning',    13),
  ('qr',    'Quantitative Reasoning', 14),
  ('writ',  'Writing',             15),
  ('cre',   'Creative Arts',       16),
  ('civ',   'Civic Education',     17),
  ('ict',   'Computer',            18),
  ('hist',  'History',             19);
```

---

### 3. `academic_sessions`
Controls which academic year is current.

```sql
CREATE TABLE academic_sessions (
  id          SERIAL PRIMARY KEY,
  label       VARCHAR(20) NOT NULL UNIQUE,   -- '2025/2026'
  is_current  BOOLEAN NOT NULL DEFAULT FALSE,
  starts_at   DATE NOT NULL,
  ends_at     DATE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO academic_sessions (label, is_current, starts_at, ends_at)
VALUES ('2025/2026', TRUE, '2025-09-01', '2026-07-31');
```

---

### 4. `users`
Every login account — staff and parents.

```sql
CREATE TABLE users (
  id              SERIAL PRIMARY KEY,
  staff_id        VARCHAR(20) UNIQUE,                -- 'RCA-STF-001' (NULL for parents)
  full_name       VARCHAR(100) NOT NULL,
  email           VARCHAR(150) NOT NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,             -- bcrypt hash (Phase 4)
  primary_role    VARCHAR(30) NOT NULL               -- 'ict_admin','head_teacher','class_teacher',
                  CHECK (primary_role IN (           --  'subject_teacher','accountant','parent'
                    'ict_admin','head_teacher',
                    'class_teacher','subject_teacher',
                    'accountant','parent'
                  )),
  job_title       VARCHAR(100),
  phone           VARCHAR(20),
  status          VARCHAR(20) NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','deactivated','suspended','archived')),
  form_class_id   INT REFERENCES classes(id),        -- Form teacher's class (NULL if not form teacher)
  last_login      TIMESTAMPTZ,
  date_joined     DATE DEFAULT CURRENT_DATE,
  created_by      INT REFERENCES users(id),
  deleted_at      TIMESTAMPTZ,                       -- soft delete
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_email       ON users(email);
CREATE INDEX idx_users_primary_role ON users(primary_role);
CREATE INDEX idx_users_status      ON users(status);
```

---

### 5. `user_roles`
Supports multiple roles per user (e.g. Form Teacher + Subject Teacher).

```sql
CREATE TABLE user_roles (
  id       SERIAL PRIMARY KEY,
  user_id  INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role     VARCHAR(30) NOT NULL
           CHECK (role IN ('ict_admin','head_teacher','class_teacher',
                           'subject_teacher','accountant','parent')),
  UNIQUE (user_id, role)
);

CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
```

---

### 6. `teacher_assignments`
Which teacher teaches which subject in which class.

```sql
CREATE TABLE teacher_assignments (
  id         SERIAL PRIMARY KEY,
  user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_id   INT NOT NULL REFERENCES classes(id),
  subject_id INT REFERENCES subjects(id),  -- NULL = teaches all subjects (form teacher)
  session_id INT NOT NULL REFERENCES academic_sessions(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, class_id, subject_id, session_id)
);

CREATE INDEX idx_ta_user_id    ON teacher_assignments(user_id);
CREATE INDEX idx_ta_class_id   ON teacher_assignments(class_id);
CREATE INDEX idx_ta_subject_id ON teacher_assignments(subject_id);
```

---

### 7. `students`
All enrolled pupils.

```sql
CREATE TABLE students (
  id             SERIAL PRIMARY KEY,
  admission_no   VARCHAR(20) NOT NULL UNIQUE,    -- 'RCA/2024/0001'
  first_name     VARCHAR(60) NOT NULL,
  last_name      VARCHAR(60) NOT NULL,
  full_name      VARCHAR(120) GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
  gender         VARCHAR(10) NOT NULL CHECK (gender IN ('male','female')),
  class_id       INT NOT NULL REFERENCES classes(id),
  date_of_birth  DATE,
  parent_phone   VARCHAR(20),
  status         VARCHAR(20) NOT NULL DEFAULT 'active'
                 CHECK (status IN ('active','graduated','transferred','archived')),
  session_id     INT NOT NULL REFERENCES academic_sessions(id),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_students_admission_no ON students(admission_no);
CREATE INDEX idx_students_class_id     ON students(class_id);
CREATE INDEX idx_students_parent_phone ON students(parent_phone);
```

---

### 8. `parent_student_links`
Links parent accounts to their enrolled children (one parent → many children).

```sql
CREATE TABLE parent_student_links (
  id          SERIAL PRIMARY KEY,
  parent_id   INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id  INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (parent_id, student_id)
);

CREATE INDEX idx_psl_parent_id  ON parent_student_links(parent_id);
CREATE INDEX idx_psl_student_id ON parent_student_links(student_id);
```

---

### 9. `scores`
CA components and exam score per pupil per subject per term.

```sql
CREATE TABLE scores (
  id           SERIAL PRIMARY KEY,
  student_id   INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id   INT NOT NULL REFERENCES subjects(id),
  session_id   INT NOT NULL REFERENCES academic_sessions(id),
  term         VARCHAR(10) NOT NULL CHECK (term IN ('term1','term2','term3')),
  
  -- CA components (each /10)
  test         SMALLINT NOT NULL DEFAULT 0 CHECK (test        BETWEEN 0 AND 10),
  assessment   SMALLINT NOT NULL DEFAULT 0 CHECK (assessment  BETWEEN 0 AND 10),
  project      SMALLINT NOT NULL DEFAULT 0 CHECK (project     BETWEEN 0 AND 10),
  midterm      SMALLINT NOT NULL DEFAULT 0 CHECK (midterm     BETWEEN 0 AND 10),
  
  -- Exam (/60)
  exam         SMALLINT NOT NULL DEFAULT 0 CHECK (exam        BETWEEN 0 AND 60),
  
  -- Computed columns (stored for reporting speed)
  ca_total     SMALLINT GENERATED ALWAYS AS (test + assessment + project + midterm) STORED,
  final_score  SMALLINT GENERATED ALWAYS AS (test + assessment + project + midterm + exam) STORED,
  grade        CHAR(1) GENERATED ALWAYS AS (
    CASE
      WHEN (test + assessment + project + midterm + exam) >= 70 THEN 'A'
      WHEN (test + assessment + project + midterm + exam) >= 60 THEN 'B'
      WHEN (test + assessment + project + midterm + exam) >= 50 THEN 'C'
      WHEN (test + assessment + project + midterm + exam) >= 45 THEN 'D'
      WHEN (test + assessment + project + midterm + exam) >= 40 THEN 'E'
      ELSE 'F'
    END
  ) STORED,
  
  -- Workflow
  entered_by   INT REFERENCES users(id),
  submitted_at TIMESTAMPTZ,
  is_locked    BOOLEAN NOT NULL DEFAULT FALSE,  -- TRUE after submission
  
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE (student_id, subject_id, session_id, term)
);

CREATE INDEX idx_scores_student_id   ON scores(student_id);
CREATE INDEX idx_scores_subject_id   ON scores(subject_id);
CREATE INDEX idx_scores_term         ON scores(term);
CREATE INDEX idx_scores_session_id   ON scores(session_id);
```

---

### 10. `result_approvals`
Tracks the approval workflow state per class per term.

```sql
CREATE TABLE result_approvals (
  id             SERIAL PRIMARY KEY,
  class_id       INT NOT NULL REFERENCES classes(id),
  session_id     INT NOT NULL REFERENCES academic_sessions(id),
  term           VARCHAR(10) NOT NULL CHECK (term IN ('term1','term2','term3')),
  
  status         VARCHAR(20) NOT NULL DEFAULT 'draft'
                 CHECK (status IN ('draft','submitted','reviewed','approved','published','returned')),
  
  submitted_by   INT REFERENCES users(id),
  submitted_at   TIMESTAMPTZ,
  reviewed_by    INT REFERENCES users(id),
  reviewed_at    TIMESTAMPTZ,
  approved_by    INT REFERENCES users(id),
  approved_at    TIMESTAMPTZ,
  published_by   INT REFERENCES users(id),
  published_at   TIMESTAMPTZ,
  return_reason  TEXT,
  
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE (class_id, session_id, term)
);

CREATE INDEX idx_approvals_class_id ON result_approvals(class_id);
CREATE INDEX idx_approvals_status   ON result_approvals(status);
```

---

### 11. `behavior_traits`
The 13 behavioural traits (lookup/seed table).

```sql
CREATE TABLE behavior_traits (
  id          SERIAL PRIMARY KEY,
  code        VARCHAR(30) NOT NULL UNIQUE,   -- 'punctuality', 'neatness', etc.
  label       VARCHAR(60) NOT NULL,
  sort_order  SMALLINT NOT NULL DEFAULT 0
);

INSERT INTO behavior_traits (code, label, sort_order) VALUES
  ('punctuality',        'Punctuality',                   1),
  ('neatness',           'Neatness',                      2),
  ('politeness',         'Politeness',                    3),
  ('honesty',            'Honesty',                       4),
  ('cooperation',        'Cooperation',                   5),
  ('leadership',         'Leadership',                    6),
  ('helping_others',     'Helping Others',                7),
  ('emotional_stability','Emotional Stability',           8),
  ('health',             'Health',                        9),
  ('social_work',        'Aptitude on Social Work',      10),
  ('preservation',       'Preservation (Care of Property)', 11),
  ('speaking',           'Speaking',                     12),
  ('writing',            'Writing',                      13);
```

---

### 12. `behavior_ratings`
A rating (1–5) per pupil per trait per term.

```sql
CREATE TABLE behavior_ratings (
  id           SERIAL PRIMARY KEY,
  student_id   INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  trait_id     INT NOT NULL REFERENCES behavior_traits(id),
  session_id   INT NOT NULL REFERENCES academic_sessions(id),
  term         VARCHAR(10) NOT NULL CHECK (term IN ('term1','term2','term3')),
  rating       SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  rated_by     INT REFERENCES users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (student_id, trait_id, session_id, term)
);

CREATE INDEX idx_br_student_id ON behavior_ratings(student_id);
```

---

### 13. `class_comments`
Teacher comment per pupil per term (from Class Review).

```sql
CREATE TABLE class_comments (
  id           SERIAL PRIMARY KEY,
  student_id   INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  session_id   INT NOT NULL REFERENCES academic_sessions(id),
  term         VARCHAR(10) NOT NULL CHECK (term IN ('term1','term2','term3')),
  comment      TEXT NOT NULL,
  written_by   INT REFERENCES users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (student_id, session_id, term)
);
```

---

### 14. `fee_schedules`
Fee structure per term per session.

```sql
CREATE TABLE fee_schedules (
  id                    SERIAL PRIMARY KEY,
  session_id            INT NOT NULL REFERENCES academic_sessions(id),
  term                  VARCHAR(10) NOT NULL CHECK (term IN ('term1','term2','term3')),
  school_fees           INT NOT NULL,          -- in kobo (₦30,000 = 3000000)
  school_fees_sibling   INT NOT NULL,          -- discounted rate (₦15,000)
  sibling_threshold     SMALLINT NOT NULL DEFAULT 3,  -- min children for discount
  utility_bill          INT NOT NULL,
  lesson_fee            INT NOT NULL,
  levy_label            VARCHAR(60),           -- 'Christmas Party', 'Inter-House Sports', etc.
  levy_amount           INT NOT NULL DEFAULT 0,
  levy_basic6_label     VARCHAR(60),           -- 'Graduation Levy (Basic 6)'
  levy_basic6_amount    INT NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (session_id, term)
);
```

---

### 15. `payment_records`
Fee payment header — one row per student per term.

```sql
CREATE TABLE payment_records (
  id              SERIAL PRIMARY KEY,
  student_id      INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  session_id      INT NOT NULL REFERENCES academic_sessions(id),
  term            VARCHAR(10) NOT NULL CHECK (term IN ('term1','term2','term3')),
  amount_expected INT NOT NULL,
  amount_paid     INT NOT NULL DEFAULT 0,
  balance         INT GENERATED ALWAYS AS (amount_expected - amount_paid) STORED,
  status          VARCHAR(20) NOT NULL DEFAULT 'unpaid'
                  CHECK (status IN ('unpaid','partial','paid')),
  has_sibling_discount BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (student_id, session_id, term)
);

CREATE INDEX idx_payment_records_student_id ON payment_records(student_id);
CREATE INDEX idx_payment_records_status     ON payment_records(status);
```

---

### 16. `payment_transactions`
Individual payment instalments (one record can have multiple payments).

```sql
CREATE TABLE payment_transactions (
  id                SERIAL PRIMARY KEY,
  payment_record_id INT NOT NULL REFERENCES payment_records(id) ON DELETE CASCADE,
  amount            INT NOT NULL,
  method            VARCHAR(30) NOT NULL
                    CHECK (method IN ('Cash','Bank Transfer','POS','Cheque','Online')),
  receipt_no        VARCHAR(30) NOT NULL UNIQUE,
  payment_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  recorded_by       INT REFERENCES users(id),
  paystack_ref      VARCHAR(100),              -- Phase 4: Paystack transaction reference
  verified          BOOLEAN NOT NULL DEFAULT FALSE,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pt_payment_record_id ON payment_transactions(payment_record_id);
CREATE INDEX idx_pt_receipt_no        ON payment_transactions(receipt_no);
```

---

### 17. `result_access_payments`
₦1,000 fee parents pay to unlock result viewing per term.

```sql
CREATE TABLE result_access_payments (
  id           SERIAL PRIMARY KEY,
  parent_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id   INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  session_id   INT NOT NULL REFERENCES academic_sessions(id),
  term         VARCHAR(10) NOT NULL CHECK (term IN ('term1','term2','term3')),
  amount       INT NOT NULL DEFAULT 100000,   -- ₦1,000 in kobo
  paid_at      TIMESTAMPTZ DEFAULT NOW(),
  paystack_ref VARCHAR(100),
  UNIQUE (parent_id, student_id, session_id, term)
);
```

---

### 18. `attendance`
Daily attendance per pupil.

```sql
CREATE TABLE attendance (
  id           SERIAL PRIMARY KEY,
  student_id   INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id     INT NOT NULL REFERENCES classes(id),
  session_id   INT NOT NULL REFERENCES academic_sessions(id),
  date         DATE NOT NULL,
  status       VARCHAR(10) NOT NULL DEFAULT 'present'
               CHECK (status IN ('present','absent','late','excused')),
  marked_by    INT REFERENCES users(id),
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (student_id, date)
);

CREATE INDEX idx_attendance_student_id ON attendance(student_id);
CREATE INDEX idx_attendance_date       ON attendance(date);
CREATE INDEX idx_attendance_class_id   ON attendance(class_id);
```

---

### 19. `discipline_records`
Incident records (Basic 1–6 only by policy).

```sql
CREATE TABLE discipline_records (
  id           SERIAL PRIMARY KEY,
  student_id   INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id     INT NOT NULL REFERENCES classes(id),
  incident     TEXT NOT NULL,
  action_taken TEXT,
  severity     VARCHAR(20) NOT NULL DEFAULT 'minor'
               CHECK (severity IN ('minor','moderate','serious')),
  reported_by  INT REFERENCES users(id),
  date         DATE NOT NULL DEFAULT CURRENT_DATE,
  session_id   INT NOT NULL REFERENCES academic_sessions(id),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_discipline_student_id ON discipline_records(student_id);
CREATE INDEX idx_discipline_date       ON discipline_records(date);
```

---

### 20. `announcements`
School announcements and newsletters.

```sql
CREATE TABLE announcements (
  id           SERIAL PRIMARY KEY,
  type         VARCHAR(20) NOT NULL DEFAULT 'announcement'
               CHECK (type IN ('announcement','newsletter','event','urgent')),
  title        VARCHAR(200) NOT NULL,
  body         TEXT NOT NULL,
  status       VARCHAR(20) NOT NULL DEFAULT 'draft'
               CHECK (status IN ('draft','published','archived')),
  author_id    INT NOT NULL REFERENCES users(id),
  published_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ
);

CREATE INDEX idx_announcements_status ON announcements(status);
CREATE INDEX idx_announcements_type   ON announcements(type);
```

---

### 21. `announcement_audiences`
Which roles can see each announcement.

```sql
CREATE TABLE announcement_audiences (
  id              SERIAL PRIMARY KEY,
  announcement_id INT NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  audience_role   VARCHAR(30) NOT NULL,   -- 'all','parent','class_teacher', etc.
  UNIQUE (announcement_id, audience_role)
);
```

---

### 22. `calendar_events`
School calendar events.

```sql
CREATE TABLE calendar_events (
  id          SERIAL PRIMARY KEY,
  title       VARCHAR(200) NOT NULL,
  event_date  DATE NOT NULL,
  category    VARCHAR(30) NOT NULL DEFAULT 'academic'
              CHECK (category IN ('academic','holiday','exam','event','fee','meeting')),
  color       VARCHAR(10),
  session_id  INT REFERENCES academic_sessions(id),
  created_by  INT REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_calendar_events_date ON calendar_events(event_date);
```

---

### 23. `activity_logs`
System audit trail — every significant action.

```sql
CREATE TABLE activity_logs (
  id          BIGSERIAL PRIMARY KEY,         -- BIGSERIAL: can have millions of rows
  user_id     INT REFERENCES users(id),
  user_name   VARCHAR(100),                  -- denormalised for performance
  user_role   VARCHAR(30),
  action      VARCHAR(50) NOT NULL,          -- 'login','create','update','approve','publish'
  category    VARCHAR(30),                   -- 'scores','payments','users','approvals'
  target      TEXT,                          -- human-readable description
  ip_address  INET,
  user_agent  TEXT,
  session_id_ref VARCHAR(100),               -- browser session token
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_user_id    ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_action     ON activity_logs(action);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);

-- Auto-purge logs older than 2 years (add as a cron job in Phase 4)
-- DELETE FROM activity_logs WHERE created_at < NOW() - INTERVAL '2 years';
```

---

## ADDITIONAL TABLES (ICT DEPARTMENT)

```sql
-- Computer lab inventory
CREATE TABLE ict_computers (
  id               SERIAL PRIMARY KEY,
  computer_code    VARCHAR(10) NOT NULL UNIQUE,   -- 'PC-01'
  name             VARCHAR(50) NOT NULL,
  brand            VARCHAR(30),
  status           VARCHAR(20) NOT NULL DEFAULT 'working'
                   CHECK (status IN ('working','faulty','maintenance','decommissioned')),
  purchased_date   DATE,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Maintenance log
CREATE TABLE ict_maintenance_log (
  id               SERIAL PRIMARY KEY,
  computer_id      INT NOT NULL REFERENCES ict_computers(id),
  maintenance_type VARCHAR(60) NOT NULL,
  technician       VARCHAR(100),
  cost             INT DEFAULT 0,      -- in kobo
  status           VARCHAR(20) NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','in_progress','completed')),
  notes            TEXT,
  maintenance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by       INT REFERENCES users(id),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ICT skill scores per student
CREATE TABLE ict_progress (
  id           SERIAL PRIMARY KEY,
  student_id   INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  session_id   INT NOT NULL REFERENCES academic_sessions(id),
  term         VARCHAR(10) NOT NULL CHECK (term IN ('term1','term2','term3')),
  skill_code   VARCHAR(20) NOT NULL,     -- 'typing','mouse','word','excel','html', etc.
  score        SMALLINT NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
  assessed_by  INT REFERENCES users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (student_id, session_id, term, skill_code)
);

-- ICT Club membership
CREATE TABLE ict_club_members (
  id           SERIAL PRIMARY KEY,
  student_id   INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  joined_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  status       VARCHAR(20) NOT NULL DEFAULT 'active'
               CHECK (status IN ('active','inactive')),
  UNIQUE (student_id)
);

-- ICT Club meetings
CREATE TABLE ict_club_meetings (
  id           SERIAL PRIMARY KEY,
  meeting_date DATE NOT NULL,
  topic        VARCHAR(200) NOT NULL,
  attendance   SMALLINT,
  notes        TEXT,
  recorded_by  INT REFERENCES users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
```

---

## VIEWS
Commonly used queries pre-built as views for performance.

```sql
-- Full result view per pupil per term
CREATE VIEW v_pupil_results AS
SELECT
  s.admission_no,
  s.full_name,
  c.name            AS class_name,
  sc.term,
  sess.label        AS session,
  sub.code          AS subject_code,
  sub.name          AS subject_name,
  sc.test, sc.assessment, sc.project, sc.midterm,
  sc.exam, sc.ca_total, sc.final_score, sc.grade
FROM scores sc
JOIN students s   ON s.id = sc.student_id
JOIN subjects sub ON sub.id = sc.subject_id
JOIN classes  c   ON c.id = s.class_id
JOIN academic_sessions sess ON sess.id = sc.session_id;

-- Fee payment summary per student per term
CREATE VIEW v_payment_summary AS
SELECT
  s.admission_no,
  s.full_name,
  c.name     AS class_name,
  pr.term,
  pr.amount_expected,
  pr.amount_paid,
  pr.balance,
  pr.status,
  COUNT(pt.id) AS payment_count
FROM payment_records pr
JOIN students s ON s.id = pr.student_id
JOIN classes  c ON c.id = s.class_id
LEFT JOIN payment_transactions pt ON pt.payment_record_id = pr.id
GROUP BY s.admission_no, s.full_name, c.name, pr.term,
         pr.amount_expected, pr.amount_paid, pr.balance, pr.status;

-- Attendance summary per student per term
CREATE VIEW v_attendance_summary AS
SELECT
  s.admission_no,
  s.full_name,
  c.name                   AS class_name,
  a.session_id,
  COUNT(*)                 AS total_days,
  SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) AS days_present,
  SUM(CASE WHEN a.status = 'absent'  THEN 1 ELSE 0 END) AS days_absent,
  SUM(CASE WHEN a.status = 'late'    THEN 1 ELSE 0 END) AS days_late,
  ROUND(SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END)::NUMERIC
        / COUNT(*) * 100, 1)                             AS attendance_pct
FROM attendance a
JOIN students s ON s.id = a.student_id
JOIN classes  c ON c.id = a.class_id
GROUP BY s.admission_no, s.full_name, c.name, a.session_id;
```

---

## KEY SQL QUERIES

```sql
-- 1. Get a pupil's full result for a term
SELECT * FROM v_pupil_results
WHERE admission_no = 'RCA/2024/0042'
  AND term = 'term2'
  AND session = '2025/2026'
ORDER BY subject_code;

-- 2. Check if a teacher can enter scores for a class/subject
SELECT 1 FROM teacher_assignments ta
JOIN users u ON u.id = ta.user_id
WHERE u.email = 'chiamaka.nnaji@royalcrystalacademy.edu.ng'
  AND ta.class_id = (SELECT id FROM classes WHERE name = 'Basic 4')
  AND ta.subject_id = (SELECT id FROM subjects WHERE code = 'eng');

-- 3. Get all outstanding fee balances
SELECT * FROM v_payment_summary
WHERE status != 'paid'
ORDER BY balance DESC;

-- 4. Get class attendance for a date
SELECT s.full_name, a.status
FROM attendance a
JOIN students s ON s.id = a.student_id
WHERE a.class_id = (SELECT id FROM classes WHERE name = 'Basic 4')
  AND a.date = '2026-06-15'
ORDER BY s.full_name;

-- 5. Get all published announcements for parents
SELECT a.title, a.body, a.published_at, u.full_name AS author
FROM announcements a
JOIN users u ON u.id = a.author_id
WHERE a.status = 'published'
  AND a.id IN (
    SELECT announcement_id FROM announcement_audiences
    WHERE audience_role IN ('all','parent')
  )
ORDER BY a.published_at DESC;

-- 6. Record a payment
BEGIN;
  INSERT INTO payment_transactions
    (payment_record_id, amount, method, receipt_no, payment_date, recorded_by)
  VALUES ($1, $2, $3, $4, $5, $6);

  UPDATE payment_records
  SET amount_paid = amount_paid + $2,
      status = CASE
        WHEN amount_paid + $2 >= amount_expected THEN 'paid'
        ELSE 'partial'
      END,
      updated_at = NOW()
  WHERE id = $1;
COMMIT;

-- 7. Submit scores (lock them)
UPDATE scores
SET is_locked = TRUE, submitted_at = NOW()
WHERE student_id IN (
  SELECT id FROM students WHERE class_id = $1
)
AND subject_id = $2
AND term = $3;

UPDATE result_approvals
SET status = 'submitted', submitted_by = $4, submitted_at = NOW()
WHERE class_id = $1 AND term = $3;
```

---

## ERD REFERENCE (Table Relationships)

```
academic_sessions ──────────────────────────────────────────────┐
     │                                                           │
     │         ┌────── classes ──────────────────────────────┐  │
     │         │          │                                  │  │
     │         │    teacher_assignments ←── user_roles       │  │
     │         │          │                    │             │  │
     │         │       users ─────────────────┘             │  │
     │         │       │    │                               │  │
     │         │       │  parent_student_links              │  │
     │         │       │         │                          │  │
students ──────┘───────┘         │                          │  │
     │                           │                          │  │
     ├── scores ─────────────────┼── subjects               │  │
     │                           │                          │  │
     ├── behavior_ratings ───────┼── behavior_traits        │  │
     │                           │                          │  │
     ├── class_comments          │                          │  │
     │                           │                          │  │
     ├── attendance ─────────────┼── classes                │  │
     │                           │                          │  │
     ├── discipline_records ─────┘                          │  │
     │                                                      │  │
     ├── payment_records ── payment_transactions ───────────┘  │
     │         │                                               │
     │    fee_schedules ────────────────────────────────────────┘
     │
     ├── ict_progress
     │
result_approvals ── classes
     │
announcements ── announcement_audiences
     │
calendar_events
     │
activity_logs
     │
ict_computers ── ict_maintenance_log
ict_club_members
ict_club_meetings
```

---

## GRADING RULES (Enforced in DB and App Layer)

```sql
-- Grade boundaries (stored as CHECK constraints in scores table)
-- A: 70–100  Excellent
-- B: 60–69   Very Good
-- C: 50–59   Good
-- D: 45–49   Pass
-- E: 40–44   Weak Pass
-- F:  0–39   Fail

-- CA weights
-- Test:       /10
-- Assessment: /10
-- Project:    /10
-- Mid-term:   /10
-- CA Total:   /40  (40%)
-- Exam:       /60  (60%)
-- Final:      /100
```

---

## WHAT CHANGES IN PHASE 4

Every `window.RCA.save('payments')` call in the frontend becomes:

```javascript
// Phase 1 & 2 (current):
window.RCA.save('payments')

// Phase 4 (backend):
await fetch('/api/payments', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ studentId, term, amount, method, receiptNo })
})
```

The data shapes are already identical — the frontend needs minimal changes.

---

*Document generated: June 2026 | Royal Crystal Academy School Management System*
