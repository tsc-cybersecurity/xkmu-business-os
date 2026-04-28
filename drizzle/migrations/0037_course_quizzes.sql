-- =============================================
-- Course Quizzes (Phase 2)
-- =============================================
-- One optional quiz per lesson. When present, lesson completion requires
-- a passing attempt. Options stored as JSONB on questions; answers as
-- JSONB per attempt.

CREATE TABLE IF NOT EXISTS course_quizzes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id       UUID NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,
  pass_threshold  INTEGER NOT NULL DEFAULT 70 CHECK (pass_threshold BETWEEN 0 AND 100),
  allow_retake    BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_course_quizzes_lesson ON course_quizzes (lesson_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'course_quiz_question_kind') THEN
    CREATE TYPE course_quiz_question_kind AS ENUM ('single', 'multiple', 'truefalse');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS course_quiz_questions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id      UUID NOT NULL REFERENCES course_quizzes(id) ON DELETE CASCADE,
  position     INTEGER NOT NULL,
  kind         course_quiz_question_kind NOT NULL,
  prompt       TEXT NOT NULL,
  options      JSONB NOT NULL DEFAULT '[]'::jsonb,
  explanation  TEXT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_course_quiz_questions_quiz
  ON course_quiz_questions (quiz_id, position);

CREATE TABLE IF NOT EXISTS course_quiz_attempts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id       UUID NOT NULL REFERENCES course_quizzes(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score         INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  passed        BOOLEAN NOT NULL,
  answers       JSONB NOT NULL DEFAULT '{}'::jsonb,
  completed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_course_quiz_attempts_quiz_user
  ON course_quiz_attempts (quiz_id, user_id, completed_at);
