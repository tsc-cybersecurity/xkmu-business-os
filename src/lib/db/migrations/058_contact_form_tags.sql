-- ============================================================
-- Migration 058: Kontaktformular-Tags erweitern auf 18 Eintraege
--
-- Live-Stand: cms_blocks.content.interestTags auf /kontakt enthielt
-- nur 11 Tags. Modul-CTAs (Migrationen 040 + 042) senden aber
-- ?interesse=Systemintegration / IT-Beratung / Security Quick Check
-- / Incident Response / Security Awareness / Kombinations-Modul
-- — diese 6 Werte werden vom ContactFormBlock-Filter aussortiert
-- (nicht in tags-Array → kein Pre-Fill).
--
-- Diese Migration ergaenzt die fehlenden Tags und bringt sie in
-- die gleiche Reihenfolge wie DEFAULT_TAGS im Code, plus "sonstige
-- Anfrage" als Catch-all.
--
-- Idempotent: setzt das Array komplett neu (jsonb_set), egal was
-- vorher drin stand.
-- ============================================================

DO $$
DECLARE
  v_tags jsonb := '[
    "KI-Beratung",
    "KI-Automatisierung",
    "KI-Assistenten & Chatbots",
    "IT-Beratung",
    "IT-Assessment",
    "IT-Architektur & Cloud",
    "Systemintegration",
    "Cybersecurity",
    "Security Quick Check",
    "Hardening & Baselines",
    "Backup & Recovery",
    "Incident Response",
    "Security Awareness",
    "Datenschutz & Compliance",
    "NIS-2 Unterstützung",
    "Kombinations-Modul",
    "Managed Services",
    "sonstige Anfrage"
  ]'::jsonb;
BEGIN
  -- contact-form Block auf /kontakt aktualisieren
  UPDATE cms_blocks
  SET content = jsonb_set(content, '{interestTags}', v_tags)
  WHERE block_type = 'contact-form'
    AND page_id IN (SELECT id FROM cms_pages WHERE slug = '/kontakt');

  -- cms_settings.design.contactInterestTags spiegeln (Branding-API)
  UPDATE cms_settings
  SET value = jsonb_set(
    COALESCE(value, '{}'::jsonb),
    '{contactInterestTags}',
    v_tags
  )
  WHERE key = 'design';
END $$;

-- Published-Snapshot der /kontakt-Page neu aufbauen
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
WHERE slug = '/kontakt';
