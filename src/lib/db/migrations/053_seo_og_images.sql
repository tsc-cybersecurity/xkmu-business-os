-- ============================================================
-- Migration 053: OG-Bilder pro Hauptseite via dynamischer
--                /api/og-Route setzen
--
-- Die OG-Route generiert 1200x630-PNGs mit Pillar-Farbe, Titel
-- und Untertitel. Setzt cms_pages.og_image (+published_og_image
-- falls Spalte vorhanden — ueber Konditional) auf einen URL
-- mit Query-Params ?t=...&s=...&p=<pillar>.
--
-- Idempotent: pure UPDATEs.
-- ============================================================

UPDATE cms_pages SET
  og_image = '/api/og?t=xKMU%20%E2%80%93%20KI%2C%20IT%20%26%20Cybersecurity%20f%C3%BCr%20KMU&s=Aus%20Weimar%20in%20Th%C3%BCringen%20%E2%80%93%20Festpreise%2C%20Umsetzung%20in%20Wochen&p=default',
  updated_at = now()
WHERE slug = '/';

UPDATE cms_pages SET
  og_image = '/api/og?t=KI-Beratung%20f%C3%BCr%20KMU%20in%20Th%C3%BCringen&s=Potenzialanalyse%2C%20Automation%2C%20Assistenten%20%E2%80%93%20pragmatisch%20und%20mit%20Festpreis&p=ki',
  updated_at = now()
WHERE slug = '/ki-beratung';

UPDATE cms_pages SET
  og_image = '/api/og?t=IT-Beratung%20f%C3%BCr%20KMU%20%E2%80%93%20Weimar%20%26%20remote&s=Assessment%2C%20Architektur%2C%20Betrieb%20%E2%80%93%20modular%20zubuchbar&p=it',
  updated_at = now()
WHERE slug = '/it-beratung';

UPDATE cms_pages SET
  og_image = '/api/og?t=Cybersecurity-Beratung%20f%C3%BCr%20KMU&s=NIS-2%2C%20Hardening%2C%20Backup%20%E2%80%93%20dokumentiert%20und%20nachweisbar&p=cyber',
  updated_at = now()
WHERE slug = '/cybersecurity';

UPDATE cms_pages SET
  og_image = '/api/og?t=NIS-2-Compliance%20f%C3%BCr%20KMU&s=Pflichten%2C%20Selbstcheck%2C%20Umsetzung%20%E2%80%93%20mit%20Festpreis-Ma%C3%9Fnahmen&p=nis2',
  updated_at = now()
WHERE slug = '/nis-2';

UPDATE cms_pages SET
  og_image = '/api/og?t=KI%2C%20IT%20%26%20Cybersecurity%20aus%20einer%20Hand&s=Drei%20Kombi-Module%20f%C3%BCr%20KMU%20%E2%80%93%20ein%20Ansprechpartner%2C%20ein%20Festpreis&p=default',
  updated_at = now()
WHERE slug = '/loesungen';

UPDATE cms_pages SET
  og_image = '/api/og?t=%C3%9Cber%20xKMU%20%E2%80%93%20IT-Beratung%20aus%20Weimar&s=Seit%20dem%20Jahr%202000%20in%20der%20IT%20%E2%80%93%20BSI%20IT-Grundschutz-Praktiker&p=default',
  updated_at = now()
WHERE slug = '/ueber-uns';

UPDATE cms_pages SET
  og_image = '/api/og?t=Kontakt%20%26%20Erstgespr%C3%A4ch&s=Kostenlos%20%C2%B7%20Vor%20Ort%20in%20Th%C3%BCringen%20%C2%B7%20remote%20m%C3%B6glich&p=default',
  updated_at = now()
WHERE slug = '/kontakt';

UPDATE cms_pages SET
  og_image = '/api/og?t=Kostenlose%20Onlinekurse%20f%C3%BCr%20KMU&s=IT-Sicherheit%2C%20KI-Grundlagen%20und%20Compliance%20%E2%80%93%20ohne%20Anmeldung&p=default',
  updated_at = now()
WHERE slug = '/kurse';

-- published_og_image-Spalte updaten falls vorhanden (manche Schemas haben sie)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cms_pages' AND column_name = 'published_og_image'
  ) THEN
    UPDATE cms_pages SET published_og_image = og_image, updated_at = now()
    WHERE slug IN (
      '/', '/ki-beratung', '/it-beratung', '/cybersecurity',
      '/nis-2', '/loesungen', '/ueber-uns', '/kontakt', '/kurse'
    );
  END IF;
END $$;
