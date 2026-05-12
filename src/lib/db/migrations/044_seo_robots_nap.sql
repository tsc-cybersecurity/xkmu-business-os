-- ============================================================
-- Migration 044: SEO Technical Fixes
--
-- 1) Garantiere in_sitemap=true + status='published' fuer alle
--    SEO-relevanten Pillar-/Pflichtseiten — egal welcher State
--    aktuell in der DB hinterlegt ist. Idempotent.
-- 2) Fuegt eine sichtbare NAP-Box (Name / Address / Phone /
--    Erreichbarkeit) als Text-Block auf /kontakt ein — direkt vor
--    dem Kontaktformular. Bestehender Block wird per settings.tag
--    erkannt und vor Re-Insert geloescht (Idempotenz).
-- ============================================================

-- ─── 1) in_sitemap-Flag fuer Hauptseiten garantieren ────────────────
UPDATE cms_pages SET
  in_sitemap = true,
  status = 'published',
  published_at = COALESCE(published_at, now()),
  updated_at = now()
WHERE slug IN (
  '/',
  '/ki-beratung',
  '/it-beratung',
  '/cybersecurity',
  '/loesungen',
  '/nis-2',
  '/ueber-uns',
  '/kontakt',
  '/kurse',
  '/blog'
);

-- ─── 2) NAP-Box auf /kontakt einfuegen ───────────────────────────────
DO $$
DECLARE
  v_page_id uuid;
  v_max_sort int;
  v_nap_sort int;
BEGIN
  SELECT id INTO v_page_id FROM cms_pages WHERE slug = '/kontakt' LIMIT 1;

  IF v_page_id IS NULL THEN
    RAISE NOTICE 'Migration 044: /kontakt-Seite nicht gefunden — NAP-Block uebersprungen.';
    RETURN;
  END IF;

  -- Bestehenden NAP-Block (Tag 'nap-box') idempotent entfernen.
  DELETE FROM cms_blocks
  WHERE page_id = v_page_id
    AND settings ? 'tag'
    AND settings->>'tag' = 'nap-box';

  -- Sort-Order direkt vor dem ersten contact-form-Block, oder am Anfang.
  SELECT MIN(sort_order) INTO v_nap_sort
  FROM cms_blocks
  WHERE page_id = v_page_id
    AND block_type IN ('contact-form', 'form');

  IF v_nap_sort IS NULL THEN
    SELECT COALESCE(MAX(sort_order), -1) + 1 INTO v_max_sort
    FROM cms_blocks WHERE page_id = v_page_id;
    v_nap_sort := v_max_sort;
  ELSE
    -- Knapp davor einsortieren; bestehende Blocks unveraendert lassen,
    -- aber sicherstellen dass keiner exakt dieselbe Sort-Order hat.
    v_nap_sort := v_nap_sort - 1;
    -- Falls negative oder kollidierend: alle ab v_nap_sort um 1 hochschieben.
    IF EXISTS (SELECT 1 FROM cms_blocks WHERE page_id = v_page_id AND sort_order = v_nap_sort) THEN
      UPDATE cms_blocks SET sort_order = sort_order + 1
      WHERE page_id = v_page_id AND sort_order >= v_nap_sort;
    END IF;
  END IF;

  INSERT INTO cms_blocks (page_id, block_type, sort_order, content, settings, is_visible)
  VALUES (
    v_page_id,
    'text',
    v_nap_sort,
    jsonb_build_object(
      'alignment', 'left',
      'content',
      E'## So erreichen Sie uns\n\n'
      || E'**xKMU digital solutions**  \n'
      || E'IT-, KI- und Cybersecurity-Beratung für KMU\n\n'
      || E'📍 **Sitz:** Weimar, Thüringen  \n'
      || E'📞 **Telefon:** [030 - 754 239 42](tel:+4930754239428)  \n'
      || E'✉️ **E-Mail:** [kontakt@xkmu.de](mailto:kontakt@xkmu.de)  \n'
      || E'🕒 **Erreichbarkeit:** Mo–Fr 9:00 – 17:00 Uhr  \n'
      || E'🚗 **Vor Ort:** in ganz Thüringen · **Remote:** im gesamten DACH-Raum'
    ),
    jsonb_build_object('tag', 'nap-box', 'maxWidth', 768),
    true
  );

  -- Published-Snapshot der Seite neu aufbauen
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
