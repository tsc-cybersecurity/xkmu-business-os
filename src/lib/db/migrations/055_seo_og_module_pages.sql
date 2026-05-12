-- ============================================================
-- Migration 055: OG-Bilder fuer 19 Modul-Detailseiten
--
-- Nutzt die /api/og-Route (siehe Migration 053 + src/app/api/og)
-- mit pro Pillar passender Farbe (ki/it/cyber + default fuer
-- Loesungen D-Module). Jedes Modul bekommt Titel + Subtitle aus
-- der jeweiligen H1/Subheadline (Migration 050).
--
-- Helper-Function fuer URL-Encoding deutscher Sonderzeichen +
-- Standard-Reserved-Chars wird inline angelegt und am Ende
-- wieder gedroppt.
-- ============================================================

-- ─── URL-Encode-Helper ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION xkmu_url_encode_de(input text) RETURNS text AS $$
DECLARE
  result text := input;
BEGIN
  -- ERST das Prozent-Zeichen, sonst werden eingefuehrte %-Codes doppelt encoded
  result := replace(result, '%', '%25');
  result := replace(result, ' ', '%20');
  result := replace(result, 'ä', '%C3%A4');
  result := replace(result, 'ö', '%C3%B6');
  result := replace(result, 'ü', '%C3%BC');
  result := replace(result, 'ß', '%C3%9F');
  result := replace(result, 'Ä', '%C3%84');
  result := replace(result, 'Ö', '%C3%96');
  result := replace(result, 'Ü', '%C3%9C');
  result := replace(result, '–', '%E2%80%93');
  result := replace(result, '&', '%26');
  result := replace(result, ',', '%2C');
  result := replace(result, '?', '%3F');
  result := replace(result, ':', '%3A');
  result := replace(result, '/', '%2F');
  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ─── KI-Beratung A1-A5 (pillar=ki) ──────────────────────────────────
UPDATE cms_pages SET og_image =
  '/api/og?t=' || xkmu_url_encode_de('KI-Potenzialanalyse für KMU')
  || '&s=' || xkmu_url_encode_de('Die 3 besten Use-Cases finden – mit Backlog, Roadmap und Guardrails')
  || '&p=ki', updated_at = now()
WHERE slug LIKE '/ki-beratung/a1-%';

UPDATE cms_pages SET og_image =
  '/api/og?t=' || xkmu_url_encode_de('KI-Automatisierung für KMU')
  || '&s=' || xkmu_url_encode_de('Routinen ersetzen statt verwalten – mit Tests und Dokumentation')
  || '&p=ki', updated_at = now()
WHERE slug LIKE '/ki-beratung/a2-%';

UPDATE cms_pages SET og_image =
  '/api/og?t=' || xkmu_url_encode_de('KI-Assistenten & Chatbots')
  || '&s=' || xkmu_url_encode_de('Eigene Assistenten aufbauen – Setup, Leitfäden, KPIs')
  || '&p=ki', updated_at = now()
WHERE slug LIKE '/ki-beratung/a3-%';

UPDATE cms_pages SET og_image =
  '/api/og?t=' || xkmu_url_encode_de('KI-Governance für KMU')
  || '&s=' || xkmu_url_encode_de('Prompt-Playbook, Templates, Regeln – Schluss mit KI-Wildwuchs')
  || '&p=ki', updated_at = now()
WHERE slug LIKE '/ki-beratung/a4-%';

UPDATE cms_pages SET og_image =
  '/api/og?t=' || xkmu_url_encode_de('KI-Schulungen für KMU')
  || '&s=' || xkmu_url_encode_de('Teams nachhaltig befähigen – mit Unterlagen, Checklisten, Übungen')
  || '&p=ki', updated_at = now()
WHERE slug LIKE '/ki-beratung/a5-%';

-- ─── IT-Beratung B1-B5 (pillar=it) ──────────────────────────────────
UPDATE cms_pages SET og_image =
  '/api/og?t=' || xkmu_url_encode_de('IT-Assessment für KMU')
  || '&s=' || xkmu_url_encode_de('Klarheit über Risiken und Quick-Fixes – mit Roadmap-Empfehlung')
  || '&p=it', updated_at = now()
WHERE slug LIKE '/it-beratung/b1-%';

UPDATE cms_pages SET og_image =
  '/api/og?t=' || xkmu_url_encode_de('IT-Architektur für KMU')
  || '&s=' || xkmu_url_encode_de('Cloud, Hybrid, M365 zukunftsfähig planen – mit Migrationspfad')
  || '&p=it', updated_at = now()
WHERE slug LIKE '/it-beratung/b2-%';

UPDATE cms_pages SET og_image =
  '/api/og?t=' || xkmu_url_encode_de('Systemintegration für KMU')
  || '&s=' || xkmu_url_encode_de('Medienbrüche beseitigen – CRM, ERP, M365 verbinden')
  || '&p=it', updated_at = now()
