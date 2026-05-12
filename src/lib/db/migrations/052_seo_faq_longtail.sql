-- ============================================================
-- Migration 052: FAQ-Erweiterungen auf 3 Pillar-Seiten
--
-- Erweitert die bisherigen 4 FAQs pro Pillar auf 8 — die 4 neuen
-- Eintraege adressieren Long-Tail-Suchen (Kosten fuer N-Mitarbeiter-
-- Unternehmen, Zeitachsen, Branchen, Abgrenzungen). FaqBlock
-- rendert weiterhin Schema.org FAQPage-JSON-LD.
--
-- Idempotent: bestehender FAQ-Block wird per UPDATE komplett mit
-- den neuen 8 Items ueberschrieben. published_blocks-Snapshot wird
-- am Ende neu aufgebaut.
-- ============================================================

-- ─── 1) KI-BERATUNG — 8 FAQs ─────────────────────────────────────
DO $$
DECLARE
  v_page_id uuid;
  v_existing_faq uuid;
  v_max_order int;
  v_content jsonb := '{
    "sectionTitle": "Häufig gestellte Fragen zur KI-Beratung",
    "items": [
      {
        "question": "Womit fängt eine KI-Einführung im KMU sinnvoll an?",
        "answer": "Mit einer ehrlichen Potenzialanalyse statt mit einem Tool-Kauf. Wir gehen Ihre Kernprozesse durch, identifizieren 5–10 mögliche Use-Cases und priorisieren nach Aufwand und messbarem Nutzen. Daraus entstehen 2–3 konkrete Quick-Wins, die wir umsetzen — und eine Roadmap für die nächsten 12 Monate."
      },
      {
        "question": "Was kostet eine KI-Potenzialanalyse für ein KMU mit 10–50 Mitarbeitern?",
        "answer": "Unser Starter-Paket (Modul A1: KI-Quick-Start + Potenzialanalyse) beginnt bei 490 € Festpreis und liefert einen priorisierten Use-Case-Backlog, eine KI-Roadmap und Leitplanken für den Einsatz im Team. Größere Implementierungsprojekte werden nach klar definierten Modulen abgerechnet — kein Stundensatz, keine Überraschungen."
      },
      {
        "question": "Wie lange dauert eine KI-Einführung im Unternehmen typischerweise?",
        "answer": "Die Potenzialanalyse (Modul A1) dauert je nach Unternehmensgröße 1–2 Wochen. Erste produktive Automationen (Modul A2) sind oft in 4–6 Wochen umgesetzt. Ein vollständiger Aufbau mit Use-Cases, Governance und Team-Enablement läuft typischerweise über 3–6 Monate — abhängig davon, wie viele Prozesse parallel angegangen werden."
      },
      {
        "question": "Welche KI-Modelle nutzen Sie für KMU?",
        "answer": "Wir sind anbieter- und modellneutral. Je nach Use-Case kommen ChatGPT, Claude, Gemini, Mistral oder lokal gehostete Modelle zum Einsatz. Entscheidend ist nicht das Modell, sondern die Integration in Ihre Prozesse — und dass Datenschutz und Datensouveränität von Anfang an mitgedacht werden."
      },
      {
        "question": "Welche KI-Use-Cases lohnen sich für Steuerberater, Handwerk oder Maschinenbau?",
        "answer": "Branchen-typische Quick-Wins: Steuerberater → Beleg-Klassifizierung, Mandantenkommunikation, Recherche-Briefings. Handwerk → automatische Angebotserstellung aus Stichworten, Vor-Ort-Protokolle, Materiallisten-Generierung. Maschinenbau → Ausschreibungs-Analyse, Übersetzung technischer Dokumentation, FAQ-Bots im After-Sales. Im Erstgespräch klären wir Ihre konkreten Hebel."
      },
      {
        "question": "Ist KI-Nutzung im Unternehmen DSGVO-konform möglich?",
        "answer": "Ja — wenn Anbieter, Verarbeitungsort und Datenarten zueinander passen. Wir prüfen pro Use-Case: Welche personenbezogenen Daten fließen ein? Welcher Anbieter (mit AV-Vertrag, EU-Server, opt-out aus Trainingsdaten) ist geeignet? Welche Daten dürfen niemals in externe Modelle? Das Ergebnis ist eine klare KI-Nutzungsrichtlinie für Ihr Team (Modul A4)."
      },
      {
        "question": "Wie verhindern wir, dass Mitarbeiter unkontrolliert KI nutzen?",
        "answer": "Mit klaren Leitplanken und einem Prompt-Playbook (Modul A4). Wir definieren gemeinsam mit Ihnen, welche KI-Tools im Unternehmen erlaubt sind, welche Daten dort eingegeben werden dürfen und welche nicht. Ergänzt durch eine Kurzschulung (Modul A5) entsteht ein einheitlicher, sicherer KI-Einsatz im Team."
      },
      {
        "question": "Kann KI bei uns auch Routine-Aufgaben automatisieren?",
        "answer": "Ja — und das ist meist der wirtschaftlich attraktivste Einstieg. Typische Anwendungsfälle bei KMU: automatische Vorverarbeitung von Eingangs-E-Mails, Erstellung von Angebotstexten aus Stichworten, Klassifizierung von Belegen, Recherche-Briefings für Geschäftsführung. Wir setzen das im Modul A2 produktiv um."
      }
    ]
  }'::jsonb;
