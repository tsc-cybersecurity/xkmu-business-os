-- ============================================================
-- Migration 050: H1 + Subheadline + Title-Tag fuer 19 Modul-
--                Detailseiten (A1-A5, B1-B5, C1-C6, D1-D3)
--
-- Jede H1 enthaelt Pillar-Keyword + Zielgruppe (KMU) + konkreten
-- Outcome. Jede Subheadline liefert Deliverables/Zeitanker oder
-- USPs (Festpreis, dokumentiert, ohne Lock-in). Title-Tags ≤70
-- Zeichen mit Markenposition am Ende.
--
-- Slug-Erkennung per LIKE '/cybersecurity/c3-%' (analog Migration
-- 042-Pattern), da die Live-Slugs lang sind und sich nicht durch
-- Praefix allein eindeutig matchen lassen.
-- ============================================================

-- ─── KI-Beratung A1-A5 ──────────────────────────────────────────────
UPDATE cms_pages SET
  title = 'KI-Potenzialanalyse für KMU – die 3 besten Use-Cases finden',
  published_title = 'KI-Potenzialanalyse für KMU – die 3 besten Use-Cases finden',
  seo_title = 'KI-Potenzialanalyse für KMU – Use-Cases finden | xKMU',
  published_seo_title = 'KI-Potenzialanalyse für KMU – Use-Cases finden | xKMU',
  updated_at = now()
WHERE slug LIKE '/ki-beratung/a1-%';

UPDATE cms_blocks SET content =
  jsonb_set(jsonb_set(content,
    '{headline}',    '"KI-Potenzialanalyse für KMU – die 3 besten Use-Cases finden"'::jsonb),
    '{subheadline}', '"Strukturierte Potenzialanalyse: wir finden die KI-Use-Cases, die in Ihrem Unternehmen sofort Geld sparen — mit priorisiertem Backlog, Roadmap und Guardrails."'::jsonb)
WHERE block_type = 'hero'
  AND page_id IN (SELECT id FROM cms_pages WHERE slug LIKE '/ki-beratung/a1-%');

UPDATE cms_pages SET
  title = 'KI-Automatisierung für KMU – Routinen ersetzen statt verwalten',
  published_title = 'KI-Automatisierung für KMU – Routinen ersetzen statt verwalten',
  seo_title = 'KI-Automatisierung für KMU – Workflows umsetzen | xKMU',
  published_seo_title = 'KI-Automatisierung für KMU – Workflows umsetzen | xKMU',
  updated_at = now()
WHERE slug LIKE '/ki-beratung/a2-%';

UPDATE cms_blocks SET content =
  jsonb_set(jsonb_set(content,
    '{headline}',    '"KI-Automatisierung für KMU – Routinen ersetzen statt verwalten"'::jsonb),
    '{subheadline}', '"Wir bauen die Automationen, die Sie heute manuell erledigen — mit Testprotokollen, Dokumentation und sauberer Übergabe. Pragmatisch, ohne Plattform-Lock-in."'::jsonb)
WHERE block_type = 'hero'
  AND page_id IN (SELECT id FROM cms_pages WHERE slug LIKE '/ki-beratung/a2-%');

UPDATE cms_pages SET
  title = 'KI-Assistenten & Chatbots für KMU – wirklich nutzbar',
  published_title = 'KI-Assistenten & Chatbots für KMU – wirklich nutzbar',
  seo_title = 'KI-Assistenten & Chatbots für KMU | xKMU',
  published_seo_title = 'KI-Assistenten & Chatbots für KMU | xKMU',
  updated_at = now()
WHERE slug LIKE '/ki-beratung/a3-%';

UPDATE cms_blocks SET content =
  jsonb_set(jsonb_set(content,
    '{headline}',    '"KI-Assistenten & Chatbots für KMU – wirklich nutzbar"'::jsonb),
    '{subheadline}', '"Eigene KI-Assistenten aufbauen und betreiben: Bot-Setup, Gesprächsleitfäden, KPIs — für Service, Vertrieb oder interne Wissensbasis."'::jsonb)
WHERE block_type = 'hero'
  AND page_id IN (SELECT id FROM cms_pages WHERE slug LIKE '/ki-beratung/a3-%');

