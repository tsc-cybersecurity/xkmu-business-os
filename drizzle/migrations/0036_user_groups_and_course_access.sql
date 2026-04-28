-- =============================================
-- User Groups + Course Access Grants
-- =============================================
-- Adds tenant-global user groups, group membership, and a per-course
-- allowlist (subject = user OR group). Empty grants list = open to all
-- portal users (current behavior preserved).

CREATE TABLE IF NOT EXISTS user_groups (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(200) NOT NULL,
  description  TEXT NULL,
  created_by   UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_groups_name ON user_groups (name);

CREATE TABLE IF NOT EXISTS user_group_members (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id  UUID NOT NULL REFERENCES user_groups(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  added_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_group_members_group_user
  ON user_group_members (group_id, user_id);

CREATE INDEX IF NOT EXISTS idx_user_group_members_user
  ON user_group_members (user_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'course_access_subject_kind') THEN
    CREATE TYPE course_access_subject_kind AS ENUM ('user', 'group');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS course_access_grants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id     UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  subject_kind  course_access_subject_kind NOT NULL,
  subject_id    UUID NOT NULL,
  created_by    UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_course_access_grants
  ON course_access_grants (course_id, subject_kind, subject_id);

CREATE INDEX IF NOT EXISTS idx_course_access_grants_course
  ON course_access_grants (course_id);

CREATE INDEX IF NOT EXISTS idx_course_access_grants_subject
  ON course_access_grants (subject_kind, subject_id);
