#!/bin/sh
set -e

echo "============================================"
echo "xKMU Business OS - Production Start"
echo "============================================"

# ------------------------------------
# Fix volume permissions (runs as root)
# ------------------------------------
echo "Ensuring data directories exist and are writable..."
mkdir -p /app/data/uploads/bi /app/data/uploads/media /backups
chown -R nextjs:nodejs /app/data /backups

# ------------------------------------
# Wait for database to be ready
# ------------------------------------
# Extract host and port from DATABASE_URL
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's|.*@\([^:/]*\).*|\1|p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
DB_HOST=${DB_HOST:-postgres}
DB_PORT=${DB_PORT:-5432}

echo "Waiting for database at ${DB_HOST}:${DB_PORT}..."
until nc -z "$DB_HOST" "$DB_PORT"; do
  echo "Database not ready, waiting..."
  sleep 2
done
echo "Database is ready!"

# ------------------------------------
# Pre-migration backup
# ------------------------------------
BACKUP_DIR="/backups"
BACKUP_KEEP="${BACKUP_KEEP:-10}"

# Extract connection details from DATABASE_URL
# Format: postgresql://user:password@host:port/dbname
DB_USER=$(echo "$DATABASE_URL" | sed -n 's|.*://\([^:]*\):.*|\1|p')
DB_PASS=$(echo "$DATABASE_URL" | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's|.*@\([^:]*\):.*|\1|p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
DB_NAME=$(echo "$DATABASE_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')

create_backup() {
  TIMESTAMP=$(date +%Y%m%d_%H%M%S)
  BACKUP_FILE="${BACKUP_DIR}/pre-migration-${TIMESTAMP}.sql.gz"

  echo "Creating pre-migration backup: ${BACKUP_FILE}"
  PGPASSWORD="$DB_PASS" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"

  # Integrity check: file must be > 100 bytes
  FILE_SIZE=$(wc -c < "$BACKUP_FILE")
  if [ "$FILE_SIZE" -lt 100 ]; then
    echo "WARNING: Backup file is suspiciously small (${FILE_SIZE} bytes), removing it"
    rm -f "$BACKUP_FILE"
    return 1
  fi

  echo "Backup created successfully (${FILE_SIZE} bytes)"
  return 0
}

rotate_backups() {
  # Count existing pre-migration backups and remove oldest if over limit
  BACKUP_COUNT=$(ls -1 "${BACKUP_DIR}"/pre-migration-*.sql.gz 2>/dev/null | wc -l)
  if [ "$BACKUP_COUNT" -gt "$BACKUP_KEEP" ]; then
    REMOVE_COUNT=$((BACKUP_COUNT - BACKUP_KEEP))
    echo "Rotating backups: removing ${REMOVE_COUNT} oldest (keeping ${BACKUP_KEEP})"
    ls -1t "${BACKUP_DIR}"/pre-migration-*.sql.gz | tail -n "$REMOVE_COUNT" | xargs rm -f
  fi
}

# Check if backup directory is writable
if [ -d "$BACKUP_DIR" ] && [ -w "$BACKUP_DIR" ]; then
  # Check if database has any tables (skip backup for empty/new DB)
  TABLE_COUNT=$(PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'" 2>/dev/null || echo "0")

  if [ "$TABLE_COUNT" -gt "0" ]; then
    if create_backup; then
      rotate_backups
    else
      echo "WARNING: Pre-migration backup failed, continuing anyway..."
    fi
  else
    echo "INFO: Empty database detected, skipping pre-migration backup"
  fi
else
  echo "WARNING: Backup directory not available or not writable, skipping backup"
  echo "  Mount a volume to /backups to enable automatic pre-migration backups"
fi


# ------------------------------------
# Pre-Drizzle SQL migrations (idempotent)
# ------------------------------------
echo "Running pre-Drizzle SQL migrations..."
PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=0 <<'EOSQL'
-- Remove tenant_id from CMS/Blog tables (global, not multi-tenant)
ALTER TABLE cms_pages DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE cms_blocks DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE cms_block_templates DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE cms_navigation_items DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE blog_posts DROP COLUMN IF EXISTS tenant_id;

-- cms_settings: drop tenant_id, ensure unique key
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cms_settings' AND column_name='tenant_id') THEN
    -- Keep only newest row per key before dropping
    DELETE FROM cms_settings a USING cms_settings b WHERE a.key = b.key AND a.id <> b.id AND a.updated_at < b.updated_at;
    DROP INDEX IF EXISTS idx_cms_settings_tenant_key;
    ALTER TABLE cms_settings DROP COLUMN tenant_id;
  END IF;
END $$;

-- Drop unique constraint if it exists (causes Drizzle prompt)
ALTER TABLE cms_settings DROP CONSTRAINT IF EXISTS cms_settings_key_unique;

-- ── IR Playbook: convert enum columns to varchar ───────────────────────────
-- Old schema used enums (ir_series, ir_severity, ir_action_phase, ...) which
-- only accepted hardcoded values like series='I'..'VI'. The JSON imports use
-- series='XI' etc., so we widen the columns to varchar. Views and functions
-- depending on the enum types must be dropped first — they are recreated
-- after drizzle-kit push below.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='ir_scenarios' AND column_name='series' AND udt_name='ir_series'
  ) THEN
    RAISE NOTICE 'Converting ir_playbook enum columns to varchar...';

    -- Drop dependent views
    DROP VIEW IF EXISTS ir_scenario_summary CASCADE;
    DROP VIEW IF EXISTS ir_dsgvo_checklist CASCADE;
    DROP VIEW IF EXISTS ir_immediate_actions CASCADE;
    DROP VIEW IF EXISTS ir_bsi_control_mapping CASCADE;

    -- Drop dependent functions (signatures reference the enum types)
    DROP FUNCTION IF EXISTS ir_import_scenario(jsonb) CASCADE;
    DROP FUNCTION IF EXISTS ir_get_actions(varchar) CASCADE;
    DROP FUNCTION IF EXISTS ir_search_scenarios(boolean, ir_series) CASCADE;

    -- ir_scenarios
    ALTER TABLE ir_scenarios ALTER COLUMN series TYPE varchar(10) USING series::text;
    ALTER TABLE ir_scenarios ALTER COLUMN severity TYPE varchar(20) USING severity::text;
    ALTER TABLE ir_scenarios ALTER COLUMN likelihood TYPE varchar(20) USING likelihood::text;
    ALTER TABLE ir_scenarios ALTER COLUMN financial_risk TYPE varchar(20) USING financial_risk::text;

    -- ir_actions
    ALTER TABLE ir_actions ALTER COLUMN phase TYPE varchar(20) USING phase::text;
    ALTER TABLE ir_actions ALTER COLUMN category TYPE varchar(30) USING category::text;
    ALTER TABLE ir_actions ALTER COLUMN responsible TYPE varchar(50) USING responsible::text;

    -- ir_escalation_recipients
    ALTER TABLE ir_escalation_recipients ALTER COLUMN contact_type TYPE varchar(30) USING contact_type::text;

    -- ir_recovery_steps
    ALTER TABLE ir_recovery_steps ALTER COLUMN responsible TYPE varchar(50) USING responsible::text;

    -- ir_checklist_items
    ALTER TABLE ir_checklist_items ALTER COLUMN category TYPE varchar(30) USING category::text;

    -- ir_lessons_learned
    ALTER TABLE ir_lessons_learned ALTER COLUMN category TYPE varchar(30) USING category::text;

    -- ir_references
    ALTER TABLE ir_references ALTER COLUMN type TYPE varchar(30) USING type::text;

    -- ir_detection_indicators
    ALTER TABLE ir_detection_indicators ALTER COLUMN type TYPE varchar(30) USING type::text;

    -- Drop now-orphaned enum types
    DROP TYPE IF EXISTS ir_series CASCADE;
    DROP TYPE IF EXISTS ir_severity CASCADE;
    DROP TYPE IF EXISTS ir_likelihood CASCADE;
    DROP TYPE IF EXISTS ir_financial_risk CASCADE;
    DROP TYPE IF EXISTS ir_action_phase CASCADE;
    DROP TYPE IF EXISTS ir_action_category CASCADE;
    DROP TYPE IF EXISTS ir_responsible CASCADE;
    DROP TYPE IF EXISTS ir_contact_type CASCADE;
    DROP TYPE IF EXISTS ir_checklist_category CASCADE;
    DROP TYPE IF EXISTS ir_lessons_category CASCADE;
    DROP TYPE IF EXISTS ir_reference_type CASCADE;
    DROP TYPE IF EXISTS ir_indicator_type CASCADE;

    RAISE NOTICE 'IR Playbook enum conversion complete.';
  END IF;
END $$;
-- ── project_tasks: add parent_task_id + delegated_to columns ────────────
ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS parent_task_id UUID;
ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS delegated_to VARCHAR(100);
CREATE INDEX IF NOT EXISTS idx_project_tasks_parent ON project_tasks (parent_task_id);

-- ── Framework v2: deliverable_modules, deliverables, execution_logs ─────
CREATE TABLE IF NOT EXISTS deliverable_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code VARCHAR(10) NOT NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(10) NOT NULL,
  category_code VARCHAR(10),
  ziel TEXT,
  preis VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_deliverable_modules_tenant ON deliverable_modules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_deliverable_modules_code ON deliverable_modules(tenant_id, code);

CREATE TABLE IF NOT EXISTS deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  module_id UUID REFERENCES deliverable_modules(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  format VARCHAR(100),
  umfang VARCHAR(100),
  trigger VARCHAR(255),
  category VARCHAR(50),
  category_code VARCHAR(10),
  status VARCHAR(20) DEFAULT 'draft',
  version VARCHAR(20) DEFAULT '1.0.0',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_deliverables_tenant ON deliverables(tenant_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_module ON deliverables(tenant_id, module_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_category ON deliverables(tenant_id, category_code);
CREATE INDEX IF NOT EXISTS idx_deliverables_status ON deliverables(tenant_id, status);

-- SOP Documents: 7 neue Felder (alle nullable)
ALTER TABLE sop_documents
  ADD COLUMN IF NOT EXISTS automation_level VARCHAR(20),
  ADD COLUMN IF NOT EXISTS ai_capable BOOLEAN,
  ADD COLUMN IF NOT EXISTS maturity_level INTEGER,
  ADD COLUMN IF NOT EXISTS estimated_duration_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS produces_deliverable_id UUID REFERENCES deliverables(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS subprocess VARCHAR(255),
  ADD COLUMN IF NOT EXISTS source_task_id VARCHAR(50);

-- SOP Steps: executor Feld
ALTER TABLE sop_steps
  ADD COLUMN IF NOT EXISTS executor VARCHAR(10);

-- ── custom_ai_prompts: create before drizzle-kit push (otherwise prompts interactively) ──
CREATE TABLE IF NOT EXISTS custom_ai_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(50) DEFAULT 'custom',
  icon VARCHAR(50) DEFAULT 'Sparkles',
  color VARCHAR(20) DEFAULT 'indigo',
  system_prompt TEXT,
  user_prompt TEXT NOT NULL,
  context_config JSONB DEFAULT '{}'::jsonb,
  activity_type VARCHAR(20) DEFAULT 'note',
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_custom_ai_prompts_active ON custom_ai_prompts(is_active);
CREATE INDEX IF NOT EXISTS idx_custom_ai_prompts_category ON custom_ai_prompts(category);

-- email_accounts.signature (HTML-Signatur je Account)
ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS signature TEXT;

-- blog_categories: verwaltbare Kategorien für Blog-Beiträge
CREATE TABLE IF NOT EXISTS blog_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(30),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_blog_categories_slug ON blog_categories(slug);
CREATE INDEX IF NOT EXISTS idx_blog_categories_active ON blog_categories(is_active);

-- users: Portal-User-Felder
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invite_token VARCHAR(64),
  ADD COLUMN IF NOT EXISTS invite_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS first_login_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_invite_token ON users(invite_token);

-- audit_logs: revisionssichere Aktions-Historie
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_role VARCHAR(50),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  payload JSONB NOT NULL DEFAULT '{}',
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action, created_at DESC);

-- Execution Logs
CREATE TABLE IF NOT EXISTS execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entity_type VARCHAR(20) NOT NULL,
  entity_id UUID NOT NULL,
  entity_version VARCHAR(20),
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  executed_by VARCHAR(10) NOT NULL,
  status VARCHAR(20) NOT NULL,
  abort_reason TEXT,
  quality_score REAL,
  duration_minutes REAL,
  cost_estimate_usd REAL,
  flags TEXT[] DEFAULT '{}',
  linked_client_id UUID,
  linked_project_id UUID,
  human_approved BOOLEAN DEFAULT FALSE,
  human_approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  human_approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_execution_logs_tenant ON execution_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_execution_logs_entity ON execution_logs(tenant_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_execution_logs_status ON execution_logs(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_execution_logs_started ON execution_logs(tenant_id, started_at);
EOSQL
echo "Pre-Drizzle migrations complete!"

# ------------------------------------
# Migration 004: rename tenants → organization (must run BEFORE drizzle-kit push,
# otherwise drizzle-kit sees the name mismatch and prompts interactively)
# ------------------------------------
echo "Running migration 004 (rename tenants → organization)..."
PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 <<'EOSQL'
DO $$
BEGIN
  IF to_regclass('public.tenants') IS NOT NULL AND to_regclass('public.organization') IS NULL THEN
    ALTER TABLE tenants RENAME TO organization;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_tenants_slug') THEN
    ALTER INDEX idx_tenants_slug RENAME TO idx_organization_slug;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_tenants_status') THEN
    ALTER INDEX idx_tenants_status RENAME TO idx_organization_status;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='tenants_pkey') THEN
    ALTER INDEX tenants_pkey RENAME TO organization_pkey;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='tenants_slug_unique') THEN
    ALTER INDEX tenants_slug_unique RENAME TO organization_slug_unique;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='tenants_slug_key') THEN
    ALTER INDEX tenants_slug_key RENAME TO organization_slug_key;
  END IF;
END $$;
EOSQL
echo "Migration 004 complete!"

# ------------------------------------
# Sync database schema via Drizzle
# ------------------------------------
echo "Syncing database schema..."
printf 'n\n%.0s' {1..20} | npx drizzle-kit push --force
echo "Schema sync complete!"

# ------------------------------------
# Post-Drizzle SQL: recreate IR Playbook views
# ------------------------------------
echo "Recreating IR Playbook views..."
PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=0 <<'EOSQL'
CREATE OR REPLACE VIEW ir_scenario_summary AS
SELECT
  s.id, s.series, s.slug, s.title, s.emoji, s.color_hex,
  s.severity, s.severity_label, s.likelihood,
  s.dsgvo_relevant, s.nis2_relevant, s.financial_risk,
  s.avg_damage_eur_min, s.avg_damage_eur_max,
  s.tags, s.affected_systems,
  s.deprecated_at IS NULL AS is_active,
  COUNT(DISTINCT a.id)    AS action_count,
  COUNT(DISTINCT CASE WHEN a.do_not THEN a.id END) AS warning_count,
  COUNT(DISTINCT el.id)   AS escalation_levels,
  COUNT(DISTINCT rs.id)   AS recovery_steps,
  COUNT(DISTINCT ci.id)   AS checklist_items,
  COUNT(DISTINCT ll.id)   AS lessons_learned_count
FROM ir_scenarios s
LEFT JOIN ir_actions           a  ON a.scenario_id  = s.id
LEFT JOIN ir_escalation_levels el ON el.scenario_id = s.id
LEFT JOIN ir_recovery_steps    rs ON rs.scenario_id = s.id
LEFT JOIN ir_checklist_items   ci ON ci.scenario_id = s.id
LEFT JOIN ir_lessons_learned   ll ON ll.scenario_id = s.id
GROUP BY s.id;

CREATE OR REPLACE VIEW ir_dsgvo_checklist AS
SELECT
  s.id AS scenario_id, s.title AS scenario_title, s.series,
  ci.id AS item_id, ci.sequence, ci.category, ci.item, ci.mandatory
FROM ir_checklist_items ci
JOIN ir_scenarios s ON s.id = ci.scenario_id
WHERE ci.dsgvo_required = TRUE
ORDER BY s.id, ci.sequence;

CREATE OR REPLACE VIEW ir_immediate_actions AS
SELECT
  s.id AS scenario_id, s.title AS scenario_title, s.emoji, s.severity,
  a.id AS action_id, a.time_label, a.time_window_minutes, a.priority,
  a.category, a.responsible, a.action, a.detail, a.do_not, a.tool_hint
FROM ir_actions a
JOIN ir_scenarios s ON s.id = a.scenario_id
WHERE a.phase = 'IMMEDIATE'
  AND (a.time_window_minutes IS NULL OR a.time_window_minutes <= 30)
  AND s.deprecated_at IS NULL
ORDER BY s.id, a.priority;

CREATE OR REPLACE VIEW ir_bsi_control_mapping AS
SELECT
  ll.maps_to_control,
  COUNT(DISTINCT ll.scenario_id) AS scenario_count,
  ARRAY_AGG(DISTINCT s.id ORDER BY s.id) AS scenario_ids,
  ARRAY_AGG(DISTINCT s.title ORDER BY s.title) AS scenario_titles
FROM ir_lessons_learned ll
JOIN ir_scenarios s ON s.id = ll.scenario_id
WHERE ll.maps_to_control IS NOT NULL
GROUP BY ll.maps_to_control
ORDER BY scenario_count DESC, ll.maps_to_control;
EOSQL
echo "IR Playbook views ready."

# ------------------------------------
# Run seed if needed
# ------------------------------------
echo "Checking if seed is needed..."
npx tsx src/lib/db/seed-check.ts

# ------------------------------------
# Scheduled jobs: handled by src/instrumentation.ts (in-process ticker)
# No OS-level crond required. node:20-alpine does not ship crond by default,
# so we run the tick loop inside the Next.js server process.
# ------------------------------------

# ------------------------------------
# Start the application
# ------------------------------------
echo "Starting Next.js production server..."
exec su-exec nextjs node server.js
