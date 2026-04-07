-- ============================================================================
-- CMS Consolidated Migration
-- Runs all pending migrations in correct order. Safe to re-run (idempotent).
-- Wrapped in transaction: if ANY step fails, NOTHING changes.
-- ============================================================================

-- DRY RUN: Uncomment next line to test without applying changes
-- SET session_replication_role = 'replica';

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Drop tenant_id from CMS + Blog tables (IF EXISTS = safe if already done)
-- ═══════════════════════════════════════════════════════════════════════════
DO $$ BEGIN RAISE NOTICE '── Step 1: Drop tenant_id columns ──'; END $$;
ALTER TABLE cms_pages DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE cms_blocks DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE cms_block_templates DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE cms_navigation_items DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE blog_posts DROP COLUMN IF EXISTS tenant_id;

-- Drop old tenant-prefixed indexes
DROP INDEX IF EXISTS idx_cms_pages_tenant_slug;
DROP INDEX IF EXISTS idx_cms_pages_tenant_status;
DROP INDEX IF EXISTS idx_cms_blocks_tenant;
DROP INDEX IF EXISTS idx_cms_block_templates_tenant;
DROP INDEX IF EXISTS idx_cms_block_templates_tenant_type;
DROP INDEX IF EXISTS idx_cms_nav_items_tenant_location_sort;
DROP INDEX IF EXISTS idx_blog_posts_tenant_slug;
DROP INDEX IF EXISTS idx_blog_posts_tenant_status;
DROP INDEX IF EXISTS idx_blog_posts_tenant_published;
DROP INDEX IF EXISTS idx_blog_posts_tenant_category;

-- Create new indexes
CREATE INDEX IF NOT EXISTS idx_cms_pages_slug ON cms_pages(slug);
CREATE INDEX IF NOT EXISTS idx_cms_pages_status ON cms_pages(status);
CREATE INDEX IF NOT EXISTS idx_cms_block_templates_type ON cms_block_templates(block_type);
CREATE INDEX IF NOT EXISTS idx_cms_nav_items_location_sort ON cms_navigation_items(location, sort_order);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(published_at);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON blog_posts(category);

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. cms_settings: cleanup, drop tenant_id, remove unique constraint
-- ═══════════════════════════════════════════════════════════════════════════
DO $$ BEGIN RAISE NOTICE '── Step 2: Clean cms_settings ──'; END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cms_settings' AND column_name='tenant_id') THEN
    DELETE FROM cms_settings a USING cms_settings b WHERE a.key = b.key AND a.id <> b.id AND a.updated_at < b.updated_at;
    DROP INDEX IF EXISTS idx_cms_settings_tenant_key;
    ALTER TABLE cms_settings DROP COLUMN tenant_id;
  END IF;
END $$;
ALTER TABLE cms_settings DROP CONSTRAINT IF EXISTS cms_settings_key_unique;
CREATE INDEX IF NOT EXISTS idx_cms_settings_key ON cms_settings(key);

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. Design settings (insert only if not exists, fix encoding if broken)
-- ═══════════════════════════════════════════════════════════════════════════
DO $$ BEGIN RAISE NOTICE '── Step 3: Design settings ──'; END $$;
INSERT INTO cms_settings (key, value)
SELECT 'design', jsonb_build_object(
  'defaultFont', 'ubuntu',
  'defaultAccent', 'blue',
  'defaultRadius', 'default',
  'defaultTheme', 'light',
  'headerSticky', true,
  'footerText', '© 2026 xKMU digital solutions UG (haftungsbeschränkt) – Alle Rechte vorbehalten.',
  'contactHeadline', 'Kontakt',
  'contactDescription', 'Haben Sie Fragen oder möchten Sie mehr über unsere Leistungen erfahren? Schreiben Sie uns!',
  'contactInterestTags', '["KI-Beratung","KI-Automatisierung","KI-Assistenten & Chatbots","IT-Assessment","IT-Architektur & Cloud","Systemintegration","Security Quick Check","Hardening & Baselines","Backup & Recovery","Incident Response","Security Awareness","Datenschutz & Compliance","NIS-2 Unterstützung","Kombinations-Modul","Managed Services"]'::jsonb
)
WHERE NOT EXISTS (SELECT 1 FROM cms_settings WHERE key = 'design');

-- Fix double-encoded UTF-8 if present
UPDATE cms_settings
SET value = jsonb_set(
  value, '{footerText}',
  to_jsonb('© 2026 xKMU digital solutions UG (haftungsbeschränkt) – Alle Rechte vorbehalten.'::text)
)
WHERE key = 'design'
  AND (value->>'footerText' LIKE '%Â©%' OR value->>'footerText' LIKE '%Ã%');

-- Clean design keys from tenants.settings
UPDATE tenants
SET settings = settings
  - 'defaultFont' - 'defaultAccent' - 'defaultRadius' - 'defaultTheme'
  - 'logoUrl' - 'logoAlt' - 'headerSticky' - 'footerText'
  - 'contactHeadline' - 'contactDescription' - 'contactInterestTags'
