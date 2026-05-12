-- ============================================================
-- Migration 031: "DACH-Raum" -> regional Thueringen
--
-- Korrektur zu Migration 029: User-Direktive ist regionaler Fokus
-- auf Thueringen (nicht DACH). Diese Migration ueberschreibt alle
-- entsprechenden Hero-Subheadlines und die Kontakt-Meta-Description.
--
-- Idempotent durch Slug-Filter; published_blocks-Snapshot wird am
-- Ende neu aufgebaut.
-- ============================================================

-- ─── KI-Beratung Hero-Subheadline ──────────────────────────────────
UPDATE cms_blocks SET content = jsonb_set(
  content,
  '{subheadline}',
  '"Von der Potenzialanalyse bis zur laufenden Automation. Wir identifizieren, wo KI wirklich hilft, setzen es um und befähigen Ihr Team – ohne KI-Wildwuchs, sondern mit klaren Regeln. Als IT-Dienstleister aus Thüringen begleiten wir KMU regional – remote und vor Ort."'::jsonb
)
WHERE block_type = 'hero'
  AND page_id IN (SELECT id FROM cms_pages WHERE slug = '/ki-beratung');

-- ─── IT-Beratung Hero-Subheadline ──────────────────────────────────
UPDATE cms_blocks SET content = jsonb_set(
  content,
  '{subheadline}',
  '"Stabile, sichere und skalierbare IT – vom Arbeitsplatz bis zur Cloud-Infrastruktur. Mit Fokus auf Betriebssicherheit, Skalierbarkeit und Kostenkontrolle. Als IT-Dienstleister aus Thüringen sind wir für KMU regional erreichbar – remote und vor Ort."'::jsonb
)
WHERE block_type = 'hero'
  AND page_id IN (SELECT id FROM cms_pages WHERE slug = '/it-beratung');

-- ─── Cybersecurity Hero-Subheadline ────────────────────────────────
UPDATE cms_blocks SET content = jsonb_set(
  content,
  '{subheadline}',
  '"Angriffsflächen reduzieren, Vorfälle abwehren, NIS-2 und DSGVO technisch umsetzen. Pragmatisch – nicht nach Lehrbuch, sondern nach Risikolage. Aus Weimar in Thüringen – regional, remote und vor Ort."'::jsonb
)
WHERE block_type = 'hero'
  AND page_id IN (SELECT id FROM cms_pages WHERE slug = '/cybersecurity');

-- ─── Kontakt Meta-Description ──────────────────────────────────────
UPDATE cms_pages SET
  seo_description = 'Kontaktieren Sie xKMU digital solutions aus Weimar: Termin online buchen, telefonische Hotline oder schriftliche Anfrage. Wir beraten KMU in Thüringen – remote und vor Ort.',
  published_seo_description = 'Kontaktieren Sie xKMU digital solutions aus Weimar: Termin online buchen, telefonische Hotline oder schriftliche Anfrage. Wir beraten KMU in Thüringen – remote und vor Ort.',
  updated_at = now()
WHERE slug = '/kontakt';

-- ─── Published-Snapshot fuer die drei Pillar-Seiten neu aufbauen ───
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
WHERE p.slug IN ('/ki-beratung', '/it-beratung', '/cybersecurity');
