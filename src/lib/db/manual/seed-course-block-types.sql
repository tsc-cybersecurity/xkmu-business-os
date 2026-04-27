-- =============================================================================
-- Manueller Seed: Course-Lesson-Block-Types + FieldDefinitions
-- =============================================================================
-- Sub-2c Workaround: Ersetzt Migrations 017+019, weil deren Migrator-Lauf
-- wegen Legacy-001 stirbt und drizzle-kit push die DDL-Spalte
-- field_definitions wegen Owner-Permissions nicht durchbekommt.
--
-- Ausführung: einmalig als DB-Superuser (postgres-Rolle) gegen prod-DB.
-- Idempotent: kann beliebig oft re-ran werden.
--
--   psql:               docker exec -i supabase-db psql -U postgres -d postgres < seed-course-block-types.sql
--   Supabase Studio:    Datei-Inhalt einfügen, "Run" — oder block-weise
--                       falls der Editor mit grossen Statements zickt.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Spalte field_definitions sicherstellen
-- -----------------------------------------------------------------------------

ALTER TABLE cms_block_type_definitions
  ADD COLUMN IF NOT EXISTS field_definitions JSONB NOT NULL DEFAULT '[]'::jsonb;

-- -----------------------------------------------------------------------------
-- 2. Sechs Legacy-Typen für Lessons freigeben
-- -----------------------------------------------------------------------------

UPDATE cms_block_type_definitions SET available_in_lessons = true WHERE slug = 'video';
UPDATE cms_block_type_definitions SET available_in_lessons = true WHERE slug = 'image';
UPDATE cms_block_type_definitions SET available_in_lessons = true WHERE slug = 'gallery';
UPDATE cms_block_type_definitions SET available_in_lessons = true WHERE slug = 'text';
UPDATE cms_block_type_definitions SET available_in_lessons = true WHERE slug = 'divider';
UPDATE cms_block_type_definitions SET available_in_lessons = true WHERE slug = 'heading';

-- -----------------------------------------------------------------------------
-- 3. FieldDefinitions für die 6 Legacy-Typen
-- -----------------------------------------------------------------------------

UPDATE cms_block_type_definitions
SET field_definitions = '[
  {"name":"src","label":"Video-URL","type":"text"},
  {"name":"title","label":"Titel","type":"text"},
  {"name":"caption","label":"Bildunterschrift","type":"text"},
  {"name":"width","label":"Breite","type":"select","options":["container","full"]},
  {"name":"aspectRatio","label":"Seitenverhältnis","type":"select","options":["16:9","4:3","1:1","21:9"]}
]'::jsonb
WHERE slug = 'video';

UPDATE cms_block_type_definitions
SET field_definitions = '[
  {"name":"src","label":"Bild-URL","type":"text"},
  {"name":"alt","label":"Alt-Text","type":"text"},
  {"name":"caption","label":"Bildunterschrift","type":"text"},
  {"name":"width","label":"Breite","type":"select","options":["container","full","narrow"]}
]'::jsonb
WHERE slug = 'image';

UPDATE cms_block_type_definitions
SET field_definitions = '[
  {"name":"sectionTitle","label":"Sektion-Titel","type":"text"},
  {"name":"columns","label":"Spalten","type":"select","options":["2","3","4"]},
  {"name":"items","label":"Bilder","type":"list-object","schema":[
    {"name":"src","label":"Bild-URL","type":"text"},
    {"name":"alt","label":"Alt-Text","type":"text"},
    {"name":"caption","label":"Bildunterschrift","type":"text"}
  ]}
]'::jsonb
WHERE slug = 'gallery';

UPDATE cms_block_type_definitions
SET field_definitions = '[
  {"name":"content","label":"Inhalt (Markdown)","type":"textarea"},
  {"name":"alignment","label":"Ausrichtung","type":"select","options":["left","center","right"]}
]'::jsonb
WHERE slug = 'text';

UPDATE cms_block_type_definitions
SET field_definitions = '[
  {"name":"style","label":"Stil","type":"select","options":["solid","dashed","dotted","gradient"]},
  {"name":"label","label":"Label (optional)","type":"text"}
]'::jsonb
WHERE slug = 'divider';

UPDATE cms_block_type_definitions
SET field_definitions = '[
  {"name":"text","label":"Text","type":"text"},
  {"name":"level","label":"Ebene","type":"select","options":["1","2","3","4"]},
  {"name":"subtitle","label":"Untertitel","type":"text"}
]'::jsonb
WHERE slug = 'heading';

-- -----------------------------------------------------------------------------
-- 4. Sechs neue Course-* Typen anlegen oder updaten
-- -----------------------------------------------------------------------------

