-- ============================================================
-- Migration 049: Hero-Subheadlines schaerfen (5 Hauptseiten)
--
-- Statt allgemeiner Service-Beschreibung: konkrete Outcomes,
-- Zeitanker (5 Tage / 4 Wochen / Wochen statt Monate), USPs
-- (Festpreis, Dokumentation, ohne Lock-in) und Region (vor Ort
-- Thueringen, remote DACH) in jeder Subheadline.
-- ============================================================

UPDATE cms_blocks SET content = jsonb_set(
  content, '{subheadline}',
  '"IT-, KI- und Cybersecurity-Beratung für KMU aus Weimar — mit Festpreisen, klaren Deliverables und Umsetzung in Wochen, nicht Monaten. Vor Ort in Thüringen, remote im gesamten DACH-Raum."'::jsonb
)
WHERE block_type = 'hero'
  AND page_id IN (SELECT id FROM cms_pages WHERE slug = '/');

UPDATE cms_blocks SET content = jsonb_set(
  content, '{subheadline}',
  '"Wir finden in einer Potenzialanalyse die 3 KI-Use-Cases, die in Ihrem Unternehmen sofort Geld sparen — und setzen sie um. Festpreis, ohne Lock-in, ohne Buzzword-Bingo. Vor Ort in Thüringen, remote im DACH-Raum."'::jsonb
)
WHERE block_type = 'hero'
  AND page_id IN (SELECT id FROM cms_pages WHERE slug = '/ki-beratung');

UPDATE cms_blocks SET content = jsonb_set(
  content, '{subheadline}',
  '"IT-Strategie und -Betrieb für KMU mit 5-250 Mitarbeitern: weniger Ausfälle, klare Kostenstruktur, dokumentierte Architektur. Modular zubuchbar — vom Assessment bis zum laufenden Betrieb. Vor Ort in Thüringen, remote im DACH-Raum."'::jsonb
)
WHERE block_type = 'hero'
  AND page_id IN (SELECT id FROM cms_pages WHERE slug = '/it-beratung');

UPDATE cms_blocks SET content = jsonb_set(
  content, '{subheadline}',
  '"Cybersecurity für KMU, die nicht 6 Monate auf einen CISO warten können: Security-Quick-Check in 5 Tagen, NIS-2-Roadmap in 4 Wochen, alles dokumentiert und nachweisbar. Vor Ort in Thüringen, remote im DACH-Raum."'::jsonb
)
WHERE block_type = 'hero'
  AND page_id IN (SELECT id FROM cms_pages WHERE slug = '/cybersecurity');

UPDATE cms_blocks SET content = jsonb_set(
  content, '{subheadline}',
  '"Drei Module, die bewusst Bereichsgrenzen überwinden. Was einzelne Berater nie leisten können: KI, IT und Security gleichzeitig, aufeinander abgestimmt. Ein Ansprechpartner, ein Festpreis, kein Schwarzer-Peter-Spiel zwischen drei Dienstleistern."'::jsonb
)
WHERE block_type = 'hero'
  AND page_id IN (SELECT id FROM cms_pages WHERE slug = '/loesungen');

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
WHERE slug IN ('/', '/ki-beratung', '/it-beratung', '/cybersecurity', '/loesungen');
