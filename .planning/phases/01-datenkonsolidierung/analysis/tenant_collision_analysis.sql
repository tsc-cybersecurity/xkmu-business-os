-- ============================================================
-- Tenant Collision Analysis -- DRY RUN (READ ONLY)
-- Default:  2ce4949e-8017-4d26-9d60-66c3f4060673
-- xKMU:     7b6c13c5-1800-47b2-a12f-10ccb11f6358
-- Ausfuehren: psql -f tenant_collision_analysis.sql
-- ACHTUNG: Nur SELECTs -- keine DML, kein Schreibzugriff
-- ============================================================

\set DEFAULT_TENANT '2ce4949e-8017-4d26-9d60-66c3f4060673'
\set XKMU_TENANT    '7b6c13c5-1800-47b2-a12f-10ccb11f6358'

-- ============================================================
-- GRUPPE A: Business-Key bekannt (Count + Duplikat-Check)
-- ============================================================

-- ── TABLE: roles ─────────────────────────────────────────────
SELECT
  'default'  AS tenant,
  COUNT(*)   AS row_count
FROM roles
WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT
  'xkmu',
  COUNT(*)
FROM roles
WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- Duplikate nach business key (name):
SELECT d.name, d.id AS default_id, x.id AS xkmu_id
FROM roles d
JOIN roles x
  ON d.name = x.name
  AND d.tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
  AND x.tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- ── TABLE: users ─────────────────────────────────────────────
SELECT
  'default'  AS tenant,
  COUNT(*)   AS row_count
FROM users
WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT
  'xkmu',
  COUNT(*)
FROM users
WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- Duplikate nach business key (email):
SELECT d.email, d.id AS default_id, x.id AS xkmu_id
FROM users d
JOIN users x
  ON d.email = x.email
  AND d.tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
  AND x.tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- ── TABLE: api_keys ──────────────────────────────────────────
SELECT
  'default'  AS tenant,
  COUNT(*)   AS row_count
FROM api_keys
WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT
  'xkmu',
  COUNT(*)
FROM api_keys
WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- Duplikate nach business key (key_prefix als Hinweis):
SELECT d.key_prefix, d.id AS default_id, x.id AS xkmu_id
FROM api_keys d
JOIN api_keys x
  ON d.key_prefix = x.key_prefix
  AND d.tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
  AND x.tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- ── TABLE: companies ─────────────────────────────────────────
SELECT
  'default'  AS tenant,
  COUNT(*)   AS row_count
FROM companies
WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT
  'xkmu',
  COUNT(*)
FROM companies
WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- Duplikate nach business key (vat_id THEN name):
SELECT
  CASE WHEN d.vat_id IS NOT NULL THEN d.vat_id ELSE d.name END AS business_key,
  d.id AS default_id,
  x.id AS xkmu_id
FROM companies d
JOIN companies x
  ON (
    (d.vat_id IS NOT NULL AND d.vat_id = x.vat_id)
    OR (d.vat_id IS NULL AND x.vat_id IS NULL AND d.name = x.name)
  )
  AND d.tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
  AND x.tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- ── TABLE: persons ───────────────────────────────────────────
SELECT
  'default'  AS tenant,
  COUNT(*)   AS row_count
FROM persons
WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT
  'xkmu',
  COUNT(*)
FROM persons
WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- Duplikate nach business key (email WHERE NOT NULL):
SELECT d.email, d.id AS default_id, x.id AS xkmu_id
FROM persons d
JOIN persons x
  ON d.email = x.email
  AND d.tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
  AND x.tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358'
WHERE d.email IS NOT NULL;

-- ── TABLE: product_categories ────────────────────────────────
SELECT
  'default'  AS tenant,
  COUNT(*)   AS row_count
FROM product_categories
WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT
  'xkmu',
  COUNT(*)
