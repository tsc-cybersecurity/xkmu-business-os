-- ============================================================
-- Migration 045: H1 (Hero-Headline) + Title-Tags fuer 8 Hauptseiten
--
-- Nutzen: jede H1 enthaelt das Pillar-Keyword + Zielgruppe (KMU) +
-- ggf. Region (Weimar/Thueringen). Title-Tags unter 70 Zeichen mit
-- Markenposition am Ende. Reduziert die "nur Service-Bezeichnung"-
-- H1s wie "KI-Beratung" oder "Kontakt".
--
-- Idempotent: pure UPDATEs auf bekannten Slugs; published_blocks-
-- Snapshot wird neu aufgebaut.
--
-- /blog ist Alias zu /it-news und bleibt unangetastet (separat).
-- ============================================================

-- ─── 1) seo_title + published_seo_title fuer 8 Seiten ───────────────
UPDATE cms_pages SET
  seo_title = 'KI-Beratung für KMU in Thüringen – Festpreise | xKMU',
  published_seo_title = 'KI-Beratung für KMU in Thüringen – Festpreise | xKMU',
  title = 'KI-Beratung für KMU in Thüringen',
  published_title = 'KI-Beratung für KMU in Thüringen',
  updated_at = now()
WHERE slug = '/ki-beratung';

UPDATE cms_pages SET
  seo_title = 'IT-Beratung für KMU – Weimar, Thüringen & remote | xKMU',
  published_seo_title = 'IT-Beratung für KMU – Weimar, Thüringen & remote | xKMU',
  title = 'IT-Beratung für KMU – Weimar & remote',
  published_title = 'IT-Beratung für KMU – Weimar & remote',
  updated_at = now()
WHERE slug = '/it-beratung';

UPDATE cms_pages SET
  seo_title = 'Cybersecurity-Beratung für KMU – NIS-2-ready | xKMU',
  published_seo_title = 'Cybersecurity-Beratung für KMU – NIS-2-ready | xKMU',
  title = 'Cybersecurity-Beratung für KMU & NIS-2-Umsetzung',
  published_title = 'Cybersecurity-Beratung für KMU & NIS-2-Umsetzung',
  updated_at = now()
WHERE slug = '/cybersecurity';

UPDATE cms_pages SET
  seo_title = 'Lösungen – KI/IT/Security-Kombi-Module für KMU | xKMU',
  seo_description = 'Drei Kombi-Module verbinden KI, IT und Cybersecurity. Ein Ansprechpartner, ein Festpreis, abgestimmte Umsetzung – von xKMU aus Weimar in Thüringen.',
  published_seo_title = 'Lösungen – KI/IT/Security-Kombi-Module für KMU | xKMU',
  published_seo_description = 'Drei Kombi-Module verbinden KI, IT und Cybersecurity. Ein Ansprechpartner, ein Festpreis, abgestimmte Umsetzung – von xKMU aus Weimar in Thüringen.',
  title = 'KI, IT & Cybersecurity aus einer Hand',
  published_title = 'KI, IT & Cybersecurity aus einer Hand',
  updated_at = now()
WHERE slug = '/loesungen';

UPDATE cms_pages SET
  seo_title = 'NIS-2-Beratung für KMU – Pflichten & Umsetzung | xKMU',
  published_seo_title = 'NIS-2-Beratung für KMU – Pflichten & Umsetzung | xKMU',
  title = 'NIS-2-Compliance für KMU pragmatisch umsetzen',
  published_title = 'NIS-2-Compliance für KMU pragmatisch umsetzen',
  updated_at = now()
WHERE slug = '/nis-2';

UPDATE cms_pages SET
  seo_title = 'Über xKMU – IT-Beratung aus Weimar seit 2000',
  seo_description = 'xKMU digital solutions aus Weimar: IT-Beratung von KMU für KMU. Seit 2000 in der IT, zertifizierter BSI IT-Grundschutz-Praktiker.',
  published_seo_title = 'Über xKMU – IT-Beratung aus Weimar seit 2000',
  published_seo_description = 'xKMU digital solutions aus Weimar: IT-Beratung von KMU für KMU. Seit 2000 in der IT, zertifizierter BSI IT-Grundschutz-Praktiker.',
  title = 'IT-Beratung aus Weimar – seit 2000 in der IT',
  published_title = 'IT-Beratung aus Weimar – seit 2000 in der IT',
  updated_at = now()
