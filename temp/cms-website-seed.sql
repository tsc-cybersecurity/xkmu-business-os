-- ============================================================================
-- CMS Website Seed – xKMU Webseitentexte
-- Generated from src/lib/db/seeds/cms-website-seed.ts
--
-- Seeds all 25 public pages with their blocks.
-- Self-contained PL/pgSQL DO block wrapped in a transaction.
-- ============================================================================

BEGIN;

DO $$
DECLARE
  v_tenant_id uuid;
  v_page_id   uuid;
  v_now       timestamptz := now();
  v_blocks    jsonb;
BEGIN
  -- ── Get first tenant ──────────────────────────────────────────────────────
  SELECT id INTO v_tenant_id FROM tenants LIMIT 1;
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'No tenant found. Create a tenant first.';
  END IF;

  -- ── Remove obsolete pages ─────────────────────────────────────────────────
  DELETE FROM cms_pages
   WHERE tenant_id = v_tenant_id
     AND slug IN ('/ki-automation', '/it-consulting', '/cyber-security');

  -- ========================================================================
  -- 1. STARTSEITE  /
  -- ========================================================================
  DELETE FROM cms_pages WHERE tenant_id = v_tenant_id AND slug = '/';

  INSERT INTO cms_pages (tenant_id, slug, title, seo_title, seo_description, status, published_at, created_at, updated_at)
  VALUES (v_tenant_id, '/', 'Startseite',
          'xKMU – KI · IT · Cybersecurity für den Mittelstand',
          'xKMU digital solutions bringt KI-Automatisierung, stabile IT und echte Sicherheit in Ihr Unternehmen.',
          'published', v_now, v_now, v_now)
  RETURNING id INTO v_page_id;

  -- Block 0: hero
  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'hero', 0,
    '{"badge":{"text":"KI · IT · Cybersecurity aus einer Hand"},"headline":"Weniger Aufwand. Mehr Ergebnis.","headlineHighlight":"Moderne IT für Ihr Unternehmen.","subheadline":"xKMU digital solutions bringt KI-Automatisierung, stabile IT und echte Sicherheit in Ihr Unternehmen – keine Berater-Folien, sondern Ergebnisse, die laufen.","buttons":[{"label":"Kostenloses Erstgespräch buchen","href":"/kontakt","variant":"default"},{"label":"Alle Leistungen ansehen","href":"#leistungen","variant":"outline"}],"stats":[{"value":"3","label":"Beratungssäulen"},{"value":"18","label":"Service-Module"},{"value":"52","label":"konkrete Deliverables"},{"value":"ab 490 €","label":"Starter-Paket (Festpreis)"}],"size":"full"}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  -- Block 1: banner
  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'banner', 1,
    '{"text":"NIS-2 trifft Ihre Kunden – und damit auch Sie. Seit Dezember 2025 gilt das neue BSIG. NIS-2-pflichtige Unternehmen müssen Sicherheitsanforderungen an ihre Dienstleister weitergeben. xKMU hilft Ihnen, diese Anforderungen pragmatisch und nachweisbar zu erfüllen.","variant":"warning","icon":"AlertTriangle","buttonLabel":"NIS-2 Compliance ansehen","buttonHref":"/cybersecurity"}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  -- Block 2: features (Drei Säulen)
  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'features', 2,
    '{"sectionTitle":"Drei Säulen. Ein Ansprechpartner.","sectionSubtitle":"Kein Flickenteppich aus Einzelberatern. xKMU verbindet KI, IT und Sicherheit – abgestimmt auf die Realität kleiner und mittlerer Unternehmen.","columns":3,"items":[{"icon":"Bot","title":"KI-Beratung","description":"Von der Potenzialanalyse bis zur laufenden Automation. Wir identifizieren, wo KI wirklich hilft, setzen es um und befähigen Ihr Team – ohne KI-Wildwuchs, sondern mit klaren Regeln.","link":"/ki-beratung"},{"icon":"Monitor","title":"IT-Beratung","description":"Stabile, sichere und skalierbare IT – vom Arbeitsplatz bis zur Cloud-Infrastruktur. Mit Fokus auf Betriebssicherheit, Skalierbarkeit und Kostenkontrolle.","link":"/it-beratung"},{"icon":"Shield","title":"Cybersecurity-Beratung","description":"Angriffsflächen reduzieren, Vorfälle abwehren, NIS-2 und DSGVO technisch umsetzen. Pragmatisch – nicht nach Lehrbuch, sondern nach Risikolage.","link":"/cybersecurity"}]}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  -- Block 3: service-cards (18 Module)
  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'service-cards', 3,
    '{"sectionTitle":"Was Sie konkret erhalten","sectionSubtitle":"Jedes Modul liefert definierte Ergebnisse – keine vagen Empfehlungen, sondern Dokumente, Systeme und Prozesse, die direkt einsetzbar sind.","columns":3,"items":[{"badge":"A1","title":"KI-Quick-Start & Potenzialanalyse","href":"/ki-beratung/a1","deliverables":[{"label":"3 Deliverables","color":"purple"}]},{"badge":"A2","title":"KI-Implementierung – Automationen & Workflows","href":"/ki-beratung/a2","deliverables":[{"label":"3 Deliverables","color":"purple"}]},{"badge":"A3","title":"KI-Assistenten & Chatbots","href":"/ki-beratung/a3","deliverables":[{"label":"3 Deliverables","color":"purple"}]},{"badge":"A4","title":"Prompting, Templates & Governance","href":"/ki-beratung/a4","deliverables":[{"label":"2 Deliverables","color":"purple"}]},{"badge":"A5","title":"KI-Schulungen & Enablement","href":"/ki-beratung/a5","deliverables":[{"label":"2 Deliverables","color":"purple"}]},{"badge":"B1","title":"IT-Assessment & Stabilitätscheck","href":"/it-beratung/b1","deliverables":[{"label":"2 Deliverables","color":"blue"}]},{"badge":"B2","title":"IT-Architektur & Modernisierung","href":"/it-beratung/b2","deliverables":[{"label":"3 Deliverables","color":"blue"}]},{"badge":"B3","title":"Systemintegration & Prozess-IT","href":"/it-beratung/b3","deliverables":[{"label":"2 Deliverables","color":"blue"}]},{"badge":"B4","title":"Betrieb, Monitoring & Dokumentation","href":"/it-beratung/b4","deliverables":[{"label":"3 Deliverables","color":"blue"}]},{"badge":"B5","title":"IT-Standardisierung & Arbeitsplatz-IT","href":"/it-beratung/b5","deliverables":[{"label":"2 Deliverables","color":"blue"}]},{"badge":"C1","title":"Security Quick Check","href":"/cybersecurity/c1","deliverables":[{"label":"3 Deliverables","color":"green"}]},{"badge":"C2","title":"Hardening & Sicherheitsbaselines","href":"/cybersecurity/c2","deliverables":[{"label":"2 Deliverables","color":"green"}]},{"badge":"C3","title":"Backup, Recovery & Ransomware-Resilienz","href":"/cybersecurity/c3","deliverables":[{"label":"3 Deliverables","color":"green"}]},{"badge":"C4","title":"Incident Response & Playbooks","href":"/cybersecurity/c4","deliverables":[{"label":"2 Deliverables","color":"green"}]},{"badge":"C5","title":"Security Awareness & Phishing-Schutz","href":"/cybersecurity/c5","deliverables":[{"label":"2 Deliverables","color":"green"}]},{"badge":"C6","title":"Datenschutz- & Compliance-Unterstützung","href":"/cybersecurity/c6","deliverables":[{"label":"2 Deliverables","color":"green"}]}]}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  -- Block 4: features (Kombinations-Module)
  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'features', 4,
    '{"sectionTitle":"KI + IT + Security – aus einer Hand","sectionSubtitle":"Drei Kombinations-Module, die bewusst Bereichsgrenzen überwinden. Was einzelne Berater nie leisten können.","columns":3,"items":[{"icon":"Sparkles","title":"D1 – KI sicher einführen","description":"KI + Security – gemeinsam, nicht nacheinander.","link":"/loesungen/d1"},{"icon":"Cog","title":"D2 – Sicher automatisieren","description":"IT + Security – Automationen die kontrolliert laufen.","link":"/loesungen/d2"},{"icon":"ShieldAlert","title":"D3 – Incident-ready Organisation","description":"IT + KI + Security – Gesamtpaket Notfallbereitschaft.","link":"/loesungen/d3"}]}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  -- Block 5: cta
  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'cta', 5,
    '{"headline":"Bereit für den ersten Schritt?","description":"30 Minuten kostenlose Erstberatung – kein Verkaufsgespräch, sondern echter Nutzen. Sie schildern Ihre Situation, wir zeigen, was sinnvoll ist.","buttons":[{"label":"Erstgespräch buchen","href":"/kontakt","variant":"default"},{"label":"Nachricht schreiben","href":"/kontakt","variant":"outline"}]}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  -- Update published_blocks for Startseite
  SELECT jsonb_agg(jsonb_build_object('id', b.id, 'blockType', b.block_type, 'sortOrder', b.sort_order, 'content', b.content, 'settings', b.settings, 'isVisible', b.is_visible) ORDER BY b.sort_order)
    INTO v_blocks
    FROM cms_blocks b
   WHERE b.page_id = v_page_id;

  UPDATE cms_pages SET published_blocks = v_blocks, has_draft_changes = false, published_title = title, published_seo_title = seo_title, published_seo_description = seo_description WHERE id = v_page_id;


  -- ========================================================================
  -- 2. PILLAR: /ki-beratung
  -- ========================================================================
  DELETE FROM cms_pages WHERE tenant_id = v_tenant_id AND slug = '/ki-beratung';

  INSERT INTO cms_pages (tenant_id, slug, title, seo_title, seo_description, status, published_at, created_at, updated_at)
  VALUES (v_tenant_id, '/ki-beratung', 'KI-Beratung',
          'KI-Beratung | xKMU',
          'Von der Potenzialanalyse bis zur laufenden Automation. Wir identifizieren, wo KI wirklich hilft, setzen es um und befähigen Ihr Team.',
          'published', v_now, v_now, v_now)
  RETURNING id INTO v_page_id;

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'hero', 0,
    '{"badge":{"icon":"Bot","text":"Artificial Intelligence & Automatisierung"},"headline":"KI-Beratung","subheadline":"Von der Potenzialanalyse bis zur laufenden Automation. Wir identifizieren, wo KI wirklich hilft, setzen es um und befähigen Ihr Team – ohne KI-Wildwuchs, sondern mit klaren Regeln.","size":"medium"}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'service-cards', 1,
    '{"sectionTitle":"Was Sie konkret erhalten","sectionSubtitle":"Alle Module","columns":2,"items":[{"badge":"A1","title":"KI-Quick-Start & Potenzialanalyse","description":"Use-Cases finden und priorisieren","href":"/ki-beratung/a1","deliverables":[{"label":"Use-Case-Backlog","color":"blue"},{"label":"KI-Roadmap","color":"blue"},{"label":"Leitplanken (Guardrails)","color":"blue"}]},{"badge":"A2","title":"KI-Implementierung – Automationen & Workflows","description":"Routinen automatisieren, Fehler reduzieren","href":"/ki-beratung/a2","deliverables":[{"label":"Laufende Automationen","color":"blue"},{"label":"Testprotokolle","color":"blue"},{"label":"Nutzerdokumentation","color":"blue"}]},{"badge":"A3","title":"KI-Assistenten & Chatbots","description":"Eigene Assistenten aufbauen und betreiben","href":"/ki-beratung/a3","deliverables":[{"label":"Bot-Setup + Blueprint","color":"blue"},{"label":"Gesprächsleitfäden","color":"blue"},{"label":"KPI-Set","color":"blue"}]},{"badge":"A4","title":"Prompting, Templates & Governance","description":"KI einheitlich und sicher im Team nutzen","href":"/ki-beratung/a4","deliverables":[{"label":"Prompt-Playbook","color":"blue"},{"label":"Governance-Kit","color":"blue"}]},{"badge":"A5","title":"KI-Schulungen & Enablement","description":"Teams befähigen – nachhaltig","href":"/ki-beratung/a5","deliverables":[{"label":"Schulungsunterlagen","color":"blue"},{"label":"Checklisten","color":"blue"}]}]}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'cta', 2,
    '{"headline":"Passt etwas davon zu Ihrer Situation?","description":"Im kostenlosen Erstgespräch klären wir, welches Modul den größten Hebel hat.","buttons":[{"label":"Erstgespräch buchen","href":"/kontakt","variant":"default"}]}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  SELECT jsonb_agg(jsonb_build_object('id', b.id, 'blockType', b.block_type, 'sortOrder', b.sort_order, 'content', b.content, 'settings', b.settings, 'isVisible', b.is_visible) ORDER BY b.sort_order) INTO v_blocks FROM cms_blocks b WHERE b.page_id = v_page_id;
  UPDATE cms_pages SET published_blocks = v_blocks, has_draft_changes = false, published_title = title, published_seo_title = seo_title, published_seo_description = seo_description WHERE id = v_page_id;


  -- ========================================================================
  -- 3. PILLAR: /it-beratung
  -- ========================================================================
  DELETE FROM cms_pages WHERE tenant_id = v_tenant_id AND slug = '/it-beratung';

  INSERT INTO cms_pages (tenant_id, slug, title, seo_title, seo_description, status, published_at, created_at, updated_at)
  VALUES (v_tenant_id, '/it-beratung', 'IT-Beratung',
          'IT-Beratung | xKMU',
          'Stabile, sichere und skalierbare IT – vom Arbeitsplatz bis zur Cloud-Infrastruktur. Mit Fokus auf Betriebssicherheit, Skalierbarkeit und Kostenkontrolle.',
          'published', v_now, v_now, v_now)
  RETURNING id INTO v_page_id;

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'hero', 0,
    '{"badge":{"icon":"Monitor","text":"Infrastruktur, Betrieb & Modernisierung"},"headline":"IT-Beratung","subheadline":"Stabile, sichere und skalierbare IT – vom Arbeitsplatz bis zur Cloud-Infrastruktur. Mit Fokus auf Betriebssicherheit, Skalierbarkeit und Kostenkontrolle.","size":"medium"}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'service-cards', 1,
    '{"sectionTitle":"Was Sie konkret erhalten","sectionSubtitle":"Alle Module","columns":2,"items":[{"badge":"B1","title":"IT-Assessment & Stabilitätscheck","description":"Klarheit über Zustand, Risiken und Quick-Fixes","href":"/it-beratung/b1","deliverables":[{"label":"IT-Health-Report","color":"blue"},{"label":"Maßnahmenplan","color":"blue"}]},{"badge":"B2","title":"IT-Architektur & Modernisierung","description":"Cloud, Hybrid, M365 – zukunftsfähig planen","href":"/it-beratung/b2","deliverables":[{"label":"Zielbild + Diagramme","color":"blue"},{"label":"Migrations-Roadmap","color":"blue"},{"label":"Runbooks","color":"blue"}]},{"badge":"B3","title":"Systemintegration & Prozess-IT","description":"Systeme verbinden, Medienbrüche beseitigen","href":"/it-beratung/b3","deliverables":[{"label":"Integrierte Prozesse","color":"blue"},{"label":"Betriebs-/Nutzerdoku","color":"blue"}]},{"badge":"B4","title":"Betrieb, Monitoring & Dokumentation","description":"Weniger Ausfälle, schnellere Fehlerbehebung","href":"/it-beratung/b4","deliverables":[{"label":"Monitoring-Plan","color":"blue"},{"label":"Runbooks","color":"blue"},{"label":"Wiederanlaufplan","color":"blue"}]},{"badge":"B5","title":"IT-Standardisierung & Arbeitsplatz-IT","description":"Einheitliche Arbeitsplätze, weniger Supportaufwand","href":"/it-beratung/b5","deliverables":[{"label":"Standardkonzept","color":"blue"},{"label":"On-/Offboarding-Prozess","color":"blue"}]}]}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'cta', 2,
    '{"headline":"Passt etwas davon zu Ihrer Situation?","description":"Im kostenlosen Erstgespräch klären wir, welches Modul den größten Hebel hat.","buttons":[{"label":"Erstgespräch buchen","href":"/kontakt","variant":"default"}]}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  SELECT jsonb_agg(jsonb_build_object('id', b.id, 'blockType', b.block_type, 'sortOrder', b.sort_order, 'content', b.content, 'settings', b.settings, 'isVisible', b.is_visible) ORDER BY b.sort_order) INTO v_blocks FROM cms_blocks b WHERE b.page_id = v_page_id;
  UPDATE cms_pages SET published_blocks = v_blocks, has_draft_changes = false, published_title = title, published_seo_title = seo_title, published_seo_description = seo_description WHERE id = v_page_id;


  -- ========================================================================
  -- 4. PILLAR: /cybersecurity
  -- ========================================================================
  DELETE FROM cms_pages WHERE tenant_id = v_tenant_id AND slug = '/cybersecurity';

  INSERT INTO cms_pages (tenant_id, slug, title, seo_title, seo_description, status, published_at, created_at, updated_at)
  VALUES (v_tenant_id, '/cybersecurity', 'Cybersecurity-Beratung',
          'Cybersecurity-Beratung | xKMU',
          'Angriffsflächen reduzieren, Vorfälle abwehren, NIS-2 und DSGVO technisch umsetzen. Pragmatisch – nicht nach Lehrbuch, sondern nach Risikolage.',
          'published', v_now, v_now, v_now)
  RETURNING id INTO v_page_id;

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'hero', 0,
    '{"badge":{"icon":"Shield","text":"Schutz, Resilienz & Compliance"},"headline":"Cybersecurity-Beratung","subheadline":"Angriffsflächen reduzieren, Vorfälle abwehren, NIS-2 und DSGVO technisch umsetzen. Pragmatisch – nicht nach Lehrbuch, sondern nach Risikolage.","size":"medium"}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'service-cards', 1,
    '{"sectionTitle":"Was Sie konkret erhalten","sectionSubtitle":"Alle Module","columns":2,"items":[{"badge":"C1","title":"Security Quick Check","description":"Top-Risiken schnell sichtbar machen","href":"/cybersecurity/c1","deliverables":[{"label":"Risiko-Heatmap","color":"blue"},{"label":"Maßnahmenkatalog","color":"blue"},{"label":"Sofortmaßnahmenliste","color":"blue"}]},{"badge":"C2","title":"Hardening & Sicherheitsbaselines","description":"Angriffsfläche systematisch reduzieren","href":"/cybersecurity/c2","deliverables":[{"label":"Baseline-Konzept","color":"blue"},{"label":"Änderungsdokumentation","color":"blue"}]},{"badge":"C3","title":"Backup, Recovery & Ransomware-Resilienz","description":"Im Ernstfall wirklich handlungsfähig sein","href":"/cybersecurity/c3","deliverables":[{"label":"Backup-/Recovery-Konzept","color":"blue"},{"label":"Restore-Testprotokolle","color":"blue"},{"label":"Wiederanlaufplan","color":"blue"}]},{"badge":"C4","title":"Incident Response & Playbooks","description":"Klarer Plan für jeden Notfall","href":"/cybersecurity/c4","deliverables":[{"label":"IR-Handbuch","color":"blue"},{"label":"Playbook-Sammlung","color":"blue"}]},{"badge":"C5","title":"Security Awareness & Phishing-Schutz","description":"Mitarbeiter als Schutzschild – ohne Schulungsfolter","href":"/cybersecurity/c5","deliverables":[{"label":"Schulungsunterlagen","color":"blue"},{"label":"Sicherheitsregeln","color":"blue"}]},{"badge":"C6","title":"Datenschutz- & Compliance-Unterstützung","description":"DSGVO und NIS-2 technisch umsetzen","href":"/cybersecurity/c6","deliverables":[{"label":"TOM-Umsetzungsnachweis","color":"blue"},{"label":"Audit-Dokumentationspaket","color":"blue"}]}]}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'cta', 2,
    '{"headline":"Passt etwas davon zu Ihrer Situation?","description":"Im kostenlosen Erstgespräch klären wir, welches Modul den größten Hebel hat.","buttons":[{"label":"Erstgespräch buchen","href":"/kontakt","variant":"default"}]}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  SELECT jsonb_agg(jsonb_build_object('id', b.id, 'blockType', b.block_type, 'sortOrder', b.sort_order, 'content', b.content, 'settings', b.settings, 'isVisible', b.is_visible) ORDER BY b.sort_order) INTO v_blocks FROM cms_blocks b WHERE b.page_id = v_page_id;
  UPDATE cms_pages SET published_blocks = v_blocks, has_draft_changes = false, published_title = title, published_seo_title = seo_title, published_seo_description = seo_description WHERE id = v_page_id;


  -- ========================================================================
  -- 5. PILLAR: /loesungen
  -- ========================================================================
  DELETE FROM cms_pages WHERE tenant_id = v_tenant_id AND slug = '/loesungen';

  INSERT INTO cms_pages (tenant_id, slug, title, seo_title, seo_description, status, published_at, created_at, updated_at)
  VALUES (v_tenant_id, '/loesungen', 'Kombinations-Module',
          'Kombinations-Module | xKMU',
          'KI + IT + Security aus einer Hand. Drei Module, die bewusst Bereichsgrenzen überwinden.',
          'published', v_now, v_now, v_now)
  RETURNING id INTO v_page_id;

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'hero', 0,
    '{"badge":{"icon":"Zap","text":"KI + IT + Security aus einer Hand"},"headline":"Kombinations-Module","subheadline":"Drei Module, die bewusst Bereichsgrenzen überwinden. Was einzelne Berater nie leisten können: KI, IT und Security gleichzeitig, aufeinander abgestimmt.","size":"medium"}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'service-cards', 1,
    '{"sectionTitle":"Was Sie konkret erhalten","sectionSubtitle":"Alle Module","columns":2,"items":[{"badge":"D1","title":"KI sicher einführen","description":"KI + Security – gemeinsam, nicht nacheinander","href":"/loesungen/d1","deliverables":[{"label":"KI-Nutzungsrichtlinie","color":"blue"},{"label":"Datenklassifikation","color":"blue"},{"label":"Prompt-Standards","color":"blue"},{"label":"Schnittstellenabsicherung","color":"blue"}]},{"badge":"D2","title":"Sicher automatisieren","description":"IT + Security – Automationen die kontrolliert laufen","href":"/loesungen/d2","deliverables":[{"label":"Dokumentierte Automationen","color":"blue"},{"label":"Sicherheitskonzept","color":"blue"},{"label":"Wartungskonzept","color":"blue"}]},{"badge":"D3","title":"Incident-ready Organisation","description":"IT + KI + Security – Gesamtpaket Notfallbereitschaft","href":"/loesungen/d3","deliverables":[{"label":"IT-Betrieb + Backup + IR","color":"blue"},{"label":"Awareness + Meldewege","color":"blue"},{"label":"Review-Meeting-Konzept","color":"blue"}]}]}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'cta', 2,
    '{"headline":"Passt etwas davon zu Ihrer Situation?","description":"Im kostenlosen Erstgespräch klären wir, welches Modul den größten Hebel hat.","buttons":[{"label":"Erstgespräch buchen","href":"/kontakt","variant":"default"}]}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  SELECT jsonb_agg(jsonb_build_object('id', b.id, 'blockType', b.block_type, 'sortOrder', b.sort_order, 'content', b.content, 'settings', b.settings, 'isVisible', b.is_visible) ORDER BY b.sort_order) INTO v_blocks FROM cms_blocks b WHERE b.page_id = v_page_id;
  UPDATE cms_pages SET published_blocks = v_blocks, has_draft_changes = false, published_title = title, published_seo_title = seo_title, published_seo_description = seo_description WHERE id = v_page_id;


  -- ========================================================================
  -- 6. MODULE DETAIL: /ki-beratung/a1
  -- ========================================================================
  DELETE FROM cms_pages WHERE tenant_id = v_tenant_id AND slug = '/ki-beratung/a1';

  INSERT INTO cms_pages (tenant_id, slug, title, seo_title, seo_description, status, published_at, created_at, updated_at)
  VALUES (v_tenant_id, '/ki-beratung/a1', 'KI-Quick-Start & Potenzialanalyse',
          'A1 – KI-Quick-Start & Potenzialanalyse | xKMU',
          'Gemeinsam erfassen wir Ihre Abläufe, identifizieren Zeitfresser und bewerten konkrete KI-Anwendungsfälle nach Machbarkeit, Nutzen und Risiko.',
          'published', v_now, v_now, v_now)
  RETURNING id INTO v_page_id;

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'hero', 0,
    '{"badge":{"text":"Modul A1 · KI-Beratung"},"headline":"KI-Quick-Start & Potenzialanalyse","headlineHighlight":"","subheadline":"Use-Cases finden und priorisieren","size":"small"}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'text', 1,
    '{"content":"Viele Unternehmen wissen, dass KI helfen könnte – aber nicht wo und wie. Die Potenzialanalyse schafft in kurzer Zeit Klarheit: Gemeinsam erfassen wir Ihre Abläufe, identifizieren Zeitfresser und Engpässe und bewerten konkrete KI-Anwendungsfälle nach Machbarkeit, Nutzen, Datenlage und Risiko. Das Ergebnis ist eine priorisierte Liste mit Quick-Wins und einer realistischen Roadmap für die nächsten 30, 60 und 90 Tage.","alignment":"left"}'::jsonb,
    '{"maxWidth":768,"paddingBottom":0}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'banner', 2,
    '{"text":"In kurzer Zeit herausfinden, wo KI wirklich lohnt – und was zuerst umgesetzt wird.","variant":"brand","icon":"Target"}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'service-cards', 3,
    '{"sectionTitle":"Konkrete Ergebnisse – keine Folien","sectionSubtitle":"Was Sie erhalten","columns":2,"items":[{"badge":"A1-1","title":"Use-Case-Backlog + Priorisierung","description":"Sie erhalten eine übersichtliche, strukturierte Liste aller KI-Möglichkeiten, die wir gemeinsam in Ihrem Unternehmen identifiziert haben – sortiert nach dem, was wirklich etwas bringt. Jeder Eintrag zeigt klar, welchen Nutzen Sie erwarten können, wie aufwändig die Umsetzung ist und wo das größte Potenzial liegt."},{"badge":"A1-2","title":"KI-Roadmap + Aufwand/Nutzen-Schätzung","description":"Ihr persönlicher Fahrplan für die nächsten 30, 60 und 90 Tage – sowie ein Ausblick auf sechs Monate. Die Roadmap zeigt, was wann umgesetzt wird, wie viel Zeit und Budget Sie dafür einplanen sollten und welche Verbesserungen Sie konkret erwarten können."},{"badge":"A1-3","title":"Leitplanken (Guardrails)","description":"Dieses Dokument legt fest, welche Daten in KI-Systeme eingegeben werden dürfen und welche nicht, wer was freigeben muss und wie die Qualität sichergestellt wird. Ein kurzes, praxisnah formuliertes Regelwerk, das Ihre Mitarbeiter tatsächlich verstehen und einhalten können."}]}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'cta', 4,
    '{"headline":"Interesse an Modul A1?","description":"In einem kostenlosen Erstgespräch zeigen wir, wie dieses Modul konkret in Ihrer Situation helfen kann – ohne Verpflichtung.","buttons":[{"label":"Erstgespräch buchen","href":"/kontakt","variant":"default"},{"label":"Zurück zur Übersicht","href":"/ki-beratung","variant":"outline"}]}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  SELECT jsonb_agg(jsonb_build_object('id', b.id, 'blockType', b.block_type, 'sortOrder', b.sort_order, 'content', b.content, 'settings', b.settings, 'isVisible', b.is_visible) ORDER BY b.sort_order) INTO v_blocks FROM cms_blocks b WHERE b.page_id = v_page_id;
  UPDATE cms_pages SET published_blocks = v_blocks, has_draft_changes = false, published_title = title, published_seo_title = seo_title, published_seo_description = seo_description WHERE id = v_page_id;


  -- ========================================================================
  -- 7. MODULE DETAIL: /ki-beratung/a2
  -- ========================================================================
  DELETE FROM cms_pages WHERE tenant_id = v_tenant_id AND slug = '/ki-beratung/a2';

  INSERT INTO cms_pages (tenant_id, slug, title, seo_title, seo_description, status, published_at, created_at, updated_at)
  VALUES (v_tenant_id, '/ki-beratung/a2', 'KI-Implementierung – Automationen & Workflows',
          'A2 – KI-Implementierung | xKMU',
          'Aus der Potenzialanalyse werden echte Lösungen. Wir bauen Automationen, die tatsächlich laufen.',
          'published', v_now, v_now, v_now)
  RETURNING id INTO v_page_id;

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'hero', 0,
    '{"badge":{"text":"Modul A2 · KI-Beratung"},"headline":"KI-Implementierung – Automationen & Workflows","headlineHighlight":"","subheadline":"Routinen automatisieren, Fehler reduzieren","size":"small"}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'text', 1,
    '{"content":"Aus der Potenzialanalyse (A1) werden hier echte Lösungen. Wir bauen Automationen, die tatsächlich laufen: E-Mail-Sortierung, Lead-Qualifizierung, Dokumentenverarbeitung, Content-Produktion. Jede Automation wird vollständig getestet, mit Fehlerhandling ausgestattet und so dokumentiert, dass Ihr Team sie selbst warten kann.","alignment":"left"}'::jsonb,
    '{"maxWidth":768,"paddingBottom":0}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'banner', 2,
    '{"text":"Wiederkehrende Arbeit reduzieren, Fehler vermeiden, Durchlaufzeiten verkürzen.","variant":"brand","icon":"Target"}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'service-cards', 3,
    '{"sectionTitle":"Konkrete Ergebnisse – keine Folien","sectionSubtitle":"Was Sie erhalten","columns":2,"items":[{"badge":"A2-1","title":"Laufende Automationen inkl. Dokumentation","description":"Die vereinbarten Automatisierungen sind fertig eingerichtet und laufen. Sie erhalten dazu eine vollständige Dokumentation: Was genau passiert wann, welche Systeme miteinander verbunden sind, wie Fehler erkannt und behandelt werden."},{"badge":"A2-2","title":"Testprotokolle + Betriebshinweise","description":"Bevor eine Automation live geht, testen wir sie gründlich. Sie erhalten ein klares Protokoll sowie praktische Betriebshinweise: Was tun, wenn etwas nicht funktioniert? Wo schaue ich zuerst nach?"},{"badge":"A2-3","title":"Bedien- und Nutzerdokumentation","description":"Eine Anleitung, die wirklich jeder versteht – ohne IT-Vorkenntnisse. Ihre Mitarbeiter erfahren, was die neue Automation macht und wie sie Probleme melden."}]}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'cta', 4,
    '{"headline":"Interesse an Modul A2?","description":"In einem kostenlosen Erstgespräch zeigen wir, wie dieses Modul konkret in Ihrer Situation helfen kann – ohne Verpflichtung.","buttons":[{"label":"Erstgespräch buchen","href":"/kontakt","variant":"default"},{"label":"Zurück zur Übersicht","href":"/ki-beratung","variant":"outline"}]}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  SELECT jsonb_agg(jsonb_build_object('id', b.id, 'blockType', b.block_type, 'sortOrder', b.sort_order, 'content', b.content, 'settings', b.settings, 'isVisible', b.is_visible) ORDER BY b.sort_order) INTO v_blocks FROM cms_blocks b WHERE b.page_id = v_page_id;
  UPDATE cms_pages SET published_blocks = v_blocks, has_draft_changes = false, published_title = title, published_seo_title = seo_title, published_seo_description = seo_description WHERE id = v_page_id;


  -- ========================================================================
  -- 8. MODULE DETAIL: /ki-beratung/a3
  -- ========================================================================
  DELETE FROM cms_pages WHERE tenant_id = v_tenant_id AND slug = '/ki-beratung/a3';

  INSERT INTO cms_pages (tenant_id, slug, title, seo_title, seo_description, status, published_at, created_at, updated_at)
  VALUES (v_tenant_id, '/ki-beratung/a3', 'KI-Assistenten & Chatbots',
          'A3 – KI-Assistenten & Chatbots | xKMU',
          'Wir richten Ihren KI-Assistenten vollständig ein: Intents, Wissensquellen, Eskalationslogik und Analytics.',
          'published', v_now, v_now, v_now)
  RETURNING id INTO v_page_id;

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'hero', 0,
    '{"badge":{"text":"Modul A3 · KI-Beratung"},"headline":"KI-Assistenten & Chatbots","headlineHighlight":"","subheadline":"Eigene Assistenten aufbauen und betreiben","size":"small"}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'text', 1,
    '{"content":"Ein KI-Assistent ist nur so gut wie seine Wissensgrundlage und seine Grenzen. Wir richten Ihren Assistenten vollständig ein: Intents definieren, Wissensquellen strukturieren, Eskalationslogik einbauen und Analytics aktivieren. Sie erhalten einen Assistenten, der das beantwortet, was er beantworten soll – und weiß, wann er einen Menschen einschalten muss.","alignment":"left"}'::jsonb,
    '{"maxWidth":768,"paddingBottom":0}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'banner', 2,
    '{"text":"Schnellere Antworten, konsistente Kommunikation, weniger Supportlast.","variant":"brand","icon":"Target"}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'service-cards', 3,
    '{"sectionTitle":"Konkrete Ergebnisse – keine Folien","sectionSubtitle":"Was Sie erhalten","columns":2,"items":[{"badge":"A3-1","title":"Bot-Setup + Wissensbasis-Blueprint","description":"Vollständig eingerichtetes Bot-System inklusive konfigurierter Wissensquellen, Intents, Tonalitätsvorgaben und Grenzen. Der Blueprint beschreibt die Struktur der Wissensdatenbank für spätere Pflege."},{"badge":"A3-2","title":"Gesprächsleitfäden & Eskalationslogik","description":"Alle Gesprächspfade des Bots sind dokumentiert: Standardantworten, Übergabepunkte an einen Menschen, Weiterleitungsregeln. Sie behalten immer die Kontrolle."},{"badge":"A3-3","title":"KPI-Set (Erfolgsmessung)","description":"Wie gut läuft Ihr Assistent wirklich? Das KPI-Set zeigt Deflection Rate, Nutzerzufriedenheit und häufige Abbruchpunkte – mit Erklärung, wie Sie diese regelmäßig abrufen."}]}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'cta', 4,
    '{"headline":"Interesse an Modul A3?","description":"In einem kostenlosen Erstgespräch zeigen wir, wie dieses Modul konkret in Ihrer Situation helfen kann – ohne Verpflichtung.","buttons":[{"label":"Erstgespräch buchen","href":"/kontakt","variant":"default"},{"label":"Zurück zur Übersicht","href":"/ki-beratung","variant":"outline"}]}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  SELECT jsonb_agg(jsonb_build_object('id', b.id, 'blockType', b.block_type, 'sortOrder', b.sort_order, 'content', b.content, 'settings', b.settings, 'isVisible', b.is_visible) ORDER BY b.sort_order) INTO v_blocks FROM cms_blocks b WHERE b.page_id = v_page_id;
  UPDATE cms_pages SET published_blocks = v_blocks, has_draft_changes = false, published_title = title, published_seo_title = seo_title, published_seo_description = seo_description WHERE id = v_page_id;


  -- ========================================================================
  -- 9. MODULE DETAIL: /ki-beratung/a4
  -- ========================================================================
  DELETE FROM cms_pages WHERE tenant_id = v_tenant_id AND slug = '/ki-beratung/a4';

  INSERT INTO cms_pages (tenant_id, slug, title, seo_title, seo_description, status, published_at, created_at, updated_at)
  VALUES (v_tenant_id, '/ki-beratung/a4', 'Prompting, Templates & Governance',
          'A4 – Prompting, Templates & Governance | xKMU',
          'Rollenbasierte Prompt-Bibliothek, fertige Templates und ein Governance-Kit für den sicheren KI-Einsatz im Team.',
          'published', v_now, v_now, v_now)
  RETURNING id INTO v_page_id;

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'hero', 0,
    '{"badge":{"text":"Modul A4 · KI-Beratung"},"headline":"Prompting, Templates & Governance","headlineHighlight":"","subheadline":"KI einheitlich und sicher im Team nutzen","size":"small"}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'text', 1,
    '{"content":"Ohne Struktur wird KI im Unternehmen zum Wildwuchs: Jeder nutzt andere Tools, andere Prompts, andere Qualitätsstandards. Wir lösen das mit einer rollenbasierten Prompt-Bibliothek, fertigen Templates für wiederkehrende Aufgaben und einem Governance-Kit, das klar regelt, wer was nutzen darf und wie Outputs freigegeben werden.","alignment":"left"}'::jsonb,
    '{"maxWidth":768,"paddingBottom":0}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'banner', 2,
    '{"text":"Einheitliche Qualität, weniger Risiko, schnellere Ergebnisse im Team.","variant":"brand","icon":"Target"}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'service-cards', 3,
    '{"sectionTitle":"Konkrete Ergebnisse – keine Folien","sectionSubtitle":"Was Sie erhalten","columns":2,"items":[{"badge":"A4-1","title":"Prompt-Playbook + Template-Sammlung","description":"Rollenbasierte Bibliothek einsatzbereiter Prompts für Vertrieb, Support, Backoffice und Marketing. Jede Vorlage ist erklärt, mit Beispiel versehen und für Ihre Abläufe angepasst."},{"badge":"A4-2","title":"Governance-Kit","description":"Nutzungsrichtlinie (was ist erlaubt, was nicht), Freigabeablauf für sensible Inhalte und Rollenzuweisung. Kein juristisches Kauderwelsch – ein Dokument, das Ihr Team tatsächlich liest."}]}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'cta', 4,
    '{"headline":"Interesse an Modul A4?","description":"In einem kostenlosen Erstgespräch zeigen wir, wie dieses Modul konkret in Ihrer Situation helfen kann – ohne Verpflichtung.","buttons":[{"label":"Erstgespräch buchen","href":"/kontakt","variant":"default"},{"label":"Zurück zur Übersicht","href":"/ki-beratung","variant":"outline"}]}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  SELECT jsonb_agg(jsonb_build_object('id', b.id, 'blockType', b.block_type, 'sortOrder', b.sort_order, 'content', b.content, 'settings', b.settings, 'isVisible', b.is_visible) ORDER BY b.sort_order) INTO v_blocks FROM cms_blocks b WHERE b.page_id = v_page_id;
  UPDATE cms_pages SET published_blocks = v_blocks, has_draft_changes = false, published_title = title, published_seo_title = seo_title, published_seo_description = seo_description WHERE id = v_page_id;


  -- ========================================================================
  -- 10. MODULE DETAIL: /ki-beratung/a5
  -- ========================================================================
  DELETE FROM cms_pages WHERE tenant_id = v_tenant_id AND slug = '/ki-beratung/a5';

  INSERT INTO cms_pages (tenant_id, slug, title, seo_title, seo_description, status, published_at, created_at, updated_at)
  VALUES (v_tenant_id, '/ki-beratung/a5', 'KI-Schulungen & Enablement',
          'A5 – KI-Schulungen & Enablement | xKMU',
          'Kurze, praxisnahe Schulungen, zugeschnitten auf echte Aufgaben. Ihr Team lernt, was es wirklich braucht.',
          'published', v_now, v_now, v_now)
  RETURNING id INTO v_page_id;

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'hero', 0,
    '{"badge":{"text":"Modul A5 · KI-Beratung"},"headline":"KI-Schulungen & Enablement","headlineHighlight":"","subheadline":"Teams befähigen – nachhaltig","size":"small"}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'text', 1,
    '{"content":"Die beste KI-Lösung nützt nichts, wenn niemand sie nutzt. Unsere Schulungen sind kurz, praxisnah und auf echte Aufgaben zugeschnitten. Ob Grundlagen für alle oder spezialisierte Trainings für Vertrieb und Marketing – Ihr Team lernt, was es wirklich braucht.","alignment":"left"}'::jsonb,
    '{"maxWidth":768,"paddingBottom":0}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'banner', 2,
    '{"text":"Mitarbeiter befähigen, damit Lösungen langfristig genutzt werden.","variant":"brand","icon":"Target"}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'service-cards', 3,
    '{"sectionTitle":"Konkrete Ergebnisse – keine Folien","sectionSubtitle":"Was Sie erhalten","columns":2,"items":[{"badge":"A5-1","title":"Schulungsunterlagen + Übungen","description":"Vollständige Trainingsmaterialien je Zielgruppe: Präsentationen, Handouts, praxisnahe Übungsaufgaben an realen Unternehmensdaten."},{"badge":"A5-2","title":"Checklisten (Qualität, Datenschutz, Freigabe)","description":"Drei kompakte Checklisten für den Alltag: Was prüfe ich vor einem KI-Output? Welche Daten darf ich eingeben? Was braucht eine Freigabe? Kurz gehalten – zum Ausdrucken oder als digitale Erinnerung."}]}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'cta', 4,
    '{"headline":"Interesse an Modul A5?","description":"In einem kostenlosen Erstgespräch zeigen wir, wie dieses Modul konkret in Ihrer Situation helfen kann – ohne Verpflichtung.","buttons":[{"label":"Erstgespräch buchen","href":"/kontakt","variant":"default"},{"label":"Zurück zur Übersicht","href":"/ki-beratung","variant":"outline"}]}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  SELECT jsonb_agg(jsonb_build_object('id', b.id, 'blockType', b.block_type, 'sortOrder', b.sort_order, 'content', b.content, 'settings', b.settings, 'isVisible', b.is_visible) ORDER BY b.sort_order) INTO v_blocks FROM cms_blocks b WHERE b.page_id = v_page_id;
  UPDATE cms_pages SET published_blocks = v_blocks, has_draft_changes = false, published_title = title, published_seo_title = seo_title, published_seo_description = seo_description WHERE id = v_page_id;


  -- ========================================================================
  -- 11. MODULE DETAIL: /it-beratung/b1
  -- ========================================================================
  DELETE FROM cms_pages WHERE tenant_id = v_tenant_id AND slug = '/it-beratung/b1';

  INSERT INTO cms_pages (tenant_id, slug, title, seo_title, seo_description, status, published_at, created_at, updated_at)
  VALUES (v_tenant_id, '/it-beratung/b1', 'IT-Assessment & Stabilitätscheck',
          'B1 – IT-Assessment & Stabilitätscheck | xKMU',
          'Das Assessment legt alles offen – ehrlich, verständlich und mit klarer Prioritätenliste.',
          'published', v_now, v_now, v_now)
  RETURNING id INTO v_page_id;

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'hero', 0,
    '{"badge":{"text":"Modul B1 · IT-Beratung"},"headline":"IT-Assessment & Stabilitätscheck","headlineHighlight":"","subheadline":"Klarheit über Zustand, Risiken und Quick-Fixes","size":"small"}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'text', 1,
    '{"content":"Viele IT-Probleme entstehen nicht über Nacht. Sie wachsen langsam: ein System zu viel, eine Lizenz zu teuer, ein Backup das nie getestet wurde. Das Assessment legt alles offen – ehrlich, verständlich und mit klarer Prioritätenliste. Grundlage für alle weiteren IT-Projekte.","alignment":"left"}'::jsonb,
    '{"maxWidth":768,"paddingBottom":0}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'banner', 2,
    '{"text":"Klarheit über Zustand, Risiken, technische Schulden und Quick-Fixes.","variant":"brand","icon":"Target"}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'service-cards', 3,
    '{"sectionTitle":"Konkrete Ergebnisse – keine Folien","sectionSubtitle":"Was Sie erhalten","columns":2,"items":[{"badge":"B1-1","title":"IT-Health-Report","description":"Strukturierter Bericht über den aktuellen Zustand der IT: Inventar, erkannte Schwachstellen, Performance-Probleme und Schatten-IT. Mit Risikobewertung und Prioritätenliste."},{"badge":"B1-2","title":"Maßnahmenplan (Quick-Wins + Roadmap)","description":"Sofort umsetzbare Quick-Wins, mittelfristige Stabilisierungsmaßnahmen und strategische Modernisierungsschritte. Jede Maßnahme mit Aufwand, Nutzen und Verantwortlichkeit."}]}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'cta', 4,
    '{"headline":"Interesse an Modul B1?","description":"In einem kostenlosen Erstgespräch zeigen wir, wie dieses Modul konkret in Ihrer Situation helfen kann – ohne Verpflichtung.","buttons":[{"label":"Erstgespräch buchen","href":"/kontakt","variant":"default"},{"label":"Zurück zur Übersicht","href":"/it-beratung","variant":"outline"}]}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  SELECT jsonb_agg(jsonb_build_object('id', b.id, 'blockType', b.block_type, 'sortOrder', b.sort_order, 'content', b.content, 'settings', b.settings, 'isVisible', b.is_visible) ORDER BY b.sort_order) INTO v_blocks FROM cms_blocks b WHERE b.page_id = v_page_id;
  UPDATE cms_pages SET published_blocks = v_blocks, has_draft_changes = false, published_title = title, published_seo_title = seo_title, published_seo_description = seo_description WHERE id = v_page_id;


  -- ========================================================================
  -- 12. MODULE DETAIL: /it-beratung/b2
  -- ========================================================================
  DELETE FROM cms_pages WHERE tenant_id = v_tenant_id AND slug = '/it-beratung/b2';

  INSERT INTO cms_pages (tenant_id, slug, title, seo_title, seo_description, status, published_at, created_at, updated_at)
  VALUES (v_tenant_id, '/it-beratung/b2', 'IT-Architektur & Modernisierung',
          'B2 – IT-Architektur & Modernisierung | xKMU',
          'Klares Zielbild für Ihre IT, Migrationsplan und Betriebsleitfaden – zukunftsfähig planen.',
          'published', v_now, v_now, v_now)
  RETURNING id INTO v_page_id;

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'hero', 0,
    '{"badge":{"text":"Modul B2 · IT-Beratung"},"headline":"IT-Architektur & Modernisierung","headlineHighlight":"","subheadline":"Cloud, Hybrid, M365 – zukunftsfähig planen","size":"small"}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'text', 1,
    '{"content":"IT, die zufällig gewachsen ist, kostet täglich Geld und Nerven. Wir entwickeln ein klares Zielbild, zeigen den Weg dahin und begleiten die Migration – mit minimalem Ausfall und maximalem Ergebnis.","alignment":"left"}'::jsonb,
    '{"maxWidth":768,"paddingBottom":0}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'banner', 2,
    '{"text":"Zukunftsfähige IT, die nicht zufällig gewachsen ist.","variant":"brand","icon":"Target"}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'service-cards', 3,
    '{"sectionTitle":"Konkrete Ergebnisse – keine Folien","sectionSubtitle":"Was Sie erhalten","columns":2,"items":[{"badge":"B2-1","title":"Zielbild + Architekturdiagramme","description":"Klare Beschreibung und grafische Übersicht, wie Ihre IT in Zukunft aussehen soll. Gemeinsame Orientierung für alle Beteiligten."},{"badge":"B2-2","title":"Migrations-Roadmap + Umsetzungsplan","description":"Phasenweiser Migrationsplan: Reihenfolge, Abhängigkeiten, Cutover-Planung, Downtime-Minimierung, Rollback-Szenarien."},{"badge":"B2-3","title":"Standards & Betriebsleitfaden (Runbooks)","description":"Verbindliche Konfigurationsstandards und operative Runbooks für wiederkehrende IT-Aufgaben – damit der Betrieb nicht vom Wissen einzelner Personen abhängt."}]}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'cta', 4,
    '{"headline":"Interesse an Modul B2?","description":"In einem kostenlosen Erstgespräch zeigen wir, wie dieses Modul konkret in Ihrer Situation helfen kann – ohne Verpflichtung.","buttons":[{"label":"Erstgespräch buchen","href":"/kontakt","variant":"default"},{"label":"Zurück zur Übersicht","href":"/it-beratung","variant":"outline"}]}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  SELECT jsonb_agg(jsonb_build_object('id', b.id, 'blockType', b.block_type, 'sortOrder', b.sort_order, 'content', b.content, 'settings', b.settings, 'isVisible', b.is_visible) ORDER BY b.sort_order) INTO v_blocks FROM cms_blocks b WHERE b.page_id = v_page_id;
  UPDATE cms_pages SET published_blocks = v_blocks, has_draft_changes = false, published_title = title, published_seo_title = seo_title, published_seo_description = seo_description WHERE id = v_page_id;


  -- ========================================================================
  -- 13. MODULE DETAIL: /it-beratung/b3
  -- ========================================================================
  DELETE FROM cms_pages WHERE tenant_id = v_tenant_id AND slug = '/it-beratung/b3';

  INSERT INTO cms_pages (tenant_id, slug, title, seo_title, seo_description, status, published_at, created_at, updated_at)
  VALUES (v_tenant_id, '/it-beratung/b3', 'Systemintegration & Prozess-IT',
          'B3 – Systemintegration & Prozess-IT | xKMU',
          'Systeme verbinden, Medienbrüche beseitigen, Abläufe vereinheitlichen.',
          'published', v_now, v_now, v_now)
  RETURNING id INTO v_page_id;

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'hero', 0,
    '{"badge":{"text":"Modul B3 · IT-Beratung"},"headline":"Systemintegration & Prozess-IT","headlineHighlight":"","subheadline":"Systeme verbinden, Medienbrüche beseitigen","size":"small"}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'text', 1,
    '{"content":"Wenn Daten manuell zwischen Systemen kopiert werden, entstehen Fehler, Verzögerungen und Frust. Wir integrieren Ihre Tools – mit klarer Dokumentation, damit Änderungen auch in einem Jahr noch nachvollziehbar sind.","alignment":"left"}'::jsonb,
    '{"maxWidth":768,"paddingBottom":0}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'banner', 2,
    '{"text":"Systeme verbinden, Medienbrüche entfernen, Abläufe vereinheitlichen.","variant":"brand","icon":"Target"}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'service-cards', 3,
    '{"sectionTitle":"Konkrete Ergebnisse – keine Folien","sectionSubtitle":"Was Sie erhalten","columns":2,"items":[{"badge":"B3-1","title":"Integrierte Prozesse (dokumentiert)","description":"Vollständige Dokumentation der realisierten Systemintegrationen: Datenflüsse, Routing-Logik, Feldmappings und Fehlerbehandlung."},{"badge":"B3-2","title":"Betriebs- und Nutzerdokumentation","description":"Technische Betriebsdoku für IT-Ansprechpartner und verständliche Nutzerdoku für Fachabteilungen – damit jeder weiß, was er wissen muss."}]}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'cta', 4,
    '{"headline":"Interesse an Modul B3?","description":"In einem kostenlosen Erstgespräch zeigen wir, wie dieses Modul konkret in Ihrer Situation helfen kann – ohne Verpflichtung.","buttons":[{"label":"Erstgespräch buchen","href":"/kontakt","variant":"default"},{"label":"Zurück zur Übersicht","href":"/it-beratung","variant":"outline"}]}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  SELECT jsonb_agg(jsonb_build_object('id', b.id, 'blockType', b.block_type, 'sortOrder', b.sort_order, 'content', b.content, 'settings', b.settings, 'isVisible', b.is_visible) ORDER BY b.sort_order) INTO v_blocks FROM cms_blocks b WHERE b.page_id = v_page_id;
  UPDATE cms_pages SET published_blocks = v_blocks, has_draft_changes = false, published_title = title, published_seo_title = seo_title, published_seo_description = seo_description WHERE id = v_page_id;


  -- ========================================================================
  -- 14. MODULE DETAIL: /it-beratung/b4
  -- ========================================================================
  DELETE FROM cms_pages WHERE tenant_id = v_tenant_id AND slug = '/it-beratung/b4';

  INSERT INTO cms_pages (tenant_id, slug, title, seo_title, seo_description, status, published_at, created_at, updated_at)
  VALUES (v_tenant_id, '/it-beratung/b4', 'Betrieb, Monitoring & Dokumentation',
          'B4 – Betrieb, Monitoring & Dokumentation | xKMU',
          'Monitoring, Alarmschwellen, Backup-Prüfung und Dokumentation für weniger Ausfälle.',
          'published', v_now, v_now, v_now)
  RETURNING id INTO v_page_id;

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'hero', 0,
    '{"badge":{"text":"Modul B4 · IT-Beratung"},"headline":"Betrieb, Monitoring & Dokumentation","headlineHighlight":"","subheadline":"Weniger Ausfälle, schnellere Fehlerbehebung","size":"small"}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'text', 1,
    '{"content":"Guter IT-Betrieb bedeutet: Probleme erkennen, bevor Kunden sie bemerken. Wir richten Ihr Monitoring ein, definieren Alarmschwellen, prüfen Backup-Prozesse und dokumentieren alles so, dass auch neue Kollegen oder externe Dienstleister sofort arbeiten können.","alignment":"left"}'::jsonb,
    '{"maxWidth":768,"paddingBottom":0}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'banner', 2,
    '{"text":"Weniger Ausfälle, schnellere Fehlerbehebung, klare Verantwortlichkeiten.","variant":"brand","icon":"Target"}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'service-cards', 3,
    '{"sectionTitle":"Konkrete Ergebnisse – keine Folien","sectionSubtitle":"Was Sie erhalten","columns":2,"items":[{"badge":"B4-1","title":"Monitoring-Plan + Alarmierungslogik","description":"Definiert was überwacht wird, ab welchem Punkt ein Alarm ausgelöst wird und wer benachrichtigt wird. Einschließlich der fertig eingerichteten Überwachung."},{"badge":"B4-2","title":"Runbooks + Systemdokumentation","description":"Schritt-für-Schritt-Anleitungen für alle wiederkehrenden IT-Aufgaben plus vollständige Systemübersicht mit Admin-Zugängen und Abhängigkeiten."},{"badge":"B4-3","title":"Wiederanlaufplan","description":"Was tun, wenn die IT ausfällt? Klare Antworten: Reihenfolge, Schritte, Zuständigkeiten, Notfallkontakte – kurz genug, um unter Stress lesbar zu sein."}]}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'cta', 4,
    '{"headline":"Interesse an Modul B4?","description":"In einem kostenlosen Erstgespräch zeigen wir, wie dieses Modul konkret in Ihrer Situation helfen kann – ohne Verpflichtung.","buttons":[{"label":"Erstgespräch buchen","href":"/kontakt","variant":"default"},{"label":"Zurück zur Übersicht","href":"/it-beratung","variant":"outline"}]}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  SELECT jsonb_agg(jsonb_build_object('id', b.id, 'blockType', b.block_type, 'sortOrder', b.sort_order, 'content', b.content, 'settings', b.settings, 'isVisible', b.is_visible) ORDER BY b.sort_order) INTO v_blocks FROM cms_blocks b WHERE b.page_id = v_page_id;
  UPDATE cms_pages SET published_blocks = v_blocks, has_draft_changes = false, published_title = title, published_seo_title = seo_title, published_seo_description = seo_description WHERE id = v_page_id;


  -- ========================================================================
  -- 15. MODULE DETAIL: /it-beratung/b5
  -- ========================================================================
  DELETE FROM cms_pages WHERE tenant_id = v_tenant_id AND slug = '/it-beratung/b5';

  INSERT INTO cms_pages (tenant_id, slug, title, seo_title, seo_description, status, published_at, created_at, updated_at)
  VALUES (v_tenant_id, '/it-beratung/b5', 'IT-Standardisierung & Arbeitsplatz-IT',
          'B5 – IT-Standardisierung & Arbeitsplatz-IT | xKMU',
          'Einheitliche Standards, weniger Supportaufwand, höhere Produktivität.',
          'published', v_now, v_now, v_now)
  RETURNING id INTO v_page_id;

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'hero', 0,
    '{"badge":{"text":"Modul B5 · IT-Beratung"},"headline":"IT-Standardisierung & Arbeitsplatz-IT","headlineHighlight":"","subheadline":"Einheitliche Arbeitsplätze, weniger Supportaufwand","size":"small"}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'text', 1,
    '{"content":"Jeder Arbeitsplatz ein bisschen anders eingerichtet – das kostet täglich Zeit. Wir schaffen einheitliche Standards, die den Supportaufwand senken und gleichzeitig die Sicherheit erhöhen.","alignment":"left"}'::jsonb,
    '{"maxWidth":768,"paddingBottom":0}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'banner', 2,
    '{"text":"Weniger Supportaufwand, konsistenter Arbeitsplatz, höhere Produktivität.","variant":"brand","icon":"Target"}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'service-cards', 3,
    '{"sectionTitle":"Konkrete Ergebnisse – keine Folien","sectionSubtitle":"Was Sie erhalten","columns":2,"items":[{"badge":"B5-1","title":"Standardkonzept + Checklisten","description":"Konzept für den standardisierten Arbeitsplatz: Gerätetypen, Konfigurationsvorgaben, Passwort- und Geräterichtlinien. Checklisten für Einrichtung und Abnahme."},{"badge":"B5-2","title":"On-/Offboarding-Prozess","description":"Neuer Mitarbeiter → sofort arbeitsfähig. Ausscheidender Mitarbeiter → kein Zugriff mehr. Klare Checkliste für beide Fälle."}]}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'cta', 4,
    '{"headline":"Interesse an Modul B5?","description":"In einem kostenlosen Erstgespräch zeigen wir, wie dieses Modul konkret in Ihrer Situation helfen kann – ohne Verpflichtung.","buttons":[{"label":"Erstgespräch buchen","href":"/kontakt","variant":"default"},{"label":"Zurück zur Übersicht","href":"/it-beratung","variant":"outline"}]}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  SELECT jsonb_agg(jsonb_build_object('id', b.id, 'blockType', b.block_type, 'sortOrder', b.sort_order, 'content', b.content, 'settings', b.settings, 'isVisible', b.is_visible) ORDER BY b.sort_order) INTO v_blocks FROM cms_blocks b WHERE b.page_id = v_page_id;
  UPDATE cms_pages SET published_blocks = v_blocks, has_draft_changes = false, published_title = title, published_seo_title = seo_title, published_seo_description = seo_description WHERE id = v_page_id;


  -- ========================================================================
  -- 16. MODULE DETAIL: /cybersecurity/c1
  -- ========================================================================
  DELETE FROM cms_pages WHERE tenant_id = v_tenant_id AND slug = '/cybersecurity/c1';

  INSERT INTO cms_pages (tenant_id, slug, title, seo_title, seo_description, status, published_at, created_at, updated_at)
  VALUES (v_tenant_id, '/cybersecurity/c1', 'Security Quick Check',
          'C1 – Security Quick Check | xKMU',
          'In kurzer Zeit ein klarer Überblick: Was sind Ihre größten Risiken? Was muss sofort angegangen werden?',
          'published', v_now, v_now, v_now)
  RETURNING id INTO v_page_id;

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'hero', 0,
    '{"badge":{"text":"Modul C1 · Cybersecurity-Beratung"},"headline":"Security Quick Check","headlineHighlight":"","subheadline":"Top-Risiken schnell sichtbar machen","size":"small"}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'text', 1,
    '{"content":"Sie wissen, dass Cybersicherheit wichtig ist – aber wo anfangen? Der Quick Check gibt in kurzer Zeit einen klaren Überblick: Was sind Ihre größten Risiken? Was muss sofort angegangen werden? Und was kann warten?","alignment":"left"}'::jsonb,
    '{"maxWidth":768,"paddingBottom":0}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'banner', 2,
    '{"text":"Schnell sichtbare Risiken finden und priorisieren.","variant":"brand","icon":"Target"}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'service-cards', 3,
    '{"sectionTitle":"Konkrete Ergebnisse – keine Folien","sectionSubtitle":"Was Sie erhalten","columns":2,"items":[{"badge":"C1-1","title":"Risiko-Heatmap (Top 10 Risiken)","description":"Visuelle Übersicht Ihrer zehn größten Sicherheitsrisiken nach Wahrscheinlichkeit und potenziellem Schaden. Klar und verständlich – kein Fachchinesisch."},{"badge":"C1-2","title":"Maßnahmenkatalog","description":"Konkrete Empfehlungen nach Aufwand, Wirkung und Dringlichkeit sortiert. Jeder Eintrag erklärt klar, warum er wichtig ist und was er bedeutet."},{"badge":"C1-3","title":"Sofortmaßnahmenliste","description":"Die wichtigsten Sicherheitsverbesserungen, die Sie innerhalb von sieben Tagen umsetzen können – ohne großen Aufwand, aber mit sofortiger Wirkung."}]}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'cta', 4,
    '{"headline":"Interesse an Modul C1?","description":"In einem kostenlosen Erstgespräch zeigen wir, wie dieses Modul konkret in Ihrer Situation helfen kann – ohne Verpflichtung.","buttons":[{"label":"Erstgespräch buchen","href":"/kontakt","variant":"default"},{"label":"Zurück zur Übersicht","href":"/cybersecurity","variant":"outline"}]}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  SELECT jsonb_agg(jsonb_build_object('id', b.id, 'blockType', b.block_type, 'sortOrder', b.sort_order, 'content', b.content, 'settings', b.settings, 'isVisible', b.is_visible) ORDER BY b.sort_order) INTO v_blocks FROM cms_blocks b WHERE b.page_id = v_page_id;
  UPDATE cms_pages SET published_blocks = v_blocks, has_draft_changes = false, published_title = title, published_seo_title = seo_title, published_seo_description = seo_description WHERE id = v_page_id;


  -- ========================================================================
  -- 17. MODULE DETAIL: /cybersecurity/c2
  -- ========================================================================
  DELETE FROM cms_pages WHERE tenant_id = v_tenant_id AND slug = '/cybersecurity/c2';

  INSERT INTO cms_pages (tenant_id, slug, title, seo_title, seo_description, status, published_at, created_at, updated_at)
  VALUES (v_tenant_id, '/cybersecurity/c2', 'Hardening & Sicherheitsbaselines',
          'C2 – Hardening & Sicherheitsbaselines | xKMU',
          'Angriffsfläche systematisch reduzieren. Identitäten, Geräte, Cloud-Dienste – alles auf sicherem Stand.',
          'published', v_now, v_now, v_now)
  RETURNING id INTO v_page_id;

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'hero', 0,
    '{"badge":{"text":"Modul C2 · Cybersecurity-Beratung"},"headline":"Hardening & Sicherheitsbaselines","headlineHighlight":"","subheadline":"Angriffsfläche systematisch reduzieren","size":"small"}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'text', 1,
    '{"content":"Die meisten Angriffe nutzen bekannte Schwachstellen in Standardkonfigurationen. Hardening schließt diese Lücken systematisch: Identitäten, Geräte, Cloud-Dienste – alles auf sicherem Stand, dokumentiert und überprüfbar.","alignment":"left"}'::jsonb,
    '{"maxWidth":768,"paddingBottom":0}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'banner', 2,
    '{"text":"Angriffsfläche reduzieren, Standardkonfigurationen absichern.","variant":"brand","icon":"Target"}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'service-cards', 3,
    '{"sectionTitle":"Konkrete Ergebnisse – keine Folien","sectionSubtitle":"Was Sie erhalten","columns":2,"items":[{"badge":"C2-1","title":"Baseline-Konzept + umgesetzte Standards","description":"Dokumentiertes Sicherheits-Baseline-Konzept inklusive Nachweis der tatsächlich umgesetzten Härtungsmaßnahmen: Identitäten, Clients, Cloud, Logging."},{"badge":"C2-2","title":"Änderungsdokumentation + Abnahmecheckliste","description":"Lückenlose Dokumentation aller Konfigurationsänderungen. Abnahmecheckliste bestätigt, dass alle vereinbarten Maßnahmen umgesetzt wurden."}]}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'cta', 4,
    '{"headline":"Interesse an Modul C2?","description":"In einem kostenlosen Erstgespräch zeigen wir, wie dieses Modul konkret in Ihrer Situation helfen kann – ohne Verpflichtung.","buttons":[{"label":"Erstgespräch buchen","href":"/kontakt","variant":"default"},{"label":"Zurück zur Übersicht","href":"/cybersecurity","variant":"outline"}]}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  SELECT jsonb_agg(jsonb_build_object('id', b.id, 'blockType', b.block_type, 'sortOrder', b.sort_order, 'content', b.content, 'settings', b.settings, 'isVisible', b.is_visible) ORDER BY b.sort_order) INTO v_blocks FROM cms_blocks b WHERE b.page_id = v_page_id;
  UPDATE cms_pages SET published_blocks = v_blocks, has_draft_changes = false, published_title = title, published_seo_title = seo_title, published_seo_description = seo_description WHERE id = v_page_id;


  -- ========================================================================
  -- 18. MODULE DETAIL: /cybersecurity/c3
  -- ========================================================================
  DELETE FROM cms_pages WHERE tenant_id = v_tenant_id AND slug = '/cybersecurity/c3';

  INSERT INTO cms_pages (tenant_id, slug, title, seo_title, seo_description, status, published_at, created_at, updated_at)
  VALUES (v_tenant_id, '/cybersecurity/c3', 'Backup, Recovery & Ransomware-Resilienz',
          'C3 – Backup, Recovery & Ransomware-Resilienz | xKMU',
          'Solide Backup-Strategie, getestete Wiederherstellung – im Ernstfall wirklich handlungsfähig.',
          'published', v_now, v_now, v_now)
  RETURNING id INTO v_page_id;

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'hero', 0,
    '{"badge":{"text":"Modul C3 · Cybersecurity-Beratung"},"headline":"Backup, Recovery & Ransomware-Resilienz","headlineHighlight":"","subheadline":"Im Ernstfall wirklich handlungsfähig sein","size":"small"}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'text', 1,
    '{"content":"Ein Backup, das nie getestet wurde, ist kein Backup. Wir erstellen eine solide Backup-Strategie, testen die Wiederherstellung und dokumentieren alles – damit Sie im Ernstfall nicht improvisieren müssen.","alignment":"left"}'::jsonb,
    '{"maxWidth":768,"paddingBottom":0}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'banner', 2,
    '{"text":"Im Ernstfall wieder arbeitsfähig sein – nicht nur \"Backup vorhanden\".","variant":"brand","icon":"Target"}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'service-cards', 3,
    '{"sectionTitle":"Konkrete Ergebnisse – keine Folien","sectionSubtitle":"Was Sie erhalten","columns":2,"items":[{"badge":"C3-1","title":"Backup-/Recovery-Konzept","description":"Vollständiges Konzept: 3-2-1-Strategie, Offline/Immutable Copies, Frequenzen, Aufbewahrungsdauern, Trennung von Produktivsystemen."},{"badge":"C3-2","title":"Restore-Testprotokolle","description":"Dokumentierter Beweis, dass Ihre Backups wirklich funktionieren: System, Datenstand, Datum, Ergebnis, Wiederherstellungsdauer."},{"badge":"C3-3","title":"Wiederanlaufplan","description":"Prioritätenliste der Systeme, Wiederherstellungsschritte, Zeitzeile, Notfallkontakte, Kommunikationsvorlage. Lesbar auch unter Stress."}]}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'cta', 4,
    '{"headline":"Interesse an Modul C3?","description":"In einem kostenlosen Erstgespräch zeigen wir, wie dieses Modul konkret in Ihrer Situation helfen kann – ohne Verpflichtung.","buttons":[{"label":"Erstgespräch buchen","href":"/kontakt","variant":"default"},{"label":"Zurück zur Übersicht","href":"/cybersecurity","variant":"outline"}]}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  SELECT jsonb_agg(jsonb_build_object('id', b.id, 'blockType', b.block_type, 'sortOrder', b.sort_order, 'content', b.content, 'settings', b.settings, 'isVisible', b.is_visible) ORDER BY b.sort_order) INTO v_blocks FROM cms_blocks b WHERE b.page_id = v_page_id;
  UPDATE cms_pages SET published_blocks = v_blocks, has_draft_changes = false, published_title = title, published_seo_title = seo_title, published_seo_description = seo_description WHERE id = v_page_id;


  -- ========================================================================
  -- 19. MODULE DETAIL: /cybersecurity/c4
  -- ========================================================================
  DELETE FROM cms_pages WHERE tenant_id = v_tenant_id AND slug = '/cybersecurity/c4';

  INSERT INTO cms_pages (tenant_id, slug, title, seo_title, seo_description, status, published_at, created_at, updated_at)
  VALUES (v_tenant_id, '/cybersecurity/c4', 'Incident Response & Playbooks',
          'C4 – Incident Response & Playbooks | xKMU',
          'IR-Handbuch und Playbook-Sammlung für Phishing, Kontoübernahme, Ransomware und Datenabfluss.',
          'published', v_now, v_now, v_now)
  RETURNING id INTO v_page_id;

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'hero', 0,
    '{"badge":{"text":"Modul C4 · Cybersecurity-Beratung"},"headline":"Incident Response & Playbooks","headlineHighlight":"","subheadline":"Klarer Plan für jeden Notfall","size":"small"}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'text', 1,
    '{"content":"Ein Sicherheitsvorfall ist der falsche Moment, um erst nachzudenken. Unser IR-Handbuch gibt Ihrem Team in genau diesem Moment Struktur. Die Playbooks decken die häufigsten Szenarien Schritt für Schritt ab – auch für Mitarbeiter ohne IT-Hintergrund.","alignment":"left"}'::jsonb,
    '{"maxWidth":768,"paddingBottom":0}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'banner', 2,
    '{"text":"Keine Panik im Vorfall – klarer Ablauf, klare Rollen.","variant":"brand","icon":"Target"}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'service-cards', 3,
    '{"sectionTitle":"Konkrete Ergebnisse – keine Folien","sectionSubtitle":"Was Sie erhalten","columns":2,"items":[{"badge":"C4-1","title":"Incident-Response-Handbuch","description":"Übergreifendes Notfallhandbuch: Meldewege, Entscheidungsbaum, Rollenverteilung, externe Partner, BSI-Meldepflicht. Alles an einem Ort."},{"badge":"C4-2","title":"Playbook-Sammlung + Checklisten","description":"Schritt-für-Schritt-Anleitungen für Phishing, Kontoübernahme, Ransomware und Datenabfluss. Erkennungsmerkmale, Sofortmaßnahmen, Kommunikation, Lessons Learned."}]}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'cta', 4,
    '{"headline":"Interesse an Modul C4?","description":"In einem kostenlosen Erstgespräch zeigen wir, wie dieses Modul konkret in Ihrer Situation helfen kann – ohne Verpflichtung.","buttons":[{"label":"Erstgespräch buchen","href":"/kontakt","variant":"default"},{"label":"Zurück zur Übersicht","href":"/cybersecurity","variant":"outline"}]}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  SELECT jsonb_agg(jsonb_build_object('id', b.id, 'blockType', b.block_type, 'sortOrder', b.sort_order, 'content', b.content, 'settings', b.settings, 'isVisible', b.is_visible) ORDER BY b.sort_order) INTO v_blocks FROM cms_blocks b WHERE b.page_id = v_page_id;
  UPDATE cms_pages SET published_blocks = v_blocks, has_draft_changes = false, published_title = title, published_seo_title = seo_title, published_seo_description = seo_description WHERE id = v_page_id;


  -- ========================================================================
  -- 20. MODULE DETAIL: /cybersecurity/c5
  -- ========================================================================
  DELETE FROM cms_pages WHERE tenant_id = v_tenant_id AND slug = '/cybersecurity/c5';

  INSERT INTO cms_pages (tenant_id, slug, title, seo_title, seo_description, status, published_at, created_at, updated_at)
  VALUES (v_tenant_id, '/cybersecurity/c5', 'Security Awareness & Phishing-Schutz',
          'C5 – Security Awareness & Phishing-Schutz | xKMU',
          'Kurze, konkrete Impulse, die im Gedächtnis bleiben. Trainings auf echte Bedrohungen zugeschnitten.',
          'published', v_now, v_now, v_now)
  RETURNING id INTO v_page_id;

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'hero', 0,
    '{"badge":{"text":"Modul C5 · Cybersecurity-Beratung"},"headline":"Security Awareness & Phishing-Schutz","headlineHighlight":"","subheadline":"Mitarbeiter als Schutzschild – ohne Schulungsfolter","size":"small"}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'text', 1,
    '{"content":"Die meisten Angriffe beginnen mit einem Klick. Awareness entsteht aber nicht durch einmalige Pflichtschulungen – sondern durch kurze, konkrete Impulse, die im Gedächtnis bleiben. Unsere Trainings sind auf echte Bedrohungen zugeschnitten, nicht auf Theorie.","alignment":"left"}'::jsonb,
    '{"maxWidth":768,"paddingBottom":0}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'banner', 2,
    '{"text":"Menschlicher Faktor als Schutzschild – ohne Schulungsfolter.","variant":"brand","icon":"Target"}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'service-cards', 3,
    '{"sectionTitle":"Konkrete Ergebnisse – keine Folien","sectionSubtitle":"Was Sie erhalten","columns":2,"items":[{"badge":"C5-1","title":"Schulungsunterlagen + Kurzleitfäden","description":"Trainingsmaterial mit echten Beispielen: Phishing-Mails, Social Engineering, Passwortfehler. Erkennungsregeln und Meldeprozess. Kurz, visuell, alltagstauglich."},{"badge":"C5-2","title":"Sicherheitsregeln für den Alltag","description":"1–2-seitiges Regelblatt: die wichtigsten Do''s und Don''ts zu Passwörtern, E-Mails, Links und Home Office. Zum Ausdrucken oder als digitales Dokument."}]}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'cta', 4,
    '{"headline":"Interesse an Modul C5?","description":"In einem kostenlosen Erstgespräch zeigen wir, wie dieses Modul konkret in Ihrer Situation helfen kann – ohne Verpflichtung.","buttons":[{"label":"Erstgespräch buchen","href":"/kontakt","variant":"default"},{"label":"Zurück zur Übersicht","href":"/cybersecurity","variant":"outline"}]}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  SELECT jsonb_agg(jsonb_build_object('id', b.id, 'blockType', b.block_type, 'sortOrder', b.sort_order, 'content', b.content, 'settings', b.settings, 'isVisible', b.is_visible) ORDER BY b.sort_order) INTO v_blocks FROM cms_blocks b WHERE b.page_id = v_page_id;
  UPDATE cms_pages SET published_blocks = v_blocks, has_draft_changes = false, published_title = title, published_seo_title = seo_title, published_seo_description = seo_description WHERE id = v_page_id;


  -- ========================================================================
  -- 21. MODULE DETAIL: /cybersecurity/c6
  -- ========================================================================
  DELETE FROM cms_pages WHERE tenant_id = v_tenant_id AND slug = '/cybersecurity/c6';

  INSERT INTO cms_pages (tenant_id, slug, title, seo_title, seo_description, status, published_at, created_at, updated_at)
  VALUES (v_tenant_id, '/cybersecurity/c6', 'Datenschutz- & Compliance-Unterstützung',
          'C6 – Datenschutz- & Compliance-Unterstützung | xKMU',
          'TOMs operationalisieren, Compliance-Fähigkeit herstellen – DSGVO und NIS-2 technisch umsetzen.',
          'published', v_now, v_now, v_now)
  RETURNING id INTO v_page_id;

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'hero', 0,
    '{"badge":{"text":"Modul C6 · Cybersecurity-Beratung"},"headline":"Datenschutz- & Compliance-Unterstützung","headlineHighlight":"","subheadline":"DSGVO und NIS-2 technisch umsetzen","size":"small"}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'text', 1,
    '{"content":"Datenschutz und Compliance sind mehr als Richtlinien – sie müssen technisch und organisatorisch gelebt werden. Wir helfen dabei, TOMs konkret umzusetzen und prüfbare Nachweise zu erstellen. Hinweis: xKMU leistet keine Rechtsberatung, unterstützt aber umfassend bei der technischen und organisatorischen Umsetzung.","alignment":"left"}'::jsonb,
    '{"maxWidth":768,"paddingBottom":0}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'banner', 2,
    '{"text":"TOMs operationalisieren, Compliance-Fähigkeit herstellen – ohne Rechtsberatung.","variant":"brand","icon":"Target"}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'service-cards', 3,
    '{"sectionTitle":"Konkrete Ergebnisse – keine Folien","sectionSubtitle":"Was Sie erhalten","columns":2,"items":[{"badge":"C6-1","title":"TOM-Umsetzungsnachweis (technisch)","description":"Nachweis der technisch umgesetzten Maßnahmen gemäß DSGVO: Zugangskontrolle, Verschlüsselung, Protokollierung, Löschkonzept. Mit Status und Nachweis."},{"badge":"C6-2","title":"Audit-Dokumentationspaket","description":"Alle relevanten Dokumente für interne Prüfungen oder externe Audits: Richtlinien, TOM-Nachweis, Rollen-/Rechtekonzept, Löschkonzept. Vollständig und abrufbar."}]}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'cta', 4,
    '{"headline":"Interesse an Modul C6?","description":"In einem kostenlosen Erstgespräch zeigen wir, wie dieses Modul konkret in Ihrer Situation helfen kann – ohne Verpflichtung.","buttons":[{"label":"Erstgespräch buchen","href":"/kontakt","variant":"default"},{"label":"Zurück zur Übersicht","href":"/cybersecurity","variant":"outline"}]}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  SELECT jsonb_agg(jsonb_build_object('id', b.id, 'blockType', b.block_type, 'sortOrder', b.sort_order, 'content', b.content, 'settings', b.settings, 'isVisible', b.is_visible) ORDER BY b.sort_order) INTO v_blocks FROM cms_blocks b WHERE b.page_id = v_page_id;
  UPDATE cms_pages SET published_blocks = v_blocks, has_draft_changes = false, published_title = title, published_seo_title = seo_title, published_seo_description = seo_description WHERE id = v_page_id;


  -- ========================================================================
  -- 22. MODULE DETAIL: /loesungen/d1
  -- ========================================================================
  DELETE FROM cms_pages WHERE tenant_id = v_tenant_id AND slug = '/loesungen/d1';

  INSERT INTO cms_pages (tenant_id, slug, title, seo_title, seo_description, status, published_at, created_at, updated_at)
  VALUES (v_tenant_id, '/loesungen/d1', 'KI sicher einführen',
          'D1 – KI sicher einführen | xKMU',
          'KI einführen ohne Sicherheitsrisiken – beides gleichzeitig regeln.',
          'published', v_now, v_now, v_now)
  RETURNING id INTO v_page_id;

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'hero', 0,
    '{"badge":{"text":"Modul D1 · Kombinations-Module"},"headline":"KI sicher einführen","headlineHighlight":"","subheadline":"KI + Security – gemeinsam, nicht nacheinander","size":"small"}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'text', 1,
    '{"content":"Wer KI einführt, ohne die Sicherheitsfragen zu klären, schafft Risiken. Wer Security regelt, ohne die KI-Nutzung zu berücksichtigen, greift zu kurz. Wir machen beides gleichzeitig – abgestimmt, effizient, und mit klaren Regeln für Ihr Team.","alignment":"left"}'::jsonb,
    '{"maxWidth":768,"paddingBottom":0}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'banner', 2,
    '{"text":"KI einführen ohne Sicherheitsrisiken – beides gleichzeitig regeln.","variant":"brand","icon":"Target"}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'service-cards', 3,
    '{"sectionTitle":"Konkrete Ergebnisse – keine Folien","sectionSubtitle":"Was Sie erhalten","columns":2,"items":[{"badge":"D1-1","title":"KI-Nutzungsrichtlinie + Rollenmodell","description":"Verbindliche Unternehmensrichtlinie: erlaubte Tools, verbotene Datenkategorien, Freigabeprozesse. Rollenmodell definiert, wer welche Systeme nutzen darf."},{"badge":"D1-2","title":"Datenklassifikationskonzept","description":"Klare Kategorisierung: Was darf in externe KI-Systeme? Was nur in interne/private Instanzen? Was gar nicht? Mit konkreten Beispielen je Datenkategorie."},{"badge":"D1-3","title":"Prompt-Standards + Freigabeprozesse + Logging","description":"Qualitätsstandards für Prompts, definierter Freigabeprozess für sensible Outputs und Logging-Konzept: Was wird protokolliert, wo, wie lange?"},{"badge":"D1-4","title":"Schnittstellenabsicherung","description":"API-Key-Management, Secrets-Verwaltung, Least-Privilege-Zugriffe für Automations-Accounts, Review-Prozess für neue Integrationen."}]}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'cta', 4,
    '{"headline":"Interesse an Modul D1?","description":"In einem kostenlosen Erstgespräch zeigen wir, wie dieses Modul konkret in Ihrer Situation helfen kann – ohne Verpflichtung.","buttons":[{"label":"Erstgespräch buchen","href":"/kontakt","variant":"default"},{"label":"Zurück zur Übersicht","href":"/loesungen","variant":"outline"}]}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  SELECT jsonb_agg(jsonb_build_object('id', b.id, 'blockType', b.block_type, 'sortOrder', b.sort_order, 'content', b.content, 'settings', b.settings, 'isVisible', b.is_visible) ORDER BY b.sort_order) INTO v_blocks FROM cms_blocks b WHERE b.page_id = v_page_id;
  UPDATE cms_pages SET published_blocks = v_blocks, has_draft_changes = false, published_title = title, published_seo_title = seo_title, published_seo_description = seo_description WHERE id = v_page_id;


  -- ========================================================================
  -- 23. MODULE DETAIL: /loesungen/d2
  -- ========================================================================
  DELETE FROM cms_pages WHERE tenant_id = v_tenant_id AND slug = '/loesungen/d2';

  INSERT INTO cms_pages (tenant_id, slug, title, seo_title, seo_description, status, published_at, created_at, updated_at)
  VALUES (v_tenant_id, '/loesungen/d2', 'Sicher automatisieren',
          'D2 – Sicher automatisieren | xKMU',
          'Automationen mit eingebautem Sicherheitsnetz – nicht nur funktional, sondern beherrschbar.',
          'published', v_now, v_now, v_now)
  RETURNING id INTO v_page_id;

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'hero', 0,
    '{"badge":{"text":"Modul D2 · Kombinations-Module"},"headline":"Sicher automatisieren","headlineHighlight":"","subheadline":"IT + Security – Automationen die kontrolliert laufen","size":"small"}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'text', 1,
    '{"content":"Automationen laufen im Hintergrund – ohne Aufsicht. Genau deshalb müssen sie von Anfang an sicher und kontrollierbar sein. Wir bauen Ihre Automationen mit eingebautem Monitoring, klaren Zugriffsrechten und einem Plan für laufende Wartung.","alignment":"left"}'::jsonb,
    '{"maxWidth":768,"paddingBottom":0}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'banner', 2,
    '{"text":"Automationen mit eingebautem Sicherheitsnetz – nicht nur funktional, sondern beherrschbar.","variant":"brand","icon":"Target"}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'service-cards', 3,
    '{"sectionTitle":"Konkrete Ergebnisse – keine Folien","sectionSubtitle":"Was Sie erhalten","columns":2,"items":[{"badge":"D2-1","title":"Dokumentierte Automationen (sicherheitskonform)","description":"Fertige Workflows mit integriertem Monitoring, Fehlerhandling-Pfaden und Rollback-Mechanismen. Vollständig dokumentiert."},{"badge":"D2-2","title":"Sicherheitskonzept für Automationen","description":"Least-Privilege-Zugriffe, Auditierbarkeit und regelmäßige Überprüfungspunkte. Wer prüft die Automationen wann?"},{"badge":"D2-3","title":"Wartungs- und Update-Konzept","description":"Prozess für den laufenden Betrieb: Wer prüft was in welchem Rhythmus? Wie werden Änderungen dokumentiert und getestet?"}]}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'cta', 4,
    '{"headline":"Interesse an Modul D2?","description":"In einem kostenlosen Erstgespräch zeigen wir, wie dieses Modul konkret in Ihrer Situation helfen kann – ohne Verpflichtung.","buttons":[{"label":"Erstgespräch buchen","href":"/kontakt","variant":"default"},{"label":"Zurück zur Übersicht","href":"/loesungen","variant":"outline"}]}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  SELECT jsonb_agg(jsonb_build_object('id', b.id, 'blockType', b.block_type, 'sortOrder', b.sort_order, 'content', b.content, 'settings', b.settings, 'isVisible', b.is_visible) ORDER BY b.sort_order) INTO v_blocks FROM cms_blocks b WHERE b.page_id = v_page_id;
  UPDATE cms_pages SET published_blocks = v_blocks, has_draft_changes = false, published_title = title, published_seo_title = seo_title, published_seo_description = seo_description WHERE id = v_page_id;


  -- ========================================================================
  -- 24. MODULE DETAIL: /loesungen/d3
  -- ========================================================================
  DELETE FROM cms_pages WHERE tenant_id = v_tenant_id AND slug = '/loesungen/d3';

  INSERT INTO cms_pages (tenant_id, slug, title, seo_title, seo_description, status, published_at, created_at, updated_at)
  VALUES (v_tenant_id, '/loesungen/d3', 'Incident-ready Organisation',
          'D3 – Incident-ready Organisation | xKMU',
          'Handlungsfähig im Ernstfall – IT-Betrieb, Backup und IR aufeinander abgestimmt.',
          'published', v_now, v_now, v_now)
  RETURNING id INTO v_page_id;

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'hero', 0,
    '{"badge":{"text":"Modul D3 · Kombinations-Module"},"headline":"Incident-ready Organisation","headlineHighlight":"","subheadline":"IT + KI + Security – Gesamtpaket Notfallbereitschaft","size":"small"}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'text', 1,
    '{"content":"Notfallbereitschaft ist kein einmaliges Projekt. Sie braucht abgestimmte Prozesse über alle Bereiche: IT-Betrieb, Datensicherung und Incident Response. Wir liefern alles als zusammenhängendes Paket – und halten es durch quartalsweise Reviews aktuell.","alignment":"left"}'::jsonb,
    '{"maxWidth":768,"paddingBottom":0}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'banner', 2,
    '{"text":"Handlungsfähig im Ernstfall – IT-Betrieb, Backup und IR aufeinander abgestimmt.","variant":"brand","icon":"Target"}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'service-cards', 3,
    '{"sectionTitle":"Konkrete Ergebnisse – keine Folien","sectionSubtitle":"Was Sie erhalten","columns":2,"items":[{"badge":"D3-1","title":"IT-Betriebskonzept + Backup/Recovery + IR-Playbooks","description":"Integriertes Gesamtpaket: IT-Betriebsdoku, vollständiges Backup-/Recovery-Konzept mit Restore-Tests und szenariospezifische IR-Playbooks – aufeinander abgestimmt."},{"badge":"D3-2","title":"Awareness-Material + Meldewege + technische Mindeststandards","description":"Mitarbeiter-Schulungsmaterial, dokumentierte Meldewege und technische Mindeststandards als gemeinsame Baseline der gesamten Organisation."},{"badge":"D3-3","title":"Review-Meeting-Konzept","description":"Quartalsweise Überprüfungsstruktur: feste Agenda, Protokollvorlagen, KPI-Tracking. Damit Sicherheit nie den Anschluss an die Wirklichkeit verliert."}]}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'cta', 4,
    '{"headline":"Interesse an Modul D3?","description":"In einem kostenlosen Erstgespräch zeigen wir, wie dieses Modul konkret in Ihrer Situation helfen kann – ohne Verpflichtung.","buttons":[{"label":"Erstgespräch buchen","href":"/kontakt","variant":"default"},{"label":"Zurück zur Übersicht","href":"/loesungen","variant":"outline"}]}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  SELECT jsonb_agg(jsonb_build_object('id', b.id, 'blockType', b.block_type, 'sortOrder', b.sort_order, 'content', b.content, 'settings', b.settings, 'isVisible', b.is_visible) ORDER BY b.sort_order) INTO v_blocks FROM cms_blocks b WHERE b.page_id = v_page_id;
  UPDATE cms_pages SET published_blocks = v_blocks, has_draft_changes = false, published_title = title, published_seo_title = seo_title, published_seo_description = seo_description WHERE id = v_page_id;


  -- ========================================================================
  -- 25. PAKETE & PREISE: /pakete
  -- ========================================================================
  DELETE FROM cms_pages WHERE tenant_id = v_tenant_id AND slug = '/pakete';

  INSERT INTO cms_pages (tenant_id, slug, title, seo_title, seo_description, status, published_at, created_at, updated_at)
  VALUES (v_tenant_id, '/pakete', 'Pakete & Preise',
          'Pakete & Preise | xKMU',
          'Starter ab 490 €, Growth ab 95 €/Std., Scale auf Anfrage, Retainer ab 250 €/Monat.',
          'published', v_now, v_now, v_now)
  RETURNING id INTO v_page_id;

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'hero', 0,
    '{"badge":{"text":"Transparente Preise"},"headline":"Das passende Paket für jede Phase","subheadline":"Kein verstecktes Pricing. Kein Stundensatz-Roulette beim Einstieg. Sie wissen vorher, was Sie bekommen.","size":"small"}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'pricing', 1,
    '{"sectionTitle":"","plans":[{"name":"Starter","price":"ab 490 €","period":"Festpreis","description":"Klarheit schaffen. Potenziale sehen. Sofort wissen, was als nächstes zu tun ist.","features":["KI-Potenzialanalyse oder IT-Assessment oder Security Quick Check","Strukturierter Ergebnisbericht","Konkreter Maßnahmenplan","30-Tage-Roadmap"],"buttonLabel":"Jetzt starten","buttonHref":"/kontakt","highlighted":false},{"name":"Growth","price":"95 €","period":"Stunde","description":"Umsetzung. 1–3 priorisierte Maßnahmen, die wirklich laufen – mit Dokumentation und Einweisung.","features":["1–3 priorisierte Umsetzungen","Vollständige Dokumentation","Schulung & Einweisung","Go-Live + Follow-up"],"buttonLabel":"Growth buchen","buttonHref":"/kontakt","highlighted":true},{"name":"Scale","price":"auf Anfrage","period":"","description":"Systematisch und dauerhaft. Mehrere Workstreams, KPI-Tracking, regelmäßige Reviews.","features":["Roadmap über mehrere Monate","Mehrere parallele Workstreams","Regelmäßige Review-Meetings","KPI-Tracking & Reporting"],"buttonLabel":"Anfragen","buttonHref":"/kontakt","highlighted":false},{"name":"Retainer","price":"ab 250 €","period":"Monat","description":"Fester Ansprechpartner, monatliche Office Hours, laufende Optimierungen und Health-Checks.","features":["Monatliche Office Hours (KI/IT/Security)","Laufende Health-Checks","Support für kleine Anpassungen","Security-Reviews & KPI-Reports"],"buttonLabel":"Retainer buchen","buttonHref":"/kontakt","highlighted":false}]}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  SELECT jsonb_agg(jsonb_build_object('id', b.id, 'blockType', b.block_type, 'sortOrder', b.sort_order, 'content', b.content, 'settings', b.settings, 'isVisible', b.is_visible) ORDER BY b.sort_order) INTO v_blocks FROM cms_blocks b WHERE b.page_id = v_page_id;
  UPDATE cms_pages SET published_blocks = v_blocks, has_draft_changes = false, published_title = title, published_seo_title = seo_title, published_seo_description = seo_description WHERE id = v_page_id;


  -- ========================================================================
  -- 26. REFERENZEN: /referenzen
  -- ========================================================================
  DELETE FROM cms_pages WHERE tenant_id = v_tenant_id AND slug = '/referenzen';

  INSERT INTO cms_pages (tenant_id, slug, title, seo_title, seo_description, status, published_at, created_at, updated_at)
  VALUES (v_tenant_id, '/referenzen', 'Referenzen & Case Studies',
          'Referenzen & Case Studies | xKMU',
          'Wie xKMU in der Praxis wirkt – konkrete Situationen, konkrete Maßnahmen, konkrete Resultate.',
          'published', v_now, v_now, v_now)
  RETURNING id INTO v_page_id;

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'hero', 0,
    '{"badge":{"text":"Echte Projekte"},"headline":"Ergebnisse, keine Versprechen","subheadline":"Wie xKMU in der Praxis wirkt – konkrete Situationen, konkrete Maßnahmen, konkrete Resultate.","size":"small"}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'cards', 1,
    '{"columns":3,"items":[{"icon":"MessageSquare","title":"Fahrschule: Weniger Telefon, mehr planbare Termine","description":"**KI-Beratung · Modul A2, A3**\n\nTäglich viele Standardanfragen per Telefon, WhatsApp und E-Mail – alles blieb am Inhaber hängen. xKMU hat die häufigsten Anfragen analysiert, einen strukturierten Eingang eingerichtet und einen KI-Assistenten für Wiederholfragen aufgebaut.\n\n**Ergebnis:** Weniger Standardanrufe, schnellere Antworten, mehr Planbarkeit"},{"icon":"Wrench","title":"Handwerksbetrieb: Schnellere Angebote, weniger Chaos","description":"**KI-Beratung · IT-Beratung · Modul A2, B3**\n\nAnfragen aus mehreren Kanälen, kein klarer Prozess, Angebote blieben liegen. xKMU hat einen zentralen Eingang, klare Kategorien und KI-Textbausteine für Angebote und Antworten eingeführt.\n\n**Ergebnis:** Schnellerer Angebotsversand und spürbar mehr Struktur im Alltag"},{"icon":"ShieldCheck","title":"Dienstleister: Von 0 auf NIS-2-ready","description":"**Cybersecurity · Modul C1, C3, C4**\n\nKein Backup-Konzept, kein Notfallplan, keine Richtlinien – und Kunden, die zunehmend Nachweise fordern. xKMU hat in drei Modulen die Grundlage geschaffen: Quick Check, Recovery-Konzept und IR-Playbooks.\n\n**Ergebnis:** Audit-fähige Dokumentation und klarer Notfallplan in 6 Wochen"}]}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  INSERT INTO cms_blocks (page_id, tenant_id, block_type, sort_order, content, settings, is_visible, created_at, updated_at)
  VALUES (v_page_id, v_tenant_id, 'cta', 2,
    '{"headline":"Passt etwas davon zu Ihrer Situation?","description":"Im kostenlosen Erstgespräch klären wir, welches Modul den größten Hebel hat.","buttons":[{"label":"Erstgespräch buchen","href":"/kontakt","variant":"default"}]}'::jsonb,
    '{}'::jsonb, true, v_now, v_now);

  SELECT jsonb_agg(jsonb_build_object('id', b.id, 'blockType', b.block_type, 'sortOrder', b.sort_order, 'content', b.content, 'settings', b.settings, 'isVisible', b.is_visible) ORDER BY b.sort_order) INTO v_blocks FROM cms_blocks b WHERE b.page_id = v_page_id;
  UPDATE cms_pages SET published_blocks = v_blocks, has_draft_changes = false, published_title = title, published_seo_title = seo_title, published_seo_description = seo_description WHERE id = v_page_id;


  -- ========================================================================
  -- NAVIGATION: Replace header + footer items
  -- ========================================================================
  DELETE FROM cms_navigation_items WHERE tenant_id = v_tenant_id;

  -- Header navigation
  INSERT INTO cms_navigation_items (tenant_id, location, label, href, sort_order, open_in_new_tab, is_visible, created_at, updated_at) VALUES
    (v_tenant_id, 'header', 'KI-Beratung',        '/ki-beratung',  0, false, true, v_now, v_now),
    (v_tenant_id, 'header', 'IT-Beratung',         '/it-beratung',  1, false, true, v_now, v_now),
    (v_tenant_id, 'header', 'Cybersecurity',       '/cybersecurity', 2, false, true, v_now, v_now),
    (v_tenant_id, 'header', 'Kombinations-Module', '/loesungen',    3, false, true, v_now, v_now),
    (v_tenant_id, 'header', 'Pakete & Preise',     '/pakete',       4, false, true, v_now, v_now),
    (v_tenant_id, 'header', 'Referenzen',          '/referenzen',   5, false, true, v_now, v_now);

  -- Footer navigation
  INSERT INTO cms_navigation_items (tenant_id, location, label, href, sort_order, open_in_new_tab, is_visible, created_at, updated_at) VALUES
    (v_tenant_id, 'footer', 'Kostenlos starten',    '/intern/register', 0, false, true, v_now, v_now),
    (v_tenant_id, 'footer', 'API-Dokumentation',    '/api-docs',        1, false, true, v_now, v_now),
    (v_tenant_id, 'footer', 'Impressum',            '/impressum',       2, false, true, v_now, v_now),
    (v_tenant_id, 'footer', 'Kontakt',              '/kontakt',         3, false, true, v_now, v_now),
    (v_tenant_id, 'footer', 'AGB',                  '/agb',             4, false, true, v_now, v_now),
    (v_tenant_id, 'footer', 'Datenschutz',          '/datenschutz',     5, false, true, v_now, v_now);

  RAISE NOTICE 'CMS Website seed completed: 26 pages + navigation seeded successfully.';
END $$;

COMMIT;