UPDATE cms_pages SET
  title = 'KI-Governance für KMU – Prompts, Templates, klare Regeln',
  published_title = 'KI-Governance für KMU – Prompts, Templates, klare Regeln',
  seo_title = 'KI-Governance für KMU – Prompts & Templates | xKMU',
  published_seo_title = 'KI-Governance für KMU – Prompts & Templates | xKMU',
  updated_at = now()
WHERE slug LIKE '/ki-beratung/a4-%';

UPDATE cms_blocks SET content =
  jsonb_set(jsonb_set(content,
    '{headline}',    '"KI-Governance für KMU – Prompts, Templates, klare Regeln"'::jsonb),
    '{subheadline}', '"Damit Ihr Team KI einheitlich und sicher nutzt: Prompt-Playbook, Template-Library, Governance-Kit. Schluss mit KI-Wildwuchs im Unternehmen."'::jsonb)
WHERE block_type = 'hero'
  AND page_id IN (SELECT id FROM cms_pages WHERE slug LIKE '/ki-beratung/a4-%');

UPDATE cms_pages SET
  title = 'KI-Schulungen für KMU – Teams nachhaltig befähigen',
  published_title = 'KI-Schulungen für KMU – Teams nachhaltig befähigen',
  seo_title = 'KI-Schulungen für KMU – Enablement & Training | xKMU',
  published_seo_title = 'KI-Schulungen für KMU – Enablement & Training | xKMU',
  updated_at = now()
WHERE slug LIKE '/ki-beratung/a5-%';

UPDATE cms_blocks SET content =
  jsonb_set(jsonb_set(content,
    '{headline}',    '"KI-Schulungen für KMU – Teams nachhaltig befähigen"'::jsonb),
    '{subheadline}', '"Praktische KI-Schulungen für Ihr Team: Schulungsunterlagen, Checklisten, Übungen. Vor Ort in Thüringen oder remote."'::jsonb)
WHERE block_type = 'hero'
  AND page_id IN (SELECT id FROM cms_pages WHERE slug LIKE '/ki-beratung/a5-%');

-- ─── IT-Beratung B1-B5 ──────────────────────────────────────────────
UPDATE cms_pages SET
  title = 'IT-Assessment für KMU – Klarheit über Risiken und Quick-Fixes',
  published_title = 'IT-Assessment für KMU – Klarheit über Risiken und Quick-Fixes',
  seo_title = 'IT-Assessment für KMU – Stabilitäts-Check | xKMU',
  published_seo_title = 'IT-Assessment für KMU – Stabilitäts-Check | xKMU',
  updated_at = now()
WHERE slug LIKE '/it-beratung/b1-%';

UPDATE cms_blocks SET content =
  jsonb_set(jsonb_set(content,
    '{headline}',    '"IT-Assessment für KMU – Klarheit über Risiken und Quick-Fixes"'::jsonb),
    '{subheadline}', '"Strukturierter Stabilitäts- und Risiko-Check Ihrer IT: dokumentierter Status, priorisierte Quick-Fixes, Roadmap-Empfehlung. Festpreis, ohne Lock-in."'::jsonb)
WHERE block_type = 'hero'
  AND page_id IN (SELECT id FROM cms_pages WHERE slug LIKE '/it-beratung/b1-%');

UPDATE cms_pages SET
  title = 'IT-Architektur für KMU – Cloud, Hybrid, M365 zukunftsfähig planen',
  published_title = 'IT-Architektur für KMU – Cloud, Hybrid, M365 zukunftsfähig planen',
  seo_title = 'IT-Architektur für KMU – Cloud, Hybrid, M365 | xKMU',
  published_seo_title = 'IT-Architektur für KMU – Cloud, Hybrid, M365 | xKMU',
  updated_at = now()
WHERE slug LIKE '/it-beratung/b2-%';

UPDATE cms_blocks SET content =
  jsonb_set(jsonb_set(content,
    '{headline}',    '"IT-Architektur für KMU – Cloud, Hybrid, M365 zukunftsfähig planen"'::jsonb),
    '{subheadline}', '"Wir planen Ihre IT-Architektur für die nächsten 5 Jahre: Cloud-Strategie, Microsoft 365, Hybrid-Setups — mit klarer Kostenstruktur und Migrationspfad."'::jsonb)
WHERE block_type = 'hero'
  AND page_id IN (SELECT id FROM cms_pages WHERE slug LIKE '/it-beratung/b2-%');

