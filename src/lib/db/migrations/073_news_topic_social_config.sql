-- ============================================================
-- 073_news_topic_social_config.sql
-- ------------------------------------------------------------
-- News-Pipeline Stufe 3 (Social-Media-Generierung) wird ab jetzt
-- PRO TOPIC konfigurierbar:
--   - welche Plattformen (X, Facebook, Instagram, LinkedIn)
--   - ob das generierte Hero-Bild des Blog-Posts an die Social-Media-
--     Posts angehaengt wird (imageUrl)
--
-- Bisher waren die Plattformen hart auf ['linkedin','x'] verdrahtet.
-- Default neu: X + Facebook + Instagram, mit Hero-Bild (LinkedIn ist
-- opt-in).
--
-- Idempotent: Spalte wird nur angelegt wenn nicht vorhanden, Backfill
-- nur fuer NULL-Werte.
-- ============================================================

ALTER TABLE news_topics
  ADD COLUMN IF NOT EXISTS social_config jsonb;

UPDATE news_topics
SET social_config = '{"platforms":["x","facebook","instagram"],"includeImage":true}'::jsonb
WHERE social_config IS NULL;

-- WICHTIG: Default als JSON-Literal mit ::jsonb-Cast, NICHT als
-- jsonb_build_object(...)-Funktionsaufruf. drizzle-kit (Schema-Sync) liest
-- den Default-Wert beim Pull per JSON.parse und crasht hart auf Funktions-
-- Calls ("Unexpected token 's', sonb_build..."). JSON-Literal + Cast wird
-- vom Parser akzeptiert. Siehe Migration 078 falls historischer Stand
-- noch den Function-Default hat.
ALTER TABLE news_topics
  ALTER COLUMN social_config
  SET DEFAULT '{"platforms":["x","facebook","instagram"],"includeImage":true}'::jsonb;

ALTER TABLE news_topics
  ALTER COLUMN social_config SET NOT NULL;
