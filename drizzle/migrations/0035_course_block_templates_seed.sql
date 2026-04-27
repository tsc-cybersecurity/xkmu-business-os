-- =============================================
-- 018: Course Block System-Templates
-- =============================================
-- 12 vorgefertigte Templates für die 6 Course-Block-Typen aus 017.
-- Idempotent via Partial Unique Index + ON CONFLICT DO UPDATE.

CREATE UNIQUE INDEX IF NOT EXISTS uq_cms_block_templates_system_name_type
  ON cms_block_templates (name, block_type)
  WHERE is_system = true;

INSERT INTO cms_block_templates (name, block_type, content, settings, is_system) VALUES
('Tipp', 'course-callout', '{"variant":"tip","title":"Tipp","body":""}'::jsonb, '{}'::jsonb, true),
('Wichtig', 'course-callout', '{"variant":"warning","title":"Wichtig","body":""}'::jsonb, '{}'::jsonb, true),
('Hinweis', 'course-callout', '{"variant":"info","title":"Hinweis","body":""}'::jsonb, '{}'::jsonb, true),
('Achtung', 'course-callout', '{"variant":"danger","title":"Achtung","body":""}'::jsonb, '{}'::jsonb, true),
('Notiz', 'course-callout', '{"variant":"note","title":"Notiz","body":""}'::jsonb, '{}'::jsonb, true),
('TypeScript-Beispiel', 'course-code', '{"language":"typescript","showLineNumbers":true,"code":""}'::jsonb, '{}'::jsonb, true),
('Bash-Befehl', 'course-code', '{"language":"bash","showLineNumbers":false,"code":""}'::jsonb, '{}'::jsonb, true),
('SQL-Query', 'course-code', '{"language":"sql","showLineNumbers":true,"code":""}'::jsonb, '{}'::jsonb, true),
('Standard-Lernziele', 'course-learning-objectives', '{"title":"Was du in dieser Lektion lernst","items":[]}'::jsonb, '{}'::jsonb, true),
('Standard-Zusammenfassung', 'course-key-takeaways', '{"title":"Wichtigste Punkte","items":[]}'::jsonb, '{}'::jsonb, true),
('Anleitung', 'course-step-by-step', '{"title":"Anleitung","steps":[{"title":"","description":""}]}'::jsonb, '{}'::jsonb, true),
('FAQ', 'course-accordion', '{"items":[{"question":"","answer":""}]}'::jsonb, '{}'::jsonb, true)
ON CONFLICT (name, block_type) WHERE is_system = true
DO UPDATE SET
  content  = EXCLUDED.content,
  settings = EXCLUDED.settings;
