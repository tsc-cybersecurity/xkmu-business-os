-- ============================================================
-- Migration 036: NIS-2-Icon-Fix (Scale statt ShieldAlert)
--
-- "ShieldAlert" ist nicht im Icon-Mapper (src/lib/utils/icon-map.ts)
-- → keine Anzeige auf den Cross-Sell-Cards in den Pillar-Seiten und
-- im Hero-Badge der NIS-2-Landingpage.
--
-- "Scale" (Justizwaage) ist im Mapper und semantisch passend fuer
-- rechtliche/Compliance-Themen.
--
-- Idempotent: Replace nur dort, wo "ShieldAlert" noch im JSONB steht.
-- ============================================================

UPDATE cms_blocks
  SET content = REPLACE(content::text, '"ShieldAlert"', '"Scale"')::jsonb
  WHERE content::text LIKE '%ShieldAlert%';

-- Published-Snapshot fuer die betroffenen Seiten neu aufbauen
UPDATE cms_pages p SET
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
    FROM cms_blocks b WHERE b.page_id = p.id
  ),
  has_draft_changes = false,
  updated_at = now()
WHERE p.slug IN ('/ki-beratung', '/it-beratung', '/cybersecurity', '/nis-2');
