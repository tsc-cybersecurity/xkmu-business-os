-- ============================================================
-- Migration 032: Ueber-uns-Seite (/ueber-uns)
--
-- P3-01: Eigene Ueber-uns-Seite mit Gruender-Story, Philosophie,
-- Mission, Team-Vorstellung und Werten. Trust-Signal — auch fuer
-- AI-Search-Visibility (E-E-A-T).
--
-- Idempotent: existiert die Seite bereits, werden Blocks neu aufgebaut.
-- ============================================================

DO $$
DECLARE
  v_page_id uuid;
  v_existed boolean;
BEGIN
  SELECT id, true INTO v_page_id, v_existed FROM cms_pages WHERE slug = '/ueber-uns' LIMIT 1;

  IF v_page_id IS NULL THEN
    INSERT INTO cms_pages (slug, title, seo_title, seo_description, status, published_at,
      published_title, published_seo_title, published_seo_description)
    VALUES (
      '/ueber-uns',
      'Über uns',
      'Über uns – IT, KI & Cybersecurity aus Weimar | xKMU',
      'xKMU digital solutions: pragmatische Beratung für KMU aus Weimar in Thüringen. Lernen Sie unseren Gründer Tino Stenzel und unsere Philosophie kennen.',
      'published',
      now(),
      'Über uns',
      'Über uns – IT, KI & Cybersecurity aus Weimar | xKMU',
      'xKMU digital solutions: pragmatische Beratung für KMU aus Weimar in Thüringen. Lernen Sie unseren Gründer Tino Stenzel und unsere Philosophie kennen.'
    ) RETURNING id INTO v_page_id;
  ELSE
    UPDATE cms_pages SET
      title = 'Über uns',
      seo_title = 'Über uns – IT, KI & Cybersecurity aus Weimar | xKMU',
      seo_description = 'xKMU digital solutions: pragmatische Beratung für KMU aus Weimar in Thüringen. Lernen Sie unseren Gründer Tino Stenzel und unsere Philosophie kennen.',
      published_seo_title = 'Über uns – IT, KI & Cybersecurity aus Weimar | xKMU',
      published_seo_description = 'xKMU digital solutions: pragmatische Beratung für KMU aus Weimar in Thüringen. Lernen Sie unseren Gründer Tino Stenzel und unsere Philosophie kennen.',
      status = 'published',
      published_at = COALESCE(published_at, now()),
      updated_at = now()
    WHERE id = v_page_id;
    DELETE FROM cms_blocks WHERE page_id = v_page_id;
  END IF;

  -- Block 0: Hero
  INSERT INTO cms_blocks (page_id, block_type, sort_order, content, settings, is_visible) VALUES (
    v_page_id, 'hero', 0,
    '{
      "badge": {"icon": "Users", "text": "Über xKMU"},
      "headline": "KMU für KMU.",
      "subheadline": "Pragmatische IT-, KI- und Cybersecurity-Beratung aus Weimar in Thüringen. Keine Berater-Folien. Klare Festpreise. Ergebnisse, die laufen.",
      "size": "medium"
    }'::jsonb, '{}'::jsonb, true);

  -- Block 1: Story
  INSERT INTO cms_blocks (page_id, block_type, sort_order, content, settings, is_visible) VALUES (
    v_page_id, 'text', 1,
    '{
      "alignment": "left",
      "content": "## Die Geschichte hinter xKMU\n\nSeit dem Jahr 2000 arbeite ich in der IT — als Administrator, Berater und Projektverantwortlicher für Mittelständler. In über zwei Jahrzehnten habe ich erlebt, was kleine und mittlere Unternehmen wirklich brauchen — und vor allem, was sie **nicht** brauchen. Sie brauchen keine 80-seitigen Strategiepapiere und keine Berater, die ein halbes Jahr fakturieren, bevor das erste System läuft.\n\nSie brauchen jemanden, der die Realität von 10–50 Mitarbeitern, knappen Budgets und gewachsener IT versteht. Der KI, IT und Sicherheit gleichzeitig denkt — weil diese drei Welten in der Praxis nicht trennbar sind. Und der zu Festpreisen liefert, was vorher klar definiert wurde.\n\nMit der Zertifizierung als **IT-Grundschutz-Praktiker (BSI)** ist Sicherheit bei xKMU kein Add-On, sondern Teil jedes Projekts. Deshalb gibt es **xKMU**. KMU für KMU."
    }'::jsonb, '{}'::jsonb, true);

  -- Block 2: Philosophie
  INSERT INTO cms_blocks (page_id, block_type, sort_order, content, settings, is_visible) VALUES (
    v_page_id, 'features', 2,
    '{
      "sectionTitle": "Was uns unterscheidet",
      "sectionSubtitle": "Drei Prinzipien, an denen jedes Projekt sich messen lassen muss.",
      "columns": 3,
      "items": [
        {
          "icon": "Target",
          "title": "Pragmatisch, nicht akademisch",
          "description": "Wir liefern Lösungen, die im Alltag funktionieren — auch wenn das Lehrbuch etwas anderes sagt. Best Practice heißt für uns: was im konkreten Unternehmen wirkt."
        },
        {
          "icon": "Package",
          "title": "Festpreise, klare Deliverables",
          "description": "Jedes Modul hat einen definierten Lieferumfang und Festpreis. Sie wissen vorher, was Sie bekommen. Keine Stundenzettel-Überraschungen, keine offene Skalen."
        },
        {
          "icon": "Zap",
          "title": "KI + IT + Sicherheit zusammen",
          "description": "Wir trennen die drei Säulen nicht künstlich. Eine Cloud-Migration ohne Sicherheitskonzept ist halbe Arbeit. KI ohne IT-Hygiene ist gefährlich. Wir denken alles zusammen."
        }
      ]
    }'::jsonb, '{}'::jsonb, true);

  -- Block 3: Mission
  INSERT INTO cms_blocks (page_id, block_type, sort_order, content, settings, is_visible) VALUES (
    v_page_id, 'text', 3,
    '{
      "alignment": "center",
      "content": "## Unsere Mission\n\nKleine und mittlere Unternehmen sollen die gleichen technischen Möglichkeiten bekommen wie Konzerne — ohne Konzern-Berater-Tarife.\n\n**Mehr Output. Weniger Kosten. Weniger Bauchschmerzen.**"
    }'::jsonb, '{}'::jsonb, true);

  -- Block 4: Team (Tino)
  INSERT INTO cms_blocks (page_id, block_type, sort_order, content, settings, is_visible) VALUES (
    v_page_id, 'team', 4,
    '{
      "sectionTitle": "Wer dahintersteht",
      "columns": 2,
      "items": [
        {
          "name": "Tino Stenzel",
          "role": "Gründer & Geschäftsführer · IT-Grundschutz-Praktiker",
          "bio": "Seit dem Jahr 2000 in der IT — über 25 Jahre Erfahrung in IT-Infrastruktur, Cloud-Migrationen und Cybersecurity für mittelständische Unternehmen. Zertifizierter IT-Grundschutz-Praktiker (BSI). Schwerpunkte heute: pragmatische KI-Einführung für KMU, NIS-2-Compliance und Modernisierung gewachsener IT-Landschaften.",
          "links": [
            {"icon": "linkedin", "href": "https://www.linkedin.com/"}
          ]
        }
      ]
    }'::jsonb, '{}'::jsonb, true);

  -- Block 5: Werte
  INSERT INTO cms_blocks (page_id, block_type, sort_order, content, settings, is_visible) VALUES (
    v_page_id, 'features', 5,
    '{
      "sectionTitle": "Unsere Werte",
      "columns": 3,
      "items": [
        {
          "icon": "MessageSquare",
          "title": "Klartext",
          "description": "Wir reden Klartext — auch wenn die Antwort \"das brauchen Sie nicht\" lautet. Wir verkaufen kein Modul, das Ihnen nichts bringt."
        },
        {
          "icon": "Handshake",
          "title": "Verbindlichkeit",
          "description": "Was wir zusagen, liefern wir. Zur abgesprochenen Zeit, zum abgesprochenen Preis, mit dem abgesprochenen Umfang."
        },
        {
          "icon": "Lock",
          "title": "Datensouveränität",
          "description": "Wir denken Datenschutz und Datensouveränität von Anfang an mit — bei KI, bei der Cloud-Migration und beim Betrieb."
        }
      ]
    }'::jsonb, '{}'::jsonb, true);

  -- Block 6: CTA
  INSERT INTO cms_blocks (page_id, block_type, sort_order, content, settings, is_visible) VALUES (
    v_page_id, 'cta', 6,
    '{
      "headline": "Klingt das nach einer guten Basis für ein Gespräch?",
      "description": "Im kostenlosen Erstgespräch klären wir, ob und wo wir Ihnen am meisten helfen können — ohne Verkaufsdruck.",
      "buttons": [
        {"label": "Erstgespräch buchen", "href": "/kontakt", "variant": "default"}
      ]
    }'::jsonb, '{}'::jsonb, true);

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

-- ─── Navigation: Ueber-uns ins Header-Menue ─────────────────────────
INSERT INTO cms_navigation_items (location, label, href, page_id, sort_order)
SELECT 'header', 'Über uns', '/ueber-uns', id, 5
FROM cms_pages WHERE slug = '/ueber-uns'
ON CONFLICT DO NOTHING;
