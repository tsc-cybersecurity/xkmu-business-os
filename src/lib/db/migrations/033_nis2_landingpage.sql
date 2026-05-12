-- ============================================================
-- Migration 033: NIS-2-Compliance-Landingpage (/nis-2)
--
-- P2-04: Dedizierte Landingpage fuer NIS-2 — eigene URL, eigener
-- Keyword-Cluster (NIS-2 Beratung, NIS-2 Pflichten, NIS-2 Checkliste).
-- Bisher war NIS-2 nur als Sektion auf der Startseite und implizit
-- via /cybersecurity erreichbar.
--
-- Idempotent: bestehende Bloecke werden bei Re-Run ueberschrieben.
-- ============================================================

DO $$
DECLARE
  v_page_id uuid;
BEGIN
  SELECT id INTO v_page_id FROM cms_pages WHERE slug = '/nis-2' LIMIT 1;

  IF v_page_id IS NULL THEN
    INSERT INTO cms_pages (slug, title, seo_title, seo_description, status, published_at,
      published_title, published_seo_title, published_seo_description)
    VALUES (
      '/nis-2',
      'NIS-2 Compliance',
      'NIS-2 Beratung für KMU – Pflichten & Umsetzung | xKMU',
      'NIS-2-Compliance pragmatisch umsetzen: Betroffenheits-Check, 6 Kernpflichten und Maßnahmenplan. NIS-2-Beratung für KMU von xKMU aus Weimar.',
      'published',
      now(),
      'NIS-2 Compliance',
      'NIS-2 Beratung für KMU – Pflichten & Umsetzung | xKMU',
      'NIS-2-Compliance pragmatisch umsetzen: Betroffenheits-Check, 6 Kernpflichten und Maßnahmenplan. NIS-2-Beratung für KMU von xKMU aus Weimar.'
    ) RETURNING id INTO v_page_id;
  ELSE
    UPDATE cms_pages SET
      title = 'NIS-2 Compliance',
      seo_title = 'NIS-2 Beratung für KMU – Pflichten & Umsetzung | xKMU',
      seo_description = 'NIS-2-Compliance pragmatisch umsetzen: Betroffenheits-Check, 6 Kernpflichten und Maßnahmenplan. NIS-2-Beratung für KMU von xKMU aus Weimar.',
      published_seo_title = 'NIS-2 Beratung für KMU – Pflichten & Umsetzung | xKMU',
      published_seo_description = 'NIS-2-Compliance pragmatisch umsetzen: Betroffenheits-Check, 6 Kernpflichten und Maßnahmenplan. NIS-2-Beratung für KMU von xKMU aus Weimar.',
      status = 'published',
      published_at = COALESCE(published_at, now()),
      updated_at = now()
    WHERE id = v_page_id;
    DELETE FROM cms_blocks WHERE page_id = v_page_id;
  END IF;

  -- 0: Hero
  INSERT INTO cms_blocks (page_id, block_type, sort_order, content, settings, is_visible) VALUES (
    v_page_id, 'hero', 0,
    '{
      "badge": {"icon": "Scale", "text": "NIS-2 · NIS2UmsuCG"},
      "headline": "NIS-2-Compliance für KMU.",
      "subheadline": "Was Geschäftsführer jetzt wissen müssen — und wie xKMU Sie pragmatisch zur Erfüllung führt. Festpreise, klare Maßnahmenpläne, Nachweisdokumentation inklusive.",
      "buttons": [
        {"label": "Kostenlosen NIS-2-Check buchen", "href": "/kontakt", "variant": "default"},
        {"label": "Selbstcheck unten lesen", "href": "#selbstcheck", "variant": "outline"}
      ],
      "size": "medium"
    }'::jsonb, '{}'::jsonb, true);

  -- 1: Was ist NIS-2 (Intro)
  INSERT INTO cms_blocks (page_id, block_type, sort_order, content, settings, is_visible) VALUES (
    v_page_id, 'text', 1,
    '{
      "alignment": "left",
      "content": "## Was ist NIS-2?\n\nDie EU-Richtlinie **NIS-2** (Netz- und Informationssicherheits-Richtlinie 2.0) verschärft die Cybersecurity-Pflichten für Unternehmen in 18 kritischen Sektoren erheblich. In Deutschland wird sie seit Dezember 2025 durch das **NIS2UmsuCG** umgesetzt.\n\nBetroffene Unternehmen müssen technische und organisatorische Maßnahmen zur Risikominimierung umsetzen, Sicherheitsvorfälle innerhalb von **24 Stunden** melden und ihre Lieferanten-Risiken aktiv managen. Bei Verstößen drohen Bußgelder bis **10 Mio. €** oder **2 % des weltweiten Jahresumsatzes** — und die Geschäftsleitung haftet persönlich.\n\nFür viele KMU ist NIS-2 deshalb keine Theorie, sondern eine Pflicht mit kurzer Umsetzungsfrist."
    }'::jsonb, '{}'::jsonb, true);

  -- 2: Betroffenheit
  INSERT INTO cms_blocks (page_id, block_type, sort_order, content, settings, is_visible) VALUES (
    v_page_id, 'features', 2,
    '{
      "sectionTitle": "Wer ist verpflichtet?",
      "sectionSubtitle": "NIS-2 unterscheidet zwischen besonders wichtigen und wichtigen Einrichtungen. Auch wer nicht direkt betroffen ist, wird oft indirekt verpflichtet — durch Lieferketten-Anforderungen seiner Auftraggeber.",
      "columns": 3,
      "items": [
        {
          "icon": "AlertTriangle",
          "title": "Besonders wichtige Einrichtungen",
          "description": "Energie, Verkehr, Bankwesen, Finanzmarkt, Gesundheit, Wasser, digitale Infrastruktur. Pflicht ab 250 Mitarbeitern oder 50 Mio. € Jahresumsatz."
        },
        {
          "icon": "Info",
          "title": "Wichtige Einrichtungen",
          "description": "Post, Abfall, Chemie, Lebensmittel, verarbeitendes Gewerbe, digitale Anbieter, Forschung. Pflicht ab 50 Mitarbeitern oder 10 Mio. € Jahresumsatz."
        },
        {
          "icon": "Link",
          "title": "Indirekt betroffene KMU",
          "description": "Zulieferer und Dienstleister von NIS-2-Einrichtungen erhalten die Pflichten vertraglich weitergegeben — oft mit detaillierten technischen Anforderungen und Nachweispflichten."
        }
      ]
    }'::jsonb, '{}'::jsonb, true);

  -- 3: 6 Kernpflichten
  INSERT INTO cms_blocks (page_id, block_type, sort_order, content, settings, is_visible) VALUES (
    v_page_id, 'features', 3,
    '{
      "sectionTitle": "Die 6 Kernpflichten",
      "sectionSubtitle": "Was NIS-2 von verpflichteten Unternehmen konkret verlangt — und wie wir es pragmatisch umsetzen.",
      "columns": 3,
      "items": [
        {
          "icon": "Activity",
          "title": "1 · Risikomanagement",
          "description": "Systematische Identifikation, Bewertung und Behandlung von Cyberrisiken. Dokumentierte Risikoinventur, regelmäßige Reviews, klare Verantwortlichkeiten."
        },
        {
          "icon": "Bell",
          "title": "2 · Incident-Response & 24h-Meldung",
          "description": "Vorfälle müssen binnen 24 Stunden ans BSI gemeldet werden. Vorab dokumentierte Playbooks, klare Meldekette und ein definiertes Incident-Response-Team sind Pflicht."
        },
        {
          "icon": "Database",
          "title": "3 · Business-Continuity & Backup",
          "description": "Notfallplanung, regelmäßig getestete Backups, dokumentierter Wiederanlaufplan. Im Ernstfall muss der Betrieb in vorab definierten Zeitfenstern wiederhergestellt sein."
        },
        {
          "icon": "Network",
          "title": "4 · Lieferantensicherheit",
          "description": "Aktives Management der Cybersecurity-Risiken aller Dienstleister und Software-Lieferanten. Verträge, Audits, technische Mindestanforderungen."
        },
        {
          "icon": "GraduationCap",
          "title": "5 · Schulung & Awareness",
          "description": "Regelmäßige Sicherheitsschulungen für alle Mitarbeiter, Phishing-Tests und dokumentierte Awareness-Programme. Auch Geschäftsleitung ist explizit eingeschlossen."
        },
        {
          "icon": "KeyRound",
          "title": "6 · Verschlüsselung & MFA",
          "description": "Verschlüsselte Kommunikation und Datenspeicherung, Multi-Faktor-Authentifizierung für privilegierte Zugriffe, Zero-Trust-Prinzipien wo angemessen."
        }
      ]
    }'::jsonb, '{}'::jsonb, true);

  -- 4: 10-Punkte-Selbstcheck
  INSERT INTO cms_blocks (page_id, block_type, sort_order, content, settings, is_visible) VALUES (
    v_page_id, 'text', 4,
    '{
      "alignment": "left",
      "content": "## 10-Punkte-Selbstcheck — Wo stehen Sie?\n\nDie folgenden 10 Fragen geben Ihnen eine erste Orientierung. Wer alle Punkte mit \"Ja\" beantworten kann, ist NIS-2-bereit. Bei \"Nein\" oder \"Weiß nicht\" besteht akuter Handlungsbedarf.\n\n1. **Asset-Inventar:** Wir haben ein aktuelles, dokumentiertes Inventar aller IT-Systeme, Anwendungen und Datenflüsse.\n2. **Risikomanagement:** Wir kennen unsere Top-10-Cyberrisiken und haben dokumentierte Maßnahmen dagegen.\n3. **Backup & Recovery:** Wir haben getestete Backups (3-2-1-Regel) inkl. Offline-Kopie. Restore-Test fand in den letzten 12 Monaten statt.\n4. **Incident-Response-Plan:** Wir haben einen schriftlichen Plan, was bei einem Sicherheitsvorfall zu tun ist — inklusive 24h-Meldepfad.\n5. **Schulungen:** Alle Mitarbeiter erhalten regelmäßig Cybersecurity-Schulungen, dokumentiert mit Datum und Inhalt.\n6. **MFA:** Multi-Faktor-Authentifizierung ist für alle Admin-Zugänge und kritischen Anwendungen aktiv.\n7. **Patch-Management:** Systeme werden innerhalb definierter Fristen gepatcht (kritische Patches innerhalb von 14 Tagen).\n8. **Lieferantenmanagement:** Wir kennen die Cybersecurity-Praxis unserer wichtigsten IT-Dienstleister und haben sie vertraglich abgesichert.\n9. **Logging & Monitoring:** Sicherheitsrelevante Logs werden zentral gesammelt und auf Anomalien überwacht.\n10. **Geschäftsleitung informiert:** Die Geschäftsführung ist regelmäßig zu Cyberrisiken gebrieft und entscheidet aktiv über Sicherheitsbudgets.\n\nMehr als drei \"Nein\" oder \"Weiß nicht\"? Dann lohnt ein NIS-2-Quickcheck — er kostet nichts und schafft Klarheit."
    }'::jsonb, '{"id": "selbstcheck"}'::jsonb, true);

  -- 5: Beratungsablauf (4 Schritte)
  INSERT INTO cms_blocks (page_id, block_type, sort_order, content, settings, is_visible) VALUES (
    v_page_id, 'features', 5,
    '{
      "sectionTitle": "So gehen wir vor",
      "sectionSubtitle": "Unser NIS-2-Beratungsablauf — vier definierte Schritte, jeder mit konkretem Deliverable.",
      "columns": 4,
      "items": [
        {
          "icon": "Search",
          "title": "1 · Betroffenheits-Check",
          "description": "30-minütiges kostenloses Erstgespräch: Klärung, ob Sie direkt oder indirekt betroffen sind, und welche Stufe (essential / important) gilt."
        },
        {
          "icon": "ClipboardCheck",
          "title": "2 · Gap-Analyse",
          "description": "Strukturierte Bewertung gegen die 10 NIS-2-Anforderungsbereiche. Ergebnis: priorisierte Liste der Lücken, jeweils mit Aufwand- und Risiko-Schätzung."
        },
        {
          "icon": "Map",
          "title": "3 · Maßnahmenplan",
          "description": "Quick-Wins (sofort umsetzbar), mittelfristige Stabilisierung und strategische Roadmap. Jede Maßnahme mit Verantwortlichkeit und Fertigstellungstermin."
        },
        {
          "icon": "ShieldCheck",
          "title": "4 · Umsetzung & Nachweis",
          "description": "Wir setzen die Maßnahmen mit Ihnen um und dokumentieren sie audit-fähig. Ergebnis: NIS-2-konformer Betrieb plus Nachweis-Paket für Prüfungen."
        }
      ]
    }'::jsonb, '{}'::jsonb, true);

  -- 6: FAQ
  INSERT INTO cms_blocks (page_id, block_type, sort_order, content, settings, is_visible) VALUES (
    v_page_id, 'faq', 6,
    '{
      "sectionTitle": "Häufig gestellte Fragen zu NIS-2",
      "items": [
        {
          "question": "Wir sind unter 50 Mitarbeiter — gilt NIS-2 trotzdem für uns?",
          "answer": "Direkt nein, indirekt sehr häufig ja. Wenn Sie als Dienstleister oder Zulieferer für ein NIS-2-pflichtiges Unternehmen arbeiten, werden die Anforderungen vertraglich an Sie weitergereicht — oft mit detaillierten technischen und organisatorischen Mindestanforderungen. Diese vertragliche Verpflichtung kann härter sein als das Gesetz selbst."
        },
        {
          "question": "Bis wann müssen wir NIS-2 umgesetzt haben?",
          "answer": "Seit Dezember 2025 ist das NIS2UmsuCG in Deutschland in Kraft. Es gibt keine offizielle Übergangsfrist — die Pflichten gelten ab Inkrafttreten. Praktisch lassen sich die wichtigsten Bausteine (Risikomanagement, Incident-Response, MFA, Backup-Test) innerhalb von 3 bis 6 Monaten erfüllen, wenn man strukturiert vorgeht."
        },
        {
          "question": "Was passiert bei einem Verstoß gegen NIS-2?",
          "answer": "Die Bußgelder reichen bis 10 Mio. € oder 2 % des weltweiten Jahresumsatzes (besonders wichtige Einrichtungen), bzw. 7 Mio. € oder 1,4 % (wichtige Einrichtungen). Zusätzlich haftet die Geschäftsleitung persönlich. Schwerwiegender ist oft der Imageschaden und der Verlust von B2B-Kunden, die NIS-2-Compliance vertraglich fordern."
        },
        {
          "question": "Müssen wir extra Personal einstellen?",
          "answer": "In den meisten KMU nicht. Statt einer eigenen Compliance-Stelle übernehmen wir die strukturierte Umsetzung, klare Dokumentation und das Coaching Ihrer internen Verantwortlichen. So entsteht intern die nötige Kompetenz, ohne ein neues Voll-Zeit-Äquivalent zu finanzieren."
        },
        {
          "question": "Was kostet die NIS-2-Beratung bei xKMU?",
          "answer": "Der initiale Betroffenheits-Check ist kostenlos (30 Min). Die anschließende Gap-Analyse und der Maßnahmenplan laufen über unsere Module C1 (Security Quick Check) und C6 (Datenschutz- & Compliance-Unterstützung) mit Festpreisen je Modul. Sie wissen vorher genau, was Sie wofür bezahlen."
        }
      ]
    }'::jsonb, '{}'::jsonb, true);

  -- 7: CTA
  INSERT INTO cms_blocks (page_id, block_type, sort_order, content, settings, is_visible) VALUES (
    v_page_id, 'cta', 7,
    '{
      "headline": "Klären Sie Ihre NIS-2-Betroffenheit — kostenlos.",
      "description": "Im 30-minütigen Erstgespräch klären wir, ob und wie NIS-2 Sie verpflichtet — direkt oder über Ihre Auftraggeber. Sie bekommen eine ehrliche Einschätzung, kein Verkaufsgespräch.",
      "buttons": [
        {"label": "NIS-2-Check buchen", "href": "/kontakt", "variant": "default"},
        {"label": "Cybersecurity-Module ansehen", "href": "/cybersecurity", "variant": "outline"}
      ]
    }'::jsonb, '{}'::jsonb, true);

  -- Published-Snapshot
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

-- ─── Navigation: NIS-2 im Footer ────────────────────────────────────
INSERT INTO cms_navigation_items (location, label, href, page_id, sort_order)
SELECT 'footer', 'NIS-2 Compliance', '/nis-2', id, 10
FROM cms_pages WHERE slug = '/nis-2'
ON CONFLICT DO NOTHING;