FROM product_categories
WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- Duplikate nach business key (COALESCE(slug, name)):
SELECT COALESCE(d.slug, d.name) AS business_key, d.id AS default_id, x.id AS xkmu_id
FROM product_categories d
JOIN product_categories x
  ON COALESCE(d.slug, d.name) = COALESCE(x.slug, x.name)
  AND d.tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
  AND x.tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- ── TABLE: products ──────────────────────────────────────────
SELECT
  'default'  AS tenant,
  COUNT(*)   AS row_count
FROM products
WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT
  'xkmu',
  COUNT(*)
FROM products
WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- Duplikate nach business key (CASE sku THEN name):
SELECT
  CASE WHEN d.sku IS NOT NULL THEN d.sku ELSE d.name END AS business_key,
  d.id AS default_id,
  x.id AS xkmu_id
FROM products d
JOIN products x
  ON (
    (d.sku IS NOT NULL AND d.sku = x.sku)
    OR (d.sku IS NULL AND x.sku IS NULL AND d.name = x.name)
  )
  AND d.tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
  AND x.tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- ── TABLE: ai_providers ──────────────────────────────────────
SELECT
  'default'  AS tenant,
  COUNT(*)   AS row_count
FROM ai_providers
WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT
  'xkmu',
  COUNT(*)
FROM ai_providers
WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- Duplikate nach business key (provider_type || ':' || name):
SELECT d.provider_type || ':' || d.name AS business_key, d.id AS default_id, x.id AS xkmu_id
FROM ai_providers d
JOIN ai_providers x
  ON d.provider_type = x.provider_type
  AND d.name = x.name
  AND d.tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
  AND x.tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- ── TABLE: projects ──────────────────────────────────────────
SELECT
  'default'  AS tenant,
  COUNT(*)   AS row_count
FROM projects
WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT
  'xkmu',
  COUNT(*)
FROM projects
WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- Duplikate nach business key (name):
SELECT d.name, d.id AS default_id, x.id AS xkmu_id
FROM projects d
JOIN projects x
  ON d.name = x.name
  AND d.tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
  AND x.tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- ── TABLE: processes ─────────────────────────────────────────
SELECT
  'default'  AS tenant,
  COUNT(*)   AS row_count
FROM processes
WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT
  'xkmu',
  COUNT(*)
FROM processes
WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- Duplikate nach business key (name):
SELECT d.name, d.id AS default_id, x.id AS xkmu_id
FROM processes d
JOIN processes x
  ON d.name = x.name
  AND d.tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
  AND x.tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- ── TABLE: deliverable_modules ───────────────────────────────
SELECT
  'default'  AS tenant,
  COUNT(*)   AS row_count
FROM deliverable_modules
WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT
  'xkmu',
  COUNT(*)
FROM deliverable_modules
WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- Duplikate nach business key (code):
SELECT d.code, d.id AS default_id, x.id AS xkmu_id
FROM deliverable_modules d
JOIN deliverable_modules x
  ON d.code = x.code
  AND d.tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
  AND x.tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- ── TABLE: deliverables ──────────────────────────────────────
SELECT
  'default'  AS tenant,
  COUNT(*)   AS row_count
FROM deliverables
WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT
  'xkmu',
  COUNT(*)
FROM deliverables
WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- Duplikate nach business key (module.code + deliverable.name):
-- Benoetigt Cross-Tenant-Join via deliverable_modules
SELECT
  dm_d.code || ':' || d.name AS business_key,
  d.id AS default_id,
  x.id AS xkmu_id
FROM deliverables d
JOIN deliverable_modules dm_d ON d.module_id = dm_d.id
  AND dm_d.tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
JOIN deliverables x
  ON x.tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358'
  AND x.name = d.name
JOIN deliverable_modules dm_x ON x.module_id = dm_x.id
  AND dm_x.tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358'
  AND dm_x.code = dm_d.code
WHERE d.tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673';

-- ── TABLE: sop_documents ─────────────────────────────────────
SELECT
  'default'  AS tenant,
  COUNT(*)   AS row_count
FROM sop_documents
WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT
  'xkmu',
  COUNT(*)
