-- =============================================
-- Course Assignments (Phase 3) — Pflichtkurse mit Deadline
-- =============================================
-- Reuses course_access_subject_kind ENUM. An assignment implies access
-- (see CourseAccessService.accessibleCondition union).

CREATE TABLE IF NOT EXISTS course_assignments (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id          UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  subject_kind       course_access_subject_kind NOT NULL,
  subject_id         UUID NOT NULL,
  due_date           TIMESTAMPTZ NULL,
  assigned_by        UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  assigned_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_reminder_at   TIMESTAMPTZ NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_course_assignments
  ON course_assignments (course_id, subject_kind, subject_id);

CREATE INDEX IF NOT EXISTS idx_course_assignments_course
  ON course_assignments (course_id);

CREATE INDEX IF NOT EXISTS idx_course_assignments_subject
  ON course_assignments (subject_kind, subject_id);

CREATE INDEX IF NOT EXISTS idx_course_assignments_due
  ON course_assignments (due_date);