BEGIN
  SELECT id INTO v_page_id FROM cms_pages WHERE slug = '/ki-beratung' LIMIT 1;
  IF v_page_id IS NULL THEN RETURN; END IF;
  SELECT id INTO v_existing_faq FROM cms_blocks WHERE page_id = v_page_id AND block_type = 'faq' ORDER BY sort_order ASC LIMIT 1;
  IF v_existing_faq IS NOT NULL THEN
    UPDATE cms_blocks SET content = v_content WHERE id = v_existing_faq;
  ELSE
    SELECT COALESCE(MAX(sort_order), 0) INTO v_max_order FROM cms_blocks WHERE page_id = v_page_id;
    INSERT INTO cms_blocks (page_id, block_type, sort_order, content, settings, is_visible)
      VALUES (v_page_id, 'faq', v_max_order + 1, v_content, '{}'::jsonb, true);
  END IF;
END $$;

-- ─── 2) IT-BERATUNG — 8 FAQs ─────────────────────────────────────
DO $$
DECLARE
  v_page_id uuid;
  v_existing_faq uuid;
  v_max_order int;
  v_content jsonb := '{
    "sectionTitle": "Häufig gestellte Fragen zur IT-Beratung",
    "items": [
      {
        "question": "Was bringt ein IT-Assessment für unser Unternehmen?",
        "answer": "Ein strukturiertes Bild davon, wo Ihre IT heute steht: Zustand der Hardware und Software, Backup-Status, Sicherheitslücken, Single Points of Failure und vermeidbare Lizenzkosten. Ergebnis ist ein priorisierter Maßnahmenplan mit Quick-Wins (sofort umsetzbar) und mittelfristigen Modernisierungsschritten — meist mit Kosteneinsparungspotenzial im IT-Budget."
      },
      {
        "question": "Was kostet eine IT-Beratung für ein Unternehmen mit 20 Mitarbeitern?",
        "answer": "Ein IT-Assessment (Modul B1) hat einen Festpreis, der von der Anzahl der Standorte und der IT-Komplexität abhängt — typischerweise im niedrigen vierstelligen Bereich. Nach dem Assessment buchen Sie modular weiter: nur Architektur (B2), nur Standardisierung (B5), oder vollen Betrieb (B4). Keine Mindestlaufzeit, keine Stundenkontingente."
      },
      {
        "question": "Wie lange dauert eine Cloud-Migration auf Microsoft 365 typischerweise?",
        "answer": "Für ein KMU mit 10–50 Arbeitsplätzen rechnen wir mit 4–8 Wochen von der Planung bis zum vollständigen Umzug — abhängig davon, ob Postfächer, gemeinsame Laufwerke und SharePoint-Strukturen migriert werden. Wir planen vorab das Zielbild (Modul B2), führen die Migration ohne Downtime durch und liefern Runbooks für den späteren Betrieb."
      },
      {
        "question": "Lohnt sich der Wechsel in die Cloud für ein KMU?",
        "answer": "In den meisten Fällen ja, aber nicht für alles. Wir analysieren, welche Systeme sinnvoll in die Cloud gehören (Mail, Office, kollaboratives Arbeiten) und was besser on-premise oder hybrid bleibt (z.B. Branchensoftware mit Spezialhardware). Microsoft 365 ist dabei oft die Basis — entscheidend ist die strukturierte Migration, nicht ein Pauschal-Ansatz."
      },
      {
        "question": "Was ist der Unterschied zwischen IT-Beratung und Managed Services?",
        "answer": "Beratung liefert Entscheidungsgrundlagen und konkrete Umsetzungspläne (Module B1–B3). Managed Services übernehmen den dauerhaften Betrieb: Monitoring, Patches, Backup-Prüfung, Incident-Response (Modul B4). Wir bieten beides — und Sie können flexibel kombinieren: erst Assessment + Modernisierung, später laufenden Betrieb dazubuchen."
      },
      {
        "question": "Können Sie auch unseren laufenden IT-Betrieb übernehmen?",
        "answer": "Ja, im Modul B4 (Betrieb, Monitoring & Dokumentation). Sie behalten die Hoheit über Ihre IT, wir übernehmen das laufende Monitoring, regelmäßige Backup-Prüfungen, Patch-Management und reagieren auf Alarme. Das Setup wird gemeinsam abgestimmt, sodass interne Mitarbeiter weiterhin Routineaufgaben übernehmen können."
      },
      {
        "question": "Können Sie unsere bestehende IT-Firma ergänzen, statt sie abzulösen?",
        "answer": "Ja — das ist sogar häufig der Einstieg. Wir übernehmen gezielte Themen, die intern oder beim bestehenden Dienstleister fehlen: Cybersecurity, KI-Einführung, IT-Strategie oder Cloud-Architektur. Ablösung ist möglich, aber nicht zwingend. Wir arbeiten mit Ihrem Bestands-IT-Dienstleister sauber zusammen, sofern gewünscht."
      },
      {
        "question": "Wie standardisieren wir unsere Arbeitsplätze sinnvoll?",
        "answer": "Mit einem Standardkonzept (Modul B5): einheitliche Hardware-Pakete pro Rolle, gleiche Software-Ausstattung, dokumentierte On-/Offboarding-Prozesse. Neue Mitarbeiter sind ab Tag 1 arbeitsfähig, ausscheidende Mitarbeiter verlieren alle Zugriffe automatisch. Das reduziert Support-Aufwand und IT-Sicherheits-Risiken gleichzeitig."
      }
    ]
  }'::jsonb;
