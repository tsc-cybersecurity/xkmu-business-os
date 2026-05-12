-- ============================================================
-- Migration 056: H2-Sektionsueberschriften personalisieren
--
-- Auf den Pillar-Seiten standen generische H2 ("Was Sie konkret
-- erhalten", "Verwandte Themen") ohne Keyword-Bezug. Diese
-- Migration setzt pro Seite konkretere Headlines mit Pillar-
-- Keyword + Zielgruppe — verbessert sowohl SEO als auch Scan-
-- bar­keit fuer Nutzer.
--
-- Match per content->>'sectionTitle' = '...' — idempotent durch
-- exakten String-Match (re-runs greifen nicht erneut, weil der
-- alte Wert dann schon weg ist).
-- ============================================================

-- ─── 1) "Was Sie konkret erhalten" auf Pillars personalisieren ─────
UPDATE cms_blocks SET content = jsonb_set(content,
  '{sectionTitle}', '"Unsere 5 KI-Beratungsmodule für KMU"'::jsonb)
WHERE content->>'sectionTitle' = 'Was Sie konkret erhalten'
  AND page_id IN (SELECT id FROM cms_pages WHERE slug = '/ki-beratung');

UPDATE cms_blocks SET content = jsonb_set(content,
  '{sectionTitle}', '"Unsere 5 IT-Beratungsmodule – von Assessment bis Betrieb"'::jsonb)
WHERE content->>'sectionTitle' = 'Was Sie konkret erhalten'
  AND page_id IN (SELECT id FROM cms_pages WHERE slug = '/it-beratung');

UPDATE cms_blocks SET content = jsonb_set(content,
  '{sectionTitle}', '"Unsere 6 Cybersecurity-Module – vom Quick-Check bis zur Compliance"'::jsonb)
WHERE content->>'sectionTitle' = 'Was Sie konkret erhalten'
  AND page_id IN (SELECT id FROM cms_pages WHERE slug = '/cybersecurity');

-- ─── 2) NIS-2: "Die 6 Kernpflichten" um Keywords ergaenzen ─────────
UPDATE cms_blocks SET content = jsonb_set(content,
  '{sectionTitle}', '"NIS-2: Die 6 Kernpflichten für KMU im Überblick"'::jsonb)
WHERE content->>'sectionTitle' = 'Die 6 Kernpflichten'
  AND page_id IN (SELECT id FROM cms_pages WHERE slug = '/nis-2');

-- ─── 3) "Verwandte Themen" auf 5 Seiten umbenennen ─────────────────
UPDATE cms_blocks SET content = jsonb_set(content,
  '{sectionTitle}', '"Passend dazu: weitere xKMU-Leistungen"'::jsonb)
WHERE content->>'sectionTitle' = 'Verwandte Themen'
  AND page_id IN (
    SELECT id FROM cms_pages
    WHERE slug IN ('/ki-beratung', '/it-beratung', '/cybersecurity', '/nis-2', '/ueber-uns')
  );

-- ─── Published-Snapshot rebuild ─────────────────────────────────────
UPDATE cms_pages p SET
  published_blocks = (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', b.id, 'blockType', b.block_type, 'sortOrder', b.sort_order,
        'content', b.content, 'settings', b.settings, 'isVisible', b.is_visible
      ) ORDER BY b.sort_order
    )
    FROM cms_blocks b WHERE b.page_id = p.id
  ),
  has_draft_changes = false,
  updated_at = now()
WHERE slug IN ('/ki-beratung', '/it-beratung', '/cybersecurity', '/nis-2', '/ueber-uns');
