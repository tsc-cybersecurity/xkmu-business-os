-- ============================================================
-- Migration 042: CTA-Fix mit korrekten langen Slugs
--
-- Migration 040 hat per slug = '/cybersecurity/c3' gematcht, die
-- Live-DB hat aber lange Slugs wie '/cybersecurity/c3-backup-recovery-
-- ransomware-resilienz'. Daher hat 040 die CTAs NICHT veraendert.
--
-- Diese Migration nutzt LIKE-Pattern (z.B. '/cybersecurity/c3-%') und
-- aktualisiert den primaeren cta-Block jeder Modul-Detailseite.
-- ============================================================

CREATE OR REPLACE FUNCTION xkmu_set_module_cta_v2(
  p_slug_pattern text, p_headline text, p_description text,
  p_button_label text, p_topic text, p_back_href text
) RETURNS void AS $$
DECLARE
  v_page_id uuid;
  v_cta_id uuid;
  v_topic_encoded text;
  v_content jsonb;
BEGIN
  SELECT id INTO v_page_id FROM cms_pages WHERE slug LIKE p_slug_pattern LIMIT 1;
  IF v_page_id IS NULL THEN RETURN; END IF;

  v_topic_encoded := REPLACE(p_topic, ' ', '%20');
  v_topic_encoded := REPLACE(v_topic_encoded, 'ü', '%C3%BC');
  v_topic_encoded := REPLACE(v_topic_encoded, 'ö', '%C3%B6');
  v_topic_encoded := REPLACE(v_topic_encoded, 'ä', '%C3%A4');
  v_topic_encoded := REPLACE(v_topic_encoded, 'ß', '%C3%9F');
  v_topic_encoded := REPLACE(v_topic_encoded, '&', '%26');

  v_content := jsonb_build_object(
    'headline', p_headline,
    'description', p_description,
    'buttons', jsonb_build_array(
      jsonb_build_object('label', p_button_label, 'href', '/kontakt?interesse=' || v_topic_encoded, 'variant', 'default'),
      jsonb_build_object('label', 'Zurück zur Übersicht', 'href', p_back_href, 'variant', 'outline')
    )
  );

  SELECT id INTO v_cta_id FROM cms_blocks
    WHERE page_id = v_page_id AND block_type = 'cta'
    ORDER BY sort_order ASC LIMIT 1;

  IF v_cta_id IS NOT NULL THEN
    UPDATE cms_blocks SET content = v_content WHERE id = v_cta_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- KI A1-A5
SELECT xkmu_set_module_cta_v2('/ki-beratung/a1-%',
  'Wo lohnt sich KI bei Ihnen wirklich?',
  'In 30 Minuten besprechen wir Ihre Kernprozesse und schauen, wo KI den größten Hebel hat. Sie bekommen eine ehrliche Einschätzung — und welche 2–3 Use-Cases bei Ihnen realistisch zuerst kommen.',
  '30-Minuten-Potenzialgespräch', 'KI-Beratung', '/ki-beratung');
SELECT xkmu_set_module_cta_v2('/ki-beratung/a2-%',
  'Welche Routine kostet Sie jede Woche Stunden?',
  'Nennen Sie uns einen Prozess, der nervt — wir sagen Ihnen ehrlich, ob sich Automatisierung rechnet, wie lange die Umsetzung dauert und was sie kostet. 30 Minuten, kein Verkaufsgespräch.',
  'Use-Case besprechen', 'KI-Automatisierung', '/ki-beratung');
SELECT xkmu_set_module_cta_v2('/ki-beratung/a3-%',
  'Eigener KI-Assistent — Tool oder Tinnef?',
  'Wir schauen mit Ihnen, ob ein eigener Bot für Ihren Anwendungsfall sinnvoll ist (FAQ, Kundensupport, Onboarding) oder ob eine fertige Lösung reicht. Klare Empfehlung statt Buzzwords.',
  'Assistent prüfen', 'KI-Assistenten & Chatbots', '/ki-beratung');