WHERE slug LIKE '/it-beratung/b3-%';

UPDATE cms_pages SET og_image =
  '/api/og?t=' || xkmu_url_encode_de('IT-Betrieb & Monitoring')
  || '&s=' || xkmu_url_encode_de('Weniger Ausfälle, schnellere Fehlerbehebung – mit Dokumentation')
  || '&p=it', updated_at = now()
WHERE slug LIKE '/it-beratung/b4-%';

UPDATE cms_pages SET og_image =
  '/api/og?t=' || xkmu_url_encode_de('Arbeitsplatz-IT für KMU')
  || '&s=' || xkmu_url_encode_de('Einheitlich standardisieren – weniger Support, mehr Tempo')
  || '&p=it', updated_at = now()
WHERE slug LIKE '/it-beratung/b5-%';

-- ─── Cybersecurity C1-C6 (pillar=cyber) ─────────────────────────────
UPDATE cms_pages SET og_image =
  '/api/og?t=' || xkmu_url_encode_de('Security Quick-Check für KMU')
  || '&s=' || xkmu_url_encode_de('Risiken in 5 Tagen sichtbar – mit Risikoreport und Roadmap')
  || '&p=cyber', updated_at = now()
WHERE slug LIKE '/cybersecurity/c1-%';

UPDATE cms_pages SET og_image =
  '/api/og?t=' || xkmu_url_encode_de('Hardening & Sicherheitsbaselines')
  || '&s=' || xkmu_url_encode_de('M365, Endpoint, Server, Netzwerk – dokumentiert und NIS-2-konform')
  || '&p=cyber', updated_at = now()
WHERE slug LIKE '/cybersecurity/c2-%';

UPDATE cms_pages SET og_image =
  '/api/og?t=' || xkmu_url_encode_de('Backup & Ransomware-Schutz')
  || '&s=' || xkmu_url_encode_de('3-2-1-Backup mit Restore-Test – im Ernstfall wirklich handlungsfähig')
  || '&p=cyber', updated_at = now()
WHERE slug LIKE '/cybersecurity/c3-%';

UPDATE cms_pages SET og_image =
  '/api/og?t=' || xkmu_url_encode_de('Incident-Response für KMU')
  || '&s=' || xkmu_url_encode_de('Playbooks, Eskalation, Templates – vorbereitet statt überrascht')
  || '&p=cyber', updated_at = now()
WHERE slug LIKE '/cybersecurity/c4-%';

UPDATE cms_pages SET og_image =
  '/api/og?t=' || xkmu_url_encode_de('Security-Awareness für KMU')
  || '&s=' || xkmu_url_encode_de('Phishing-resistent durch Simulation, Schulung, messbare Klickraten')
  || '&p=cyber', updated_at = now()
WHERE slug LIKE '/cybersecurity/c5-%';

UPDATE cms_pages SET og_image =
  '/api/og?t=' || xkmu_url_encode_de('Datenschutz & Compliance')
  || '&s=' || xkmu_url_encode_de('DSGVO und NIS-2 pragmatisch umsetzen – ohne 200-Seiten-Konzept')
  || '&p=cyber', updated_at = now()
WHERE slug LIKE '/cybersecurity/c6-%';

-- ─── Lösungen D1-D3 (Kombi-Module, pillar=default) ──────────────────
UPDATE cms_pages SET og_image =
  '/api/og?t=' || xkmu_url_encode_de('KI sicher einführen')
  || '&s=' || xkmu_url_encode_de('Kombi-Modul: KI, IT-Architektur und Security in einem Projekt')
  || '&p=default', updated_at = now()
WHERE slug LIKE '/loesungen/d1-%';

UPDATE cms_pages SET og_image =
  '/api/og?t=' || xkmu_url_encode_de('Sicher automatisieren')
  || '&s=' || xkmu_url_encode_de('Kombi-Modul: Workflow + Zugriffskontrolle + Audit-Logs')
  || '&p=default', updated_at = now()
WHERE slug LIKE '/loesungen/d2-%';

UPDATE cms_pages SET og_image =
  '/api/og?t=' || xkmu_url_encode_de('Incident-ready Organisation')
  || '&s=' || xkmu_url_encode_de('Kombi-Modul: Backup + Incident-Response + Krisenkommunikation')
  || '&p=default', updated_at = now()
WHERE slug LIKE '/loesungen/d3-%';

-- ─── published_og_image spiegeln falls Spalte vorhanden ─────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cms_pages' AND column_name = 'published_og_image'
  ) THEN
    UPDATE cms_pages SET published_og_image = og_image, updated_at = now()
    WHERE slug LIKE '/ki-beratung/a%'
       OR slug LIKE '/it-beratung/b%'
       OR slug LIKE '/cybersecurity/c%'
       OR slug LIKE '/loesungen/d%';
  END IF;
END $$;

-- ─── Helper-Funktion entfernen ──────────────────────────────────────
DROP FUNCTION xkmu_url_encode_de(text);
