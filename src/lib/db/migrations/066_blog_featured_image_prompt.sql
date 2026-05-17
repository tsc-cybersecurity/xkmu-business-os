-- ============================================================
-- 066_blog_featured_image_prompt.sql
-- ------------------------------------------------------------
-- Persistiert den AI-Bildgenerierungs-Prompt fuer das Hero-Bild
-- eines Blog-Beitrags. Bisher hat die KI bei der Beitrags-
-- generierung einen detaillierten Image-Prompt erzeugt, der
-- direkt an Gemini ging — die URL wurde gespeichert, der Prompt
-- selbst aber verworfen. Operatoren konnten danach nicht
-- nachvollziehen, womit das Bild generiert wurde, und beim
-- Re-Generieren musste ein neuer Prompt geschrieben werden.
--
-- TEXT (kein varchar-Limit), weil die KI mitunter sehr
-- detaillierte Mehrzeilen-Prompts liefert.
-- ============================================================

ALTER TABLE blog_posts
  ADD COLUMN IF NOT EXISTS featured_image_prompt text;
