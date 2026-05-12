-- ============================================================
-- Migration 054: Trust-Stripe (Migration 035) defensiv re-applyen
--
-- Live-Check 2026-05-12 zeigt: auf der Startseite ist der Trust-
-- Stripe (Stats-Block mit "25+ Jahre", "BSI IT-Grundschutz-
-- Praktiker", "Weimar/Thueringen", "ab 490 €") nicht sichtbar.
-- Migration 035 ist offenbar nie sauber durchgelaufen (analog zum
-- /kurse-Problem in Migration 041 vs 047).
--
-- Diese Migration ist idempotent ueber settings.tag='trust-stripe':
-- - Existiert der Tag-Block: nur UPDATE des content
-- - Existiert er nicht: alle Bloecke ab sort_order ≥ 1 um +1
--   verschieben und Stats-Block bei sort_order 1 einfuegen
-- ============================================================

CREATE OR REPLACE FUNCTION xkmu_reapply_trust_stripe(p_slug text) RETURNS void AS $$
DECLARE
  v_page_id uuid;
  v_existed boolean;
  v_content jsonb := '{
    "sectionTitle": "Vertrauen entsteht durch Klartext.",
    "sectionSubtitle": "Was Sie konkret bekommen — nicht nur versprochen.",
    "columns": 4,
    "variant": "default",
    "items": [
      {
        "value": "25+",
        "label": "Jahre IT-Erfahrung",
        "description": "Seit dem Jahr 2000 in IT-Infrastruktur, Cloud und Cybersecurity."
      },
      {
        "value": "BSI",
        "label": "IT-Grundschutz-Praktiker",
        "description": "Zertifiziert nach BSI-Standard — Sicherheit als Teil jedes Projekts."
      },
      {
        "value": "Weimar",
        "label": "Thüringen",
        "description": "Regional aus Mitteldeutschland — remote und vor Ort."
      },
      {
        "value": "ab 490 €",
        "label": "Festpreise",
        "description": "Definierter Lieferumfang pro Modul. Keine Stundenzettel-Überraschungen."
      }
    ]
  }'::jsonb;
BEGIN
  SELECT id INTO v_page_id FROM cms_pages WHERE slug = p_slug;
  IF v_page_id IS NULL THEN RETURN; END IF;

  SELECT EXISTS(
    SELECT 1 FROM cms_blocks
    WHERE page_id = v_page_id AND settings->>'tag' = 'trust-stripe'
  ) INTO v_existed;

  IF v_existed THEN
    UPDATE cms_blocks SET content = v_content, is_visible = true
    WHERE page_id = v_page_id AND settings->>'tag' = 'trust-stripe';
  ELSE
    -- Alle Bloecke ab sort_order >= 1 um +1 verschieben (Hero bleibt bei 0)
    UPDATE cms_blocks SET sort_order = sort_order + 1
    WHERE page_id = v_page_id AND sort_order >= 1;

    INSERT INTO cms_blocks (page_id, block_type, sort_order, content, settings, is_visible)
    VALUES (v_page_id, 'stats', 1, v_content, '{"tag":"trust-stripe"}'::jsonb, true);
  END IF;
END;
$$ LANGUAGE plpgsql;

SELECT xkmu_reapply_trust_stripe('/');
SELECT xkmu_reapply_trust_stripe('/ueber-uns');

DROP FUNCTION xkmu_reapply_trust_stripe(text);

-- Published-Snapshot fuer beide Seiten neu aufbauen
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
WHERE p.slug IN ('/', '/ueber-uns');
