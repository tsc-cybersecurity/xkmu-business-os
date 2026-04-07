-- ============================================================================
-- Migration: Remove tenant_id from cms_settings, deduplicate, add unique key
-- ============================================================================

BEGIN;

-- 1. Keep only one row per key (the newest)
DELETE FROM cms_settings a
USING cms_settings b
WHERE a.key = b.key
  AND a.id <> b.id
  AND a.updated_at < b.updated_at;

-- 2. Fix double-encoded UTF-8 in design settings
UPDATE cms_settings
SET value = jsonb_set(
  value, '{footerText}',
  to_jsonb('© 2026 xKMU digital solutions UG (haftungsbeschränkt) – Alle Rechte vorbehalten.'::text)
)
WHERE key = 'design'
  AND (value->>'footerText' LIKE '%Â©%' OR value->>'footerText' LIKE '%Ã%');

UPDATE cms_settings
SET value = jsonb_set(
  jsonb_set(
    value, '{contactDescription}',
    to_jsonb('Haben Sie Fragen oder möchten Sie mehr über unsere Leistungen erfahren? Schreiben Sie uns!'::text)
  ),
  '{contactInterestTags}',
  '["KI-Beratung","KI-Automatisierung","KI-Assistenten & Chatbots","IT-Assessment","IT-Architektur & Cloud","Systemintegration","Security Quick Check","Hardening & Baselines","Backup & Recovery","Incident Response","Security Awareness","Datenschutz & Compliance","NIS-2 Unterstützung","Kombinations-Modul","Managed Services"]'::jsonb
)
WHERE key = 'design'
  AND (value->>'contactDescription' LIKE '%Ã%');

-- 3. Drop tenant_id column and old index
DROP INDEX IF EXISTS idx_cms_settings_tenant_key;
ALTER TABLE cms_settings DROP COLUMN IF EXISTS tenant_id;

-- 4. Add unique constraint on key
ALTER TABLE cms_settings ADD CONSTRAINT cms_settings_key_unique UNIQUE (key);
CREATE INDEX IF NOT EXISTS idx_cms_settings_key ON cms_settings(key);

COMMIT;
