-- ============================================================
-- 077_business_plan_artifacts.sql
-- ------------------------------------------------------------
-- Generierte Artefakte zu einem Plan (PDF-Export, Pitch-Bilder, etc.).
-- iteration_id ist optional — ein Artefakt kann an eine spezifische
-- Iteration gebunden sein (z.B. PDF-Export der Iteration 3) oder am
-- aktuellen Final-State haengen (iteration_id NULL).
--
-- file_url ist eine Referenz auf das Object Storage / Asset-System.
-- Format-Konvention: relativer Pfad ab /uploads bzw. absolute URL.
-- ============================================================

CREATE TABLE IF NOT EXISTS business_plan_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES business_plans(id) ON DELETE CASCADE,
  iteration_id uuid REFERENCES business_plan_iterations(id) ON DELETE SET NULL,
  kind varchar(30) NOT NULL,
  file_url text NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_business_plan_art_plan ON business_plan_artifacts(plan_id);
CREATE INDEX IF NOT EXISTS idx_business_plan_art_iteration ON business_plan_artifacts(iteration_id);
CREATE INDEX IF NOT EXISTS idx_business_plan_art_kind ON business_plan_artifacts(kind);
