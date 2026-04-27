-- =============================================
-- Onlinekurse Sub-3 Vorbereitung: Lesson Content Blocks
-- =============================================
-- Polymorphe Tabelle für Lesson-Inhalte (Markdown-Chunks + CMS-Block-Refs)
-- + Migration der bestehenden contentMarkdown-Inhalte als ersten Markdown-Block
-- + 6 neue CMS-Block-Typen (course-callout, course-code, course-learning-objectives,
--   course-key-takeaways, course-step-by-step, course-accordion)
-- + Freigabe von 6 bestehenden Blocks für Lessons
--
-- Idempotent: alle Statements nutzen IF NOT EXISTS / ON CONFLICT.

CREATE TABLE IF NOT EXISTS course_lesson_blocks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id       UUID NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,
  position        INTEGER NOT NULL,
  kind            VARCHAR(20) NOT NULL,
  markdown_body   TEXT NULL,
  block_type      VARCHAR(50) NULL,
  content         JSONB NOT NULL DEFAULT '{}'::jsonb,
  settings        JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_visible      BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT course_lesson_blocks_kind_chk CHECK (
    (kind = 'markdown'  AND markdown_body IS NOT NULL AND block_type IS NULL)
    OR
    (kind = 'cms_block' AND block_type IS NOT NULL AND markdown_body IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_course_lesson_blocks_lesson
  ON course_lesson_blocks (lesson_id, position);

INSERT INTO course_lesson_blocks (lesson_id, position, kind, markdown_body)
SELECT cl.id, 1, 'markdown', cl.content_markdown
FROM course_lessons cl
WHERE cl.content_markdown IS NOT NULL
  AND cl.content_markdown <> ''
  AND NOT EXISTS (
    SELECT 1 FROM course_lesson_blocks clb WHERE clb.lesson_id = cl.id
  );

ALTER TABLE cms_block_type_definitions
  ADD COLUMN IF NOT EXISTS available_in_lessons BOOLEAN NOT NULL DEFAULT false;

UPDATE cms_block_type_definitions
SET available_in_lessons = true
WHERE slug IN ('video', 'image', 'gallery', 'text', 'divider', 'heading');

INSERT INTO cms_block_type_definitions
  (slug, name, description, icon, category, fields, default_content, default_settings, is_active, sort_order, available_in_lessons)
VALUES
(
  'course-callout',
  'Hinweis / Callout',
  'Hervorgehobener Hinweis: Tipp, Warnung, Info, Achtung.',
  'lightbulb',
  'course',
  '[
    {"name":"variant","label":"Typ","type":"select","options":["note","tip","warning","danger","info"],"default":"tip"},
    {"name":"title","label":"Titel","type":"text"},
    {"name":"body","label":"Text","type":"textarea"}
  ]'::jsonb,
  '{"variant":"tip","title":"Tipp","body":"Hier eine wichtige Anmerkung."}'::jsonb,
  '{}'::jsonb,
  true, 100, true
),
(
  'course-code',
  'Code-Block',
  'Code mit Syntax-Highlighting und Copy-Button.',
  'code',
  'course',
  '[
    {"name":"language","label":"Sprache","type":"text","default":"typescript"},
    {"name":"filename","label":"Dateiname (optional)","type":"text"},
    {"name":"code","label":"Code","type":"textarea"},
    {"name":"showLineNumbers","label":"Zeilennummern","type":"boolean","default":false}
  ]'::jsonb,
  '{"language":"typescript","code":"// Beispiel\nconst x = 1","showLineNumbers":false}'::jsonb,
  '{}'::jsonb,
  true, 101, true
),
(
  'course-learning-objectives',
  'Lernziele',
  'Liste „Was du nach dieser Lektion kannst".',
  'target',
  'course',
  '[
    {"name":"title","label":"Titel","type":"text","default":"Was du lernst"},
    {"name":"items","label":"Lernziele (eines pro Zeile)","type":"list-text"}
  ]'::jsonb,
  '{"title":"Was du lernst","items":["Lernziel 1","Lernziel 2"]}'::jsonb,
  '{}'::jsonb,
  true, 102, true
),
(
  'course-key-takeaways',
  'Wichtigste Punkte',
  'Zusammenfassung am Ende einer Lektion.',
  'sparkles',
  'course',
  '[
    {"name":"title","label":"Titel","type":"text","default":"Wichtigste Punkte"},
    {"name":"items","label":"Punkte (eines pro Zeile)","type":"list-text"}
  ]'::jsonb,
  '{"title":"Wichtigste Punkte","items":["Wichtiger Punkt 1","Wichtiger Punkt 2"]}'::jsonb,
  '{}'::jsonb,
  true, 103, true
),
(
  'course-step-by-step',
  'Schritt-für-Schritt',
  'Nummerierte Anleitung mit Titel + optionaler Beschreibung pro Schritt.',
  'list-ordered',
  'course',
  '[
    {"name":"title","label":"Titel","type":"text"},
    {"name":"steps","label":"Schritte","type":"list-object","schema":[
      {"name":"title","label":"Titel","type":"text"},
      {"name":"description","label":"Beschreibung","type":"textarea"}
    ]}
  ]'::jsonb,
  '{"steps":[{"title":"Schritt 1","description":""}]}'::jsonb,
  '{}'::jsonb,
  true, 104, true
),
(
  'course-accordion',
  'Akkordeon (Q&A)',
  'Aufklappbare Fragen & Antworten.',
  'list-collapse',
  'course',
  '[
    {"name":"items","label":"Einträge","type":"list-object","schema":[
      {"name":"question","label":"Frage","type":"text"},
      {"name":"answer","label":"Antwort (Markdown)","type":"textarea"}
    ]}
  ]'::jsonb,
  '{"items":[{"question":"Frage 1?","answer":"Antwort."}]}'::jsonb,
  '{}'::jsonb,
  true, 105, true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  category = EXCLUDED.category,
  fields = EXCLUDED.fields,
  default_content = EXCLUDED.default_content,
  default_settings = EXCLUDED.default_settings,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order,
  available_in_lessons = EXCLUDED.available_in_lessons;
