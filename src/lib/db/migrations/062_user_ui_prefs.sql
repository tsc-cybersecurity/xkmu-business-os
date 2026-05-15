-- ============================================================
-- 062_user_ui_prefs.sql
-- ------------------------------------------------------------
-- Pro-Benutzer UI-Praeferenzen als JSONB. Aktuell genutzt fuer
-- die Quick-Action-FAB-Konfiguration (Position, Hintergrund,
-- ausgewaehlte Icons, Reihenfolge). Schema bleibt absichtlich
-- generisch (key-keyed Map) damit weitere UI-Settings ohne
-- Schema-Aenderung dazu kommen koennen.
-- ============================================================

CREATE TABLE IF NOT EXISTS user_ui_prefs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  prefs       jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_ui_prefs_user ON user_ui_prefs(user_id);
