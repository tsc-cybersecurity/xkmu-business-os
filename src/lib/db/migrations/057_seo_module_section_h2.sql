-- ============================================================
-- Migration 057: Modul-Section-H2 personalisieren
--
-- Alle 19 Modul-Detailseiten hatten die gleiche generische H2
-- "Konkrete Ergebnisse – keine Folien" als sectionTitle. Diese
-- Migration setzt pro Modul einen spezifischen Titel mit Modul-
-- Keyword — bessere SEO + Scanbarkeit fuer Nutzer.
--
-- Match per content->>'sectionTitle' = 'Konkrete Ergebnisse...':
-- - Idempotent (Re-Run greift nicht erneut, Alt-Wert ist weg)
-- - Wirkt auf alle Block-Typen (features/cards/wheel/columns)
-- ============================================================

-- Helper-Funktion zur Verkleinerung der Wiederholung pro Modul
CREATE OR REPLACE FUNCTION xkmu_set_module_section_h2(
  p_slug_prefix text, p_new_title text
) RETURNS void AS $$
BEGIN
  UPDATE cms_blocks SET content = jsonb_set(content,
    '{sectionTitle}', to_jsonb(p_new_title))
  WHERE content->>'sectionTitle' = 'Konkrete Ergebnisse – keine Folien'
    AND page_id IN (SELECT id FROM cms_pages WHERE slug LIKE p_slug_prefix);
END;
$$ LANGUAGE plpgsql;

-- ─── KI-Beratung A1-A5 ─────────────────────────────────────────────
SELECT xkmu_set_module_section_h2('/ki-beratung/a1-%', 'Was die KI-Potenzialanalyse liefert');
SELECT xkmu_set_module_section_h2('/ki-beratung/a2-%', 'Was unsere KI-Automatisierung liefert');
SELECT xkmu_set_module_section_h2('/ki-beratung/a3-%', 'Was Ihre KI-Assistenten können werden');
SELECT xkmu_set_module_section_h2('/ki-beratung/a4-%', 'Was unser KI-Governance-Paket liefert');
SELECT xkmu_set_module_section_h2('/ki-beratung/a5-%', 'Was unsere KI-Schulungen liefern');

-- ─── IT-Beratung B1-B5 ─────────────────────────────────────────────
SELECT xkmu_set_module_section_h2('/it-beratung/b1-%', 'Was das IT-Assessment liefert');
SELECT xkmu_set_module_section_h2('/it-beratung/b2-%', 'Was unsere IT-Architektur-Beratung liefert');
SELECT xkmu_set_module_section_h2('/it-beratung/b3-%', 'Was unsere Systemintegration liefert');
SELECT xkmu_set_module_section_h2('/it-beratung/b4-%', 'Was unser IT-Betrieb liefert');
SELECT xkmu_set_module_section_h2('/it-beratung/b5-%', 'Was unsere Arbeitsplatz-Standardisierung liefert');

-- ─── Cybersecurity C1-C6 ───────────────────────────────────────────
SELECT xkmu_set_module_section_h2('/cybersecurity/c1-%', 'Was der Security Quick-Check liefert');
SELECT xkmu_set_module_section_h2('/cybersecurity/c2-%', 'Was unser Hardening-Paket liefert');
SELECT xkmu_set_module_section_h2('/cybersecurity/c3-%', 'Was unser Backup-Paket liefert');
SELECT xkmu_set_module_section_h2('/cybersecurity/c4-%', 'Was unsere Incident-Response liefert');
SELECT xkmu_set_module_section_h2('/cybersecurity/c5-%', 'Was unser Awareness-Programm liefert');
SELECT xkmu_set_module_section_h2('/cybersecurity/c6-%', 'Was unser Datenschutz- und Compliance-Paket liefert');

-- ─── Loesungen D1-D3 (Kombi-Module) ────────────────────────────────
SELECT xkmu_set_module_section_h2('/loesungen/d1-%', 'Was das Kombi-Modul "KI sicher einführen" liefert');
SELECT xkmu_set_module_section_h2('/loesungen/d2-%', 'Was das Kombi-Modul "Sicher automatisieren" liefert');
SELECT xkmu_set_module_section_h2('/loesungen/d3-%', 'Was das Kombi-Modul "Incident-ready Organisation" liefert');

DROP FUNCTION xkmu_set_module_section_h2(text, text);

-- ─── Published-Snapshot rebuild ─────────────────────────────────────
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
WHERE slug LIKE '/ki-beratung/a%'
   OR slug LIKE '/it-beratung/b%'
   OR slug LIKE '/cybersecurity/c%'
   OR slug LIKE '/loesungen/d%';
