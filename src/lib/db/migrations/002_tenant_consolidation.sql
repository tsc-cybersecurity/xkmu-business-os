-- ============================================================
-- Migration 002: Tenant Consolidation
-- Strategie: Option B — CRM-Seed-Daten aus default verwerfen
--
-- Source (loeschen): default  = 2ce4949e-8017-4d26-9d60-66c3f4060673
-- Ziel  (behalten): xkmu     = 7b6c13c5-1800-47b2-a12f-10ccb11f6358
--
-- Nach Ausfuehren: genau 1 Tenant, alle Daten konsistent.
-- IDEMPOTENT: Laeuft erneut ohne Fehler wenn default-Tenant nicht mehr existiert.
-- ============================================================

-- ============================================================
-- IDEMPOTENZ-GUARD: Abbruch wenn default-Tenant nicht existiert
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM tenants WHERE id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
  ) THEN
    RAISE NOTICE 'Tenant-Konsolidierung bereits durchgefuehrt — Migration no-op.';
    RETURN;
  END IF;

  RAISE NOTICE 'Starte Tenant-Konsolidierung: default -> xkmu ...';

  -- --------------------------------------------------------
  -- Interne Variablen
  -- --------------------------------------------------------
  -- DEFAULT_ID = '2ce4949e-8017-4d26-9d60-66c3f4060673'
  -- XKMU_ID   = '7b6c13c5-1800-47b2-a12f-10ccb11f6358'

  -- ============================================================
  -- GRUPPE D: User-FKs umhaengen (vor User-Delete!)
  -- Felder ohne ON DELETE CASCADE/SET NULL muessen manuell auf
  -- xkmu-Admin umgehangen oder auf NULL gesetzt werden.
  -- Tabellen die MIGRIERT werden (Gruppe B) muessen auf xkmu-Admin zeigen.
  -- Tabellen die GELOESCHT werden (Gruppe A) koennen ignoriert werden.
  -- ============================================================

  -- sop_documents: owner_id, approved_by (migriert via Gruppe B)
  UPDATE sop_documents
    SET owner_id = (SELECT id FROM users WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358' LIMIT 1)
    WHERE owner_id IN (SELECT id FROM users WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673');

  UPDATE sop_documents
    SET approved_by = (SELECT id FROM users WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358' LIMIT 1)
    WHERE approved_by IN (SELECT id FROM users WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673');

  -- sop_versions: created_by (CASCADE via sop_documents, kein tenant_id)
  UPDATE sop_versions
    SET created_by = (SELECT id FROM users WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358' LIMIT 1)
    WHERE created_by IN (SELECT id FROM users WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673');

  -- rocks: owner_id (migriert via Gruppe B)
  UPDATE rocks
    SET owner_id = (SELECT id FROM users WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358' LIMIT 1)
    WHERE owner_id IN (SELECT id FROM users WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673');

  -- scorecard_metrics: owner_id (migriert via Gruppe B)
  UPDATE scorecard_metrics
    SET owner_id = (SELECT id FROM users WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358' LIMIT 1)
    WHERE owner_id IN (SELECT id FROM users WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673');

  -- okr_objectives: owner_id (migriert via Gruppe B, CASCADE via okr_cycles)
  UPDATE okr_objectives
    SET owner_id = (SELECT id FROM users WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358' LIMIT 1)
    WHERE owner_id IN (SELECT id FROM users WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673');

  -- vto: updated_by (migriert via Gruppe B)
  UPDATE vto
    SET updated_by = (SELECT id FROM users WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358' LIMIT 1)
    WHERE updated_by IN (SELECT id FROM users WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673');

  -- eos_issues: created_by ohne ON DELETE (migriert via Gruppe B)
  -- Drizzle definiert kein ON DELETE fuer eos_issues.created_by -> manuell NULLen
  UPDATE eos_issues
    SET created_by = NULL
    WHERE created_by IN (SELECT id FROM users WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673');

  -- okr_checkins: created_by (kein ON DELETE, cascaded child)
  UPDATE okr_checkins
    SET created_by = NULL
    WHERE created_by IN (SELECT id FROM users WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673');

  -- workflows: global-Tabelle (kein tenant_id), created_by ohne ON DELETE
  UPDATE workflows
    SET created_by = NULL
    WHERE created_by IN (SELECT id FROM users WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673');

  -- cron_jobs: global-Tabelle (kein tenant_id), created_by ohne ON DELETE
  UPDATE cron_jobs
    SET created_by = NULL
    WHERE created_by IN (SELECT id FROM users WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673');

  -- email_accounts: global-Tabelle (kein tenant_id), created_by ohne ON DELETE
  UPDATE email_accounts
    SET created_by = NULL
    WHERE created_by IN (SELECT id FROM users WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673');

  -- ideas: created_by ohne ON DELETE (Gruppe A — wird geloescht, aber vorher NK setzen)
  -- ideas.created_by hat kein ON DELETE, muss vor User-Delete genullt werden
  UPDATE ideas
    SET created_by = NULL
    WHERE created_by IN (SELECT id FROM users WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673');

  -- companies.created_by: kein ON DELETE — Gruppe A wird geloescht, aber sicherheitshalber
  UPDATE companies
    SET created_by = NULL
    WHERE created_by IN (SELECT id FROM users WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673')
    AND tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

  -- persons.created_by: kein ON DELETE — Gruppe A
  UPDATE persons
    SET created_by = NULL
    WHERE created_by IN (SELECT id FROM users WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673')
    AND tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

  -- opportunities.created_by: kein ON DELETE — Gruppe A
  UPDATE opportunities
    SET created_by = NULL
    WHERE created_by IN (SELECT id FROM users WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673')
    AND tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

  -- social_media_posts.created_by: kein ON DELETE — Gruppe A
  UPDATE social_media_posts
    SET created_by = NULL
    WHERE created_by IN (SELECT id FROM users WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673')
    AND tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

  RAISE NOTICE 'Gruppe D: User-FK-Umhaengung abgeschlossen.';

  -- ============================================================
  -- GRUPPE A: DELETE — CRM-Seed und Demo-Daten aus default
  -- Cascade-Kinder werden automatisch mitgeloescht.
  -- ============================================================

  -- grundschutz_asset_relations (via grundschutz_assets CASCADE)
  -- grundschutz_asset_controls (via grundschutz_assets CASCADE)
  -- -> erst grundschutz_assets loeschen (zieht Relations + Controls mit)
  DELETE FROM grundschutz_assets WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

  -- grundschutz_audit_sessions (+ CASCADE: grundschutz_answers)
  DELETE FROM grundschutz_audit_sessions WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

  -- wiba_audit_sessions (+ CASCADE: wiba_answers)
  DELETE FROM wiba_audit_sessions WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

  -- din_audit_sessions (+ CASCADE: din_answers)
  DELETE FROM din_audit_sessions WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

  -- chat_conversations (+ CASCADE: chat_messages)
  DELETE FROM chat_conversations WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

  -- cockpit_systems (+ CASCADE: cockpit_credentials)
  DELETE FROM cockpit_systems WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

  -- feedback_forms (+ CASCADE: feedback_responses)
  DELETE FROM feedback_forms WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

  -- newsletter_campaigns
  DELETE FROM newsletter_campaigns WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

  -- newsletter_subscribers
  DELETE FROM newsletter_subscribers WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

  -- social_media_posts
  DELETE FROM social_media_posts WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

  -- social_media_topics
  DELETE FROM social_media_topics WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

  -- marketing_campaigns (+ CASCADE: marketing_tasks)
  DELETE FROM marketing_campaigns WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

  -- marketing_templates (falls vorhanden)
  DELETE FROM marketing_templates WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

  -- activities (tenant-bezogen)
  DELETE FROM activities WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

  -- opportunities
  DELETE FROM opportunities WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

  -- leads
  DELETE FROM leads WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

  -- persons
  DELETE FROM persons WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

  -- companies
  DELETE FROM companies WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

  -- n8n_connections (+ CASCADE: n8n_workflow_logs)
  DELETE FROM n8n_connections WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

  -- ai_logs
  DELETE FROM ai_logs WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

  -- media_uploads
  DELETE FROM media_uploads WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

  -- generated_images
  DELETE FROM generated_images WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

  -- firecrawl_researches
  DELETE FROM firecrawl_researches WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

  -- company_researches
  DELETE FROM company_researches WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

  -- business_profiles
  DELETE FROM business_profiles WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

  -- business_documents
  DELETE FROM business_documents WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

  -- ideas
  DELETE FROM ideas WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

  -- webhooks
  DELETE FROM webhooks WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

  -- audit_log
  DELETE FROM audit_log WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

  -- time_entries (falls vorhanden)
  DELETE FROM time_entries WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

  -- task_queue (falls vorhanden)
  DELETE FROM task_queue WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

  -- receipts (falls vorhanden)
  DELETE FROM receipts WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

  -- execution_logs
  DELETE FROM execution_logs WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

  RAISE NOTICE 'Gruppe A: DELETE-Loeschungen abgeschlossen.';

  -- ============================================================
  -- GRUPPE C: Dedup — Duplikate loeschen, Rest bleibt/wird migriert
  -- ============================================================

  -- deliverables: Zuerst loeschen (referenziert deliverable_modules via module_id)
  -- Strategie: Behalte xkmu-Zeilen; loese default's Zeilen die einen gleichen Namen
  -- im gleichen Modul-Code haben wie xkmu-Zeilen.
  -- Da deliverables.module_id auf deliverable_modules.id zeigt (und xkmu+default
  -- verschiedene IDs fuer gleiche Codes haben), matchen wir via Modul-Code + Name.
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

  -- Restliche default-Deliverables (kein xkmu-Duplikat): UPDATE zu xkmu
  -- (In Praxis: nach Ausfuehren von Zeile oben sollten alle 70 geloescht sein.
  --  Sicherheitsnetz: verbleibende auf xkmu umschreiben.)
  UPDATE deliverables
    SET tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358'
    WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

  -- deliverable_modules: Behalte xkmu; loese default's Duplikate by code
  DELETE FROM deliverable_modules
  WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
    AND code IN (
      SELECT code FROM deliverable_modules
      WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358'
    );

  -- Restliche default-Module (kein xkmu-Duplikat): UPDATE zu xkmu
  UPDATE deliverable_modules
    SET tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358'
    WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

  -- ai_prompt_templates: Behalte xkmu's Zeile bei Slug-Konflikt; migriere Rest
  -- Zuerst Duplikate (gleicher slug in xkmu UND default) aus default loeschen
  DELETE FROM ai_prompt_templates
  WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
    AND slug IN (
      SELECT slug FROM ai_prompt_templates
      WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358'
    );

  -- Nicht-doppelte default-Templates -> UPDATE zu xkmu
  UPDATE ai_prompt_templates
    SET tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358'
    WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

  -- roles: Behalte xkmu's Rolle bei Name-Konflikt; migriere Rest
  -- role_permissions CASCADE via roles.id -> automatisch mitgeloescht
  DELETE FROM roles
  WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
    AND name IN (
      SELECT name FROM roles
      WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358'
    );

  -- Nicht-doppelte default-Rollen -> UPDATE zu xkmu
  UPDATE roles
    SET tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358'
    WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

  RAISE NOTICE 'Gruppe C: Dedup abgeschlossen.';

  -- ============================================================
  -- GRUPPE B: UPDATE tenant_id = xkmu (migrieren)
  -- Business-relevante Daten aus default zu xkmu umhaengen.
  -- Cascade-Kinder (sop_steps, sop_versions, rock_milestones, etc.)
  -- haben kein eigenes tenant_id — sie folgen dem Parent automatisch.
  -- ============================================================

  -- vto (EOS Vision/Traction Organizer)
  UPDATE vto
    SET tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358'
    WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

  -- rocks (+ CASCADE: rock_milestones via rocks.id)
  UPDATE rocks
    SET tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358'
    WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

  -- scorecard_metrics (+ CASCADE: scorecard_entries via scorecard_metrics.id)
  UPDATE scorecard_metrics
    SET tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358'
    WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

  -- eos_issues
  UPDATE eos_issues
    SET tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358'
    WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

  -- meeting_sessions
  UPDATE meeting_sessions
    SET tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358'
    WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

  -- okr_cycles (+ CASCADE: okr_objectives -> okr_key_results -> okr_checkins)
  UPDATE okr_cycles
    SET tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358'
    WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

  -- okr_objectives: tenant_id direkt setzen (zusaetzlich zu CASCADE via cycle)
  UPDATE okr_objectives
    SET tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358'
    WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

  -- sop_documents (+ CASCADE: sop_steps, sop_versions via sop_documents.id)
  UPDATE sop_documents
    SET tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358'
    WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

  -- products (+ product_categories)
  UPDATE product_categories
    SET tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358'
    WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

  UPDATE products
    SET tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358'
    WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

  -- ai_providers (nur wenn xkmu noch keine hat — UPDATE loescht keine Duplikate,
  --   bei gleicher providerType-Kombination entstehen Duplikate -> akzeptabel)
  UPDATE ai_providers
    SET tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358'
    WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

  -- documents (+ CASCADE: document_items via documents.id)
  -- document_items hat auch eigenes tenant_id -> beide updaten
  UPDATE document_items
    SET tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358'
    WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

  UPDATE documents
    SET tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358'
    WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

  -- document_templates
  UPDATE document_templates
    SET tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358'
    WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

  -- email_templates
  UPDATE email_templates
    SET tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358'
    WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

  -- contract_templates
  UPDATE contract_templates
    SET tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358'
    WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

  -- contract_clauses
  UPDATE contract_clauses
    SET tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358'
    WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

  -- api_keys (falls der default-Admin API-Keys hatte)
  UPDATE api_keys
    SET tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358'
    WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

  RAISE NOTICE 'Gruppe B: tenant_id-Updates abgeschlossen.';

  -- ============================================================
  -- GRUPPE E: Final — DELETE users + DELETE tenant
  -- Erst users loeschen, dann den Tenant selbst.
  -- Danach rauemen ON DELETE CASCADE alle verbliebenen Zeilen auf.
  -- ============================================================

  -- Sicherheitshalber: api_keys des default-Users loeschen (falls noch vorhanden)
  DELETE FROM api_keys
  WHERE user_id IN (SELECT id FROM users WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673');

  -- Default-Admin-User loeschen
  DELETE FROM users WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

  -- Default-Tenant loeschen (CASCADE rauemt noch verbliebene Reste auf)
  DELETE FROM tenants WHERE id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

  RAISE NOTICE 'Gruppe E: Default-Tenant geloescht. Migration abgeschlossen.';

END $$;

-- ============================================================
-- VALIDIERUNG (Read-only SELECTs — decken Probleme auf)
-- ============================================================

-- 1. Genau 1 Tenant uebrig?
DO $$
DECLARE
  cnt INTEGER;
BEGIN
  SELECT COUNT(*) INTO cnt FROM tenants;
  IF cnt <> 1 THEN
    RAISE WARNING 'VALIDIERUNG FEHLGESCHLAGEN: % Tenants vorhanden (erwartet: 1)', cnt;
  ELSE
    RAISE NOTICE 'OK: Genau 1 Tenant vorhanden.';
  END IF;
END $$;

-- 2. Keine Zeilen mit default-tenant_id uebrig?
DO $$
DECLARE
  cnt INTEGER;
BEGIN
  SELECT COUNT(*) INTO cnt
  FROM sop_documents
  WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';
  IF cnt > 0 THEN
    RAISE WARNING 'VALIDIERUNG FEHLGESCHLAGEN: % sop_documents mit default-tenant_id', cnt;
  ELSE
    RAISE NOTICE 'OK: sop_documents alle in xkmu-Tenant.';
  END IF;
END $$;

DO $$
DECLARE
  cnt INTEGER;
BEGIN
  SELECT COUNT(*) INTO cnt
  FROM users
  WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';
  IF cnt > 0 THEN
    RAISE WARNING 'VALIDIERUNG FEHLGESCHLAGEN: % users mit default-tenant_id', cnt;
  ELSE
    RAISE NOTICE 'OK: Kein User mehr im default-Tenant.';
  END IF;
END $$;

DO $$
DECLARE
  cnt INTEGER;
BEGIN
  SELECT COUNT(*) INTO cnt
  FROM deliverable_modules
  WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';
  IF cnt > 0 THEN
    RAISE WARNING 'VALIDIERUNG FEHLGESCHLAGEN: % deliverable_modules mit default-tenant_id', cnt;
  ELSE
    RAISE NOTICE 'OK: deliverable_modules alle in xkmu-Tenant.';
  END IF;
END $$;

-- 3. Erwartete Mindest-Counts im xkmu-Tenant
DO $$
DECLARE
  cnt INTEGER;
BEGIN
  SELECT COUNT(*) INTO cnt FROM sop_documents WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';
  RAISE NOTICE 'INFO: sop_documents in xkmu: % (erwartet: ~221)', cnt;
END $$;

DO $$
DECLARE
  cnt INTEGER;
BEGIN
  SELECT COUNT(*) INTO cnt FROM deliverable_modules WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';
  RAISE NOTICE 'INFO: deliverable_modules in xkmu: % (erwartet: 16)', cnt;
END $$;

DO $$
DECLARE
  cnt INTEGER;
BEGIN
  SELECT COUNT(*) INTO cnt FROM deliverables WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';
  RAISE NOTICE 'INFO: deliverables in xkmu: % (erwartet: 70)', cnt;
END $$;

DO $$
DECLARE
  cnt INTEGER;
BEGIN
  SELECT COUNT(*) INTO cnt FROM companies WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';
  RAISE NOTICE 'INFO: companies in xkmu: % (erwartet: 9, CRM-Seed verworfen)', cnt;
END $$;