BEGIN
  SELECT id INTO v_page_id FROM cms_pages WHERE slug = '/it-beratung' LIMIT 1;
  IF v_page_id IS NULL THEN RETURN; END IF;
  SELECT id INTO v_existing_faq FROM cms_blocks WHERE page_id = v_page_id AND block_type = 'faq' ORDER BY sort_order ASC LIMIT 1;
  IF v_existing_faq IS NOT NULL THEN
    UPDATE cms_blocks SET content = v_content WHERE id = v_existing_faq;
  ELSE
    SELECT COALESCE(MAX(sort_order), 0) INTO v_max_order FROM cms_blocks WHERE page_id = v_page_id;
    INSERT INTO cms_blocks (page_id, block_type, sort_order, content, settings, is_visible)
      VALUES (v_page_id, 'faq', v_max_order + 1, v_content, '{}'::jsonb, true);
  END IF;
END $$;

-- ─── 3) CYBERSECURITY — 8 FAQs ───────────────────────────────────
DO $$
DECLARE
  v_page_id uuid;
  v_existing_faq uuid;
  v_max_order int;
  v_content jsonb := '{
    "sectionTitle": "Häufig gestellte Fragen zur Cybersecurity",
    "items": [
      {
        "question": "Sind wir als kleines Unternehmen wirklich von NIS-2 betroffen?",
        "answer": "Direkt: nur wenn Sie zu einer der 18 NIS-2-Sektoren gehören und bestimmte Größenschwellen überschreiten. Indirekt aber sehr häufig — weil größere Auftraggeber die NIS-2-Pflichten vertraglich an Sie weiterreichen, oft mit recht detaillierten technischen Anforderungen. Wir prüfen Betroffenheit und vertragliche Risiken kostenlos im Erstgespräch."
      },
      {
        "question": "Was kostet ein Security Quick Check für ein KMU?",
        "answer": "Ein Security Quick Check (Modul C1) ist ein Festpreis-Paket mit klar definiertem Umfang: dokumentierte Risikobewertung, Sofortmaßnahmen, priorisierte Roadmap — typischerweise im niedrigen vierstelligen Bereich. Der Aufwand richtet sich nach Anzahl Standorte, Systeme und Mitarbeitern. Konkretes Angebot nach kostenlosem Erstgespräch."
      },
      {
        "question": "Wie oft sollten wir unsere IT-Sicherheit überprüfen lassen?",
        "answer": "Ein vollständiger Security Quick Check (Modul C1) ist alle 12–24 Monate sinnvoll — oder anlassbezogen nach größeren Änderungen (Cloud-Migration, neue Standorte, M&A). Zwischen den Prüfungen lohnen sich kurze Awareness-Checks (Phishing-Simulationen, Modul C5) und Restore-Tests der Backups (Modul C3) im Quartalsrhythmus."
      },
      {
        "question": "Was sind die häufigsten Sicherheitslücken in KMU?",
        "answer": "In dieser Reihenfolge: untestete oder fehlende Backups, schwache oder geteilte Passwörter ohne MFA, veraltete Software (Browser, Office, Server), zu großzügige Admin-Rechte, fehlendes Monitoring, ungeschulte Mitarbeiter beim Erkennen von Phishing. Genau diese Punkte deckt unser Security Quick Check (Modul C1) als Erstes ab."
      },
      {
        "question": "Was ist der Unterschied zwischen einem Security Quick Check und einem Pentest?",
        "answer": "Ein Pentest ist ein technischer Angriff auf konkrete Systeme — nützlich für reife Organisationen mit bereits etablierten Grundschutzmaßnahmen. Ein Security Quick Check (Modul C1) deckt strukturelle Risiken auf: fehlende Backups, schwache Passwortrichtlinien, ungenutzte Admin-Konten, fehlendes Monitoring. Für die meisten KMU ist das der sinnvolle Start, bevor man pentestet."
      },
      {
        "question": "Müssen wir trotz IT-Dienstleister selbst Cybersecurity betreiben?",
        "answer": "Ja. Cybersecurity ist nie vollständig delegierbar: Awareness im Team, Reaktion auf Phishing-Meldungen, Entscheidungen zu Zugriffsrechten und Krisenkommunikation müssen intern verankert sein. Wir bauen mit Ihnen die organisatorische Seite auf (Module C4 + C5) und übernehmen technische Routine (Hardening, Monitoring, Backup-Tests) — die Hoheit über Ihre Sicherheitsentscheidungen bleibt bei Ihnen."
      },
      {
        "question": "Wie schützen wir uns konkret vor Ransomware?",
        "answer": "Mit einer Kombination aus drei Bausteinen: getestete Backups nach 3-2-1-Regel inkl. Offline-Kopie (Modul C3), Hardening der Endpoints und Server (Modul C2), und einem dokumentierten Wiederanlauf-Plan (Teil von C3). Wichtig: Backups müssen regelmäßig restore-getestet werden — sonst sind sie im Ernstfall wertlos."
      },
      {
        "question": "Reicht eine einmalige Mitarbeiter-Schulung gegen Phishing?",
        "answer": "Nein. Phishing-Awareness funktioniert nur als laufender Prozess: kurze, wiederkehrende Lerneinheiten, simulierte Test-Phishings und schnelle Reaktion auf gemeldete Vorfälle. Im Modul C5 setzen wir das pragmatisch um — ohne stundenlange E-Learnings, sondern mit konkreten Beispielen aus Ihrem Arbeitsalltag."
      }
    ]
  }'::jsonb;
BEGIN
  SELECT id INTO v_page_id FROM cms_pages WHERE slug = '/cybersecurity' LIMIT 1;
  IF v_page_id IS NULL THEN RETURN; END IF;
  SELECT id INTO v_existing_faq FROM cms_blocks WHERE page_id = v_page_id AND block_type = 'faq' ORDER BY sort_order ASC LIMIT 1;
  IF v_existing_faq IS NOT NULL THEN
    UPDATE cms_blocks SET content = v_content WHERE id = v_existing_faq;
  ELSE
    SELECT COALESCE(MAX(sort_order), 0) INTO v_max_order FROM cms_blocks WHERE page_id = v_page_id;
    INSERT INTO cms_blocks (page_id, block_type, sort_order, content, settings, is_visible)
      VALUES (v_page_id, 'faq', v_max_order + 1, v_content, '{}'::jsonb, true);
  END IF;
END $$;

-- ─── Published-Snapshot fuer die 3 Pillar-Seiten neu aufbauen ────
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
WHERE slug IN ('/ki-beratung', '/it-beratung', '/cybersecurity');
