-- ============================================================
-- Migration 016: Onlinekurse Sub-Projekt 1 — Core Authoring + Content Model
-- Tabellen: courses, course_modules, course_assets, course_lessons
-- Idempotent.
-- ============================================================

-- ENUM course_visibility (idempotent via Exception-Handler)
DO $$
BEGIN
  CREATE TYPE course_visibility AS ENUM ('public', 'portal', 'both');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- courses
CREATE TABLE IF NOT EXISTS courses (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug               VARCHAR(160) NOT NULL UNIQUE,
  title              VARCHAR(200) NOT NULL,
  subtitle           VARCHAR(300),
  description        TEXT,
  cover_image_id     UUID REFERENCES media_uploads(id) ON DELETE SET NULL,
  visibility         course_visibility NOT NULL DEFAULT 'portal',
  status             VARCHAR(20) NOT NULL DEFAULT 'draft',
  use_modules        BOOLEAN NOT NULL DEFAULT FALSE,
  enforce_sequential BOOLEAN NOT NULL DEFAULT FALSE,
  estimated_minutes  INTEGER,
  created_by         UUID REFERENCES users(id) ON DELETE SET NULL,
  published_at       TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);
CREATE INDEX IF NOT EXISTS idx_courses_visibility ON courses(visibility, status);

-- course_modules
CREATE TABLE IF NOT EXISTS course_modules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id   UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  position    INTEGER NOT NULL,
  title       VARCHAR(200) NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_course_modules_course ON course_modules(course_id, position);

-- course_assets (lesson_id FK wird unten deferred hinzugefuegt — course_lessons existiert noch nicht)
CREATE TABLE IF NOT EXISTS course_assets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id     UUID REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id     UUID,
  kind          VARCHAR(20) NOT NULL,
  filename      VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type     VARCHAR(120) NOT NULL,
  size_bytes    BIGINT NOT NULL,
  path          VARCHAR(500) NOT NULL,
  label         VARCHAR(200),
  position      INTEGER,
  uploaded_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_course_assets_course ON course_assets(course_id);
CREATE INDEX IF NOT EXISTS idx_course_assets_lesson ON course_assets(lesson_id);

-- course_lessons
CREATE TABLE IF NOT EXISTS course_lessons (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id          UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  module_id          UUID REFERENCES course_modules(id) ON DELETE SET NULL,
  position           INTEGER NOT NULL,
  slug               VARCHAR(160) NOT NULL,
  title              VARCHAR(200) NOT NULL,
  content_markdown   TEXT,
  video_asset_id     UUID REFERENCES course_assets(id) ON DELETE SET NULL,
  video_external_url TEXT,
  duration_minutes   INTEGER,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (course_id, slug)
);
CREATE INDEX IF NOT EXISTS idx_course_lessons_course ON course_lessons(course_id, position);
CREATE INDEX IF NOT EXISTS idx_course_lessons_module ON course_lessons(module_id, position);

-- Deferred FK: course_assets.lesson_id -> course_lessons.id (idempotent via pg_constraint-Guard)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'course_assets_lesson_id_fkey') THEN
    ALTER TABLE course_assets
      ADD CONSTRAINT course_assets_lesson_id_fkey
      FOREIGN KEY (lesson_id) REFERENCES course_lessons(id) ON DELETE CASCADE;
  END IF;
END $$;