UPDATE cms_pages SET
  title = 'Systemintegration für KMU – Medienbrüche beseitigen',
  published_title = 'Systemintegration für KMU – Medienbrüche beseitigen',
  seo_title = 'Systemintegration für KMU – CRM, ERP, M365 verbinden | xKMU',
  published_seo_title = 'Systemintegration für KMU – CRM, ERP, M365 verbinden | xKMU',
  updated_at = now()
WHERE slug LIKE '/it-beratung/b3-%';

UPDATE cms_blocks SET content =
  jsonb_set(jsonb_set(content,
    '{headline}',    '"Systemintegration für KMU – Medienbrüche beseitigen"'::jsonb),
    '{subheadline}', '"Wir verbinden Ihre Systeme so, dass Daten ohne Medienbrüche fließen — CRM, ERP, M365, Branchensoftware. Pragmatisch und dokumentiert."'::jsonb)
WHERE block_type = 'hero'
  AND page_id IN (SELECT id FROM cms_pages WHERE slug LIKE '/it-beratung/b3-%');

UPDATE cms_pages SET
  title = 'IT-Betrieb & Monitoring für KMU – weniger Ausfälle',
  published_title = 'IT-Betrieb & Monitoring für KMU – weniger Ausfälle',
  seo_title = 'IT-Betrieb & Monitoring für KMU – weniger Ausfälle | xKMU',
  published_seo_title = 'IT-Betrieb & Monitoring für KMU – weniger Ausfälle | xKMU',
  updated_at = now()
WHERE slug LIKE '/it-beratung/b4-%';

UPDATE cms_blocks SET content =
  jsonb_set(jsonb_set(content,
    '{headline}',    '"IT-Betrieb & Monitoring für KMU – weniger Ausfälle, schnellere Fehlerbehebung"'::jsonb),
    '{subheadline}', '"Wir bauen Ihren IT-Betrieb auf: Monitoring, Dokumentation, klare Eskalation. Mit Notfallhandbuch und nachvollziehbarer Übergabe."'::jsonb)
WHERE block_type = 'hero'
  AND page_id IN (SELECT id FROM cms_pages WHERE slug LIKE '/it-beratung/b4-%');

UPDATE cms_pages SET
  title = 'Arbeitsplatz-IT für KMU – einheitlich standardisieren',
  published_title = 'Arbeitsplatz-IT für KMU – einheitlich standardisieren',
  seo_title = 'Arbeitsplatz-IT für KMU – Standardisierung | xKMU',
  published_seo_title = 'Arbeitsplatz-IT für KMU – Standardisierung | xKMU',
  updated_at = now()
WHERE slug LIKE '/it-beratung/b5-%';

UPDATE cms_blocks SET content =
  jsonb_set(jsonb_set(content,
    '{headline}',    '"Arbeitsplatz-IT für KMU – einheitlich standardisieren"'::jsonb),
    '{subheadline}', '"Einheitliche Arbeitsplätze, automatisierte Provisionierung, klare Update-Strategie. Senken Sie Supportaufwand und Onboarding-Zeit dauerhaft."'::jsonb)
WHERE block_type = 'hero'
  AND page_id IN (SELECT id FROM cms_pages WHERE slug LIKE '/it-beratung/b5-%');

-- ─── Cybersecurity C1-C6 ────────────────────────────────────────────
UPDATE cms_pages SET
  title = 'Security Quick-Check für KMU – Risiken in 5 Tagen sichtbar',
  published_title = 'Security Quick-Check für KMU – Risiken in 5 Tagen sichtbar',
  seo_title = 'Security Quick-Check für KMU – Risiken in 5 Tagen | xKMU',
  published_seo_title = 'Security Quick-Check für KMU – Risiken in 5 Tagen | xKMU',
  updated_at = now()
WHERE slug LIKE '/cybersecurity/c1-%';

UPDATE cms_blocks SET content =
  jsonb_set(jsonb_set(content,
    '{headline}',    '"Security Quick-Check für KMU – Risiken in 5 Tagen sichtbar"'::jsonb),
    '{subheadline}', '"Wo steht Ihre IT-Sicherheit heute? Strukturierter Quick-Check mit dokumentiertem Risikoreport, Sofortmaßnahmen und Roadmap. Festpreis, ohne Lock-in."'::jsonb)