FROM sop_documents
WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- Duplikate nach business key (COALESCE(source_task_id, title)):
SELECT
  COALESCE(d.source_task_id, d.title) AS business_key,
  d.id AS default_id,
  x.id AS xkmu_id
FROM sop_documents d
JOIN sop_documents x
  ON COALESCE(d.source_task_id, d.title) = COALESCE(x.source_task_id, x.title)
  AND d.tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
  AND x.tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- ── TABLE: okr_cycles ────────────────────────────────────────
SELECT
  'default'  AS tenant,
  COUNT(*)   AS row_count
FROM okr_cycles
WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT
  'xkmu',
  COUNT(*)
FROM okr_cycles
WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- Duplikate nach business key (name, z.B. "Q1 2026"):
SELECT d.name, d.id AS default_id, x.id AS xkmu_id
FROM okr_cycles d
JOIN okr_cycles x
  ON d.name = x.name
  AND d.tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
  AND x.tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- ── TABLE: grundschutz_audit_sessions ────────────────────────
SELECT
  'default'  AS tenant,
  COUNT(*)   AS row_count
FROM grundschutz_audit_sessions
WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT
  'xkmu',
  COUNT(*)
FROM grundschutz_audit_sessions
WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- Duplikate nach business key (COALESCE(title, created_at::date::text)):
SELECT
  COALESCE(d.title, d.created_at::date::text) AS business_key,
  d.id AS default_id,
  x.id AS xkmu_id
FROM grundschutz_audit_sessions d
JOIN grundschutz_audit_sessions x
  ON COALESCE(d.title, d.created_at::date::text) = COALESCE(x.title, x.created_at::date::text)
  AND d.tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
  AND x.tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- ── TABLE: din_audit_sessions ────────────────────────────────
SELECT
  'default'  AS tenant,
  COUNT(*)   AS row_count
FROM din_audit_sessions
WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT
  'xkmu',
  COUNT(*)
FROM din_audit_sessions
WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- Duplikate nach business key (created_at::date):
SELECT d.created_at::date AS business_key, d.id AS default_id, x.id AS xkmu_id
FROM din_audit_sessions d
JOIN din_audit_sessions x
  ON d.created_at::date = x.created_at::date
  AND d.tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
  AND x.tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- ── TABLE: wiba_audit_sessions ───────────────────────────────
SELECT
  'default'  AS tenant,
  COUNT(*)   AS row_count
FROM wiba_audit_sessions
WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT
  'xkmu',
  COUNT(*)
FROM wiba_audit_sessions
WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- Duplikate nach business key (created_at::date):
SELECT d.created_at::date AS business_key, d.id AS default_id, x.id AS xkmu_id
FROM wiba_audit_sessions d
JOIN wiba_audit_sessions x
  ON d.created_at::date = x.created_at::date
  AND d.tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
  AND x.tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- ============================================================
-- GRUPPE B: Kein eindeutiger Business-Key (nur Counts)
-- ============================================================

-- ── TABLE: leads ─────────────────────────────────────────────
SELECT
  'default'  AS tenant,
  COUNT(*)   AS row_count
FROM leads
WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT
  'xkmu',
  COUNT(*)
FROM leads
WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- ── TABLE: opportunities ─────────────────────────────────────
SELECT
  'default'  AS tenant,
  COUNT(*)   AS row_count
FROM opportunities
WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT
  'xkmu',
  COUNT(*)
FROM opportunities
WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- ── TABLE: activities ────────────────────────────────────────
SELECT
  'default'  AS tenant,
  COUNT(*)   AS row_count
FROM activities
WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT
  'xkmu',
  COUNT(*)
FROM activities
WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- ── TABLE: ai_logs ───────────────────────────────────────────
SELECT
  'default'  AS tenant,
  COUNT(*)   AS row_count
FROM ai_logs
WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT
  'xkmu',
  COUNT(*)
FROM ai_logs
WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- ── TABLE: ai_prompt_templates ───────────────────────────────
SELECT
  'default'  AS tenant,
  COUNT(*)   AS row_count
FROM ai_prompt_templates
WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT
  'xkmu',
  COUNT(*)
