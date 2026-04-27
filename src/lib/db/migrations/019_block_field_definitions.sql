-- =============================================
-- 019: Block Field Definitions for Lesson Editor
-- =============================================
-- Sub-2c: Generischer Lesson-Block-Edit-Dialog braucht strukturierte
-- Field-Definitionen ({ name, label, type, options?, schema? }) statt der
-- bisherigen string[]-Spalte `fields` (nur Feldnamen).
--
-- Loesung: neue Spalte `field_definitions` (jsonb), gepflegt fuer alle
-- 12 lesson-verfuegbaren Block-Typen (6 course-* + 6 legacy).
-- Die alte `fields`-Spalte bleibt fuer Backwards-Compat im CMS-Page-Editor.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS, UPDATE per slug.

ALTER TABLE cms_block_type_definitions
  ADD COLUMN IF NOT EXISTS field_definitions JSONB NOT NULL DEFAULT '[]'::jsonb;

-- ----- 6 neue Course-Block-Typen -----

UPDATE cms_block_type_definitions
SET field_definitions = '[
  {"name": "variant",  "label": "Variante", "type": "select",
   "options": ["note", "tip", "info", "warning", "danger"]},
  {"name": "title",    "label": "Titel",    "type": "text"},
  {"name": "body",     "label": "Text",     "type": "textarea"}
]'::jsonb
WHERE slug = 'course-callout';

UPDATE cms_block_type_definitions
SET field_definitions = '[
  {"name": "language",        "label": "Sprache",          "type": "text"},
  {"name": "filename",        "label": "Dateiname",        "type": "text"},
  {"name": "code",            "label": "Code",             "type": "textarea"},
  {"name": "showLineNumbers", "label": "Zeilennummern",    "type": "boolean"}
]'::jsonb
WHERE slug = 'course-code';

UPDATE cms_block_type_definitions
SET field_definitions = '[
  {"name": "title", "label": "Titel",       "type": "text"},
  {"name": "items", "label": "Lernziele",   "type": "list-text"}
]'::jsonb
WHERE slug = 'course-learning-objectives';

UPDATE cms_block_type_definitions
SET field_definitions = '[
  {"name": "title", "label": "Titel",       "type": "text"},
  {"name": "items", "label": "Erkenntnisse","type": "list-text"}
]'::jsonb
WHERE slug = 'course-key-takeaways';

UPDATE cms_block_type_definitions
SET field_definitions = '[
  {"name": "title", "label": "Titel", "type": "text"},
  {"name": "steps", "label": "Schritte", "type": "list-object", "schema": [
    {"name": "title",       "label": "Schritt-Titel",  "type": "text"},
    {"name": "description", "label": "Beschreibung",   "type": "textarea"}
  ]}
]'::jsonb
WHERE slug = 'course-step-by-step';

UPDATE cms_block_type_definitions
SET field_definitions = '[
  {"name": "items", "label": "Frage-Antwort-Paare", "type": "list-object", "schema": [
    {"name": "question", "label": "Frage",    "type": "text"},
    {"name": "answer",   "label": "Antwort",  "type": "textarea"}
  ]}
]'::jsonb
WHERE slug = 'course-accordion';

-- ----- 6 Legacy-Typen, in 017 als lesson-verfuegbar markiert -----

UPDATE cms_block_type_definitions
SET field_definitions = '[
  {"name": "src",         "label": "Video-URL",     "type": "text"},
  {"name": "title",       "label": "Titel",         "type": "text"},
  {"name": "caption",     "label": "Bildunterschrift", "type": "text"},
  {"name": "width",       "label": "Breite",        "type": "select",
   "options": ["container", "full"]},
  {"name": "aspectRatio", "label": "Seitenverhaeltnis", "type": "select",
   "options": ["16:9", "4:3", "1:1", "21:9"]}
]'::jsonb
WHERE slug = 'video';

UPDATE cms_block_type_definitions
SET field_definitions = '[
  {"name": "src",     "label": "Bild-URL",         "type": "text"},
  {"name": "alt",     "label": "Alt-Text",         "type": "text"},
  {"name": "caption", "label": "Bildunterschrift", "type": "text"},
  {"name": "width",   "label": "Breite",           "type": "select",
   "options": ["container", "full", "narrow"]}
]'::jsonb
WHERE slug = 'image';

UPDATE cms_block_type_definitions
SET field_definitions = '[
  {"name": "sectionTitle", "label": "Sektion-Titel", "type": "text"},
  {"name": "columns",      "label": "Spalten",       "type": "select",
   "options": ["2", "3", "4"]},
  {"name": "items", "label": "Bilder", "type": "list-object", "schema": [
    {"name": "src",     "label": "Bild-URL",   "type": "text"},
    {"name": "alt",     "label": "Alt-Text",   "type": "text"},
    {"name": "caption", "label": "Bildunterschrift", "type": "text"}
  ]}
]'::jsonb
WHERE slug = 'gallery';

UPDATE cms_block_type_definitions
SET field_definitions = '[
  {"name": "content",   "label": "Inhalt (Markdown)", "type": "textarea"},
  {"name": "alignment", "label": "Ausrichtung",       "type": "select",
   "options": ["left", "center", "right"]}
]'::jsonb
WHERE slug = 'text';

UPDATE cms_block_type_definitions
SET field_definitions = '[
  {"name": "style", "label": "Stil", "type": "select",
   "options": ["solid", "dashed", "dotted", "gradient"]},
  {"name": "label", "label": "Label (optional)", "type": "text"}
]'::jsonb
WHERE slug = 'divider';

UPDATE cms_block_type_definitions
SET field_definitions = '[
  {"name": "text",     "label": "Text",     "type": "text"},
  {"name": "level",    "label": "Ebene",    "type": "select",
   "options": ["1", "2", "3", "4"]},
  {"name": "subtitle", "label": "Untertitel", "type": "text"}
]'::jsonb
WHERE slug = 'heading';
