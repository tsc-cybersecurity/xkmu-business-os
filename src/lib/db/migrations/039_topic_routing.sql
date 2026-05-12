-- ============================================================
-- Migration 039: Topic-Routing fuer CTAs
--
-- Reicht das Thema vom Klick-Ort an /kontakt weiter:
--   <a href="/kontakt?interesse=KI-Beratung">...</a>
-- Das Kontaktformular liest den Parameter und waehlt den Tag vor
-- (siehe contact-form-block.tsx).
--
-- Aenderungen:
-- 1. interestTags der /kontakt-Seite um Pillar-Level-Tags erweitern
--    ('KI-Beratung' war schon drin, 'IT-Beratung' + 'Cybersecurity' neu)
-- 2. Alle CTA-Buttons und Cross-Sell-Links der Pillar-/NIS-2-Seiten
--    bekommen ?interesse=<Tag>-Parameter angehaengt
--
-- Idempotent: Nutzt REPLACE auf JSONB-Text-Repraesentation — nur dort,
-- wo der nackte /kontakt-Link noch steht.
-- ============================================================

-- ─── 1) /kontakt: Tag-Liste komplett neu setzen ─────────────────────
UPDATE cms_blocks SET content = jsonb_set(
  content,
  '{interestTags}',
  '[
    "KI-Beratung", "IT-Beratung", "Cybersecurity",
    "KI-Automatisierung", "KI-Assistenten & Chatbots",
    "IT-Assessment", "IT-Architektur & Cloud", "Systemintegration",
    "Security Quick Check", "Hardening & Baselines", "Backup & Recovery",
    "Incident Response", "Security Awareness", "Datenschutz & Compliance",
    "NIS-2 Unterstützung",
    "Kombinations-Modul", "Managed Services"
  ]'::jsonb
)
WHERE block_type = 'contact-form'
  AND page_id IN (SELECT id FROM cms_pages WHERE slug = '/kontakt');

-- ─── 2) CTA-/Link-hrefs mit Topic-Parameter versehen ────────────────
-- Strategie: Replace im JSONB-Text. Wirkt nur, wo der nackte Link steht.

-- KI-Beratung (Hero-Buttons, CTA, Cross-Sell-Cards)
UPDATE cms_blocks SET content = REPLACE(content::text, '"href":"/kontakt"', '"href":"/kontakt?interesse=KI-Beratung"')::jsonb
WHERE page_id IN (SELECT id FROM cms_pages WHERE slug = '/ki-beratung')
  AND content::text LIKE '%"href":"/kontakt"%';

UPDATE cms_blocks SET content = REPLACE(content::text, '"link":"/kontakt"', '"link":"/kontakt?interesse=KI-Beratung"')::jsonb
WHERE page_id IN (SELECT id FROM cms_pages WHERE slug = '/ki-beratung')
  AND content::text LIKE '%"link":"/kontakt"%';

-- IT-Beratung
UPDATE cms_blocks SET content = REPLACE(content::text, '"href":"/kontakt"', '"href":"/kontakt?interesse=IT-Beratung"')::jsonb
WHERE page_id IN (SELECT id FROM cms_pages WHERE slug = '/it-beratung')
  AND content::text LIKE '%"href":"/kontakt"%';

UPDATE cms_blocks SET content = REPLACE(content::text, '"link":"/kontakt"', '"link":"/kontakt?interesse=IT-Beratung"')::jsonb
WHERE page_id IN (SELECT id FROM cms_pages WHERE slug = '/it-beratung')
  AND content::text LIKE '%"link":"/kontakt"%';

-- Cybersecurity
UPDATE cms_blocks SET content = REPLACE(content::text, '"href":"/kontakt"', '"href":"/kontakt?interesse=Cybersecurity"')::jsonb
WHERE page_id IN (SELECT id FROM cms_pages WHERE slug = '/cybersecurity')
  AND content::text LIKE '%"href":"/kontakt"%';

UPDATE cms_blocks SET content = REPLACE(content::text, '"link":"/kontakt"', '"link":"/kontakt?interesse=Cybersecurity"')::jsonb
WHERE page_id IN (SELECT id FROM cms_pages WHERE slug = '/cybersecurity')
  AND content::text LIKE '%"link":"/kontakt"%';

-- NIS-2-Landingpage (URL-encoded weil Leerzeichen + Sonderzeichen im Tag)
UPDATE cms_blocks SET content = REPLACE(content::text, '"href":"/kontakt"', '"href":"/kontakt?interesse=NIS-2%20Unterst%C3%BCtzung"')::jsonb
WHERE page_id IN (SELECT id FROM cms_pages WHERE slug = '/nis-2')
  AND content::text LIKE '%"href":"/kontakt"%';

UPDATE cms_blocks SET content = REPLACE(content::text, '"link":"/kontakt"', '"link":"/kontakt?interesse=NIS-2%20Unterst%C3%BCtzung"')::jsonb
WHERE page_id IN (SELECT id FROM cms_pages WHERE slug = '/nis-2')
  AND content::text LIKE '%"link":"/kontakt"%';

-- ─── Published-Snapshot fuer alle betroffenen Seiten neu aufbauen ───
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
WHERE p.slug IN ('/kontakt', '/ki-beratung', '/it-beratung', '/cybersecurity', '/nis-2');