WHERE block_type = 'hero'
  AND page_id IN (SELECT id FROM cms_pages WHERE slug LIKE '/cybersecurity/c1-%');

UPDATE cms_pages SET
  title = 'Hardening & Sicherheitsbaselines für KMU – BSI-konform',
  published_title = 'Hardening & Sicherheitsbaselines für KMU – BSI-konform',
  seo_title = 'Hardening & Sicherheitsbaselines für KMU – BSI | xKMU',
  published_seo_title = 'Hardening & Sicherheitsbaselines für KMU – BSI | xKMU',
  updated_at = now()
WHERE slug LIKE '/cybersecurity/c2-%';

UPDATE cms_blocks SET content =
  jsonb_set(jsonb_set(content,
    '{headline}',    '"Hardening & Sicherheitsbaselines für KMU – BSI-konform"'::jsonb),
    '{subheadline}', '"Wir härten Ihre Systeme nach klaren Baselines: M365, Endpoint, Server, Netzwerk. Dokumentiert, prüfbar, NIS-2-konform."'::jsonb)
WHERE block_type = 'hero'
  AND page_id IN (SELECT id FROM cms_pages WHERE slug LIKE '/cybersecurity/c2-%');

UPDATE cms_pages SET
  title = 'Backup & Ransomware-Schutz für KMU – mit Restore-Test',
  published_title = 'Backup & Ransomware-Schutz für KMU – mit Restore-Test',
  seo_title = 'Backup & Ransomware-Schutz für KMU – Restore-Test | xKMU',
  published_seo_title = 'Backup & Ransomware-Schutz für KMU – Restore-Test | xKMU',
  updated_at = now()
WHERE slug LIKE '/cybersecurity/c3-%';

UPDATE cms_blocks SET content =
  jsonb_set(jsonb_set(content,
    '{headline}',    '"Backup & Ransomware-Schutz für KMU – mit Restore-Test"'::jsonb),
    '{subheadline}', '"3-2-1-Backup-Konzept, immutable Copies, dokumentierte Restore-Tests, Wiederanlaufplan. Damit Sie im Ernstfall wirklich handlungsfähig sind — und es beweisen können."'::jsonb)
WHERE block_type = 'hero'
  AND page_id IN (SELECT id FROM cms_pages WHERE slug LIKE '/cybersecurity/c3-%');

UPDATE cms_pages SET
  title = 'Incident-Response für KMU – vorbereitet statt überrascht',
  published_title = 'Incident-Response für KMU – vorbereitet statt überrascht',
  seo_title = 'Incident-Response für KMU – Playbooks & Eskalation | xKMU',
  published_seo_title = 'Incident-Response für KMU – Playbooks & Eskalation | xKMU',
  updated_at = now()
WHERE slug LIKE '/cybersecurity/c4-%';

UPDATE cms_blocks SET content =
  jsonb_set(jsonb_set(content,
    '{headline}',    '"Incident-Response für KMU – vorbereitet statt überrascht"'::jsonb),
    '{subheadline}', '"Wir bauen Ihre Notfallorganisation: Playbooks, Eskalationswege, Kommunikationstemplates. Damit bei einem Vorfall jeder weiß, was zu tun ist."'::jsonb)
WHERE block_type = 'hero'
  AND page_id IN (SELECT id FROM cms_pages WHERE slug LIKE '/cybersecurity/c4-%');

UPDATE cms_pages SET
  title = 'Security-Awareness für KMU – Phishing-resistent durch Training',
  published_title = 'Security-Awareness für KMU – Phishing-resistent durch Training',
  seo_title = 'Security-Awareness für KMU – Phishing-Schutz | xKMU',
  published_seo_title = 'Security-Awareness für KMU – Phishing-Schutz | xKMU',
  updated_at = now()
WHERE slug LIKE '/cybersecurity/c5-%';

UPDATE cms_blocks SET content =
  jsonb_set(jsonb_set(content,
    '{headline}',    '"Security-Awareness für KMU – Phishing-resistent durch Training"'::jsonb),
    '{subheadline}', '"Realistische Phishing-Simulationen, kompakte Schulungen, messbare Klickraten. Nicht einmalig, sondern dauerhaft wirksam."'::jsonb)
WHERE block_type = 'hero'
  AND page_id IN (SELECT id FROM cms_pages WHERE slug LIKE '/cybersecurity/c5-%');

