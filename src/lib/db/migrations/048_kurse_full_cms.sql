-- ============================================================
-- Migration 048: /kurse vollstaendig CMS-bearbeitbar + neuer
--                course-listing Block-Typ
--
-- 1) Registriert den Block-Typ 'course-listing' (Slug eindeutig,
--    ON CONFLICT DO NOTHING — kompatibel mit seedDefaults()).
-- 2) Baut die /kurse-Page neu auf: Hero + Intro-Text + Course-
--    Listing-Block + CTA — design-konsistent mit Pillar-Seiten.
--    Bestehende Bloecke werden ersetzt, damit der neue Aufbau
--    aktiv wird (User-Edits gehen verloren — Migration 048 wird
--    nur einmal ausgefuehrt).
-- ============================================================

-- ─── 1) Block-Type registrieren ──────────────────────────────────────
INSERT INTO cms_block_type_definitions
  (slug, name, description, icon, category, fields, default_content, default_settings,
   is_active, sort_order)
VALUES (
  'course-listing',
  'Kurs-Liste',
  'Dynamische Liste aller veroeffentlichten Onlinekurse — Grid mit Titel, Untertitel, Dauer.',
  'GraduationCap',
  'content',
  '["title","subtitle","columns","limit","basePath","emptyText"]'::jsonb,
  '{
    "title": "Aktuelle Onlinekurse",
    "subtitle": "Kostenlos, ohne Anmeldung — sofort starten.",
    "columns": 3,
    "limit": 60,
    "basePath": "/kurse",
    "emptyText": "Demnächst gibt es hier freie Lerninhalte."
  }'::jsonb,
  '{}'::jsonb,
  true,
  23
)
ON CONFLICT (slug) DO NOTHING;

-- ─── 2) /kurse-Page neu aufbauen ─────────────────────────────────────
DO $$
DECLARE
  v_page_id uuid;
BEGIN
  SELECT id INTO v_page_id FROM cms_pages WHERE slug = '/kurse' LIMIT 1;

  IF v_page_id IS NULL THEN
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
  END IF;

  -- Bestehende Bloecke leeren (Page wird mit dem neuen Pattern aufgebaut).
  DELETE FROM cms_blocks WHERE page_id = v_page_id;

  -- 0: Hero (Pillar-konsistent — kleinerer Hero, kein riesiges Padding)
  INSERT INTO cms_blocks (page_id, block_type, sort_order, content, settings, is_visible) VALUES (
    v_page_id, 'hero', 0,
    '{
      "badge": {"icon": "GraduationCap", "text": "Lerninhalte aus der Praxis"},
      "headline": "Kostenlose Onlinekurse: IT, KI & Cybersecurity für KMU",
      "subheadline": "Kompakte, kostenlose Lerneinheiten zu IT-Sicherheit, KI-Grundlagen und Compliance — pragmatisch, sofort umsetzbar und ohne Berater-Folien.",
      "size": "small"
    }'::jsonb, '{}'::jsonb, true);

  -- 1: Intro-Text
  INSERT INTO cms_blocks (page_id, block_type, sort_order, content, settings, is_visible) VALUES (
    v_page_id, 'text', 1,
    '{
      "alignment": "left",
      "content": "## Wissen, das im Alltag funktioniert\n\nUnsere Onlinekurse sind so geschnitten, wie wir auch beraten: pragmatisch, mit klaren Schritten und ohne unnötige Theorie. Sie können einzelne Lektionen ansehen oder ganze Kurse durcharbeiten — alles ohne Anmeldung, alles kostenlos. Wenn Sie nach einem Kurs konkrete Umsetzung im eigenen Unternehmen brauchen, sind Sie bei unserer [Beratung](/kontakt?interesse=KI-Beratung) richtig."
    }'::jsonb, '{"maxWidth": 768}'::jsonb, true);

  -- 2: Course-Listing (dynamisch, holt sich Kurse via /api/public/courses)
  INSERT INTO cms_blocks (page_id, block_type, sort_order, content, settings, is_visible) VALUES (
    v_page_id, 'course-listing', 2,
    '{
      "title": "Aktuelle Onlinekurse",
      "subtitle": "Kostenlos, ohne Anmeldung — sofort starten.",
      "columns": 3,
      "limit": 60,
      "basePath": "/kurse",
      "emptyText": "Demnächst gibt es hier freie Lerninhalte."
    }'::jsonb, '{}'::jsonb, true);

  -- 3: CTA — Brueckenschlag zur Beratung
  INSERT INTO cms_blocks (page_id, block_type, sort_order, content, settings, is_visible) VALUES (
    v_page_id, 'cta', 3,
    '{
      "headline": "Lieber direkt umsetzen lassen?",
      "description": "Wenn Sie nach den Kursen Unterstützung bei der konkreten Umsetzung in Ihrem Unternehmen brauchen — wir helfen pragmatisch und mit Festpreisen.",
      "buttons": [
        {"label": "Kostenloses Erstgespräch buchen", "href": "/kontakt?interesse=KI-Beratung", "variant": "default"},
        {"label": "Alle Leistungen ansehen", "href": "/loesungen", "variant": "outline"}
      ],
      "backgroundStyle": "dark",
      "size": "full"
    }'::jsonb, '{}'::jsonb, true);

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
END $$;
