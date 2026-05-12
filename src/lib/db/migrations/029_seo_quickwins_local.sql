-- ============================================================
-- Migration 029: SEO Quick Wins (P1-01, P1-02, P5-01)
--
-- - P1-01: 'Weimar' in Hero-Subheadline der Startseite
-- - P1-02: 'Thueringen' in Hero-Subheadline von KI/IT/Cybersecurity
-- - P5-01: Title-Tags + Meta-Descriptions fuer Startseite, KI, IT,
--          Cybersecurity, Kontakt — mit Geo-Bezug (Weimar/Thueringen)
--
-- Idempotent durch Slug-Filter; published_blocks-Snapshot wird am Ende
-- aus den (frisch aktualisierten) cms_blocks-Eintraegen neu aufgebaut,
-- damit die Live-Seiten die neuen Texte ausliefern.
-- ============================================================

-- ─── Startseite (P1-01 + P5-01) ─────────────────────────────────────
UPDATE cms_pages SET
  seo_title = 'xKMU – KI, IT & Cybersecurity für KMU aus Weimar',
  seo_description = 'KI-Automatisierung, stabile IT und echte Sicherheit für KMU – pragmatisch umgesetzt von xKMU digital solutions aus Weimar in Thüringen.',
  published_seo_title = 'xKMU – KI, IT & Cybersecurity für KMU aus Weimar',
  published_seo_description = 'KI-Automatisierung, stabile IT und echte Sicherheit für KMU – pragmatisch umgesetzt von xKMU digital solutions aus Weimar in Thüringen.',
  updated_at = now()
WHERE slug = '/';

UPDATE cms_blocks SET content = jsonb_set(
  content,
  '{subheadline}',
  '"xKMU digital solutions aus Weimar bringt KI-Automatisierung, stabile IT und echte Sicherheit in Ihr Unternehmen – keine Berater-Folien, sondern Ergebnisse, die laufen."'::jsonb
)
WHERE block_type = 'hero'
  AND page_id IN (SELECT id FROM cms_pages WHERE slug = '/');

-- ─── KI-Beratung (P1-02 + P5-01) ────────────────────────────────────
UPDATE cms_pages SET
  seo_title = 'KI-Beratung für KMU in Thüringen | xKMU',
  seo_description = 'KI-Potenzialanalyse, Automatisierung und Assistenten – pragmatische KI-Beratung für kleine und mittlere Unternehmen aus Weimar in Thüringen.',
  published_seo_title = 'KI-Beratung für KMU in Thüringen | xKMU',
  published_seo_description = 'KI-Potenzialanalyse, Automatisierung und Assistenten – pragmatische KI-Beratung für kleine und mittlere Unternehmen aus Weimar in Thüringen.',
  updated_at = now()
WHERE slug = '/ki-beratung';

UPDATE cms_blocks SET content = jsonb_set(
  content,
  '{subheadline}',
  '"Von der Potenzialanalyse bis zur laufenden Automation. Wir identifizieren, wo KI wirklich hilft, setzen es um und befähigen Ihr Team – ohne KI-Wildwuchs, sondern mit klaren Regeln. Als IT-Dienstleister aus Thüringen begleiten wir KMU im DACH-Raum remote und vor Ort."'::jsonb
)
WHERE block_type = 'hero'
  AND page_id IN (SELECT id FROM cms_pages WHERE slug = '/ki-beratung');

-- ─── IT-Beratung (P1-02 + P5-01) ────────────────────────────────────
UPDATE cms_pages SET
  seo_title = 'IT-Beratung für KMU in Thüringen | xKMU',
  seo_description = 'Stabile, sichere und skalierbare IT vom Arbeitsplatz bis zur Cloud – Beratung für kleine und mittlere Unternehmen aus Weimar in Thüringen.',
  published_seo_title = 'IT-Beratung für KMU in Thüringen | xKMU',
  published_seo_description = 'Stabile, sichere und skalierbare IT vom Arbeitsplatz bis zur Cloud – Beratung für kleine und mittlere Unternehmen aus Weimar in Thüringen.',
  updated_at = now()
WHERE slug = '/it-beratung';

UPDATE cms_blocks SET content = jsonb_set(
  content,
  '{subheadline}',
  '"Stabile, sichere und skalierbare IT – vom Arbeitsplatz bis zur Cloud-Infrastruktur. Mit Fokus auf Betriebssicherheit, Skalierbarkeit und Kostenkontrolle. Als IT-Dienstleister aus Thüringen sind wir für KMU im DACH-Raum vor Ort und remote erreichbar."'::jsonb
)
WHERE block_type = 'hero'
  AND page_id IN (SELECT id FROM cms_pages WHERE slug = '/it-beratung');

-- ─── Cybersecurity-Beratung (P1-02 + P5-01) ─────────────────────────
UPDATE cms_pages SET
  seo_title = 'Cybersecurity-Beratung für KMU in Thüringen | xKMU',
  seo_description = 'NIS-2 Compliance, DSGVO-Umsetzung, Hardening und Backup-Konzepte für KMU. Pragmatische Cybersecurity-Beratung aus Weimar in Thüringen.',
  published_seo_title = 'Cybersecurity-Beratung für KMU in Thüringen | xKMU',
  published_seo_description = 'NIS-2 Compliance, DSGVO-Umsetzung, Hardening und Backup-Konzepte für KMU. Pragmatische Cybersecurity-Beratung aus Weimar in Thüringen.',
  updated_at = now()
WHERE slug = '/cybersecurity';

UPDATE cms_blocks SET content = jsonb_set(
  content,
  '{subheadline}',
  '"Angriffsflächen reduzieren, Vorfälle abwehren, NIS-2 und DSGVO technisch umsetzen. Pragmatisch – nicht nach Lehrbuch, sondern nach Risikolage. Aus Weimar in Thüringen für KMU im gesamten DACH-Raum."'::jsonb
)
WHERE block_type = 'hero'
  AND page_id IN (SELECT id FROM cms_pages WHERE slug = '/cybersecurity');

-- ─── Kontakt (P5-01) ────────────────────────────────────────────────
UPDATE cms_pages SET
  seo_title = 'Kontakt – IT-Beratung Weimar | Termin online buchen',
  seo_description = 'Kontaktieren Sie xKMU digital solutions aus Weimar: Termin online buchen, telefonische Hotline oder schriftliche Anfrage. Wir beraten KMU im DACH-Raum.',
  published_seo_title = 'Kontakt – IT-Beratung Weimar | Termin online buchen',
  published_seo_description = 'Kontaktieren Sie xKMU digital solutions aus Weimar: Termin online buchen, telefonische Hotline oder schriftliche Anfrage. Wir beraten KMU im DACH-Raum.',
  updated_at = now()
WHERE slug = '/kontakt';

-- ─── Published-Snapshot fuer alle geaenderten Seiten neu aufbauen ───
-- (sonst rendert die Live-Seite weiterhin den alten subheadline-Text)
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
    FROM cms_blocks b
    WHERE b.page_id = p.id
  ),
  has_draft_changes = false,
  published_at = COALESCE(published_at, now()),
  published_title = title,
  updated_at = now()
WHERE p.slug IN ('/', '/ki-beratung', '/it-beratung', '/cybersecurity', '/kontakt');
