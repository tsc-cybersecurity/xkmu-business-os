-- ============================================================
-- 076_business_plan_iterations.sql
-- ------------------------------------------------------------
-- Pro Plan-Iteration ein Eintrag mit:
--   - generierter Plan-Version (Canvas-JSONB + KfW-Markdown, je nach mode)
--   - Mirofish-Simulationsergebnis (raw)
--   - KI-Analyse mit Score + Verbesserungs-Anweisungen
--
-- iteration_number ist 1-basiert. UNIQUE(plan_id, iteration_number)
-- verhindert Doppellaeufe bei Worker-Retries.
--
-- Status pro Iteration: pending → generating → simulating → analyzing → done
-- Bei Fehler: failed mit error-Text.
-- ============================================================

CREATE TABLE IF NOT EXISTS business_plan_iterations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES business_plans(id) ON DELETE CASCADE,
  iteration_number int NOT NULL CHECK (iteration_number > 0),
  plan_canvas jsonb,
  plan_kfw_markdown text,
  simulation_request jsonb,
  simulation_result jsonb,
  analysis jsonb,
  duration_ms int,
  status varchar(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'generating', 'simulating', 'analyzing', 'done', 'failed')),
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_business_plan_iter_number UNIQUE (plan_id, iteration_number)
);

CREATE INDEX IF NOT EXISTS idx_business_plan_iter_plan ON business_plan_iterations(plan_id);
CREATE INDEX IF NOT EXISTS idx_business_plan_iter_status ON business_plan_iterations(status);
CREATE INDEX IF NOT EXISTS idx_business_plan_iter_created ON business_plan_iterations(created_at DESC);
