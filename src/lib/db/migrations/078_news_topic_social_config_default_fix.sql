-- ============================================================
-- 078_news_topic_social_config_default_fix.sql
-- ------------------------------------------------------------
-- HOTFIX: Migration 073 setzte den Default fuer
-- news_topics.social_config als Funktions-Aufruf:
--   jsonb_build_object('platforms', jsonb_build_array(...), ...)
--
-- drizzle-kit (Schema-Sync) versucht beim Pull diesen Default per
-- JSON.parse zu lesen und crasht hart mit
--   SyntaxError: Unexpected token 's', "sonb_build"...
-- Folge: drizzle-kit push faellt, App-Container restartet endlos.
--
-- Fix: Default als JSON-Literal mit ::jsonb-Cast setzen — semantisch
-- identisch, aber von drizzle-kit's internem Parser akzeptiert.
-- ============================================================

ALTER TABLE news_topics
  ALTER COLUMN social_config
  SET DEFAULT '{"platforms":["x","facebook","instagram"],"includeImage":true}'::jsonb;