SELECT xkmu_set_module_cta_v2('/ki-beratung/a4-%',
  'Wie nutzt Ihr Team KI heute — sicher genug?',
  'Wir prüfen kurz, wo Ihre Mitarbeiter aktuell KI nutzen, welche Daten dabei rausgehen und wo das gefährlich werden könnte. Sie bekommen sofort eine Einschätzung, ob Sie Leitplanken brauchen.',
  'KI-Nutzung prüfen', 'KI-Beratung', '/ki-beratung');
SELECT xkmu_set_module_cta_v2('/ki-beratung/a5-%',
  'KI im Team verankern — ohne Schulungsmarathon.',
  '30 Minuten reichen, um Ihren Schulungsbedarf zu klären: Wer braucht was? Tool-Grundlagen oder Prompt-Strategien? Wir sagen Ihnen, mit welchem Format Ihr Team wirklich vorankommt.',
  'Schulungsbedarf klären', 'KI-Beratung', '/ki-beratung');

-- IT B1-B5
SELECT xkmu_set_module_cta_v2('/it-beratung/b1-%',
  'Wie steht Ihre IT eigentlich da?',
  'Im Erstgespräch klären wir, welche Bereiche Ihrer IT die größten Risiken oder Kostenfallen bergen — und ob ein Assessment sich für Sie lohnt. Sie bekommen sofort 2–3 Quick-Win-Hinweise, kostenlos.',
  '30-Minuten-IT-Gespräch', 'IT-Assessment', '/it-beratung');
SELECT xkmu_set_module_cta_v2('/it-beratung/b2-%',
  'Cloud, hybrid oder bleiben? Wir klären das.',
  'Bringen Sie uns Ihre aktuelle IT-Landschaft in drei Sätzen — wir sagen ehrlich, ob eine Cloud-Migration für Sie Sinn macht, welche Schritte zuerst kommen und was realistisch kostet.',
  'Migration durchsprechen', 'IT-Architektur & Cloud', '/it-beratung');
SELECT xkmu_set_module_cta_v2('/it-beratung/b3-%',
  'Welche Systeme reden bei Ihnen aneinander vorbei?',
  'Nennen Sie uns die zwei Tools, zwischen denen es bei Ihnen klemmt — wir bewerten kostenlos, ob sich eine Integration lohnt und was sie technisch und prozessual bedeutet.',
  'Integration besprechen', 'Systemintegration', '/it-beratung');
SELECT xkmu_set_module_cta_v2('/it-beratung/b4-%',
  'Wer kümmert sich nachts um Ihre Server?',
  'Im 30-Minuten-Gespräch klären wir, ob Ihre IT-Hygiene heute reicht, was bei einem Ausfall passieren würde und ob wir Ihren Betrieb sinnvoll entlasten können — ohne Sie zum Outsourcing zu drängen.',
  'Betriebs-Check anfragen', 'IT-Beratung', '/it-beratung');
SELECT xkmu_set_module_cta_v2('/it-beratung/b5-%',
  'Neuer Mitarbeiter — wie lange dauert das Setup?',
  'Wenn jeder neue Arbeitsplatz ein Sonderfall ist, kostet das Zeit und Nerven. Wir besprechen mit Ihnen, wie ein Standardkonzept aussehen würde — und ob es sich für Ihre Größe lohnt.',
  'Standardisierung anfragen', 'IT-Beratung', '/it-beratung');

-- Cybersecurity C1-C6
SELECT xkmu_set_module_cta_v2('/cybersecurity/c1-%',
  'Wo sind Ihre größten Cyber-Risiken — heute?',
  '30 Minuten genügen für eine grobe Einordnung Ihrer Risikolage. Sie bekommen 2–3 konkrete Hinweise auf Lücken, die Sie sofort selbst schließen können — und wissen, ob ein vollständiger Check sich lohnt.',
  'Risiko-Vorgespräch', 'Security Quick Check', '/cybersecurity');
SELECT xkmu_set_module_cta_v2('/cybersecurity/c2-%',
  'Server und Endpoints — wie hart sind Ihre?',
  'Wir klären in 30 Minuten, ob Ihre aktuellen Sicherheits-Baselines reichen, wo Hardening bei Ihrer Größe wirtschaftlich ist und welche Quick-Wins Sie auch ohne Beratung selbst umsetzen können.',
  'Hardening-Gespräch', 'Hardening & Baselines', '/cybersecurity');
