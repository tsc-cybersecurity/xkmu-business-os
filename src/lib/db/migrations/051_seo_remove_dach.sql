-- ============================================================
-- Migration 051: DACH-Raum-Erwaehnungen aus Hero-Subheadlines
--                entfernen (Korrektur zu Migration 049)
--
-- User-Vorgabe: regionaler Fokus Thueringen, "remote" ohne
-- geografische Erweiterung. Keine DACH-Erwaehnungen auf
-- oeffentlichen Seiten (vgl. Migration 031).
--
-- Migration 049 hatte versehentlich "DACH-Raum" in den
-- Hero-Subheadlines der Startseite und 3 Pillar-Seiten. Hier
-- korrigiert mit kompletten Subheadlines (jsonb_set), damit
-- keine Pattern-Replace-Fallstricke.
-- ============================================================

UPDATE cms_blocks SET content = jsonb_set(
  content, '{subheadline}',
  '"IT-, KI- und Cybersecurity-Beratung für KMU aus Weimar — mit Festpreisen, klaren Deliverables und Umsetzung in Wochen, nicht Monaten. Vor Ort in ganz Thüringen, remote möglich."'::jsonb
)
WHERE block_type = 'hero'
  AND page_id IN (SELECT id FROM cms_pages WHERE slug = '/');

UPDATE cms_blocks SET content = jsonb_set(
  content, '{subheadline}',
  '"Wir finden in einer Potenzialanalyse die 3 KI-Use-Cases, die in Ihrem Unternehmen sofort Geld sparen — und setzen sie um. Festpreis, ohne Lock-in, ohne Buzzword-Bingo. Vor Ort in Thüringen, remote möglich."'::jsonb
)
WHERE block_type = 'hero'
  AND page_id IN (SELECT id FROM cms_pages WHERE slug = '/ki-beratung');

UPDATE cms_blocks SET content = jsonb_set(
  content, '{subheadline}',
  '"IT-Strategie und -Betrieb für KMU mit 5-250 Mitarbeitern: weniger Ausfälle, klare Kostenstruktur, dokumentierte Architektur. Modular zubuchbar — vom Assessment bis zum laufenden Betrieb. Vor Ort in Thüringen, remote möglich."'::jsonb
)
WHERE block_type = 'hero'
  AND page_id IN (SELECT id FROM cms_pages WHERE slug = '/it-beratung');

UPDATE cms_blocks SET content = jsonb_set(
  content, '{subheadline}',
  '"Cybersecurity für KMU, die nicht 6 Monate auf einen CISO warten können: Security-Quick-Check in 5 Tagen, NIS-2-Roadmap in 4 Wochen, alles dokumentiert und nachweisbar. Vor Ort in Thüringen, remote möglich."'::jsonb
)
WHERE block_type = 'hero'
  AND page_id IN (SELECT id FROM cms_pages WHERE slug = '/cybersecurity');

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
WHERE slug IN ('/', '/ki-beratung', '/it-beratung', '/cybersecurity');
