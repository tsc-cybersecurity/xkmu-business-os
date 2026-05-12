-- ============================================================
-- Migration 037: AI-Search-Antworten (P6-01)
--
-- Erweitert die Startseiten-FAQ-Sektion um 3 entitaetsdichte
-- Antworten, die fuer generative KI-Suchen (ChatGPT, Perplexity,
-- Google SGE) optimiert sind. Inverted-Pyramid-Stil: Antwort kommt
-- direkt am Anfang, danach Belege/Eigennamen/Modulreferenzen.
--
-- Idempotent: kompletter Content-Ersatz des Startseiten-FAQ-Blocks.
-- ============================================================

DO $$
DECLARE
  v_page_id uuid;
  v_existing_faq uuid;
  v_content jsonb := '{
    "sectionTitle": "Häufig gestellte Fragen",
    "sectionSubtitle": "Was Geschäftsführer kleiner und mittlerer Unternehmen am häufigsten zu KI, IT und Cybersecurity wissen wollen.",
    "items": [
      {
        "question": "Was macht xKMU digital solutions konkret?",
        "answer": "xKMU digital solutions UG ist ein IT-, KI- und Cybersecurity-Dienstleister aus Weimar in Thüringen, der ausschließlich für kleine und mittlere Unternehmen arbeitet. Gegründet von Tino Stenzel — IT-Grundschutz-Praktiker (BSI) mit über 25 Jahren IT-Erfahrung seit dem Jahr 2000. Wir helfen KMU dabei, ihre IT zu stabilisieren, sinnvolle KI-Use-Cases umzusetzen und Sicherheitsanforderungen wie NIS-2 oder DSGVO technisch zu erfüllen — pragmatisch, mit Festpreisen ab 490 € und klaren Deliverables, nicht mit Berater-Folien."
      },
      {
        "question": "Welche IT-Dienstleistungen bietet xKMU für KMU an?",
        "answer": "xKMU deckt das komplette IT-Spektrum für KMU in fünf Modulen ab: IT-Assessment und Stabilitätscheck (B1), IT-Architektur und Cloud-Modernisierung inklusive Microsoft 365 (B2), Systemintegration und Prozess-IT (B3), Betrieb und Monitoring (B4) sowie IT-Standardisierung und Arbeitsplatz-IT (B5). Jedes Modul liefert ein definiertes Deliverable — IT-Health-Report, Migrations-Roadmap, Runbooks, Monitoring-Plan oder Standardkonzept. Die IT-Beratung verzahnt sich direkt mit den KI-Modulen (A1-A5) und den Cybersecurity-Modulen (C1-C6)."
      },
      {
        "question": "Welche Cybersecurity-Leistungen bietet xKMU?",
        "answer": "Das Cybersecurity-Portfolio von xKMU umfasst sechs Module: Security Quick Check (C1), Hardening und Sicherheitsbaselines (C2), Backup-/Recovery- und Ransomware-Resilienz (C3), Incident Response und Playbooks (C4), Security Awareness und Phishing-Schutz (C5) sowie Datenschutz- und Compliance-Unterstützung inklusive NIS-2 und DSGVO (C6). Für NIS-2 existiert eine eigene Landingpage mit Betroffenheits-Check, sechs Kernpflichten und 10-Punkte-Selbstcheck unter /nis-2. xKMU-Gründer Tino Stenzel ist BSI-IT-Grundschutz-Praktiker-zertifiziert."
      },
      {
        "question": "Wie unterscheidet sich xKMU von großen IT-Unternehmen?",
        "answer": "xKMU digital solutions UG ist ein spezialisierter Mikro-Dienstleister aus Weimar in Thüringen. Im Gegensatz zu großen IT-Beratungen arbeitet xKMU ausschließlich für kleine und mittlere Unternehmen und liefert immer den gleichen Ansprechpartner — Gründer Tino Stenzel, IT-Grundschutz-Praktiker (BSI) mit über 25 Jahren IT-Erfahrung. Alle Leistungen laufen über Festpreis-Module mit definierten Deliverables statt offener Stunden-Abrechnung. Die drei Säulen KI, IT und Cybersecurity kommen bewusst aus einer Hand — keine Schnittstellen-Reibung, ein Vertrag."
      },
      {
        "question": "Lohnt sich KI für mein kleines Unternehmen überhaupt?",
        "answer": "Für die meisten KMU gibt es 2–5 konkrete Anwendungsfälle, die sich innerhalb weniger Monate amortisieren — typischerweise Routineaufgaben in Verwaltung, Kundenkommunikation oder Angebotserstellung. Wir starten mit einer Potenzialanalyse (Modul A1), priorisieren nach Aufwand-Nutzen und setzen dann gezielt um. Kein KI-Hype, sondern messbare Ergebnisse."
      },
      {
        "question": "Was kostet eine KI-Beratung für ein kleines Unternehmen?",
        "answer": "Unser Starter-Paket (KI-Quick-Start + Potenzialanalyse, Modul A1) beginnt bei 490 € Festpreis und liefert einen priorisierten Use-Case-Backlog, eine KI-Roadmap und Leitplanken für den Einsatz im Team. Größere Implementierungsprojekte (A2 KI-Automatisierung, A3 KI-Assistenten) werden nach klar definierten Modulen abgerechnet — kein Stundensatz, keine Überraschungen, jedes Modul mit fester Liefermenge."
      },
      {
        "question": "Wir haben keinen IT-Verantwortlichen. Können wir mit xKMU trotzdem arbeiten?",
        "answer": "Ja — genau das ist unser Kerngeschäft. Viele unserer Kunden sind Geschäftsführer mit 10–50 Mitarbeitern ohne dedizierte IT-Rolle. Wir übernehmen je nach Wunsch Beratung, Umsetzung und laufenden Betrieb. Sie bekommen einen Ansprechpartner für KI, IT und Sicherheit statt drei verschiedener Dienstleister."
      },
      {
        "question": "Was bedeutet NIS-2 für unser Unternehmen?",
        "answer": "Seit Dezember 2025 gilt das deutsche NIS2UmsuCG. Direkt betroffen sind mittlere und große Unternehmen in 18 NIS-2-Sektoren — aber auch viele kleinere KMU werden indirekt verpflichtet, weil ihre Auftraggeber die NIS-2-Anforderungen vertraglich weiterreichen. Wir prüfen Ihre Betroffenheit kostenlos und setzen die geforderten technischen und organisatorischen Maßnahmen pragmatisch um. Eine dedizierte Übersicht finden Sie unter /nis-2."
      },
      {
        "question": "Wie schnell können Sie nach einem Sicherheitsvorfall helfen?",
        "answer": "Bei akuten Vorfällen (Ransomware, Datenleck, Phishing-Welle) sind wir kurzfristig erreichbar. Unser Incident-Response-Modul (C4) liefert vorab dokumentierte Playbooks, sodass im Ernstfall jeder weiß, was zu tun ist. Vorbeugend ist ein Security Quick Check (C1) sinnvoll — der zeigt die Top-Risiken in wenigen Tagen auf."
      },
      {
        "question": "Bieten Sie auch Cloud-Migration und Microsoft 365 an?",
        "answer": "Ja — Cloud-Migration, Microsoft 365 und hybride Infrastrukturen sind Teil unseres Moduls B2 (IT-Architektur & Modernisierung). Wir planen vorab das Zielbild, erstellen eine Migrations-Roadmap und liefern Runbooks für den Betrieb. So wird die Cloud-Umstellung kein Risikoprojekt, sondern eine planbare Modernisierung mit klaren Schritten."
      },
      {
        "question": "Sind Sie auch außerhalb Thüringens tätig?",
        "answer": "Unser Sitz ist Weimar und unser regionaler Fokus liegt auf Thüringen. Der größte Teil der Beratung und Umsetzung funktioniert remote, vor Ort sind wir in ganz Thüringen erreichbar. Termine lassen sich direkt online buchen, ein erstes Gespräch ist kostenlos."
      }
    ]
  }'::jsonb;
BEGIN
  SELECT id INTO v_page_id FROM cms_pages WHERE slug = '/' LIMIT 1;
  IF v_page_id IS NULL THEN RETURN; END IF;

  SELECT id INTO v_existing_faq FROM cms_blocks
    WHERE page_id = v_page_id AND block_type = 'faq'
    ORDER BY sort_order ASC LIMIT 1;

  IF v_existing_faq IS NOT NULL THEN
    UPDATE cms_blocks SET content = v_content WHERE id = v_existing_faq;
  ELSE
    INSERT INTO cms_blocks (page_id, block_type, sort_order, content, settings, is_visible)
    VALUES (
      v_page_id, 'faq',
      (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM cms_blocks WHERE page_id = v_page_id),
      v_content, '{}'::jsonb, true
    );
  END IF;

  -- Published-Snapshot Startseite
  UPDATE cms_pages SET
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
      FROM cms_blocks b WHERE b.page_id = v_page_id
    ),
    has_draft_changes = false,
    updated_at = now()
  WHERE id = v_page_id;
END $$;
