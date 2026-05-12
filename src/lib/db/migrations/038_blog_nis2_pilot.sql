-- ============================================================
-- Migration 038: NIS-2-Pilot-Blogartikel (P4-02)
--
-- Erster vollwertiger Blog-Artikel als SEO-Anchor fuer den
-- Keyword-Cluster NIS-2 / NIS-2 KMU / NIS-2 Pflichten / NIS-2 Checkliste.
-- ~1.300 Woerter, Inverted-Pyramid-Stil, mehrere CTAs auf /kontakt
-- mit Topic-Parameter und interne Links auf /nis-2 und /cybersecurity.
--
-- Idempotent: existiert der Slug bereits, wird der Inhalt aktualisiert.
-- ============================================================

DO $$
DECLARE
  v_slug text := 'nis-2-fuer-kleine-unternehmen-was-geschaeftsfuehrer-wissen-muessen';
  v_existing_id uuid;
  v_title varchar(255) := 'NIS-2 für kleine Unternehmen: Was Geschäftsführer jetzt wissen müssen';
  v_excerpt text := 'Seit Dezember 2025 gilt das NIS2UmsuCG. Wer ist betroffen, welche Pflichten entstehen, und was sind die fünf konkreten ersten Schritte für KMU?';
  v_seo_title varchar(70) := 'NIS-2 für KMU – Pflichten & erste Schritte | xKMU Blog';
  v_seo_desc varchar(160) := 'NIS-2 verständlich erklärt: Wer ist betroffen, welche Pflichten entstehen, was sind die fünf ersten Schritte? Praxis-Leitfaden für KMU von xKMU.';
  v_content text := E'## Worum geht es?

Seit Dezember 2025 ist das **NIS2UmsuCG** in Deutschland in Kraft — die nationale Umsetzung der EU-Richtlinie **NIS-2**. Sie verpflichtet Unternehmen in 18 kritischen Sektoren zu einem deutlich höheren Cybersecurity-Niveau, inklusive **24-Stunden-Meldepflicht**, **Lieferantensicherheit** und **persönlicher Haftung der Geschäftsführung**. Bußgelder können bis **10 Mio. €** oder **2 % des weltweiten Jahresumsatzes** betragen.

Viele Geschäftsführer kleiner und mittlerer Unternehmen denken: "Das betrifft mich doch nicht." Die ehrliche Antwort lautet: häufig doch — direkt oder indirekt. Dieser Artikel klärt die wichtigsten Fragen und zeigt fünf konkrete erste Schritte.

## Wer ist betroffen?

NIS-2 unterscheidet zwei Kategorien von Pflichten und drei praktische Betroffenheits-Stufen für KMU:

**1. Besonders wichtige Einrichtungen** (essential entities) — Energie, Verkehr, Bankwesen, Finanzmarkt, Gesundheit, Wasser, digitale Infrastruktur, IKT-Service-Management. Pflicht ab 250 Mitarbeitern oder 50 Mio. € Jahresumsatz.

**2. Wichtige Einrichtungen** (important entities) — Post, Abfallwirtschaft, Chemie, Lebensmittel, verarbeitendes Gewerbe, digitale Anbieter, Forschung. Pflicht ab 50 Mitarbeitern oder 10 Mio. € Jahresumsatz.

**3. Indirekt betroffene KMU** — und das ist die in der Praxis größte Gruppe: Zulieferer, Dienstleister und Software-Anbieter, die für NIS-2-pflichtige Unternehmen arbeiten. Diese erhalten die Pflichten **vertraglich weitergereicht**, oft mit sehr detaillierten technischen und organisatorischen Mindestanforderungen. Die vertragliche Verpflichtung kann härter sein als das Gesetz selbst, weil sie kürzere Fristen und konkretere Nachweise verlangt.

Wenn Sie als 30-Personen-Software-Dienstleister einen Energieversorger als Kunden haben, sind Sie *de facto* NIS-2-betroffen — auch wenn das Gesetz Sie nicht direkt nennt.

## Welche Pflichten entstehen?

NIS-2 nennt sechs Kernpflichten, die alle verpflichteten Unternehmen erfüllen müssen:

**1. Risikomanagement-System** — systematische Identifikation, Bewertung und Behandlung aller Cyberrisiken. Dokumentierte Risikoinventur und regelmäßige Reviews.

**2. Incident-Response mit 24-Stunden-Meldepflicht** — Sicherheitsvorfälle müssen innerhalb von 24 Stunden ans BSI gemeldet werden. Das verlangt vorab dokumentierte Playbooks und ein definiertes Incident-Response-Team.

**3. Business-Continuity und Backup** — Notfallplanung, regelmäßig getestete Backups (3-2-1-Regel inkl. Offline-Kopie), dokumentierter Wiederanlaufplan. Backups, die nie restore-getestet wurden, gelten als nicht vorhanden.

**4. Lieferantensicherheit** — aktives Management der Cybersecurity-Risiken aller IT-Dienstleister und Software-Lieferanten. Verträge, Audits, technische Mindestanforderungen.

**5. Schulung und Awareness** — regelmäßige Sicherheitsschulungen für alle Mitarbeiter, simulierte Phishing-Tests, dokumentierte Awareness-Programme. Die Geschäftsleitung ist explizit eingeschlossen.

**6. Verschlüsselung und Multi-Faktor-Authentifizierung** — verschlüsselte Kommunikation und Datenspeicherung, MFA für alle privilegierten Zugriffe, Zero-Trust-Prinzipien wo angemessen.

Hinzu kommt die persönliche Haftung der Geschäftsleitung — Verstöße sind kein abstraktes Unternehmensrisiko mehr, sondern ein direktes persönliches.

