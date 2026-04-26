-- Onlinekurse Sub-Projekt 1: Core Authoring + Content Model

CREATE TYPE course_visibility AS ENUM ('public', 'portal', 'both');

CREATE TABLE courses (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug               varchar(160) NOT NULL UNIQUE,
  title              varchar(200) NOT NULL,
  subtitle           varchar(300),
  description        text,
  cover_image_id     uuid REFERENCES media_uploads(id) ON DELETE SET NULL,
  visibility         course_visibility NOT NULL DEFAULT 'portal',
  status             varchar(20) NOT NULL DEFAULT 'draft',
  use_modules        boolean NOT NULL DEFAULT false,
  enforce_sequential boolean NOT NULL DEFAULT false,
  estimated_minutes  integer,
  created_by         uuid REFERENCES users(id) ON DELETE SET NULL,
  published_at       timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_courses_status ON courses(status);
CREATE INDEX idx_courses_visibility ON courses(visibility, status);

CREATE TABLE course_modules (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id   uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  position    integer NOT NULL,
  title       varchar(200) NOT NULL,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_course_modules_course ON course_modules(course_id, position);

CREATE TABLE course_assets (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id     uuid REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id     uuid,
  kind          varchar(20) NOT NULL,
  filename      varchar(255) NOT NULL,
  original_name varchar(255) NOT NULL,
  mime_type     varchar(120) NOT NULL,
  size_bytes    bigint NOT NULL,
  path          varchar(500) NOT NULL,
  label         varchar(200),
  position      integer,
  uploaded_by   uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_course_assets_course ON course_assets(course_id);
CREATE INDEX idx_course_assets_lesson ON course_assets(lesson_id);

CREATE TABLE course_lessons (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id          uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  module_id          uuid REFERENCES course_modules(id) ON DELETE SET NULL,
  position           integer NOT NULL,
  slug               varchar(160) NOT NULL,
  title              varchar(200) NOT NULL,
  content_markdown   text,
  video_asset_id     uuid REFERENCES course_assets(id) ON DELETE SET NULL,
  video_external_url text,
  duration_minutes   integer,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_course_lessons_slug UNIQUE (course_id, slug)
);
CREATE INDEX idx_course_lessons_course ON course_lessons(course_id, position);
CREATE INDEX idx_course_lessons_module ON course_lessons(module_id, position);

ALTER TABLE course_assets
  ADD CONSTRAINT course_assets_lesson_id_fkey
  FOREIGN KEY (lesson_id) REFERENCES course_lessons(id) ON DELETE CASCADE;