WHERE slug = '/ueber-uns';

UPDATE cms_pages SET
  seo_title = 'Kontakt & Termin – IT-Beratung Weimar | xKMU',
  seo_description = 'Kostenloses Erstgespräch zur IT-, KI- oder Cybersecurity-Beratung. xKMU aus Weimar – vor Ort in Thüringen, remote im DACH-Raum.',
  published_seo_title = 'Kontakt & Termin – IT-Beratung Weimar | xKMU',
  published_seo_description = 'Kostenloses Erstgespräch zur IT-, KI- oder Cybersecurity-Beratung. xKMU aus Weimar – vor Ort in Thüringen, remote im DACH-Raum.',
  title = 'Kontakt – Kostenloses Erstgespräch für KMU',
  published_title = 'Kontakt – Kostenloses Erstgespräch für KMU',
  updated_at = now()
WHERE slug = '/kontakt';

-- /kurse hat in Migration 041 bereits seo_title + seo_description gesetzt — nur title/H1 schaerfen
UPDATE cms_pages SET
  title = 'Kostenlose Onlinekurse: IT, KI & Cybersecurity für KMU',
  published_title = 'Kostenlose Onlinekurse: IT, KI & Cybersecurity für KMU',
  updated_at = now()
WHERE slug = '/kurse';

-- ─── 2) Hero-Block-Headlines (H1 im sichtbaren Render) ──────────────
-- Pattern aus Migration 029: jsonb_set auf content.{headline} fuer
-- Bloecke vom Typ 'hero' der jeweiligen Page.

UPDATE cms_blocks SET content = jsonb_set(
  content, '{headline}', '"KI-Beratung für KMU in Thüringen"'::jsonb)
WHERE block_type = 'hero'
  AND page_id IN (SELECT id FROM cms_pages WHERE slug = '/ki-beratung');

UPDATE cms_blocks SET content = jsonb_set(
  content, '{headline}', '"IT-Beratung für KMU – Weimar & remote"'::jsonb)
WHERE block_type = 'hero'
  AND page_id IN (SELECT id FROM cms_pages WHERE slug = '/it-beratung');

UPDATE cms_blocks SET content = jsonb_set(
  content, '{headline}', '"Cybersecurity-Beratung für KMU & NIS-2-Umsetzung"'::jsonb)
WHERE block_type = 'hero'
  AND page_id IN (SELECT id FROM cms_pages WHERE slug = '/cybersecurity');

UPDATE cms_blocks SET content = jsonb_set(
  content, '{headline}', '"KI, IT & Cybersecurity aus einer Hand"'::jsonb)
WHERE block_type = 'hero'
  AND page_id IN (SELECT id FROM cms_pages WHERE slug = '/loesungen');

UPDATE cms_blocks SET content = jsonb_set(
  content, '{headline}', '"NIS-2-Compliance für KMU pragmatisch umsetzen"'::jsonb)
WHERE block_type = 'hero'
  AND page_id IN (SELECT id FROM cms_pages WHERE slug = '/nis-2');

UPDATE cms_blocks SET content = jsonb_set(
  content, '{headline}', '"IT-Beratung aus Weimar – seit 2000 in der IT"'::jsonb)
WHERE block_type = 'hero'
  AND page_id IN (SELECT id FROM cms_pages WHERE slug = '/ueber-uns');

UPDATE cms_blocks SET content = jsonb_set(
  content, '{headline}', '"Kontakt – Kostenloses Erstgespräch für KMU"'::jsonb)
WHERE block_type = 'hero'
  AND page_id IN (SELECT id FROM cms_pages WHERE slug = '/kontakt');

UPDATE cms_blocks SET content = jsonb_set(
  content, '{headline}', '"Kostenlose Onlinekurse: IT, KI & Cybersecurity für KMU"'::jsonb)
WHERE block_type = 'hero'
  AND page_id IN (SELECT id FROM cms_pages WHERE slug = '/kurse');

-- ─── 3) published_blocks-Snapshot fuer alle 8 Seiten neu aufbauen ───
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
WHERE slug IN (
  '/ki-beratung', '/it-beratung', '/cybersecurity', '/loesungen',
  '/nis-2', '/ueber-uns', '/kontakt', '/kurse'
);
