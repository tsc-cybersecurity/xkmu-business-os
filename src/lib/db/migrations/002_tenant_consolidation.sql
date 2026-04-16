-- ============================================================
-- Migration 002: Tenant Consolidation (plain SQL, no DO blocks)
-- Strategie: Option B — CRM-Seed-Daten aus default verwerfen
--
-- Source (loeschen): default = 2ce4949e-8017-4d26-9d60-66c3f4060673
-- Ziel  (behalten): xkmu    = 7b6c13c5-1800-47b2-a12f-10ccb11f6358
--
-- IDEMPOTENT: Alle Statements wirken auf 0 Zeilen wenn default bereits geloescht.
-- Keine DO-Blocks wegen postgres.js $-Quoting-Konflikt.
-- ============================================================

-- ============================================================
-- GRUPPE D: User-FKs umhaengen (vor User-Delete!)
-- Alle Felder ohne ON DELETE CASCADE/SET NULL auf xkmu-Admin umhaengen
-- oder auf NULL setzen.
-- ============================================================

-- SOP-bezogen: owner_id, approved_by umhaengen
UPDATE sop_documents
  SET owner_id = (SELECT id FROM users WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358' LIMIT 1)
  WHERE owner_id IN (SELECT id FROM users WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673');

UPDATE sop_documents
  SET approved_by = (SELECT id FROM users WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358' LIMIT 1)
  WHERE approved_by IN (SELECT id FROM users WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673');

UPDATE sop_versions
  SET created_by = (SELECT id FROM users WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358' LIMIT 1)
  WHERE created_by IN (SELECT id FROM users WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673');

-- Management Framework
UPDATE rocks
  SET owner_id = (SELECT id FROM users WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358' LIMIT 1)
  WHERE owner_id IN (SELECT id FROM users WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673');

UPDATE scorecard_metrics
  SET owner_id = (SELECT id FROM users WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358' LIMIT 1)
  WHERE owner_id IN (SELECT id FROM users WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673');

UPDATE okr_objectives
  SET owner_id = (SELECT id FROM users WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358' LIMIT 1)
  WHERE owner_id IN (SELECT id FROM users WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673');

UPDATE vto
  SET updated_by = (SELECT id FROM users WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358' LIMIT 1)
  WHERE updated_by IN (SELECT id FROM users WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673');

-- Nullable FKs: created_by auf NULL setzen (ohne ON DELETE-Klausel)
UPDATE eos_issues SET created_by = NULL
  WHERE created_by IN (SELECT id FROM users WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673');

UPDATE okr_checkins SET created_by = NULL
  WHERE created_by IN (SELECT id FROM users WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673');

UPDATE workflows SET created_by = NULL
  WHERE created_by IN (SELECT id FROM users WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673');

UPDATE cron_jobs SET created_by = NULL
  WHERE created_by IN (SELECT id FROM users WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673');

UPDATE email_accounts SET created_by = NULL
  WHERE created_by IN (SELECT id FROM users WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673');

UPDATE ideas SET created_by = NULL
  WHERE created_by IN (SELECT id FROM users WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673');

UPDATE companies SET created_by = NULL
  WHERE created_by IN (SELECT id FROM users WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673')
  AND tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

UPDATE persons SET created_by = NULL
  WHERE created_by IN (SELECT id FROM users WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673')
  AND tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

-- opportunities has NO created_by column — skipped
-- social_media_posts: DELETE-target (Gruppe A), cascade handles FKs

-- products.created_by — migriert in Gruppe B, FK auf xkmu-Admin umhaengen
UPDATE products
  SET created_by = (SELECT id FROM users WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358' LIMIT 1)
  WHERE created_by IN (SELECT id FROM users WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673');

-- documents.created_by — migriert in Gruppe B
UPDATE documents
  SET created_by = (SELECT id FROM users WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358' LIMIT 1)
  WHERE created_by IN (SELECT id FROM users WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673');

-- cms_pages.created_by — CMS ist global (kein tenant_id), aber FK kann auf default-Admin zeigen
UPDATE cms_pages SET created_by = NULL
  WHERE created_by IN (SELECT id FROM users WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673');

-- marketing_campaigns.created_by — Gruppe A (delete), aber vor DELETE users evtl. benoetigt
UPDATE marketing_campaigns SET created_by = NULL
  WHERE created_by IN (SELECT id FROM users WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673');

-- generated_images.created_by — Gruppe A (delete)
UPDATE generated_images SET created_by = NULL
  WHERE created_by IN (SELECT id FROM users WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673');

-- cockpit_systems.created_by — Gruppe A (delete)
UPDATE cockpit_systems SET created_by = NULL
  WHERE created_by IN (SELECT id FROM users WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673');

-- social_media_posts.created_by — Gruppe A (delete)
UPDATE social_media_posts SET created_by = NULL
  WHERE created_by IN (SELECT id FROM users WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673');

-- ============================================================
-- GRUPPE A: DELETE — CRM-Seed und Demo-Daten aus default
-- ============================================================

DELETE FROM grundschutz_assets WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';
DELETE FROM grundschutz_audit_sessions WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';
DELETE FROM wiba_audit_sessions WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';
DELETE FROM din_audit_sessions WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';
DELETE FROM chat_conversations WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';
DELETE FROM cockpit_systems WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';
DELETE FROM feedback_forms WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';
DELETE FROM newsletter_campaigns WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';
DELETE FROM newsletter_subscribers WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';
DELETE FROM social_media_posts WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';
DELETE FROM social_media_topics WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';
DELETE FROM marketing_campaigns WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';
DELETE FROM marketing_templates WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';
DELETE FROM activities WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';
DELETE FROM opportunities WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';
DELETE FROM leads WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';
DELETE FROM persons WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';
DELETE FROM companies WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';
DELETE FROM n8n_connections WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';
DELETE FROM ai_logs WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';
DELETE FROM media_uploads WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';
DELETE FROM generated_images WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';
DELETE FROM firecrawl_researches WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';
DELETE FROM company_researches WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';
DELETE FROM business_profiles WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';
DELETE FROM business_documents WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';
DELETE FROM ideas WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';
DELETE FROM webhooks WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';
DELETE FROM audit_log WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';
DELETE FROM time_entries WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';
DELETE FROM task_queue WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';
DELETE FROM receipts WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';
DELETE FROM execution_logs WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

-- ============================================================
-- GRUPPE C: Dedup — Duplikate loeschen, Rest spaeter migrieren
-- ============================================================

-- deliverables: DELETE default's Zeilen die Namen-Duplikat in xkmu haben (via Modul-Code)
DELETE FROM deliverables d_default
WHERE d_default.tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
  AND EXISTS (
    SELECT 1
    FROM deliverables d_xkmu
    JOIN deliverable_modules dm_xkmu ON dm_xkmu.id = d_xkmu.module_id
    JOIN deliverable_modules dm_default ON dm_default.id = d_default.module_id
    WHERE d_xkmu.tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358'
      AND d_xkmu.name = d_default.name
      AND dm_xkmu.code = dm_default.code
  );

-- deliverable_modules: DELETE default's die code-Duplikat in xkmu haben
DELETE FROM deliverable_modules
WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
  AND code IN (
    SELECT code FROM deliverable_modules
    WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358'
  );

-- ai_prompt_templates: DELETE Duplikate by slug
DELETE FROM ai_prompt_templates
WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
  AND slug IN (
    SELECT slug FROM ai_prompt_templates
    WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358'
  );

-- roles: DELETE Duplikate by name
DELETE FROM roles
WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
  AND name IN (
    SELECT name FROM roles
    WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358'
  );

-- ============================================================
-- GRUPPE B: UPDATE tenant_id = xkmu (migrieren)
-- Reihenfolge wichtig: erst Kinder-loss-Tabellen, dann Parents
-- ============================================================

UPDATE vto SET tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358'
  WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

UPDATE rocks SET tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358'
  WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

UPDATE scorecard_metrics SET tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358'
  WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

UPDATE eos_issues SET tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358'
  WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

UPDATE meeting_sessions SET tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358'
  WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

UPDATE okr_cycles SET tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358'
  WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

UPDATE okr_objectives SET tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358'
  WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

UPDATE sop_documents SET tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358'
  WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

UPDATE product_categories SET tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358'
  WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

UPDATE products SET tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358'
  WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

UPDATE ai_providers SET tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358'
  WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

UPDATE document_items SET tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358'
  WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

UPDATE documents SET tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358'
  WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

UPDATE document_templates SET tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358'
  WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

UPDATE email_templates SET tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358'
  WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

UPDATE contract_templates SET tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358'
  WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

UPDATE contract_clauses SET tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358'
  WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

-- Restliche ai_prompt_templates (Non-Duplikate)
UPDATE ai_prompt_templates SET tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358'
  WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

-- Restliche roles (Non-Duplikate)
UPDATE roles SET tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358'
  WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

-- Restliche deliverables (Non-Duplikate, falls welche uebrig)
UPDATE deliverables SET tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358'
  WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

-- Restliche deliverable_modules (Non-Duplikate, falls welche uebrig)
UPDATE deliverable_modules SET tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358'
  WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

-- api_keys des default-Admins umhaengen (falls vorhanden)
UPDATE api_keys SET tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358'
  WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

-- ============================================================
-- GRUPPE E: Final — DELETE users + DELETE tenant
-- ============================================================

-- api_keys des default-Users loeschen (Cleanup vor User-Delete)
DELETE FROM api_keys
WHERE user_id IN (SELECT id FROM users WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673');

-- Default-Admin-User loeschen
DELETE FROM users WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

-- Default-Tenant loeschen (CASCADE raeumt Reste auf)
DELETE FROM tenants WHERE id = '2ce4949e-8017-4d26-9d60-66c3f4060673';
