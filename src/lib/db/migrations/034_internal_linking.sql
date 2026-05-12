-- ============================================================
-- Migration 034: Interne Verlinkung (P5-02)
--
-- Fuegt auf 5 Kernseiten einen "Verwandte Themen"-features-Block
-- ein, der die jeweils anderen Pillar-/Compliance-/About-Seiten
-- referenziert. Erhoeht den internen Linkflow (SEO) und reduziert
-- Bounce-Rate.
--
-- Position: jeweils direkt VOR dem CTA-Block. Bestehende Bloecke
-- ab CTA-sort_order werden um +1 verschoben, der Cross-Sell-Block
-- nimmt den freigewordenen Platz ein.
--
-- Idempotent: ueber settings.tag = 'cross-sell' identifizierbar;
-- bei Re-Run wird der existing Cross-Sell vorher geloescht, die
-- Sort-Order-Shifts werden NUR ausgefuehrt, wenn kein Cross-Sell
-- existiert (verhindert Doppel-Shifts).
-- ============================================================

-- ─── Hilfsprozedur: Cross-Sell-Block fuer eine Seite setzen ─────────
CREATE OR REPLACE FUNCTION xkmu_set_cross_sell(p_slug text, p_content jsonb) RETURNS void AS $$
DECLARE
  v_page_id uuid;
  v_cta_sort int;
  v_existed boolean;
BEGIN
  SELECT id INTO v_page_id FROM cms_pages WHERE slug = p_slug;
  IF v_page_id IS NULL THEN RETURN; END IF;

  -- Pruefen, ob bereits ein Cross-Sell existiert
  SELECT EXISTS(
    SELECT 1 FROM cms_blocks
    WHERE page_id = v_page_id AND settings->>'tag' = 'cross-sell'
  ) INTO v_existed;

  IF v_existed THEN
    -- Nur Content aktualisieren, keine sort-Order-Aenderung
    UPDATE cms_blocks SET content = p_content
    WHERE page_id = v_page_id AND settings->>'tag' = 'cross-sell';
  ELSE
    -- CTA-Block finden, Bloecke ab dort um +1 shiften, Cross-Sell einfuegen
    SELECT MIN(sort_order) INTO v_cta_sort
    FROM cms_blocks
    WHERE page_id = v_page_id AND block_type = 'cta';

    IF v_cta_sort IS NULL THEN
      -- Fallback: kein CTA → ans Ende anhaengen
      SELECT COALESCE(MAX(sort_order), -1) + 1 INTO v_cta_sort
      FROM cms_blocks WHERE page_id = v_page_id;
    ELSE
      UPDATE cms_blocks SET sort_order = sort_order + 1
      WHERE page_id = v_page_id AND sort_order >= v_cta_sort;
    END IF;

    INSERT INTO cms_blocks (page_id, block_type, sort_order, content, settings, is_visible)
    VALUES (v_page_id, 'features', v_cta_sort, p_content, '{"tag":"cross-sell"}'::jsonb, true);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ─── /ki-beratung ──────────────────────────────────────────────────
SELECT xkmu_set_cross_sell('/ki-beratung', '{
  "sectionTitle": "Verwandte Themen",
  "sectionSubtitle": "KI entfaltet ihren Nutzen erst auf einer stabilen IT-Basis und mit klaren Sicherheits-Leitplanken.",
  "columns": 3,
  "items": [
    {
      "icon": "Monitor",
      "title": "IT-Beratung",
      "description": "Stabile Infrastruktur als Fundament — Cloud, Arbeitsplatz, Betrieb.",
      "link": "/it-beratung"
    },
    {
      "icon": "Shield",
      "title": "Cybersecurity-Beratung",
      "description": "Risiken reduzieren, NIS-2 und DSGVO technisch umsetzen.",
      "link": "/cybersecurity"
    },
    {
      "icon": "ShieldAlert",
      "title": "NIS-2 Compliance",
      "description": "Betroffenheits-Check und Massnahmenplan fuer NIS-2-pflichtige KMU.",
      "link": "/nis-2"
    }
  ]
}'::jsonb);

