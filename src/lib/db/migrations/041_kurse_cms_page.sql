-- ============================================================
-- Migration 041: /kurse als CMS-Page editierbar machen
--
-- Die /kurse-Seite war bisher hart-codiert (Page-tsx mit fixed
-- Headline und Metadata). Jetzt: CMS-Page legt Hero + SEO-Meta fest,
-- die dynamische Course-Liste bleibt automatisch unter dem CMS-Content.
--
-- Idempotent: bei existierender Seite werden Bloecke neu aufgebaut.
-- ============================================================

DO $$
DECLARE
  v_page_id uuid;
BEGIN
  SELECT id INTO v_page_id FROM cms_pages WHERE slug = '/kurse' LIMIT 1;

  IF v_page_id IS NULL THEN
    INSERT INTO cms_pages (slug, title, seo_title, seo_description, status, published_at,
      published_title, published_seo_title, published_seo_description)
    VALUES (
      '/kurse',
      'Onlinekurse',
      'Onlinekurse für KMU – IT, KI & Cybersecurity | xKMU',
      'Kostenlose Onlinekurse zu IT-Sicherheit, KI-Grundlagen und Compliance für kleine und mittlere Unternehmen — pragmatisch und sofort umsetzbar.',
      'published',
      now(),
      'Onlinekurse',
      'Onlinekurse für KMU – IT, KI & Cybersecurity | xKMU',
      'Kostenlose Onlinekurse zu IT-Sicherheit, KI-Grundlagen und Compliance für kleine und mittlere Unternehmen — pragmatisch und sofort umsetzbar.'
    ) RETURNING id INTO v_page_id;
  ELSE
    UPDATE cms_pages SET
      title = 'Onlinekurse',
      seo_title = 'Onlinekurse für KMU – IT, KI & Cybersecurity | xKMU',
      seo_description = 'Kostenlose Onlinekurse zu IT-Sicherheit, KI-Grundlagen und Compliance für kleine und mittlere Unternehmen — pragmatisch und sofort umsetzbar.',
      published_seo_title = 'Onlinekurse für KMU – IT, KI & Cybersecurity | xKMU',
      published_seo_description = 'Kostenlose Onlinekurse zu IT-Sicherheit, KI-Grundlagen und Compliance für kleine und mittlere Unternehmen — pragmatisch und sofort umsetzbar.',
      status = 'published',
      published_at = COALESCE(published_at, now()),
      updated_at = now()
    WHERE id = v_page_id;
    DELETE FROM cms_blocks WHERE page_id = v_page_id;
  END IF;

  -- 0: Hero
  INSERT INTO cms_blocks (page_id, block_type, sort_order, content, settings, is_visible) VALUES (
    v_page_id, 'hero', 0,
    '{
      "badge": {"icon": "GraduationCap", "text": "Lerninhalte aus der Praxis"},
      "headline": "Onlinekurse für KMU.",
      "subheadline": "Kostenlose, kompakte Lerneinheiten zu IT-Sicherheit, KI-Grundlagen und Compliance — pragmatisch, sofort umsetzbar und ohne Berater-Folien.",
      "size": "small"
    }'::jsonb, '{}'::jsonb, true);

  -- 1: Text
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
          'id', b.id,
          'blockType', b.block_type,
          'sortOrder', b.sort_order,
          'content', b.content,
          'settings', b.settings,
          'isVisible', b.is_visible
        ) ORDER BY b.sort_order
      )
      FROM cms_blocks b WHERE b.page_id = v_page_id
    ),
    has_draft_changes = false,
    updated_at = now()
  WHERE id = v_page_id;
END $$;
