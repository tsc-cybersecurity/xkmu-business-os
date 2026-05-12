-- ============================================================
-- Migration 060: Personennamen aus /ueber-uns Meta + NIS-2-Blog
--
-- Folge-Migration zu 059. Entfernt Personennamen aus:
-- 1) /ueber-uns seo_description + published_seo_description
-- 2) Blog-Post "nis-2-fuer-kleine-unternehmen..." content
--
-- /ueber-uns Team-Block bleibt unveraendert — dort ist Personen-
-- Nennung korrekt (Person-Detail-Sektion).
--
-- Idempotent ueber exakte String-Matches in REPLACE().
-- ============================================================

-- ─── 1) /ueber-uns Meta-Description ─────────────────────────────────
UPDATE cms_pages SET
  seo_description = 'xKMU digital solutions: pragmatische Beratung für KMU aus Weimar in Thüringen. Lernen Sie unsere Geschichte, Mission und Werte kennen.',
  published_seo_description = 'xKMU digital solutions: pragmatische Beratung für KMU aus Weimar in Thüringen. Lernen Sie unsere Geschichte, Mission und Werte kennen.',
  updated_at = now()
WHERE slug = '/ueber-uns';

-- ─── 2) Blog-Artikel NIS-2: Personennamen ersetzen ──────────────────
UPDATE blog_posts SET
  content = REPLACE(
    content,
    'Gründer Tino Stenzel ist BSI-zertifizierter IT-Grundschutz-Praktiker — die NIS-2-Maßnahmen sind in seiner täglichen Beratungspraxis verankert',
    'xKMU ist BSI-IT-Grundschutz-Praktiker-zertifiziert — die NIS-2-Maßnahmen sind in unserer täglichen Beratungspraxis verankert'
  ),
  updated_at = now()
WHERE slug = 'nis-2-fuer-kleine-unternehmen-was-geschaeftsfuehrer-wissen-muessen';