-- ─── /it-beratung ──────────────────────────────────────────────────
SELECT xkmu_set_cross_sell('/it-beratung', '{
  "sectionTitle": "Verwandte Themen",
  "sectionSubtitle": "Auf der stabilen IT-Basis lassen sich KI-Use-Cases umsetzen und Sicherheits-Pflichten erfuellen.",
  "columns": 3,
  "items": [
    {
      "icon": "Bot",
      "title": "KI-Beratung",
      "description": "Sinnvolle KI-Use-Cases identifizieren, umsetzen und im Team verankern.",
      "link": "/ki-beratung"
    },
    {
      "icon": "Shield",
      "title": "Cybersecurity-Beratung",
      "description": "IT-Hygiene plus Hardening, Backup-Resilienz und Incident-Response.",
      "link": "/cybersecurity"
    },
    {
      "icon": "ShieldAlert",
      "title": "NIS-2 Compliance",
      "description": "Auch fuer indirekt verpflichtete IT-Dienstleister oft Pflicht.",
      "link": "/nis-2"
    }
  ]
}'::jsonb);

-- ─── /cybersecurity ─────────────────────────────────────────────────
SELECT xkmu_set_cross_sell('/cybersecurity', '{
  "sectionTitle": "Verwandte Themen",
  "sectionSubtitle": "Cybersecurity ist kein Insel-Thema — sie traegt die KI-Einfuehrung und stabilisiert den IT-Betrieb.",
  "columns": 3,
  "items": [
    {
      "icon": "ShieldAlert",
      "title": "NIS-2 Compliance",
      "description": "Eigene Landingpage mit Betroffenheits-Check, Pflichten und Beratungsablauf.",
      "link": "/nis-2"
    },
    {
      "icon": "Monitor",
      "title": "IT-Beratung",
      "description": "Sicherheit braucht ein solides IT-Fundament: Patch, Backup, Monitoring.",
      "link": "/it-beratung"
    },
    {
      "icon": "Bot",
      "title": "KI-Beratung",
      "description": "KI-Einsatz inkl. Datenschutz, Prompt-Governance und Modell-Wahl.",
      "link": "/ki-beratung"
    }
  ]
}'::jsonb);

-- ─── /nis-2 ────────────────────────────────────────────────────────
SELECT xkmu_set_cross_sell('/nis-2', '{
  "sectionTitle": "Weitere xKMU-Leistungen",
  "sectionSubtitle": "NIS-2 setzt auf einer stabilen IT auf — und greift in alle drei xKMU-Beratungssaeulen.",
  "columns": 3,
  "items": [
    {
      "icon": "Shield",
      "title": "Cybersecurity-Beratung",
      "description": "Alle 6 Cybersecurity-Module (C1-C6) — vom Quick Check bis zur Datenschutz-Compliance.",
      "link": "/cybersecurity"
    },
    {
      "icon": "Monitor",
      "title": "IT-Beratung",
      "description": "Stabile IT als Voraussetzung fuer Backup, Monitoring und Patch-Management.",
      "link": "/it-beratung"
    },
    {
      "icon": "Bot",
      "title": "KI-Beratung",
      "description": "KI-Einsatz inkl. Datenschutz-Leitplanken und Governance-Kit.",
      "link": "/ki-beratung"
    }
  ]
}'::jsonb);

-- ─── /ueber-uns ─────────────────────────────────────────────────────
SELECT xkmu_set_cross_sell('/ueber-uns', '{
  "sectionTitle": "Was wir konkret machen",
  "sectionSubtitle": "Drei Saeulen — bewusst aus einer Hand. Schauen Sie sich die Leistungen im Detail an.",
  "columns": 3,
  "items": [
    {
      "icon": "Bot",
      "title": "KI-Beratung",
      "description": "Pragmatische KI-Einfuehrung fuer KMU — von der Potenzialanalyse bis zum produktiven Einsatz.",
      "link": "/ki-beratung"
    },
    {
      "icon": "Monitor",
      "title": "IT-Beratung",
      "description": "Stabile, sichere und skalierbare IT vom Arbeitsplatz bis zur Cloud.",
      "link": "/it-beratung"
    },
    {
      "icon": "Shield",
      "title": "Cybersecurity-Beratung",
      "description": "Risiken reduzieren, NIS-2 und DSGVO umsetzen — pragmatisch und audit-fest.",
      "link": "/cybersecurity"
    }
  ]
}'::jsonb);

-- ─── Hilfsprozedur wieder droppen (war nur fuer diese Migration) ────
DROP FUNCTION xkmu_set_cross_sell(text, jsonb);

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
WHERE p.slug IN ('/ki-beratung', '/it-beratung', '/cybersecurity', '/nis-2', '/ueber-uns');
