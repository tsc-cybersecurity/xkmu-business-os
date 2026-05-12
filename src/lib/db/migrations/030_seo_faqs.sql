-- ============================================================
-- Migration 030: FAQ-Sektionen fuer Startseite + 3 Pillar-Seiten
--
-- Erfuellt P3-02 (FAQs Startseite) + Teil P2-01/02/03 (FAQs auf
-- Pillar-Seiten). FaqBlock rendert Schema.org FAQPage-JSON-LD —
-- kritisch fuer Google Rich-Results und AI-Search-Sichtbarkeit.
--
-- Idempotent: existiert auf einer Seite bereits ein faq-Block, wird
-- der erste durch die neuen Inhalte ueberschrieben statt zusaetzlich
-- eingefuegt. published_blocks-Snapshot wird am Ende neu aufgebaut.
-- ============================================================

-- Hilfsfunktion: existiert bereits ein FAQ-Block fuer die page_id?
-- Wir nutzen ein CTE-Pattern pro Seite (idempotent ohne Trigger).

-- ─── 1) STARTSEITE — 8 FAQs (KI, IT, Cyber, Allgemein) ──────────
DO $$
DECLARE
  v_page_id uuid;
  v_existing_faq uuid;
  v_max_order int;
  v_content jsonb := '{
    "sectionTitle": "Häufig gestellte Fragen",
    "sectionSubtitle": "Was Geschäftsführer kleiner und mittlerer Unternehmen am häufigsten zu KI, IT und Cybersecurity wissen wollen.",
    "items": [
      {
        "question": "Was macht xKMU digital solutions konkret?",
        "answer": "xKMU ist ein IT-, KI- und Cybersecurity-Dienstleister aus Weimar in Thüringen, der ausschließlich für kleine und mittlere Unternehmen arbeitet. Wir helfen KMU dabei, ihre IT zu stabilisieren, sinnvolle KI-Use-Cases umzusetzen und Sicherheitsanforderungen wie NIS-2 oder DSGVO technisch zu erfüllen — pragmatisch, mit Festpreisen und klaren Deliverables, nicht mit Berater-Folien."
      },
      {
        "question": "Lohnt sich KI für mein kleines Unternehmen überhaupt?",
        "answer": "Für die meisten KMU gibt es 2–5 konkrete Anwendungsfälle, die sich innerhalb weniger Monate amortisieren — typischerweise Routineaufgaben in Verwaltung, Kundenkommunikation oder Angebotserstellung. Wir starten mit einer Potenzialanalyse (Modul A1), priorisieren nach Aufwand-Nutzen und setzen dann gezielt um. Kein KI-Hype, sondern messbare Ergebnisse."
      },
      {
        "question": "Was kostet eine KI-Beratung für ein kleines Unternehmen?",
        "answer": "Unser Starter-Paket (KI-Quick-Start + Potenzialanalyse) beginnt bei 490 € Festpreis und liefert einen priorisierten Use-Case-Backlog, eine KI-Roadmap und Leitplanken für den Einsatz im Team. Größere Implementierungsprojekte werden nach klar definierten Modulen abgerechnet — kein Stundensatz, keine Überraschungen, jedes Modul mit fester Liefermenge."
      },
      {
        "question": "Wir haben keinen IT-Verantwortlichen. Können wir mit xKMU trotzdem arbeiten?",
        "answer": "Ja — genau das ist unser Kerngeschäft. Viele unserer Kunden sind Geschäftsführer mit 10–50 Mitarbeitern ohne dedizierte IT-Rolle. Wir übernehmen je nach Wunsch Beratung, Umsetzung und laufenden Betrieb. Sie bekommen einen Ansprechpartner für KI, IT und Sicherheit statt drei verschiedener Dienstleister."
      },
      {
        "question": "Was bedeutet NIS-2 für unser Unternehmen?",
        "answer": "Seit Dezember 2025 gilt das deutsche NIS2UmsuCG. Direkt betroffen sind mittlere und große Unternehmen in 18 Sektoren — aber auch viele kleinere KMU werden indirekt verpflichtet, weil ihre Auftraggeber die NIS-2-Anforderungen vertraglich weiterreichen. Wir prüfen Ihre Betroffenheit kostenlos und setzen die geforderten technischen und organisatorischen Maßnahmen pragmatisch um."
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
        "question": "Sind Sie auch außerhalb Weimars in Thüringen tätig?",
        "answer": "Ja. Unser Sitz ist Weimar, aber wir betreuen KMU in ganz Thüringen. Der größte Teil der Beratung und Umsetzung funktioniert remote, vor Ort sind wir in ganz Thüringen erreichbar. Termine lassen sich direkt online buchen, ein erstes Gespräch ist kostenlos."
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
    SELECT COALESCE(MAX(sort_order), 0) INTO v_max_order FROM cms_blocks WHERE page_id = v_page_id;
    INSERT INTO cms_blocks (page_id, block_type, sort_order, content, settings, is_visible)
      VALUES (v_page_id, 'faq', v_max_order + 1, v_content, '{}'::jsonb, true);
  END IF;
END $$;

-- ─── 2) KI-BERATUNG — 4 FAQs ─────────────────────────────────────
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
        "question": "Welche KI-Modelle nutzen Sie für KMU?",
        "answer": "Wir sind anbieter- und modellneutral. Je nach Use-Case kommen ChatGPT, Claude, Gemini, Mistral oder lokal gehostete Modelle zum Einsatz. Entscheidend ist nicht das Modell, sondern die Integration in Ihre Prozesse — und dass Datenschutz und Datensouveränität von Anfang an mitgedacht werden."
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

-- ─── 3) IT-BERATUNG — 4 FAQs ────────────────────────────────────
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
        "question": "Lohnt sich der Wechsel in die Cloud für ein KMU?",
        "answer": "In den meisten Fällen ja, aber nicht für alles. Wir analysieren, welche Systeme sinnvoll in die Cloud gehören (Mail, Office, kollaboratives Arbeiten) und was besser on-premise oder hybrid bleibt (z.B. Branchensoftware mit Spezialhardware). Microsoft 365 ist dabei oft die Basis — entscheidend ist die strukturierte Migration, nicht ein Pauschal-Ansatz."
      },
      {
        "question": "Können Sie auch unseren laufenden IT-Betrieb übernehmen?",
        "answer": "Ja, im Modul B4 (Betrieb, Monitoring & Dokumentation). Sie behalten die Hoheit über Ihre IT, wir übernehmen das laufende Monitoring, regelmäßige Backup-Prüfungen, Patch-Management und reagieren auf Alarme. Das Setup wird gemeinsam abgestimmt, sodass interne Mitarbeiter weiterhin Routineaufgaben übernehmen können."
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

-- ─── 4) CYBERSECURITY — 4 FAQs (inkl. NIS-2) ─────────────────────
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
        "question": "Was ist der Unterschied zwischen einem Security Quick Check und einem Pentest?",
        "answer": "Ein Pentest ist ein technischer Angriff auf konkrete Systeme — nützlich für reife Organisationen mit bereits etablierten Grundschutzmaßnahmen. Ein Security Quick Check (Modul C1) deckt strukturelle Risiken auf: fehlende Backups, schwache Passwortrichtlinien, ungenutzte Admin-Konten, fehlendes Monitoring. Für die meisten KMU ist das der sinnvolle Start, bevor man pentestet."
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

-- ─── Published-Snapshot fuer alle vier Seiten neu aufbauen ──────
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
  published_at = COALESCE(published_at, now()),
  updated_at = now()
WHERE p.slug IN ('/', '/ki-beratung', '/it-beratung', '/cybersecurity');