FROM ai_prompt_templates
WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- ── TABLE: ideas ─────────────────────────────────────────────
SELECT
  'default'  AS tenant,
  COUNT(*)   AS row_count
FROM ideas
WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT
  'xkmu',
  COUNT(*)
FROM ideas
WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- ── TABLE: webhooks ──────────────────────────────────────────
SELECT
  'default'  AS tenant,
  COUNT(*)   AS row_count
FROM webhooks
WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT
  'xkmu',
  COUNT(*)
FROM webhooks
WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- ── TABLE: audit_log ─────────────────────────────────────────
SELECT
  'default'  AS tenant,
  COUNT(*)   AS row_count
FROM audit_log
WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT
  'xkmu',
  COUNT(*)
FROM audit_log
WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- ── TABLE: documents ─────────────────────────────────────────
SELECT
  'default'  AS tenant,
  COUNT(*)   AS row_count
FROM documents
WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT
  'xkmu',
  COUNT(*)
FROM documents
WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- ── TABLE: document_items ────────────────────────────────────
SELECT
  'default'  AS tenant,
  COUNT(*)   AS row_count
FROM document_items
WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT
  'xkmu',
  COUNT(*)
FROM document_items
WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- ── TABLE: document_templates ────────────────────────────────
SELECT
  'default'  AS tenant,
  COUNT(*)   AS row_count
FROM document_templates
WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT
  'xkmu',
  COUNT(*)
FROM document_templates
WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- ── TABLE: email_templates ───────────────────────────────────
SELECT
  'default'  AS tenant,
  COUNT(*)   AS row_count
FROM email_templates
WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT
  'xkmu',
  COUNT(*)
FROM email_templates
WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- ── TABLE: contract_templates ────────────────────────────────
SELECT
  'default'  AS tenant,
  COUNT(*)   AS row_count
FROM contract_templates
WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT
  'xkmu',
  COUNT(*)
FROM contract_templates
WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- ── TABLE: contract_clauses ──────────────────────────────────
SELECT
  'default'  AS tenant,
  COUNT(*)   AS row_count
FROM contract_clauses
WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT
  'xkmu',
  COUNT(*)
FROM contract_clauses
WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- ── TABLE: din_answers ───────────────────────────────────────
SELECT
  'default'  AS tenant,
  COUNT(*)   AS row_count
FROM din_answers
WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT
  'xkmu',
  COUNT(*)
FROM din_answers
WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- ── TABLE: wiba_answers ──────────────────────────────────────
SELECT
  'default'  AS tenant,
  COUNT(*)   AS row_count
FROM wiba_answers
WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT
  'xkmu',
  COUNT(*)
FROM wiba_answers
WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- ── TABLE: grundschutz_answers ───────────────────────────────
SELECT
  'default'  AS tenant,
  COUNT(*)   AS row_count
FROM grundschutz_answers
WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT
  'xkmu',
  COUNT(*)
FROM grundschutz_answers
WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- ── TABLE: n8n_connections ───────────────────────────────────
SELECT
  'default'  AS tenant,
  COUNT(*)   AS row_count
FROM n8n_connections
WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT
  'xkmu',
  COUNT(*)
FROM n8n_connections
WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- ── TABLE: n8n_workflow_logs ─────────────────────────────────
SELECT
  'default'  AS tenant,
  COUNT(*)   AS row_count
FROM n8n_workflow_logs
WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT
  'xkmu',
  COUNT(*)
FROM n8n_workflow_logs
WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- ── TABLE: media_uploads ─────────────────────────────────────
SELECT
  'default'  AS tenant,
  COUNT(*)   AS row_count
FROM media_uploads
WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT
  'xkmu',
  COUNT(*)
FROM media_uploads
WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- ── TABLE: generated_images ──────────────────────────────────
SELECT
  'default'  AS tenant,
  COUNT(*)   AS row_count
FROM generated_images
WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT
  'xkmu',
  COUNT(*)
