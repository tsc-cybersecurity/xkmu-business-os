-- ============================================================
-- Migration 043: CTA-Bloecke auf dark-bg + volle Breite
--
-- Alle CTA-Bloecke der Modul-Detailseiten, /loesungen-Subseiten,
-- /nis-2, /ueber-uns und der Pillar-Seiten bekommen backgroundStyle
-- "dark" und size "full" — visuell auffaelligere Conversion-Sektionen.
-- ============================================================

UPDATE cms_blocks SET content =
  jsonb_set(jsonb_set(content, '{backgroundStyle}', '"dark"'), '{size}', '"full"')
WHERE block_type = 'cta'
  AND page_id IN (
    SELECT id FROM cms_pages
    WHERE slug LIKE '/ki-beratung%'
       OR slug LIKE '/it-beratung%'
       OR slug LIKE '/cybersecurity%'
       OR slug LIKE '/loesungen%'
       OR slug = '/nis-2'
       OR slug = '/ueber-uns'
  );

-- Published-Snapshot rebuild
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
WHERE p.slug LIKE '/ki-beratung%'
   OR p.slug LIKE '/it-beratung%'
   OR p.slug LIKE '/cybersecurity%'
   OR p.slug LIKE '/loesungen%'
   OR p.slug = '/nis-2'
   OR p.slug = '/ueber-uns';