SELECT xkmu_set_module_cta_v2('/cybersecurity/c3-%',
  'Wann haben Sie das letzte Mal einen Restore getestet?',
  'Falls die Antwort "nie" ist, sind Sie nicht allein — und wir sollten reden. 30 Minuten reichen, um Ihre Backup-Strategie zu bewerten und Ihnen ehrliche Hinweise zu geben, wo Sie verwundbar sind.',
  'Backup-Lage klären', 'Backup & Recovery', '/cybersecurity');
SELECT xkmu_set_module_cta_v2('/cybersecurity/c4-%',
  'Stellen Sie sich Mittwoch 11:00 Uhr Ransomware vor.',
  'Wer wird angerufen? Wer entscheidet was? Wir prüfen in 30 Minuten, ob Sie für den Ernstfall vorbereitet sind — oder ob sich ein dokumentierter Plan lohnt. Klare Antwort, keine Panik-Mache.',
  'Notfall-Lage klären', 'Incident Response', '/cybersecurity');
SELECT xkmu_set_module_cta_v2('/cybersecurity/c5-%',
  'Würde Ihr Team auf eine echte Phishing-Mail klicken?',
  'Wir besprechen kurz, was Ihre Mitarbeiter heute über Cybersicherheit wissen und wie ein realistisches Schulungsprogramm aussieht — ohne stundenlange E-Learnings, die niemand nutzt.',
  'Awareness-Bedarf klären', 'Security Awareness', '/cybersecurity');
SELECT xkmu_set_module_cta_v2('/cybersecurity/c6-%',
  'DSGVO, NIS-2 — was gilt eigentlich für Sie?',
  'In 30 Minuten klären wir Ihre echten Compliance-Pflichten (oft weniger oder mehr als gedacht) und besprechen, wie ein audit-festes Setup für Ihre Größe aussehen kann. Keine Kanzlei-Tarife.',
  'Compliance-Gespräch', 'Datenschutz & Compliance', '/cybersecurity');

-- Kombi D1-D3
SELECT xkmu_set_module_cta_v2('/loesungen/d1-%',
  'KI einführen — Risiko oder Hebel?',
  'Wenn Mitarbeiter heute schon ChatGPT nutzen, ohne Regeln, sollten wir reden. 30 Minuten reichen, um Ihre aktuelle KI-Praxis kurz zu screenen und Ihnen konkrete Mindest-Leitplanken zu zeigen.',
  'KI+Security klären', 'Kombinations-Modul', '/loesungen');
SELECT xkmu_set_module_cta_v2('/loesungen/d2-%',
  'Eine Automation läuft. Bis sie es nicht mehr tut.',
  'Wir besprechen mit Ihnen Ihre aktuellen oder geplanten Automationen — und prüfen, ob Monitoring, Berechtigungen und Wartung mitgedacht sind. Klare Empfehlungen, was wirklich kritisch ist.',
  'Automation-Check', 'Kombinations-Modul', '/loesungen');
SELECT xkmu_set_module_cta_v2('/loesungen/d3-%',
  'Drei Stunden Stromausfall — was passiert bei Ihnen?',
  'Im 30-Minuten-Gespräch spielen wir 1–2 realistische Notfall-Szenarien durch und sagen Ihnen, wo Sie strukturell verwundbar sind. Keine Generalprobe, sondern eine ehrliche Lagebewertung.',
  'Notfall-Bereitschaft prüfen', 'Kombinations-Modul', '/loesungen');

DROP FUNCTION xkmu_set_module_cta_v2(text, text, text, text, text, text);

-- Published-Snapshot fuer alle Modul-Detailseiten neu aufbauen
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
WHERE p.slug LIKE '/ki-beratung/%'
   OR p.slug LIKE '/it-beratung/%'
   OR p.slug LIKE '/cybersecurity/%'
   OR p.slug LIKE '/loesungen/%';
