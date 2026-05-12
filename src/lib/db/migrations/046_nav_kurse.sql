-- ============================================================
-- Migration 046: /kurse als Nav-Eintrag im Header
--
-- Migration 041 hat die /kurse-Seite als CMS-Page angelegt, aber
-- keinen Navigations-Eintrag hinzugefuegt — Seite war damit nur
-- per direktem Link erreichbar.
--
-- Idempotent: pruefe per WHERE NOT EXISTS, kein UNIQUE-Index auf
-- (location, href) im Schema, daher manuell.
-- ============================================================

INSERT INTO cms_navigation_items (location, label, href, page_id, sort_order, is_visible)
SELECT 'header', 'Kurse', '/kurse', p.id, 4, true
FROM cms_pages p
WHERE p.slug = '/kurse'
  AND NOT EXISTS (
    SELECT 1 FROM cms_navigation_items
    WHERE location = 'header'
      AND href = '/kurse'
  );