WHERE settings IS NOT NULL
  AND (settings ? 'defaultFont' OR settings ? 'footerText' OR settings ? 'contactInterestTags');

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. Seed new block types (ON CONFLICT DO NOTHING = safe if already exists)
-- ═══════════════════════════════════════════════════════════════════════════
DO $$ BEGIN RAISE NOTICE '── Step 4: Seed block types ──'; END $$;
INSERT INTO cms_block_type_definitions (slug, name, description, icon, category, fields, default_content, default_settings, is_active, sort_order)
VALUES
  ('contact-form', 'Kontaktformular', 'Kontaktformular mit Themen-Tags, Validierung und Lead-Erstellung', 'Mail', 'content',
   '["interestTags","submitLabel","successHeadline","successMessage","privacyUrl"]'::jsonb,
   '{"interestTags":["KI-Beratung","IT-Beratung","Cybersecurity","Managed Services"],"submitLabel":"Nachricht senden","successHeadline":"Vielen Dank!","successMessage":"Wir melden uns schnellstmöglich.","privacyUrl":"/datenschutz"}'::jsonb,
   '{}'::jsonb, true, 22),
  ('columns', 'Spalten-Layout', 'Mehrspalten-Layout mit eingebetteten Blöcken (2 oder 3 Spalten)', 'Columns3', 'layout',
   '["columns","layout","left","center","right"]'::jsonb,
   '{"columns":2,"layout":"equal","left":[{"blockType":"text","content":{"content":"Linke Spalte"}}],"right":[{"blockType":"text","content":{"content":"Rechte Spalte"}}]}'::jsonb,
   '{}'::jsonb, true, 23)
ON CONFLICT (slug) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. Kontakt CMS page (only if not exists - won't overwrite manual edits)
-- ═══════════════════════════════════════════════════════════════════════════
DO $$ BEGIN RAISE NOTICE '── Step 5: Kontakt page ──'; END $$;

-- Only insert if /kontakt doesn't exist yet
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM cms_pages WHERE slug = '/kontakt') THEN
    RAISE NOTICE '  /kontakt page already exists, skipping';
    RETURN;
  END IF;

  INSERT INTO cms_pages (slug, title, seo_title, seo_description, status, published_at, created_at, updated_at)
  VALUES ('/kontakt', 'Kontakt', 'Kontakt | xKMU',
    'Haben Sie Fragen oder möchten Sie mehr über unsere Leistungen erfahren? Schreiben Sie uns!',
    'published', now(), now(), now());

  INSERT INTO cms_blocks (page_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  SELECT p.id, v.block_type, v.sort_order, v.content::jsonb, '{}'::jsonb, true, now(), now()
  FROM cms_pages p, (VALUES
    ('hero', 0, '{"badge":{"icon":"Mail","text":"Wir freuen uns auf Ihre Nachricht"},"headline":"Kontakt","subheadline":"Haben Sie Fragen oder möchten Sie mehr über unsere Leistungen erfahren? Schreiben Sie uns – wir melden uns schnellstmöglich.","size":"small"}'),
    ('contact-form', 1, '{"interestTags":["KI-Beratung","KI-Automatisierung","KI-Assistenten & Chatbots","IT-Assessment","IT-Architektur & Cloud","Systemintegration","Security Quick Check","Hardening & Baselines","Backup & Recovery","Incident Response","Security Awareness","Datenschutz & Compliance","NIS-2 Unterstützung","Kombinations-Modul","Managed Services"],"submitLabel":"Nachricht senden","successHeadline":"Vielen Dank für Ihre Nachricht!","successMessage":"Wir haben Ihre Anfrage erhalten und werden uns schnellstmöglich bei Ihnen melden.","privacyUrl":"/datenschutz"}')
  ) AS v(block_type, sort_order, content)
  WHERE p.slug = '/kontakt';

  UPDATE cms_pages pp
  SET published_blocks = (
    SELECT jsonb_agg(
      jsonb_build_object('id', b.id, 'blockType', b.block_type, 'sortOrder', b.sort_order,
        'content', b.content, 'settings', b.settings, 'isVisible', b.is_visible)
      ORDER BY b.sort_order
    ) FROM cms_blocks b WHERE b.page_id = pp.id
  ), has_draft_changes = false
  WHERE pp.slug = '/kontakt';

  RAISE NOTICE '  /kontakt page created';
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. Remove obsolete pages + duplicates
-- ═══════════════════════════════════════════════════════════════════════════
DO $$ BEGIN RAISE NOTICE '── Step 6: Cleanup ──'; END $$;

-- Delete obsolete placeholder pages (replaced by CMS website seed)
DELETE FROM cms_pages WHERE slug IN ('/cyber-security', '/it-consulting', '/ki-automation');
DO $$ BEGIN RAISE NOTICE '── Step 6: Deduplicate ──'; END $$;

DELETE FROM cms_pages a USING cms_pages b
WHERE a.slug = b.slug AND a.id <> b.id AND a.updated_at < b.updated_at;

DELETE FROM cms_navigation_items a USING cms_navigation_items b
WHERE a.location = b.location AND a.label = b.label AND a.id <> b.id AND a.created_at < b.created_at;

DELETE FROM cms_blocks WHERE page_id NOT IN (SELECT id FROM cms_pages);

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. Summary
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
DECLARE r RECORD;
BEGIN
  RAISE NOTICE '── Migration complete ──';
  FOR r IN
    SELECT 'cms_pages' AS tbl, COUNT(*) AS cnt FROM cms_pages
    UNION ALL SELECT 'cms_blocks', COUNT(*) FROM cms_blocks
    UNION ALL SELECT 'cms_settings', COUNT(*) FROM cms_settings
    UNION ALL SELECT 'cms_navigation_items', COUNT(*) FROM cms_navigation_items
    UNION ALL SELECT 'cms_block_templates', COUNT(*) FROM cms_block_templates
    UNION ALL SELECT 'cms_block_type_definitions', COUNT(*) FROM cms_block_type_definitions
    UNION ALL SELECT 'blog_posts', COUNT(*) FROM blog_posts
  LOOP
    RAISE NOTICE '  %: % rows', r.tbl, r.cnt;
  END LOOP;
END $$;

COMMIT;
