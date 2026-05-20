-- ============================================================
-- 075_business_plans.sql
-- ------------------------------------------------------------
-- Haupt-Datensatz fuer die KI-gesteuerte Businessplan-Plattform.
-- Ein business_plans-Eintrag haelt den Operator-Input + Plan-State.
-- Der eigentliche Plan-Inhalt (Canvas/KfW-Markdown) liegt pro
-- Iteration in business_plan_iterations (Migration 076).
--
-- Status-Lifecycle: idle → running → (completed | failed | stopped)
-- mode: canvas | kfw | both — Operator entscheidet beim Anlegen welche
--        Plan-Form generiert wird
-- input_type: quick (nur Idea-String) | briefing (strukturiert)
-- score_threshold: ab welchem Score (KI-Bewertung der Simulation) die
--                  Iterationsschleife beendet wird (Default 80)
-- max_iterations: harte Obergrenze (Default 5, max 10)
-- ============================================================

CREATE TABLE IF NOT EXISTS business_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title varchar(255) NOT NULL,
  mode varchar(16) NOT NULL CHECK (mode IN ('canvas', 'kfw', 'both')),
  input_type varchar(16) NOT NULL CHECK (input_type IN ('quick', 'briefing')),
  seed_input jsonb NOT NULL,
  current_iteration int NOT NULL DEFAULT 0,
  max_iterations int NOT NULL DEFAULT 5 CHECK (max_iterations > 0 AND max_iterations <= 10),
  score_threshold int NOT NULL DEFAULT 80 CHECK (score_threshold >= 0 AND score_threshold <= 100),
  final_score int CHECK (final_score IS NULL OR (final_score >= 0 AND final_score <= 100)),
  status varchar(20) NOT NULL DEFAULT 'idle'
    CHECK (status IN ('idle', 'running', 'completed', 'failed', 'stopped')),
  error text,
  current_iteration_task_id uuid REFERENCES task_queue(id) ON DELETE SET NULL,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_business_plans_status ON business_plans(status);
CREATE INDEX IF NOT EXISTS idx_business_plans_created_by ON business_plans(created_by);
CREATE INDEX IF NOT EXISTS idx_business_plans_created_at ON business_plans(created_at DESC);