INSERT INTO cms_block_type_definitions (
  slug, name, description, icon, category,
  fields, field_definitions, default_content, default_settings,
  is_active, sort_order, available_in_lessons
) VALUES (
  'course-callout',
  'Hinweis / Callout',
  'Hervorgehobener Hinweisblock (Tipp, Warnung, Info, Gefahr)',
  'AlertCircle',
  'course',
  '["variant","title","body"]'::jsonb,
  '[{"name":"variant","label":"Variante","type":"select","options":["note","tip","info","warning","danger"]},{"name":"title","label":"Titel","type":"text"},{"name":"body","label":"Text","type":"textarea"}]'::jsonb,
  '{"variant":"tip","title":"","body":""}'::jsonb,
  '{}'::jsonb,
  true, 100, true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  category = EXCLUDED.category,
  field_definitions = EXCLUDED.field_definitions,
  available_in_lessons = true;

INSERT INTO cms_block_type_definitions (
  slug, name, description, icon, category,
  fields, field_definitions, default_content, default_settings,
  is_active, sort_order, available_in_lessons
) VALUES (
  'course-code',
  'Code-Block',
  'Code mit Syntax-Highlighting und Copy-Button',
  'Code',
  'course',
  '["language","filename","code","showLineNumbers"]'::jsonb,
  '[{"name":"language","label":"Sprache","type":"text"},{"name":"filename","label":"Dateiname","type":"text"},{"name":"code","label":"Code","type":"textarea"},{"name":"showLineNumbers","label":"Zeilennummern","type":"boolean"}]'::jsonb,
  '{"language":"typescript","code":"","filename":"","showLineNumbers":false}'::jsonb,
  '{}'::jsonb,
  true, 101, true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  category = EXCLUDED.category,
  field_definitions = EXCLUDED.field_definitions,
  available_in_lessons = true;

INSERT INTO cms_block_type_definitions (
  slug, name, description, icon, category,
  fields, field_definitions, default_content, default_settings,
  is_active, sort_order, available_in_lessons
) VALUES (
  'course-learning-objectives',
  'Lernziele',
  'Liste der Lernziele dieser Lektion',
  'Target',
  'course',
  '["title","items"]'::jsonb,
  '[{"name":"title","label":"Titel","type":"text"},{"name":"items","label":"Lernziele","type":"list-text"}]'::jsonb,
  '{"title":"Was du lernst","items":[]}'::jsonb,
  '{}'::jsonb,
  true, 102, true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  category = EXCLUDED.category,
  field_definitions = EXCLUDED.field_definitions,
  available_in_lessons = true;

INSERT INTO cms_block_type_definitions (
  slug, name, description, icon, category,
  fields, field_definitions, default_content, default_settings,
  is_active, sort_order, available_in_lessons
) VALUES (
  'course-key-takeaways',
  'Wichtigste Punkte',
  'Zusammenfassung der wichtigsten Erkenntnisse',
  'Sparkles',
  'course',
  '["title","items"]'::jsonb,
  '[{"name":"title","label":"Titel","type":"text"},{"name":"items","label":"Erkenntnisse","type":"list-text"}]'::jsonb,
  '{"title":"Wichtigste Punkte","items":[]}'::jsonb,
  '{}'::jsonb,
  true, 103, true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  category = EXCLUDED.category,
  field_definitions = EXCLUDED.field_definitions,
  available_in_lessons = true;

INSERT INTO cms_block_type_definitions (
  slug, name, description, icon, category,
  fields, field_definitions, default_content, default_settings,
  is_active, sort_order, available_in_lessons
) VALUES (
  'course-step-by-step',
  'Schritt-für-Schritt',
  'Nummerierte Anleitung mit mehreren Schritten',
  'ListOrdered',
  'course',
  '["title","steps"]'::jsonb,
  '[{"name":"title","label":"Titel","type":"text"},{"name":"steps","label":"Schritte","type":"list-object","schema":[{"name":"title","label":"Schritt-Titel","type":"text"},{"name":"description","label":"Beschreibung","type":"textarea"}]}]'::jsonb,
  '{"title":"","steps":[]}'::jsonb,
  '{}'::jsonb,
  true, 104, true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  category = EXCLUDED.category,
  field_definitions = EXCLUDED.field_definitions,
  available_in_lessons = true;

INSERT INTO cms_block_type_definitions (
  slug, name, description, icon, category,
  fields, field_definitions, default_content, default_settings,
  is_active, sort_order, available_in_lessons
) VALUES (
  'course-accordion',
  'FAQ / Akkordeon',
  'Aufklappbare Frage-Antwort-Paare',
  'ChevronDown',
  'course',
  '["items"]'::jsonb,
  '[{"name":"items","label":"Frage-Antwort-Paare","type":"list-object","schema":[{"name":"question","label":"Frage","type":"text"},{"name":"answer","label":"Antwort","type":"textarea"}]}]'::jsonb,
  '{"items":[]}'::jsonb,
  '{}'::jsonb,
  true, 105, true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  category = EXCLUDED.category,
  field_definitions = EXCLUDED.field_definitions,
  available_in_lessons = true;

-- -----------------------------------------------------------------------------
-- 5. Verify
-- -----------------------------------------------------------------------------

SELECT
  slug,
  available_in_lessons,
  jsonb_array_length(field_definitions) AS fdef_count,
  field_definitions
FROM cms_block_type_definitions
WHERE available_in_lessons = true
ORDER BY sort_order;
