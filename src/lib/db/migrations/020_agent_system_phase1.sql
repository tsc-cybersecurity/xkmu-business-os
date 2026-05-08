-- =============================================
-- 020: Agent-System Phase 1 — Schema + Extensions
-- =============================================
-- Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md
--
-- Legt die Foundation fuer das KI-Agenten-System an:
--   - pgvector + pg_trgm Extensions
--   - 6 neue agent_*-Tabellen (goals/runs/steps/definitions/memory_entries/cost_events)
--   - Task-Queue Index fuer Agent-Tick-Performance
--
-- Idempotent: CREATE EXTENSION/TABLE/INDEX IF NOT EXISTS.

-- ─────────────────────────────────────────────
-- Extensions
-- ─────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ─────────────────────────────────────────────
-- agent_goals — die User-Aufgabe
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
-- agent_runs — Run-Iteration eines Goals
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
-- agent_steps — Plan-Schritte
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
-- agent_definitions — Worker-/Orchestrator-Profile
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
-- agent_memory_entries — Index fuer Markdown-Files
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
-- agent_cost_events — pro LLM-Call ein Event
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

-- ─────────────────────────────────────────────
-- task_queue Index fuer Agent-Tick-Performance
-- ─────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_task_queue_type_status_scheduled
  ON task_queue (type, status, scheduled_for);
