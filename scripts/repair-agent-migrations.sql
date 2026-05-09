-- =============================================
-- REPAIR-SCRIPT: Agent-System Migrationen 020-023
-- =============================================
-- Hintergrund: Auf etablierten DBs (drizzle-kit push) wurden alle Migrationen
-- vom Bootstrap-Mechanismus (src/lib/db/migrator.ts:84) als "applied" markiert
-- ohne tatsaechlich ausgefuehrt zu werden. Dieses Script holt das fuer 020-023
-- nach. Idempotent — kann beliebig oft laufen.
--
-- Verwendung:
--   psql "$DATABASE_URL" -f scripts/repair-agent-migrations.sql
--
-- Voraussetzung Supabase: pgvector-Extension in Dashboard aktivieren
--   (Database → Extensions → vector)

BEGIN;

-- ─────────────────────────────────────────────
-- Extensions (Migration 020)
-- ─────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ─────────────────────────────────────────────
-- agent_goals (Migration 020)
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS agent_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  execution_mode VARCHAR(20) NOT NULL DEFAULT 'cron',
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  budget_tokens INTEGER,
  budget_cents INTEGER,
  spent_tokens INTEGER NOT NULL DEFAULT 0,
  spent_cents INTEGER NOT NULL DEFAULT 0,
  priority INTEGER NOT NULL DEFAULT 2,
  require_plan_approval BOOLEAN NOT NULL DEFAULT FALSE,
  created_by_user_id UUID REFERENCES users(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_goals_status_priority ON agent_goals (status, priority, created_at);
CREATE INDEX IF NOT EXISTS idx_agent_goals_user_status ON agent_goals (created_by_user_id, status);

-- ─────────────────────────────────────────────
-- agent_runs
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES agent_goals(id) ON DELETE CASCADE,
  attempt INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(30) NOT NULL DEFAULT 'planning',
  plan_json JSONB,
  context_snapshot_json JSONB,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  input_tokens BIGINT NOT NULL DEFAULT 0,
  output_tokens BIGINT NOT NULL DEFAULT 0,
  cached_input_tokens BIGINT NOT NULL DEFAULT 0,
  cost_cents INTEGER NOT NULL DEFAULT 0,
  liveness_checked_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_runs_goal_status ON agent_runs (goal_id, status);
CREATE INDEX IF NOT EXISTS idx_agent_runs_status_liveness ON agent_runs (status, liveness_checked_at);

-- ─────────────────────────────────────────────
-- agent_steps
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS agent_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES agent_goals(id) ON DELETE CASCADE,
  step_key VARCHAR(200) NOT NULL,
  worker_type VARCHAR(200) NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  context_refs JSONB NOT NULL DEFAULT '[]',
  depends_on_step_keys TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  result_json JSONB,
  result_summary VARCHAR(500),
  result_document_id UUID,
  input_tokens BIGINT NOT NULL DEFAULT 0,
  output_tokens BIGINT NOT NULL DEFAULT 0,
  cost_cents INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  task_queue_id UUID REFERENCES task_queue(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_agent_steps_run_step_key ON agent_steps (run_id, step_key);
CREATE INDEX IF NOT EXISTS idx_agent_steps_run_status ON agent_steps (run_id, status);
CREATE INDEX IF NOT EXISTS idx_agent_steps_status_taskqueue ON agent_steps (status, task_queue_id);

-- ─────────────────────────────────────────────
-- agent_definitions
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS agent_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) NOT NULL UNIQUE,
  role VARCHAR(30) NOT NULL,
  name VARCHAR(200),
  system_prompt TEXT NOT NULL,
  allowed_tools TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  model_hint VARCHAR(100),
  max_tokens_per_call INTEGER NOT NULL DEFAULT 4096,
  max_iterations INTEGER NOT NULL DEFAULT 8,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_definitions_role_active ON agent_definitions (role, is_active);

-- ─────────────────────────────────────────────
-- agent_memory_entries  (das war die haupt-fehlende Tabelle!)
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS agent_memory_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  para VARCHAR(20) NOT NULL,
  scope VARCHAR(500) NOT NULL,
  file_path TEXT NOT NULL,
  title VARCHAR(500),
  summary TEXT,
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  content_hash VARCHAR(64) NOT NULL,
  content_trgm TEXT,
  embedding vector(768),
  source_run_id UUID REFERENCES agent_runs(id) ON DELETE SET NULL,
  source_step_id UUID REFERENCES agent_steps(id) ON DELETE SET NULL,
  source_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  superseded_by_entry_id UUID REFERENCES agent_memory_entries(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_agent_memory_entries_filepath ON agent_memory_entries (file_path);
CREATE INDEX IF NOT EXISTS idx_agent_memory_entries_scope_status ON agent_memory_entries (scope, status);
CREATE INDEX IF NOT EXISTS idx_agent_memory_entries_trgm
  ON agent_memory_entries USING gin (content_trgm gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_agent_memory_entries_embedding
  ON agent_memory_entries USING ivfflat (embedding vector_cosine_ops);

-- ─────────────────────────────────────────────
-- agent_cost_events
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS agent_cost_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES agent_runs(id) ON DELETE SET NULL,
  step_id UUID REFERENCES agent_steps(id) ON DELETE SET NULL,
  goal_id UUID REFERENCES agent_goals(id) ON DELETE SET NULL,
  provider VARCHAR(50) NOT NULL,
  model VARCHAR(100) NOT NULL,
  call_role VARCHAR(50) NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  cached_input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cost_cents INTEGER NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_cost_events_goal_occurred ON agent_cost_events (goal_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_agent_cost_events_run_occurred ON agent_cost_events (run_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_agent_cost_events_provider_occurred ON agent_cost_events (provider, occurred_at);

-- task_queue Index fuer Agent-Tick-Performance
CREATE INDEX IF NOT EXISTS idx_task_queue_type_status_scheduled
  ON task_queue (type, status, scheduled_for);

-- ─────────────────────────────────────────────
-- Migration 021: Default-Smart-Worker
-- ─────────────────────────────────────────────

INSERT INTO agent_definitions (slug, role, name, system_prompt, allowed_tools, model_hint, max_tokens_per_call, max_iterations)
VALUES
  (
    'writer',
    'worker',
    'Writer',
    'Du bist ein praeziser Schreib-Assistent. Du nimmst eine Aufgabe (z.B. Text schreiben, ueberarbeiten, kuerzen) und lieferst genau das gewuenschte Ergebnis. Nutze Memory-Tools um Kontext nachzuschlagen, Prompt-Tools um Templates zu rendern. Antworte deutsch.',
    ARRAY['memory:read', 'memory:search', 'memory:list', 'memory:write', 'prompt:*'],
    'gemini-2.5-flash-lite',
    2048,
    6
  ),
  (
    'researcher',
    'worker',
    'Researcher',
    'Du bist ein Recherche-Agent. Du nimmst eine Recherche-Aufgabe (z.B. Firmen-Hintergrund, Marktdaten, technische Frage) und lieferst eine zusammengefasste Antwort. Nutze service-Tools fuer Web-Recherche, memory-Tools zum Speichern und Wiederfinden. Antworte deutsch.',
    ARRAY['memory:read', 'memory:search', 'memory:list', 'memory:write', 'service:lead-research', 'service:website-scraper'],
    'gemini-2.5-flash',
    4096,
    8
  ),
  (
    'generalist',
    'worker',
    'Generalist',
    'Du bist ein generischer Smart-Worker. Du nimmst eine offene Aufgabe und arbeitest sie mit den verfuegbaren Tools ab. Halte dich kurz, prueffe Memory bevor du etwas neu generierst, schreibe wichtige Erkenntnisse in Memory zurueck. Antworte deutsch.',
    ARRAY['memory:*', 'prompt:*', 'workflow:*'],
    'gemini-2.5-flash-lite',
    2048,
    8
  )
ON CONFLICT (slug) DO NOTHING;

-- ─────────────────────────────────────────────
-- Migration 022: Goal-Templates
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS agent_goal_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  title_template TEXT NOT NULL,
  description_template TEXT,
  required_variables TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  default_budget_cents INTEGER,
  default_budget_tokens INTEGER,
  default_execution_mode VARCHAR(20) NOT NULL DEFAULT 'cron',
  default_priority INTEGER NOT NULL DEFAULT 2,
  default_require_plan_approval BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_goal_templates_slug_active ON agent_goal_templates (slug, is_active);

INSERT INTO agent_goal_templates (slug, name, description, title_template, description_template, required_variables, default_budget_cents, default_priority)
VALUES
  (
    'firma-recherchieren',
    'Firma recherchieren',
    'Recherchiert eine Firma und legt ein Memo unter Resources/firmen/<slug> ab.',
    'Recherche: {{firmenName}}',
    'Recherchiere die Firma "{{firmenName}}" — Branche, Mitarbeiterzahl, Umsatz, Schluesselpersonen, aktuelle News. Nutze service:lead-research und service:website-scraper. Speichere die Zusammenfassung als Memory unter Resources/firmen/{{firmenName}}.md.',
    ARRAY['firmenName'],
    500,
    2
  ),
  (
    'memo-schreiben',
    'Memo schreiben',
    'Schreibt ein kurzes Memo zu einem Thema basierend auf vorhandenem Memory.',
    'Memo: {{thema}}',
    'Schreibe ein praezises Memo (max 500 Worte) zum Thema "{{thema}}". Nutze memory:search um vorhandenes Material zu finden, agent:writer fuer den Fliesstext. Speichere als Memory unter Projects/memos/{{thema}}.md.',
    ARRAY['thema'],
    300,
    2
  ),
  (
    'newsletter-analysieren',
    'Newsletter-URL analysieren',
    'Scrapt eine Newsletter-Quelle und legt strukturierte Notizen ab.',
    'Newsletter-Analyse: {{quelleUrl}}',
    'Scrape die URL "{{quelleUrl}}" via service:website-scraper, extrahiere die wichtigsten 5 Punkte, speichere als Memory unter Resources/newsletter/<auto-slug>.md.',
    ARRAY['quelleUrl'],
    300,
    2
  )
ON CONFLICT (slug) DO NOTHING;

-- ─────────────────────────────────────────────
-- Migration 023: Performance-Index
-- ─────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_agent_cost_events_occurred_desc
  ON agent_cost_events (occurred_at DESC);

-- ─────────────────────────────────────────────
-- _migrations Tracking aktualisieren
-- damit der Auto-Migrator beim naechsten Boot konsistent bleibt
-- ─────────────────────────────────────────────

INSERT INTO _migrations (name) VALUES ('020_agent_system_phase1.sql') ON CONFLICT (name) DO NOTHING;
INSERT INTO _migrations (name) VALUES ('021_agent_definitions_seed.sql') ON CONFLICT (name) DO NOTHING;
INSERT INTO _migrations (name) VALUES ('022_agent_goal_templates.sql') ON CONFLICT (name) DO NOTHING;
INSERT INTO _migrations (name) VALUES ('023_agent_cost_events_index.sql') ON CONFLICT (name) DO NOTHING;

COMMIT;

-- ─────────────────────────────────────────────
-- Verify (manuell als separate Queries laufen):
--
-- SELECT COUNT(*) FROM agent_memory_entries;
-- SELECT slug FROM agent_definitions ORDER BY slug;
-- SELECT slug FROM agent_goal_templates ORDER BY slug;
-- ─────────────────────────────────────────────
