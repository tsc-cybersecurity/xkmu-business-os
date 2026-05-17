-- ============================================================
-- 069_magazine_block_type.sql
-- ------------------------------------------------------------
-- Neuer CMS-Block 'magazine' fuer Magazin-Themenseiten (z.B.
-- Cybersecurity, KI, Automatisierung). Layout: grosse Featured-
-- Card links + 3-Item-Sidebar rechts + 3-Spalten-Grid unten.
-- Kategorien werden als Pill-Nav ueber dem Layout gerendert
-- und filtern die geladenen Beitraege.
--
-- Datenquelle: gleiche Public-API wie blog-listing
-- (/api/v1/public/blog/posts) — Block ist sofort einsatzbereit
-- sobald veroeffentlichte Beitraege mit Kategorie existieren.
-- ============================================================

INSERT INTO cms_block_type_definitions
  (slug, name, description, icon, category, fields, default_content,
   default_settings, is_active, sort_order)
VALUES (
  'magazine',
  'Magazin-Layout',
  'Magazin-/Themenseite mit grossem Featured-Beitrag, Sidebar und Grid. Kategorien werden als Filter-Buttons angezeigt — ideal fuer Themenseiten wie Cybersecurity, KI, Automatisierung.',
  'Newspaper',
  'content',
  '["title","categories","sidebarCount","gridCount","showAllTab","linkPrefix","defaultAuthor","showDate"]'::jsonb,
  '{
    "title": "Aktuelle Beiträge",
    "categories": [],
    "sidebarCount": 3,
    "gridCount": 6,
    "showAllTab": true,
    "linkPrefix": "/it-news",
    "defaultAuthor": "",
    "showDate": true
  }'::jsonb,
  '{}'::jsonb,
  true,
  24
)
ON CONFLICT (slug) DO NOTHING;