FROM generated_images
WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- ── TABLE: company_researches ────────────────────────────────
SELECT
  'default'  AS tenant,
  COUNT(*)   AS row_count
FROM company_researches
WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT
  'xkmu',
  COUNT(*)
FROM company_researches
WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- ── TABLE: firecrawl_researches ──────────────────────────────
SELECT
  'default'  AS tenant,
  COUNT(*)   AS row_count
FROM firecrawl_researches
WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT
  'xkmu',
  COUNT(*)
FROM firecrawl_researches
WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- ── TABLE: business_documents ────────────────────────────────
SELECT
  'default'  AS tenant,
  COUNT(*)   AS row_count
FROM business_documents
WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT
  'xkmu',
  COUNT(*)
FROM business_documents
WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- ── TABLE: business_profiles ─────────────────────────────────
SELECT
  'default'  AS tenant,
  COUNT(*)   AS row_count
FROM business_profiles
WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT
  'xkmu',
  COUNT(*)
FROM business_profiles
WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- ── TABLE: marketing_campaigns ───────────────────────────────
SELECT
  'default'  AS tenant,
  COUNT(*)   AS row_count
FROM marketing_campaigns
WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT
  'xkmu',
  COUNT(*)
FROM marketing_campaigns
WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- ── TABLE: marketing_tasks ───────────────────────────────────
SELECT
  'default'  AS tenant,
  COUNT(*)   AS row_count
FROM marketing_tasks
WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT
  'xkmu',
  COUNT(*)
FROM marketing_tasks
WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- ── TABLE: marketing_templates ───────────────────────────────
SELECT
  'default'  AS tenant,
  COUNT(*)   AS row_count
FROM marketing_templates
WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT
  'xkmu',
  COUNT(*)
FROM marketing_templates
WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- ── TABLE: social_media_topics ───────────────────────────────
SELECT
  'default'  AS tenant,
  COUNT(*)   AS row_count
FROM social_media_topics
WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT
  'xkmu',
  COUNT(*)
FROM social_media_topics
WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- ── TABLE: social_media_posts ────────────────────────────────
SELECT
  'default'  AS tenant,
  COUNT(*)   AS row_count
FROM social_media_posts
WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT
  'xkmu',
  COUNT(*)
FROM social_media_posts
WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- ── TABLE: newsletter_subscribers ────────────────────────────
SELECT
  'default'  AS tenant,
  COUNT(*)   AS row_count
FROM newsletter_subscribers
WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT
  'xkmu',
  COUNT(*)
FROM newsletter_subscribers
WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- ── TABLE: newsletter_campaigns ──────────────────────────────
SELECT
  'default'  AS tenant,
  COUNT(*)   AS row_count
FROM newsletter_campaigns
WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT
  'xkmu',
  COUNT(*)
FROM newsletter_campaigns
WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- ── TABLE: feedback_forms ────────────────────────────────────
SELECT
  'default'  AS tenant,
  COUNT(*)   AS row_count
FROM feedback_forms
WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT
  'xkmu',
  COUNT(*)
FROM feedback_forms
WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- ── TABLE: processes ─────────────────────────────────────────
-- (Count bereits oben in Gruppe A mit Duplikat-Check)

-- ── TABLE: process_tasks ─────────────────────────────────────
SELECT
  'default'  AS tenant,
  COUNT(*)   AS row_count
FROM process_tasks
WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT
  'xkmu',
  COUNT(*)
FROM process_tasks
WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- ── TABLE: project_tasks ─────────────────────────────────────
SELECT
  'default'  AS tenant,
  COUNT(*)   AS row_count
FROM project_tasks
WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT
  'xkmu',
  COUNT(*)
FROM project_tasks
WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- ── TABLE: time_entries ──────────────────────────────────────
SELECT
  'default'  AS tenant,
  COUNT(*)   AS row_count
FROM time_entries
WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT
  'xkmu',
  COUNT(*)
FROM time_entries
WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- ── TABLE: task_queue ────────────────────────────────────────
SELECT
  'default'  AS tenant,
  COUNT(*)   AS row_count