UPDATE cms_pages SET
  title = 'Datenschutz & DSGVO/NIS-2-Compliance für KMU',
  published_title = 'Datenschutz & DSGVO/NIS-2-Compliance für KMU',
  seo_title = 'Datenschutz & DSGVO/NIS-2-Compliance für KMU | xKMU',
  published_seo_title = 'Datenschutz & DSGVO/NIS-2-Compliance für KMU | xKMU',
  updated_at = now()
WHERE slug LIKE '/cybersecurity/c6-%';

UPDATE cms_blocks SET content =
  jsonb_set(jsonb_set(content,
    '{headline}',    '"Datenschutz & DSGVO/NIS-2-Compliance für KMU"'::jsonb),
    '{subheadline}', '"Pragmatische Datenschutz- und Compliance-Umsetzung: Verzeichnisse, TOM, Nachweise. Mit klarem Maßnahmenplan statt 200-Seiten-Konzept."'::jsonb)
WHERE block_type = 'hero'
  AND page_id IN (SELECT id FROM cms_pages WHERE slug LIKE '/cybersecurity/c6-%');

-- ─── Lösungen D1-D3 ─────────────────────────────────────────────────
UPDATE cms_pages SET
  title = 'KI sicher einführen – Kombi-Modul für KMU',
  published_title = 'KI sicher einführen – Kombi-Modul für KMU',
  seo_title = 'KI sicher einführen – Kombi-Modul für KMU | xKMU',
  published_seo_title = 'KI sicher einführen – Kombi-Modul für KMU | xKMU',
  updated_at = now()
WHERE slug LIKE '/loesungen/d1-%';

UPDATE cms_blocks SET content =
  jsonb_set(jsonb_set(content,
    '{headline}',    '"KI sicher einführen – Kombi-Modul für KMU"'::jsonb),
    '{subheadline}', '"Wenn KI, IT-Architektur und Security gemeinsam entstehen müssen: Use-Case-Auswahl, IT-Grundlagen und Guardrails in einem koordinierten Projekt. Ein Ansprechpartner, ein Festpreis."'::jsonb)
WHERE block_type = 'hero'
  AND page_id IN (SELECT id FROM cms_pages WHERE slug LIKE '/loesungen/d1-%');

UPDATE cms_pages SET
  title = 'Sicher automatisieren – Kombi-Modul für KMU',
  published_title = 'Sicher automatisieren – Kombi-Modul für KMU',
  seo_title = 'Sicher automatisieren – Kombi-Modul für KMU | xKMU',
  published_seo_title = 'Sicher automatisieren – Kombi-Modul für KMU | xKMU',
  updated_at = now()
WHERE slug LIKE '/loesungen/d2-%';

UPDATE cms_blocks SET content =
  jsonb_set(jsonb_set(content,
    '{headline}',    '"Sicher automatisieren – Kombi-Modul für KMU"'::jsonb),
    '{subheadline}', '"Automatisierung mit Sicherheit gedacht: Workflow-Implementierung plus Zugriffskontrolle, Audit-Logs, Berechtigungsmodell. Aufeinander abgestimmt, dokumentiert."'::jsonb)
WHERE block_type = 'hero'
  AND page_id IN (SELECT id FROM cms_pages WHERE slug LIKE '/loesungen/d2-%');

UPDATE cms_pages SET
  title = 'Incident-ready Organisation – Kombi-Modul für KMU',
  published_title = 'Incident-ready Organisation – Kombi-Modul für KMU',
  seo_title = 'Incident-ready Organisation – Kombi-Modul KMU | xKMU',
  published_seo_title = 'Incident-ready Organisation – Kombi-Modul KMU | xKMU',
  updated_at = now()
WHERE slug LIKE '/loesungen/d3-%';

UPDATE cms_blocks SET content =
  jsonb_set(jsonb_set(content,
    '{headline}',    '"Incident-ready Organisation – Kombi-Modul für KMU"'::jsonb),
    '{subheadline}', '"Backup, Incident-Response und Krisenkommunikation als geschlossenes Paket: nicht nur Tools, sondern eine Organisation, die einen Vorfall übersteht."'::jsonb)
WHERE block_type = 'hero'
  AND page_id IN (SELECT id FROM cms_pages WHERE slug LIKE '/loesungen/d3-%');

-- ─── Published-Snapshot Rebuild ─────────────────────────────────────
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
