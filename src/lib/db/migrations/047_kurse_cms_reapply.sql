-- ============================================================
-- Migration 047: /kurse CMS-Page re-apply (falls nicht eingespielt)
--
-- Migration 041 hat in einigen Umgebungen offenbar keine
-- /kurse-Page erzeugt — die Seite faellt im Frontend auf den
-- Hardcoded-Fallback zurueck, und in der internen CMS-Liste
-- erscheint sie nicht.
--
-- Diese Migration ist DEFENSIV idempotent:
-- - Existiert bereits eine Page mit slug='/kurse' ODER slug='kurse'
--   → nur Status/in_sitemap absichern, KEINE User-Edits ueberschreiben
-- - Existiert keine → frisch anlegen mit Hero + Text-Block +
--   published_blocks-Snapshot (analog Migration 041)
-- ============================================================

DO $$
DECLARE
  v_page_id uuid;
BEGIN
  -- Toleranter Lookup: '/kurse' bevorzugt, sonst 'kurse' ohne fuehrenden Slash.
  SELECT id INTO v_page_id FROM cms_pages WHERE slug = '/kurse' LIMIT 1;
  IF v_page_id IS NULL THEN
    SELECT id INTO v_page_id FROM cms_pages WHERE slug = 'kurse' LIMIT 1;
  END IF;

  IF v_page_id IS NOT NULL THEN
    -- Page existiert: nur Sichtbarkeit absichern, keinen Content ueberschreiben.
    UPDATE cms_pages SET
      status = 'published',
      in_sitemap = true,
      published_at = COALESCE(published_at, now()),
      updated_at = now()
    WHERE id = v_page_id;
    RAISE NOTICE 'Migration 047: /kurse-Page existiert (id=%), Status/Sitemap-Flag abgesichert.', v_page_id;
    RETURN;
  END IF;

  -- Page existiert nicht → neu anlegen.
  INSERT INTO cms_pages (slug, title, seo_title, seo_description, status, published_at,
    published_title, published_seo_title, published_seo_description, in_sitemap)
  VALUES (
    '/kurse',
    'Kostenlose Onlinekurse: IT, KI & Cybersecurity für KMU',
    'Onlinekurse für KMU – IT, KI & Cybersecurity | xKMU',
    'Kostenlose Onlinekurse zu IT-Sicherheit, KI-Grundlagen und Compliance für kleine und mittlere Unternehmen — pragmatisch und sofort umsetzbar.',
    'published',
    now(),
    'Kostenlose Onlinekurse: IT, KI & Cybersecurity für KMU',
    'Onlinekurse für KMU – IT, KI & Cybersecurity | xKMU',
    'Kostenlose Onlinekurse zu IT-Sicherheit, KI-Grundlagen und Compliance für kleine und mittlere Unternehmen — pragmatisch und sofort umsetzbar.',
    true
  ) RETURNING id INTO v_page_id;

  -- Hero
  INSERT INTO cms_blocks (page_id, block_type, sort_order, content, settings, is_visible) VALUES (
    v_page_id, 'hero', 0,
    '{
      "badge": {"icon": "GraduationCap", "text": "Lerninhalte aus der Praxis"},
      "headline": "Kostenlose Onlinekurse: IT, KI & Cybersecurity für KMU",
      "subheadline": "Kompakte, kostenlose Lerneinheiten zu IT-Sicherheit, KI-Grundlagen und Compliance — pragmatisch, sofort umsetzbar und ohne Berater-Folien.",
      "size": "small"
    }'::jsonb, '{}'::jsonb, true);

  -- Intro-Text
  INSERT INTO cms_blocks (page_id, block_type, sort_order, content, settings, is_visible) VALUES (
    v_page_id, 'text', 1,
    '{
      "alignment": "left",
      "content": "## Wissen, das im Alltag funktioniert\n\nUnsere Onlinekurse sind so geschnitten, wie wir auch beraten: pragmatisch, mit klaren Schritten und ohne unnötige Theorie. Sie können einzelne Lektionen ansehen oder ganze Kurse durcharbeiten — alles ohne Anmeldung, alles kostenlos. Wenn Sie nach einem Kurs konkrete Umsetzung im eigenen Unternehmen brauchen, sind Sie bei unserer [Beratung](/kontakt?interesse=KI-Beratung) richtig."
    }'::jsonb, '{"maxWidth": 768}'::jsonb, true);

  -- Published-Snapshot
  UPDATE cms_pages SET
    published_blocks = (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', b.id, 'blockType', b.block_type, 'sortOrder', b.sort_order,
          'content', b.content, 'settings', b.settings, 'isVisible', b.is_visible
        ) ORDER BY b.sort_order
      )
      FROM cms_blocks b WHERE b.page_id = v_page_id
    ),
    has_draft_changes = false,
    updated_at = now()
  WHERE id = v_page_id;

  RAISE NOTICE 'Migration 047: /kurse-Page neu angelegt (id=%).', v_page_id;
END $$;