## Fünf konkrete erste Schritte

Nicht alles muss am Tag eins fertig sein. Diese fünf Schritte schaffen die Basis und sind für die meisten KMU innerhalb von 3 bis 6 Monaten umsetzbar.

**Schritt 1 — Betroffenheits-Klärung.** Klären Sie schriftlich, ob Sie direkt (über Mitarbeiterzahl/Umsatz/Sektor) oder indirekt (über Kundenverträge) verpflichtet sind. Lassen Sie sich das von Auftraggebern bestätigen, falls Vertragsklauseln unklar sind. Das ist Tag-1-Aufgabe.

**Schritt 2 — Asset-Inventar.** Sie können nichts schützen, was Sie nicht kennen. Erstellen Sie ein aktuelles Inventar aller IT-Systeme, Anwendungen, Datenflüsse und Zugriffsberechtigungen. Excel reicht für den Anfang — Hauptsache vollständig.

**Schritt 3 — Multi-Faktor-Authentifizierung.** MFA für alle Administrator-Zugänge und alle Anwendungen, die personenbezogene oder geschäftskritische Daten verarbeiten. Das ist die wirksamste Einzelmaßnahme, die Sie in wenigen Tagen umsetzen können.

**Schritt 4 — Backup-Test.** Testen Sie die Wiederherstellung Ihres letzten Backups. Bei Ransomware sind Sie auf Backups angewiesen — und 60 % aller KMU stellen im Ernstfall fest, dass ihre Backups defekt oder unvollständig sind. Ein Restore-Test pro Quartal sollte zur Pflicht werden.

**Schritt 5 — Incident-Response-Plan.** Schreiben Sie auf, was bei einem Sicherheitsvorfall zu tun ist: Wer wird angerufen? Wer entscheidet, ob die Hotline gemeldet wird? Wer informiert Kunden? Eine Seite reicht — Hauptsache, sie liegt griffbereit.

Wenn diese fünf Schritte umgesetzt sind, sind Sie nicht NIS-2-konform — aber Sie haben die mit Abstand wirksamsten Bausteine erledigt.

## Wie xKMU hilft

Wir sind auf NIS-2-Beratung für KMU spezialisiert und arbeiten mit Festpreis-Modulen:

- Der **kostenlose Betroffenheits-Check** (30 Minuten) klärt Ihre Pflichten — direkt und indirekt.
- Die **Gap-Analyse** bewertet Ihren Status gegen die zehn NIS-2-Anforderungsbereiche und liefert eine priorisierte Lücken-Liste.
- Der **Maßnahmenplan** trennt Quick-Wins von strategischen Schritten — jede Maßnahme mit Aufwand, Nutzen und Verantwortlichkeit.
- Bei der **Umsetzung** dokumentieren wir alles audit-fähig: Sie bekommen NIS-2-konformen Betrieb plus ein Nachweis-Paket für Prüfungen.

Gründer Tino Stenzel ist BSI-zertifizierter IT-Grundschutz-Praktiker — die NIS-2-Maßnahmen sind in seiner täglichen Beratungspraxis verankert, nicht in einer Schulung von letzter Woche.

## Fazit

NIS-2 ist für viele KMU kein Theorie-Thema, sondern eine Pflicht mit kurzer Umsetzungsfrist und persönlichem Haftungsrisiko der Geschäftsleitung. Auch wer nicht direkt verpflichtet ist, bekommt die Anforderungen oft vertraglich weitergereicht.

Die gute Nachricht: Die wichtigsten Bausteine — MFA, getestete Backups, Asset-Inventar, Incident-Plan — lassen sich strukturiert in wenigen Monaten umsetzen. Und sie sind sowieso überfällig, NIS-2 hin oder her.

**Sie wollen Klarheit über Ihre eigene NIS-2-Situation?** [Buchen Sie einen kostenlosen 30-Minuten-Check](https://www.xkmu.de/kontakt?interesse=NIS-2%20Unterst%C3%BCtzung) — wir geben Ihnen eine ehrliche Einschätzung, kein Verkaufsgespräch. Mehr zu unserer [NIS-2-Beratung](https://www.xkmu.de/nis-2) und unseren [Cybersecurity-Modulen](https://www.xkmu.de/cybersecurity).';
BEGIN
  SELECT id INTO v_existing_id FROM blog_posts WHERE slug = v_slug LIMIT 1;

  IF v_existing_id IS NULL THEN
    INSERT INTO blog_posts (title, slug, excerpt, content, seo_title, seo_description, seo_keywords,
      tags, category, status, published_at, source, in_sitemap)
    VALUES (
      v_title, v_slug, v_excerpt, v_content, v_seo_title, v_seo_desc,
      'NIS-2 KMU, NIS-2 Pflichten, NIS-2 Checkliste, NIS2UmsuCG, IT-Sicherheit Mittelstand',
      ARRAY['NIS-2', 'Cybersecurity', 'Compliance', 'KMU']::text[],
      'Cybersecurity', 'published', now(), 'manual', true
    );
  ELSE
    UPDATE blog_posts SET
      title = v_title,
      excerpt = v_excerpt,
      content = v_content,
      seo_title = v_seo_title,
      seo_description = v_seo_desc,
      seo_keywords = 'NIS-2 KMU, NIS-2 Pflichten, NIS-2 Checkliste, NIS2UmsuCG, IT-Sicherheit Mittelstand',
      tags = ARRAY['NIS-2', 'Cybersecurity', 'Compliance', 'KMU']::text[],
      category = 'Cybersecurity',
      status = 'published',
      published_at = COALESCE(published_at, now()),
      updated_at = now()
    WHERE id = v_existing_id;
  END IF;
END $$;
