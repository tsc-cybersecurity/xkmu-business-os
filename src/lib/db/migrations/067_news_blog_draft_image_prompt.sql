-- ============================================================
-- 067_news_blog_draft_image_prompt.sql
-- ------------------------------------------------------------
-- News-Pipeline (Stufe 2: news-blog-draft) soll wie die manuelle
-- Blog-Generierung zusaetzlich einen englischen Bildprompt +
-- deutschen Alt-Text liefern. Bisher fehlten diese Felder im
-- outputFormat — Folge: Beitraege aus dem News-Modul kamen
-- ohne Hero-Bild und ohne dokumentierten Bildprompt in den
-- Blog. Mit Migration 066 ist die Spalte da, hier wird der
-- Template-Output entsprechend erweitert.
--
-- Update-Strategie: nur die Felder ueberschreiben, die wir
-- definitiv neu setzen wollen (outputFormat + userPrompt-
-- Hinweis). systemPrompt + Restfelder bleiben unangetastet,
-- damit operator-seitige Anpassungen erhalten bleiben.
-- ============================================================

UPDATE ai_prompt_templates
SET
  output_format = '{ "title": "...", "excerpt": "...", "content": "Markdown ~600-900 Woerter", "seoTitle": "<=70 Zeichen", "seoDescription": "<=160 Zeichen", "tags": ["...","..."], "featuredImage": "<detaillierter englischer AI-Bildgenerierungs-Prompt, fotorealistisch, B2B, 16:9, ohne Text/Logos/Wasserzeichen>", "featuredImageAlt": "<beschreibender deutscher Alt-Text, max 200 Zeichen>" }',
  updated_at    = now()
WHERE slug = 'news-blog-draft';