FROM task_queue
WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT
  'xkmu',
  COUNT(*)
FROM task_queue
WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- ── TABLE: receipts ──────────────────────────────────────────
SELECT
  'default'  AS tenant,
  COUNT(*)   AS row_count
FROM receipts
WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT
  'xkmu',
  COUNT(*)
FROM receipts
WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- ── TABLE: chat_conversations ────────────────────────────────
SELECT
  'default'  AS tenant,
  COUNT(*)   AS row_count
FROM chat_conversations
WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT
  'xkmu',
  COUNT(*)
FROM chat_conversations
WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- ── TABLE: cockpit_systems ───────────────────────────────────
SELECT
  'default'  AS tenant,
  COUNT(*)   AS row_count
FROM cockpit_systems
WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT
  'xkmu',
  COUNT(*)
FROM cockpit_systems
WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- ── TABLE: execution_logs ────────────────────────────────────
SELECT
  'default'  AS tenant,
  COUNT(*)   AS row_count
FROM execution_logs
WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT
  'xkmu',
  COUNT(*)
FROM execution_logs
WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- ── TABLE: vto ───────────────────────────────────────────────
-- (EOS-Tabelle mit tenant_id -- hat kein tenant_id in whitelist, aber in schema)
SELECT
  'default'  AS tenant,
  COUNT(*)   AS row_count
FROM vto
WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT
  'xkmu',
  COUNT(*)
FROM vto
WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- ── TABLE: rocks ─────────────────────────────────────────────
SELECT
  'default'  AS tenant,
  COUNT(*)   AS row_count
FROM rocks
WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT
  'xkmu',
  COUNT(*)
FROM rocks
WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- ── TABLE: scorecard_metrics ─────────────────────────────────
SELECT
  'default'  AS tenant,
  COUNT(*)   AS row_count
FROM scorecard_metrics
WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT
  'xkmu',
  COUNT(*)
FROM scorecard_metrics
WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- ── TABLE: eos_issues ────────────────────────────────────────
SELECT
  'default'  AS tenant,
  COUNT(*)   AS row_count
FROM eos_issues
WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT
  'xkmu',
  COUNT(*)
FROM eos_issues
WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- ── TABLE: meeting_sessions ──────────────────────────────────
SELECT
  'default'  AS tenant,
  COUNT(*)   AS row_count
FROM meeting_sessions
WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT
  'xkmu',
  COUNT(*)
FROM meeting_sessions
WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- ── TABLE: okr_objectives ────────────────────────────────────
SELECT
  'default'  AS tenant,
  COUNT(*)   AS row_count
FROM okr_objectives
WHERE tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT
  'xkmu',
  COUNT(*)
FROM okr_objectives
WHERE tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- ============================================================
-- JOIN TABLES: Kein tenant_id -- Count via Parent-Join
-- ============================================================

