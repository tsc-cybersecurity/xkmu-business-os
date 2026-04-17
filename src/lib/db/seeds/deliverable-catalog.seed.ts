import { db } from '@/lib/db'
import { deliverableModules } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { DeliverableService } from '@/lib/services/deliverable.service'
import { logger } from '@/lib/utils/logger'
import { TENANT_ID } from '@/lib/constants/tenant'

const MOD = 'DeliverableSeed'

// ============================================================
// Source: temp/xKMU_Deliverable_Katalog_v1 (1).json
// Modules: A1-A5 (KI-Beratung), B1-B5 (IT-Beratung),
//          C1-C3 (Cybersecurity), D1-D3 (Schnittstellen-Module)
// Total: 16 modules, 70 deliverables
// ============================================================

const MODULES = [
  // ── Kategorie A: KI-Beratung ──────────────────────────────────────────
  {
    code: 'A1',
    name: 'KI-Quick-Start & Potenzialanalyse',
    categoryCode: 'A',
    category: 'KI-Beratung',
    ziel: 'In kurzer Zeit herausfinden, wo KI wirklich lohnt und was zuerst umgesetzt wird.',
    preis: '490 EUR Festpreis, Vorauszahlung',
    deliverables: [
      {
        name: 'Use-Case-Backlog mit Priorisierung',
        description: 'Vollstaendige Liste aller identifizierten KI-Anwendungsfaelle aus dem Workshop, bewertet nach Nutzen, Aufwand, Risiko und ROI. Jeder Use Case hat eine klare Priorisierungsstufe (Hoch / Mittel / Niedrig) und eine Aufwandsschaetzung in Tagen.',
        format: 'Excel / Notion-Tabelle',
        umfang: '1-2 Seiten',
        trigger: 'Nach Workshop Teil 2',
      },
      {
        name: 'KI-Roadmap',
        description: 'Zeitlicher Umsetzungsplan mit Quick-Wins (sofort umsetzbar), mittelfristigen Massnahmen (30-60-90 Tage) und strategischen Zielen (6 Monate). Enthalt Abhaengigkeiten und Meilensteine.',
        format: 'PDF / Word',
        umfang: '1-2 Seiten',
        trigger: 'Mit Massnahmenplan',
      },
      {
        name: 'Aufwand/Nutzen-Schaetzung je Use Case',
        description: 'Fuer jeden priorisierten Use Case eine strukturierte Schaetzung: Implementierungsaufwand in Stunden, erwarteter Nutzen (Zeit/Kosten/Qualitaet), Amortisierungszeitraum und empfohlenes Tool.',
        format: 'Excel / Tabelle im Ergebnisbericht',
        umfang: 'Teil des Ergebnisberichts',
        trigger: 'Nach Bewertungsphase',
      },
      {
        name: 'Leitplanken-Dokument (Guardrails)',
        description: 'Verbindliche Spielregeln fuer den KI-Einsatz im Unternehmen: Datenschutzanforderungen, Rollenverteilung (wer darf KI wie einsetzen), Qualitaetsregeln fuer KI-Outputs und Eskalationspfade bei Unsicherheiten.',
        format: 'Word / PDF',
        umfang: '1-2 Seiten',
        trigger: 'Mit Ergebnisbericht',
      },
      {
        name: 'Massnahmenplan / Ergebnisbericht (PDF)',
        description: 'Professionelles PDF-Dokument fuer die Geschaeftsfuehrung: Zusammenfassung der Analyse, Top-3 KI-Potenziale mit Nutzen und Tool-Empfehlung, Zeitplan fuer Umsetzung, naechste Schritte. Min. 20% manuell personalisiert.',
        format: 'PDF',
        umfang: '4-8 Seiten',
        trigger: 'Abschluss Workshop',
      },
      {
        name: '30-Tage-Schnelleinstieg-Plan',
        description: 'Konkreter Aktionsplan fuer die ersten 30 Tage nach dem Workshop: Welche 3 Massnahmen werden sofort angegangen, wer ist verantwortlich, welche Tools werden benoetigt, was kostet es.',
        format: '1 Seite PDF / Notion',
        umfang: '1 Seite',
        trigger: 'Mit Ergebnisbericht',
      },
      {
        name: 'Workshop-Folien (personalisiert)',
        description: 'Individualisierte Praesentation mit Kundenlogo, branchenspezifischen KI-Beispielen und ausgefuelltem Miro-Board-Export. Dient als Arbeitsgrundlage und Erinnerungsanker fuer den Kunden.',
        format: 'PDF / PowerPoint',
        umfang: '10-20 Folien',
        trigger: 'Nach Workshop',
      },
    ],
  },
  {
    code: 'A2',
    name: 'KI-Implementierung - Automationen & Workflows',
    categoryCode: 'A',
    category: 'KI-Beratung',
    ziel: 'Wiederkehrende Arbeit reduzieren, Fehler vermeiden, Durchlaufzeiten verkuerzen.',
    preis: '95 EUR/Std., Aufwand nach Angebot',
    deliverables: [
      {
        name: 'Laufende Automation (konfiguriert & in Betrieb)',
        description: 'Die fertig eingerichtete und getestete Automatisierungs-Loesung im Kundensystem. Umfasst Trigger-Konfiguration, Aktionslogik, Fehlerhandling, Monitoring-Alerting und alle notwendigen Integrationen (CRM, Mail, Kalender etc.).',
        format: 'Live-System (Zapier / Make / n8n)',
        umfang: 'Funktionsfaehige Loesung',
        trigger: 'Nach Implementierung & Tests',
      },
      {
        name: 'Workflow-Dokumentation / Prozessdiagramm',
        description: 'Visuelles Diagramm des automatisierten Prozesses mit allen Schritten, Entscheidungspunkten, beteiligten Systemen und Datenfluss. Dient als Referenz fuer Anpassungen und neue Mitarbeiter.',
        format: 'Notion / PDF mit Diagramm',
        umfang: '1-3 Seiten',
        trigger: 'Waehrend Implementierung',
      },
      {
        name: 'Testprotokoll',
        description: 'Dokumentierter Nachweis aller Testfaelle: mindestens 10 Szenarien (Normalfall, Randfaelle, Fehlerfaelle, Edge Cases). Jeder Test mit Status Bestanden/Offen, Datum und Tester. KI-generierte Testfaelle, manuell durchgefuehrt.',
        format: 'Excel / Notion-Tabelle',
        umfang: '10+ Testfaelle',
        trigger: 'Vor Uebergabe an Kunden',
      },
      {
        name: 'Betriebshinweise & Monitoring-Konfiguration',
        description: 'Dokumentation was im laufenden Betrieb zu beachten ist: Wann laeuft die Automation, wie erkenne ich Fehler, wer wird bei Fehler per Alert benachrichtigt, wie pausiere ich die Automation bei Bedarf.',
        format: 'Notion / Word (max. 1 Seite)',
        umfang: '1 Seite',
        trigger: 'Mit Uebergabe',
      },
      {
        name: 'Bedien-/Nutzerdokumentation',
        description: 'Verstaendliche Anleitung fuer den Kunden ohne Technikwissen: Was macht die Automation, wie starte/stoppe ich sie, wie aendere ich einfache Einstellungen, was tue ich bei typischen Fehlern. Kein Fachjargon.',
        format: 'Word / PDF, max. 2 Seiten',
        umfang: 'Max. 2 Seiten',
        trigger: 'Vor Schulung',
      },
      {
        name: 'Schulungs-Handout',
        description: 'Kompaktes Begleitdokument zur 60-90-minutigen Schulung: Kurzanleitung, Screenshots der wichtigsten Schritte, Support-Kontakt und Reaktionszeit. Wird direkt nach der Schulung per E-Mail versendet.',
        format: 'PDF, max. 2 Seiten',
        umfang: 'Max. 2 Seiten',
        trigger: 'Direkt nach Schulung',
      },
      {
        name: 'Abnahmeprotokoll (digital signiert)',
        description: 'Formelle Projektabnahme via DocuSign/PandaDoc mit allen Projektdetails: Lieferumfang, Testphasendatum, Schulungsdatum, Unterschrift des Kunden. Loest automatisch CRM-Update und Feedback-Anfrage aus.',
        format: 'PDF / digital signiert',
        umfang: '1 Seite',
        trigger: 'Nach 1 Woche Testbetrieb',
      },
    ],
  },
  {
    code: 'A3',
    name: 'KI-Assistenten & Chatbots',
    categoryCode: 'A',
    category: 'KI-Beratung',
    ziel: 'Schnellere Antworten, konsistente Kommunikation, weniger Supportlast.',
    preis: '95 EUR/Std., Aufwand nach Angebot',
    deliverables: [
      {
        name: 'Bot-Setup (konfiguriert & in Betrieb)',
        description: 'Vollstaendig eingerichteter KI-Assistent mit definierten Intents, Wissensquellen, Tonalitaet und Grenzen (was der Bot nicht darf). Angebunden an Kundensysteme (Website, CRM, Mail).',
        format: 'Live-System',
        umfang: 'Funktionsfaehige Loesung',
        trigger: 'Nach Tests',
      },
      {
        name: 'Wissensbasis-Blueprint',
        description: 'Strukturiertes Dokument der Wissensquellen: Welche Dokumente/FAQs wurden aufgenommen, wie sind sie gegliedert, wer ist verantwortlich fuer Aktualisierungen, wie oft wird die Wissensbasis gepflegt.',
        format: 'Notion / Word',
        umfang: '2-4 Seiten',
        trigger: 'Waehrend Aufbau',
      },
      {
        name: 'Gespraechsleitfaeden & Eskalationslogik',
        description: 'Dokumentierte Gespraechspfade fuer die wichtigsten Anfragetypen: Wie reagiert der Bot auf typische Fragen, wann und wie eskaliert er an einen Menschen, wie lauten die Uebergabe-Nachrichten.',
        format: 'Word / PDF mit Flussdiagramm',
        umfang: '3-5 Seiten',
        trigger: 'Vor Inbetriebnahme',
      },
      {
        name: 'KPI-Set fuer Bot-Performance',
        description: 'Definiertes Kennzahlen-Set zur laufenden Erfolgsmessung: Deflection Rate (Anteil ohne Mensch bearbeitet), Zufriedenheitsscore, durchschnittliche Response Time, haeufigste ungeloeste Anfragen.',
        format: 'Excel / Dashboard-Konfiguration',
        umfang: 'Konfiguriertes Dashboard',
        trigger: 'Mit Inbetriebnahme',
      },
      {
        name: 'Qualitaets- und Sicherheitsregeln',
        description: 'Verbindliches Regelwerk fuer den Bot-Betrieb: Quellenhinweis-Pflicht, Themen-Ausschluesse, Datenschutz-Grenzen (keine personenbezogenen Daten verarbeiten), Freigabeprozess fuer Wissensaenderungen.',
        format: 'Word / PDF, 1-2 Seiten',
        umfang: '1-2 Seiten',
        trigger: 'Vor Go-Live',
      },
    ],
  },
  {
    code: 'A4',
    name: 'Prompting, Templates & Governance',
    categoryCode: 'A',
    category: 'KI-Beratung',
    ziel: 'Einheitliche Qualitaet, weniger Risiko, schnellere Ergebnisse im Team - kein KI-Wildwuchs.',
    preis: '95 EUR/Std.',
    deliverables: [
      {
        name: 'Prompt-Playbook (rollenbasiert)',
        description: 'Strukturierte Sammlung einsatzbereiter Prompts fuer alle Kernrollen im Unternehmen: Vertrieb (Angebote, Follow-ups), Support (Antwortvorlagen), Backoffice (Dokumentation, Berichte), Marketing (Content, Social Media). Jeder Prompt mit Erklaerung und Anwendungsbeispiel.',
        format: 'Notion-Datenbank / Word',
        umfang: '20-50 Prompts',
        trigger: 'Abschluss Modul',
      },
      {
        name: 'Template-Sammlung',
        description: 'Fertige Vorlagen fuer haeufige Aufgaben: Angebotsvorlage, E-Mail-Vorlagen (Erstantwort, Follow-up, Abschluss), SOP-Vorlage, Bericht-Template, Newsletter-Vorlage, Social-Media-Vorlage. Alle direkt einsetzbar.',
        format: 'Word / Notion / Google Docs',
        umfang: '10-20 Templates',
        trigger: 'Abschluss Modul',
      },
      {
        name: 'Governance-Kit',
        description: 'Vollstaendiges Steuerungspaket fuer KI im Unternehmen: KI-Nutzungsrichtlinie (Do/Don\'t), Freigabeablauf fuer neue Prompts/Templates, Rollendefinition (wer darf was), Ueberpruefungsturnus.',
        format: 'Word / PDF',
        umfang: '3-5 Seiten',
        trigger: 'Abschluss Modul',
      },
      {
        name: 'Datenklassifikations-Matrix',
        description: 'Uebersichtstabelle welche Datentypen in welche KI-Systeme eingegeben werden duerfen: oeffentliche Daten (alle KI-Systeme OK), interne Daten (nur lokale LLMs), personenbezogene Daten (nie in externe KI ohne Pruefung).',
        format: 'Excel / Tabelle',
        umfang: '1 Seite',
        trigger: 'Mit Governance-Kit',
      },
    ],
  },
  {
    code: 'A5',
    name: 'KI-Schulungen & Enablement',
    categoryCode: 'A',
    category: 'KI-Beratung',
    ziel: 'Mitarbeiter befaehigen, damit Loesungen langfristig genutzt und weiterentwickelt werden.',
    preis: '450 EUR / 5-Std.-Paket (90 EUR/Std.)',
    deliverables: [
      {
        name: 'Schulungsunterlagen (Folien + Handout)',
        description: 'Vollstaendige Kursunterlagen: Praesentation mit Lernzielen, Erklaerungen, Screenshots und Beispielen. Begleitendes Handout als Kurzreferenz zum Nachschlagen nach der Schulung. Angepasst an Zielgruppe und Branche.',
        format: 'PDF / PowerPoint + Handout PDF',
        umfang: 'Folien + 2-4 Seiten Handout',
        trigger: 'Schulungstag',
      },
      {
        name: 'Uebungsaufgaben mit Loesungen',
        description: 'Praktische Uebungen an realen oder realistischen Kundendaten: 5-10 Aufgaben mit steigendem Schwierigkeitsgrad, vollstaendige Musterloesungen mit Erklaerungen, Varianten fuer unterschiedliche Rollen.',
        format: 'Word / PDF',
        umfang: '5-10 Aufgaben',
        trigger: 'Schulungstag',
      },
      {
        name: 'Checklisten (Qualitaet, Datenschutz, Freigabe)',
        description: 'Drei praxisnahe Checklisten: (1) Qualitaets-Checkliste fuer KI-Outputs vor Verwendung, (2) Datenschutz-Checkliste was geprueft werden muss, (3) Freigabe-Checkliste vor Einsatz neuer Prompts im Team.',
        format: 'PDF (laminierbar)',
        umfang: 'Je 1 Seite',
        trigger: 'Schulungsende',
      },
      {
        name: 'Best-Practice-Bibliothek',
        description: 'Wachsende interne Sammlung von erprobten Ansaetzen: Was hat in der Praxis funktioniert, welche Prompts liefern konsistent gute Ergebnisse, welche Tools empfehlen sich fuer welche Aufgaben. Wird nach der Schulung vom Team gepflegt.',
        format: 'Notion-Datenbank',
        umfang: 'Starter: 10-20 Eintraege',
        trigger: 'Nach Schulung',
      },
    ],
  },

  // ── Kategorie B: IT-Beratung ──────────────────────────────────────────
  {
    code: 'B1',
    name: 'IT-Assessment & Stabilitaetscheck',
    categoryCode: 'B',
    category: 'IT-Beratung',
    ziel: 'Klarheit ueber Zustand, Risiken, technische Schulden und Quick-Fixes.',
    preis: '490 EUR Festpreis oder 95 EUR/Std.',
    deliverables: [
      {
        name: 'IT-Health-Report',
        description: 'Vollstaendiger Zustandsbericht der IT-Infrastruktur: Inventarliste (Clients, Server, Cloud, Netzwerk, Identitaeten, Tools), Bewertung nach Stabilitaet/Sicherheit/Aktualitaet, priorisierte Risikoliste (Hoch/Mittel/Niedrig), Quick-Fix-Empfehlungen.',
        format: 'PDF / Word',
        umfang: '5-10 Seiten',
        trigger: 'Nach Inventar & Analyse',
      },
      {
        name: 'Quick-Fix-Liste',
        description: 'Sofort umsetzbare Massnahmen ohne Budget oder grosse Eingriffe: Software-Updates nachholen, Standard-Passwoerter aendern, unnoetige offene Ports schliessen, 2FA aktivieren. Je Punkt: Beschreibung, Zeitaufwand, Wirkung.',
        format: '1-2 Seiten PDF',
        umfang: '5-15 Massnahmen',
        trigger: 'Mit Health-Report',
      },
      {
        name: 'Mittelfristige IT-Roadmap',
        description: 'Planung der naechsten 3-12 Monate: Welche IT-Investitionen sind notwendig, in welcher Reihenfolge, mit welchem Aufwand und Budget. Priorisiert nach Risiko und Betriebsnotwendigkeit.',
        format: 'Excel / Gantt-Chart PDF',
        umfang: '1-2 Seiten',
        trigger: 'Mit Health-Report',
      },
      {
        name: 'Kosten-/Lizenz-Optimierungsliste',
        description: 'Uebersicht aller identifizierten Einsparmoeglichkeiten: Doppelte Lizenzen, ungenutzte Abos, guenstigere Alternativen mit gleichem Funktionsumfang, Schatten-IT-Konsolidierung. Mit geschaetztem Einsparpotenzial je Punkt.',
        format: 'Excel / Tabelle',
        umfang: '1 Seite',
        trigger: 'Mit Health-Report',
      },
    ],
  },
  {
    code: 'B2',
    name: 'IT-Architektur & Modernisierung',
    categoryCode: 'B',
    category: 'IT-Beratung',
    ziel: 'Zukunftsfaehige IT, die nicht zufaellig gewachsen ist.',
    preis: '95 EUR/Std., Aufwand nach Angebot',
    deliverables: [
      {
        name: 'IT-Zielbild (Architekturdiagramm)',
        description: 'Visuelles Diagramm der Ziel-IT-Landschaft: alle Systeme, deren Verbindungen, Datenfluesse, Zugriffsmodelle und Verantwortlichkeiten. Mit Beschriftungen und Legende. Dient als Referenz fuer alle Beteiligten.',
        format: 'Visio / Draw.io / PDF',
        umfang: '1-3 Diagramme',
        trigger: 'Abschluss Planungsphase',
      },
      {
        name: 'Migrations-Roadmap',
        description: 'Phasenplan fuer die Migration: Welche Systeme werden wann migriert, welche Abhaengigkeiten gibt es, wie werden Risiken minimiert, wie lange ist die Downtime, wer fuehrt was durch, wann wird getestet.',
        format: 'Excel / Projektplan PDF',
        umfang: '3-8 Seiten',
        trigger: 'Nach Zielbild-Freigabe',
      },
      {
        name: 'Konfigurationsstandards-Dokument',
        description: 'Verbindliche Standards fuer die gesamte IT: Namenskonventionen (Accounts, Server, Ordner), Rollen/Rechte-Modell, Passwort-Policy, Update-Rhythmus, Backup-Frequenz. Gilt fuer alle zukuenftigen Aenderungen.',
        format: 'Word / PDF',
        umfang: '3-6 Seiten',
        trigger: 'Abschluss Modul',
      },
      {
        name: 'Betriebsleitfaden / Runbooks',
        description: 'Schritt-fuer-Schritt-Anleitungen fuer die neue Architektur: Wie werden neue Mitarbeiter angelegt, wie werden Updates eingespielt, wie wird ein neues Geraet konfiguriert, wie reagiert man bei typischen Problemen.',
        format: 'Notion / Word',
        umfang: '5-15 Runbooks',
        trigger: 'Abschluss Implementierung',
      },
    ],
  },
  {
    code: 'B3',
    name: 'Systemintegration & Prozess-IT',
    categoryCode: 'B',
    category: 'IT-Beratung',
    ziel: 'Systeme verbinden, Medienbueche entfernen, Ablaeufe vereinheitlichen.',
    preis: '95 EUR/Std., Aufwand nach Angebot',
    deliverables: [
      {
        name: 'Integrierte Prozesse (live & dokumentiert)',
        description: 'Die fertig eingerichteten Systemverbindungen (CRM-Mail, CRM-Kalender, Formular-Ticket, etc.) - konfiguriert, getestet und in Betrieb. Jede Integration mit Beschreibung, Eigentuemer und Review-Datum.',
        format: 'Live-Systeme + Notion-Dokumentation',
        umfang: 'Je nach Scope',
        trigger: 'Nach Tests',
      },
      {
        name: 'Datenmodell-Dokumentation',
        description: 'Uebersicht der Datenstruktur in allen integrierten Systemen: Welche Felder gibt es, welche sind Pflichtfelder, wie ist das Status-Modell aufgebaut, welche Tags/Kategorien werden verwendet, wie werden Duplikate behandelt.',
        format: 'Notion / Word mit Tabellen',
        umfang: '3-5 Seiten',
        trigger: 'Waehrend Umsetzung',
      },
      {
        name: 'Betriebsdokumentation fuer Admins',
        description: 'Technische Dokumentation fuer IT-Verantwortliche: Wie sind die Integrationen konfiguriert, wo werden Fehler geloggt, wie werden Aenderungen vorgenommen, was passiert bei Verbindungsabbruch, wie wird monitoriert.',
        format: 'Notion / Word',
        umfang: '3-8 Seiten',
        trigger: 'Abschluss Implementierung',
      },
      {
        name: 'Nutzerdokumentation',
        description: 'Verstaendliche Anleitung fuer Endanwender: Wie nutze ich das integrierte System im Alltag, was muss ich beachten, was aendert sich gegenueber vorher, wen kontaktiere ich bei Problemen. Kein Fachjargon.',
        format: 'PDF / Word, max. 4 Seiten',
        umfang: 'Max. 4 Seiten',
        trigger: 'Vor Schulung',
      },
    ],
  },
  {
    code: 'B4',
    name: 'Betrieb, Monitoring & Dokumentation',
    categoryCode: 'B',
    category: 'IT-Beratung',
    ziel: 'Weniger Ausfaelle, schnellere Fehlerbehebung, klare Verantwortlichkeiten.',
    preis: '95 EUR/Std.',
    deliverables: [
      {
        name: 'Monitoring-Plan mit Alarmierungslogik',
        description: 'Konfiguriertes Monitoring-Setup mit definierten Schwellwerten: Welche Systeme werden ueberwacht, welche Metriken sind relevant (Verfuegbarkeit, CPU, Speicher, Backup-Status), wer wird bei welchem Alarm wie benachrichtigt.',
        format: 'Konfiguriertes System + Dokumentation',
        umfang: 'Betriebsfaehig',
        trigger: 'Abschluss Modul',
      },
      {
        name: 'Runbooks fuer Betriebsaufgaben',
        description: 'Schritt-fuer-Schritt-Anleitungen fuer haeufige und kritische Betriebsaufgaben: Update-Einspielen, neuen User anlegen, Backup manuell starten, Dienst neu starten, Zertifikat erneuern. Je Runbook: Voraussetzungen, Schritte, Ergebnis, Fehlerfall.',
        format: 'Notion / Word',
        umfang: '5-15 Runbooks',
        trigger: 'Abschluss Modul',
      },
      {
        name: 'Systemdokumentation',
        description: 'Vollstaendige technische Bestandsaufnahme: alle Systeme mit IP-Adressen/URLs, Admin-Zugaenge (sicher hinterlegt), Konfigurationsdetails, Lizenz-Laufzeiten, Notfall-Kontakte der Anbieter, letzte Aenderungen.',
        format: 'Notion / verschluesselt',
        umfang: 'Vollstaendig je System',
        trigger: 'Abschluss Modul',
      },
      {
        name: 'Wiederanlaufplan (Basis)',
        description: 'Priorisierte Liste welche Systeme nach einem Ausfall in welcher Reihenfolge wiederhergestellt werden muessen: Kritikalitaetsstufen, maximale Ausfallzeit je System (RTO), wer startet was, wie wird der Erfolg verifiziert.',
        format: '1-2 Seiten PDF (laminierbar)',
        umfang: '1-2 Seiten',
        trigger: 'Mit Systemdokumentation',
      },
      {
        name: 'Backup-/Restore-Testprotokoll',
        description: 'Nachweis dass Backups wirklich funktionieren: Datum des Tests, welches System/welche Daten wurden getestet, wie lange hat die Wiederherstellung gedauert, war das Ergebnis vollstaendig und nutzbar, wer hat getestet.',
        format: 'Excel / PDF',
        umfang: '1 Seite pro Test',
        trigger: 'Monatlich / nach Aenderungen',
      },
    ],
  },
  {
    code: 'B5',
    name: 'IT-Standardisierung & Arbeitsplatz-IT',
    categoryCode: 'B',
    category: 'IT-Beratung',
    ziel: 'Weniger Supportaufwand, konsistenter Arbeitsplatz, hoehere Produktivitaet.',
    preis: '95 EUR/Std.',
    deliverables: [
      {
        name: 'Standardkonzept-Dokument',
        description: 'Verbindliche Festlegung des Arbeitsplatz-Standards: Welche Geraete werden eingesetzt, welche Software ist Pflicht/Optional, welche Policies gelten (Bildschirmsperre, Verschluesselung, Updates), wie ist die Rechtestruktur.',
        format: 'Word / PDF',
        umfang: '3-6 Seiten',
        trigger: 'Abschluss Konzeptphase',
      },
      {
        name: 'On-/Offboarding-Checkliste',
        description: 'Zweiseitige Checkliste fuer neuen Mitarbeiter (Onboarding: Account anlegen, Geraet einrichten, Zugaenge vergeben, Einweisung) und ausscheidenden Mitarbeiter (Offboarding: alle Zugaenge entziehen, Geraet zuruecksetzen, Daten sichern).',
        format: 'PDF / Word (2 Seiten)',
        umfang: 'Je 1 Seite',
        trigger: 'Abschluss Modul',
      },
      {
        name: 'Richtlinien-Dokument',
        description: 'Praxisnahes Regelwerk fuer alle Mitarbeiter: Passwort-Richtlinie (Mindestanforderungen, kein Wiederverwenden), Geraete-Richtlinie (was darf auf Firmengeraeten), Zugangs-Richtlinie (wer bekommt was wann), Freigabe-Richtlinie.',
        format: 'PDF (unterschriftbereit)',
        umfang: '2-4 Seiten',
        trigger: 'Abschluss Modul',
      },
      {
        name: 'Software-Inventar mit Lizenzuebersicht',
        description: 'Vollstaendige Liste aller eingesetzten Software: Name, Version, Lizenztyp, Anzahl Lizenzen, Kosten/Monat, naechste Verlaengerung, Verantwortlicher. Dient als Basis fuer Kosten-Kontrolle und Compliance.',
        format: 'Excel / Notion-Tabelle',
        umfang: 'Vollstaendig',
        trigger: 'Abschluss Modul',
      },
    ],
  },

  // ── Kategorie C: Cybersecurity ────────────────────────────────────────
  {
    code: 'C1',
    name: 'Security Quick Check',
    categoryCode: 'C',
    category: 'Cybersecurity',
    ziel: 'Schnell sichtbare Risiken finden, priorisieren und erste Massnahmen einleiten.',
    preis: '490 EUR Festpreis, Vorauszahlung',
    deliverables: [
      {
        name: 'Risiko-Heatmap (Top 10)',
        description: 'Visuelle Darstellung der 10 groessten Sicherheitsrisiken: jedes Risiko mit Wahrscheinlichkeit (1-5), Auswirkung (1-5), kombiniertem Risikowert und Farbe (Rot/Orange/Gelb). Direkt erkennbar was zuerst angegangen werden muss.',
        format: 'Excel / PDF mit farbiger Matrix',
        umfang: '1 Seite',
        trigger: 'Nach Analyse',
      },
      {
        name: 'Massnahmenkatalog',
        description: 'Strukturierte Liste aller empfohlenen Sicherheitsmassnahmen: je Massnahme Beschreibung, Prioritaet (Sofort/Kurzfristig/Mittelfristig), Aufwand in Stunden, erwartete Wirkung, Verantwortlichkeit und empfohlenes Tool/Vorgehen.',
        format: 'Excel / PDF',
        umfang: '10-25 Massnahmen',
        trigger: 'Mit Ergebnisbericht',
      },
      {
        name: 'Sofortmassnahmenliste (7-Tage-Plan)',
        description: 'Separates Dokument mit ausschliesslich sofort umsetzbaren Massnahmen ohne Budget: MFA aktivieren, Admin-Passwort aendern, unnoetige Accounts deaktivieren, Update einspielen. Je Punkt: Was genau tun, wie lange dauert es.',
        format: '1 Seite PDF',
        umfang: '5-10 Massnahmen',
        trigger: 'Mit Massnahmenkatalog',
      },
      {
        name: 'Ergebnisbericht (DIN SPEC 27076 Bewertung)',
        description: 'Professioneller Bericht fuer die Geschaeftsfuehrung: Bewertung aller 6 DIN-SPEC-27076-Bereiche (Identitaeten, E-Mail, Endgeraete, Backup, Netzwerk, Awareness), Gesamtreifegradscore, Handlungsempfehlungen nach Dringlichkeit.',
        format: 'PDF',
        umfang: '5-10 Seiten',
        trigger: 'Abschluss Analyse',
      },
    ],
  },
  {
    code: 'C2',
    name: 'Hardening & Sicherheitsbaselines',
    categoryCode: 'C',
    category: 'Cybersecurity',
    ziel: 'Angriffsflaehe reduzieren, Standardkonfigurationen absichern.',
    preis: '95 EUR/Std.',
    deliverables: [
      {
        name: 'Baseline-Konzept-Dokument',
        description: 'Vollstaendige Dokumentation des Haertungskonzepts: Was wurde gehaertet, welche Einstellung wurde wie veraendert, warum diese Entscheidung, welche Systeme sind betroffen. Als Referenz fuer spaetere Aenderungen und Audits.',
        format: 'Word / PDF',
        umfang: '5-10 Seiten',
        trigger: 'Vor Umsetzung',
      },
      {
        name: 'Aenderungsdokumentation (Audit-Trail)',
        description: 'Lueckenloses Protokoll aller vorgenommenen Aenderungen: Datum, System, alte Einstellung, neue Einstellung, Begruendung, Durchfuehrender. Dient als Nachweis und als Grundlage fuer Rollback bei Problemen.',
        format: 'Excel / Notion mit Zeitstempeln',
        umfang: 'Je Aenderung 1 Zeile',
        trigger: 'Waehrend Umsetzung',
      },
      {
        name: 'Abnahmecheckliste (alle Baseline-Punkte)',
        description: 'Strukturierte Checkliste aller definierten Baseline-Anforderungen: je Punkt Status (Umgesetzt/Ausstehend/Nicht Anwendbar), Datum der Umsetzung, Pruefungsergebnis. Wird gemeinsam mit Kunden durchgegangen und unterschrieben.',
        format: 'PDF / digital signiert',
        umfang: '1-3 Seiten',
        trigger: 'Abschluss Umsetzung',
      },
      {
        name: 'Empfehlungsliste zurueckgestellte Punkte',
        description: 'Transparente Liste der Haertungspunkte, die noch nicht umgesetzt wurden: Begruendung (zu aufwaendig, nicht kompatibel, noch nicht priorisiert), empfohlener Zeitrahmen fuer spaetere Umsetzung, Risikohinweis.',
        format: '1 Seite PDF',
        umfang: '1 Seite',
        trigger: 'Mit Abnahmecheckliste',
      },
    ],
  },
  {
    code: 'C3',
    name: 'Backup, Recovery & Ransomware-Resilienz',
    categoryCode: 'C',
    category: 'Cybersecurity',
    ziel: 'Im Ernstfall wieder arbeitsfaehig - nicht nur Backup vorhanden, sondern getestet.',
    preis: '95 EUR/Std.',
    deliverables: [
      {
        name: 'Backup-/Recovery-Konzept',
        description: 'Vollstaendige Strategie-Dokumentation: 3-2-1-Regel Umsetzung, Versionierungskonzept, Offline/Immutable-Backup-Loesung, Aufbewahrungsfristen, Recovery Time Objective (RTO) und Recovery Point Objective (RPO) je System, Verantwortlichkeiten.',
        format: 'Word / PDF',
        umfang: '4-8 Seiten',
        trigger: 'Abschluss Konzeptphase',
      },
      {
        name: 'Restore-Testprotokoll',
        description: 'Nachweis tatsaechlich durchgefuehrter Wiederherstellungstests: System, Datum, getestete Daten/Volume, Dauer der Wiederherstellung, vollstaendig? Nutzbar? Gefundene Probleme und Loesungen. Gibt Sicherheit dass es wirklich funktioniert.',
        format: 'Excel / PDF (ein Protokoll je Test)',
        umfang: '1 Seite je Test',
        trigger: 'Nach jedem Restore-Test',
      },
      {
        name: 'Prioritaetenliste kritischer Systeme',
        description: 'Geordnete Liste welche Systeme und Daten im Ernstfall zuerst wiederhergestellt werden: Kritikalitaetsstufe, maximale tolerierbare Ausfallzeit (RTO), maximaler Datenverlust (RPO), Abhaengigkeiten von anderen Systemen.',
        format: 'Excel / 1 Seite PDF',
        umfang: '1 Seite',
        trigger: 'Mit Konzept',
      },
      {
        name: 'Wiederanlaufplan (KMU-pragmatisch)',
        description: 'Handlungsorientierter Plan fuer den Ernstfall: Wer macht was in welcher Reihenfolge, welche Zugaenge werden benoetigt, wie wird Erfolg verifiziert, wen kontaktiert man extern (Anbieter, Versicherung). Auf 1-2 Seiten, laminierbar.',
        format: 'PDF (laminierbar, 1-2 Seiten)',
        umfang: '1-2 Seiten',
        trigger: 'Abschluss Modul',
      },
    ],
  },

  // ── Kategorie D: Schnittstellen-Module ───────────────────────────────
  {
    code: 'D1',
    name: 'KI sicher einfuehren (AI Security & Governance)',
    categoryCode: 'D',
    category: 'Schnittstellen-Module',
    ziel: 'KI-Nutzung im Unternehmen technisch, organisatorisch und kulturell absichern.',
    preis: '95 EUR/Std.',
    deliverables: [
      {
        name: 'KI-Nutzungsrichtlinie',
        description: 'Verbindliches Dokument fuer alle Mitarbeiter: Welche KI-Tools sind erlaubt, welche verboten, welche Daten duerfen eingegeben werden, was passiert mit den Outputs (Qualitaetspruefung Pflicht), wer ist bei Fragen Ansprechpartner.',
        format: 'Word / PDF (unterschriftbereit)',
        umfang: '2-4 Seiten',
        trigger: 'Abschluss Modul',
      },
      {
        name: 'Rollenkonzept fuer KI-Governance',
        description: 'Klare Zuweisung der KI-bezogenen Verantwortlichkeiten: KI-Koordinator (wer), Freigabe-Verantwortliche (wer genehmigt neue Prompts/Use Cases), Schulungs-Verantwortlicher, Datenschutz-Ansprechpartner fuer KI-Fragen.',
        format: 'Word / 1-2 Seiten',
        umfang: '1-2 Seiten',
        trigger: 'Mit Richtlinie',
      },
      {
        name: 'Datenklassifikations-Matrix',
        description: 'Entscheidungshilfe fuer Mitarbeiter: Welche Daten in welche KI-Systeme eingegeben werden duerfen. Drei Stufen: (1) Oeffentliche Daten - alle Systeme OK, (2) Interne Daten - nur lokale LLMs, (3) Personenbezogene Daten - nie ohne Pruefung.',
        format: '1 Seite PDF / Aushang',
        umfang: '1 Seite',
        trigger: 'Mit Richtlinie',
      },
      {
        name: 'Prompt-Standards & Freigabeprozess',
        description: 'Regelwerk fuer die Prompt-Entwicklung: Welche Qualitaetsanforderungen muss ein Prompt erfuellen, wie wird er vor Team-Rollout geprueft, wer genehmigt, wie wird er dokumentiert und in die Bibliothek aufgenommen.',
        format: 'Notion / Word',
        umfang: '2-3 Seiten',
        trigger: 'Mit Richtlinie',
      },
    ],
  },
  {
    code: 'D2',
    name: 'Sicher automatisieren (Automation + Betrieb + Security)',
    categoryCode: 'D',
    category: 'Schnittstellen-Module',
    ziel: 'Automationen sicher betreiben - mit Monitoring, Kontrolle und Pruefpfad.',
    preis: '95 EUR/Std.',
    deliverables: [
      {
        name: 'Sicherheitskonzept fuer Automationen',
        description: 'Dokumentiertes Sicherheitsframework fuer alle Automationen: Zugriffsrechte-Konzept (Least Privilege pro Automation), Logging-Anforderungen, Fehlerhandling-Standard, Rollback-Prozedur, Review-Turnus (wer prueft was wann).',
        format: 'Word / PDF',
        umfang: '3-5 Seiten',
        trigger: 'Abschluss Modul',
      },
      {
        name: 'Secrets-Management-Loesung (konfiguriert)',
        description: 'Eingerichtetes System fuer sichere Verwaltung von API-Keys, Passwoertern und Tokens in Automationen: kein Klartext in Workflow-Definitionen, zentrale Verwaltung, Rotation-Policy, Zugriffsprotokolle.',
        format: 'Konfiguriertes System + Doku',
        umfang: 'Betriebsfaehig',
        trigger: 'Abschluss Modul',
      },
      {
        name: 'Wartungsplan fuer Automationen',
        description: 'Strukturierter Plan fuer den laufenden Betrieb: Wer prueft welche Automationen in welchem Rhythmus (monatlich/quartalsweise), was wird geprueft (Logs, Fehlerrate, Datenqualitaet), wie werden Aenderungen dokumentiert.',
        format: 'Excel / Notion',
        umfang: '1-2 Seiten',
        trigger: 'Abschluss Modul',
      },
    ],
  },
  {
    code: 'D3',
    name: 'Incident-ready Organisation',
    categoryCode: 'D',
    category: 'Schnittstellen-Module',
    ziel: 'Ganzheitliche Vorbereitung fuer den Ernstfall - technisch und menschlich.',
    preis: 'Jahrespaket: Setup + 4 Quartals-Reviews',
    deliverables: [
      {
        name: 'Vollstaendiges IR-Paket (Handbuch + 4 Playbooks + Kontakte)',
        description: 'Kombiniertes Notfallpaket aus IR-Handbuch (5-10 Seiten), allen 4 Playbooks (Phishing, Kontouebernahme, Ransomware, Datenabfluss je 1 Seite) und laminierter Notfall-Kontaktliste. Sofort einsatzbereit.',
        format: 'PDF-Paket + laminierte Karten',
        umfang: 'Ca. 15 Seiten gesamt',
        trigger: 'Abschluss Setup-Phase',
      },
      {
        name: 'Review-Meeting-Vorlage (Quartalsweise)',
        description: 'Standardisierte Agenda und Checkliste fuer die 4 jaehrlichen Review-Meetings: KPI-Status (Patch-Compliance, Backup-Erfolgsrate, Awareness), neue Bedrohungslagen, durchgefuehrte Tests, angepasste Massnahmen, naechste Schritte.',
        format: 'Notion / Word (je Meeting 1-2 Seiten)',
        umfang: 'Vorlage + ausgefuelltes Protokoll',
        trigger: 'Je Quartal',
      },
      {
        name: 'Mindeststandard-Statusbericht',
        description: 'Regelmaessiger Statusbericht des technischen Sicherheitsniveaus: aktueller Status je Mindeststandard (MFA, Patches, Backup, Awareness) vs. Zielzustand, offene Punkte, Verbesserungen seit letztem Review.',
        format: 'Excel / PDF (je Review)',
        umfang: '1-2 Seiten',
        trigger: 'Je Quartal',
      },
    ],
  },
]

