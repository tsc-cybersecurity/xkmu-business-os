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
SET social_config = jsonb_build_object(
  'platforms', jsonb_build_array('x', 'facebook', 'instagram'),
  'includeImage', true
)
WHERE social_config IS NULL;

ALTER TABLE news_topics
  ALTER COLUMN social_config SET DEFAULT jsonb_build_object(
    'platforms', jsonb_build_array('x', 'facebook', 'instagram'),
    'includeImage', true
  );

ALTER TABLE news_topics
  ALTER COLUMN social_config SET NOT NULL;