-- ── TABLE: role_permissions (via roles) ──────────────────────
SELECT 'default', COUNT(*) FROM role_permissions rp
JOIN roles r ON rp.role_id = r.id
WHERE r.tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT 'xkmu', COUNT(*) FROM role_permissions rp
JOIN roles r ON rp.role_id = r.id
WHERE r.tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- ── TABLE: chat_messages (via chat_conversations) ────────────
SELECT 'default', COUNT(*) FROM chat_messages cm
JOIN chat_conversations cc ON cm.conversation_id = cc.id
WHERE cc.tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT 'xkmu', COUNT(*) FROM chat_messages cm
JOIN chat_conversations cc ON cm.conversation_id = cc.id
WHERE cc.tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- ── TABLE: cockpit_credentials (via cockpit_systems) ─────────
SELECT 'default', COUNT(*) FROM cockpit_credentials cc
JOIN cockpit_systems cs ON cc.system_id = cs.id
WHERE cs.tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT 'xkmu', COUNT(*) FROM cockpit_credentials cc
JOIN cockpit_systems cs ON cc.system_id = cs.id
WHERE cs.tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- ── TABLE: feedback_responses (via feedback_forms) ───────────
SELECT 'default', COUNT(*) FROM feedback_responses fr
JOIN feedback_forms ff ON fr.form_id = ff.id
WHERE ff.tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT 'xkmu', COUNT(*) FROM feedback_responses fr
JOIN feedback_forms ff ON fr.form_id = ff.id
WHERE ff.tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- ── TABLE: sop_steps (via sop_documents) ─────────────────────
SELECT 'default', COUNT(*) FROM sop_steps ss
JOIN sop_documents sd ON ss.sop_id = sd.id
WHERE sd.tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT 'xkmu', COUNT(*) FROM sop_steps ss
JOIN sop_documents sd ON ss.sop_id = sd.id
WHERE sd.tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- ── TABLE: sop_versions (via sop_documents) ──────────────────
SELECT 'default', COUNT(*) FROM sop_versions sv
JOIN sop_documents sd ON sv.sop_id = sd.id
WHERE sd.tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT 'xkmu', COUNT(*) FROM sop_versions sv
JOIN sop_documents sd ON sv.sop_id = sd.id
WHERE sd.tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- ── TABLE: scorecard_entries (via scorecard_metrics) ─────────
SELECT 'default', COUNT(*) FROM scorecard_entries se
JOIN scorecard_metrics sm ON se.metric_id = sm.id
WHERE sm.tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT 'xkmu', COUNT(*) FROM scorecard_entries se
JOIN scorecard_metrics sm ON se.metric_id = sm.id
WHERE sm.tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- ── TABLE: rock_milestones (via rocks) ───────────────────────
SELECT 'default', COUNT(*) FROM rock_milestones rm
JOIN rocks r ON rm.rock_id = r.id
WHERE r.tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT 'xkmu', COUNT(*) FROM rock_milestones rm
JOIN rocks r ON rm.rock_id = r.id
WHERE r.tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- ── TABLE: okr_key_results (via okr_objectives) ──────────────
SELECT 'default', COUNT(*) FROM okr_key_results kr
JOIN okr_objectives o ON kr.objective_id = o.id
WHERE o.tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT 'xkmu', COUNT(*) FROM okr_key_results kr
JOIN okr_objectives o ON kr.objective_id = o.id
WHERE o.tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- ── TABLE: okr_checkins (via okr_key_results + okr_objectives)
SELECT 'default', COUNT(*) FROM okr_checkins c
JOIN okr_key_results kr ON c.key_result_id = kr.id
JOIN okr_objectives o ON kr.objective_id = o.id
WHERE o.tenant_id = '2ce4949e-8017-4d26-9d60-66c3f4060673'
UNION ALL
SELECT 'xkmu', COUNT(*) FROM okr_checkins c
JOIN okr_key_results kr ON c.key_result_id = kr.id
JOIN okr_objectives o ON kr.objective_id = o.id
WHERE o.tenant_id = '7b6c13c5-1800-47b2-a12f-10ccb11f6358';

-- ============================================================
-- SUMMARY: Alle oeffentlichen Tabellen mit/ohne tenant_id
-- ============================================================
SELECT
  t.tablename,
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_name = t.tablename
     AND column_name = 'tenant_id'
     AND table_schema = 'public') AS has_tenant_id
FROM pg_tables t
WHERE t.schemaname = 'public'
  AND t.tablename NOT IN (
    'cms_pages','cms_blocks','cms_block_templates','cms_navigation_items',
    'cms_settings','cms_block_type_definitions','blog_posts',
    'email_accounts','emails','workflows','workflow_runs',
    'din_requirements','din_grants','wiba_requirements',
    'grundschutz_groups','grundschutz_controls','grundschutz_catalog_meta',
    'ir_scenarios','ir_detection_indicators','ir_actions','ir_escalation_levels',
    'ir_escalation_recipients','ir_recovery_steps','ir_checklist_items',
    'ir_lessons_learned','ir_references','cron_jobs','tenants',
    '_migrations'
  )
ORDER BY t.tablename;