export async function seedDeliverableCatalog(_tenantId: string) {
  logger.info('Seeding Deliverable Catalog...', { module: MOD })
  let moduleCount = 0
  let deliverableCount = 0

  for (const m of MODULES) {
    // 1. Module idempotent anlegen
    const [existing] = await db
      .select()
      .from(deliverableModules)
      .where(
        and(eq(deliverableModules.code, m.code)))

    let moduleId: string
    if (existing) {
      moduleId = existing.id
      logger.info(`Module ${m.code} already exists, skipping`, { module: MOD })
    } else {
      const [created] = await db
        .insert(deliverableModules)
        .values({
          code: m.code,
          name: m.name,
          category: m.categoryCode, // 'A' | 'B' | 'C' | 'D'
          ziel: m.ziel,
          preis: m.preis,
        })
        .returning()
      moduleId = created.id
      moduleCount++
      logger.info(`Module ${m.code} created: ${m.name}`, { module: MOD })
    }

    // 2. Deliverables fuer dieses Modul idempotent anlegen
    const existingDels = await DeliverableService.list(TENANT_ID, { moduleId })
    if (existingDels.length > 0) {
      logger.info(`Deliverables fuer ${m.code} existieren bereits (${existingDels.length}), skip`, { module: MOD })
      continue
    }

    for (const d of m.deliverables) {
      await DeliverableService.create(TENANT_ID, {
        moduleId,
        name: d.name,
        description: d.description,
        format: d.format,
        umfang: d.umfang,
        trigger: d.trigger,
        category: m.category,      // z.B. 'KI-Beratung'
        categoryCode: m.categoryCode, // 'A' | 'B' | 'C' | 'D'
        status: 'active',
        version: '1.0.0',
      })
      deliverableCount++
    }

    logger.info(`${m.deliverables.length} Deliverables fuer Modul ${m.code} erstellt`, { module: MOD })
  }

  logger.info(
    `Deliverable Catalog seeded: ${moduleCount} Module, ${deliverableCount} Deliverables`,
    { module: MOD })
}
