# Contracts Feature (Vertraege) - Design Spec

## Overview

Neues Feature unter Finanzen: Kundenvertraege mit Stammdaten, Template-basierter Vertragserstellung, Bausteine-Bibliothek, KI-gestuetzter Template-Generierung, Projekt-Zuordnung und Konversion zu Angeboten/Rechnungen.

## Architecture Decision

**Ansatz A: Documents-Tabelle erweitern.** Vertraege werden als `type='contract'` in der bestehenden `documents`-Tabelle gefuehrt. Vertragsspezifische Felder werden als neue Spalten hinzugefuegt. Templates und Bausteine erhalten eigene Tabellen.

**Begruendung:** Konversion Vertrag->Angebot/Rechnung ist trivial (gleiche Tabelle, `convertedFromId`). Bestehende UI-Komponenten (DocumentForm, LineItemsEditor, StatusBadge) wiederverwendbar. Permissions, Suche, API-Routen funktionieren sofort.

---

## 1. Datenmodell

### 1.1 Documents-Tabelle erweitern

Neue Spalten fuer `type='contract'`:

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| `contract_start_date` | timestamp | Vertragsbeginn |
| `contract_end_date` | timestamp | Vertragsende (NULL = unbefristet) |
| `contract_renewal_type` | varchar(30) | `none`, `manual`, `auto` |
| `contract_renewal_period` | varchar(30) | `monthly`, `quarterly`, `yearly` |
| `contract_notice_period_days` | integer | Kuendigungsfrist in Tagen |
| `contract_template_id` | uuid FK | Verwendetes Vertragstemplate |
| `project_id` | uuid FK | Zugeordnetes Projekt |
| `contract_body_html` | text | Generierter Vertragstext (aus Template + Bausteine) |

### 1.2 Neue Tabelle: `contract_templates`

Globale (System) + tenant-spezifische Templates.

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| `id` | uuid PK | |
| `tenant_id` | uuid FK (nullable) | NULL = globales System-Template |
| `name` | varchar(255) | z.B. "IT-Dienstleistungsvertrag" |
| `category` | varchar(100) | `it_service`, `consulting`, `software_dev`, `hosting_saas` |
| `description` | text | Kurzbeschreibung des Templates |
| `body_html` | text | HTML mit `{{Platzhaltern}}` |
| `placeholders` | jsonb | `[{key, label, type, required}]` |
| `clauses` | jsonb | Default-Bausteine fuer dieses Template |
| `is_system` | boolean | Vordefiniertes System-Template (schreibgeschuetzt) |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

### 1.3 Neue Tabelle: `contract_clauses`

Bausteine-Bibliothek fuer modulare Vertragsgestaltung.

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| `id` | uuid PK | |
| `tenant_id` | uuid FK (nullable) | NULL = globaler System-Baustein |
| `category` | varchar(100) | Siehe Kategorien unten |
| `name` | varchar(255) | z.B. "Standardhaftungsklausel" |
| `body_html` | text | Klausel-Text mit Platzhaltern |
| `is_system` | boolean | Vordefiniert |
| `sort_order` | integer | Standard-Reihenfolge im Vertrag |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

**Baustein-Kategorien:** `general`, `liability`, `termination`, `payment`, `confidentiality`, `data_protection`, `sla`, `ip_rights`

### 1.4 Status-Workflow

```
draft -> sent -> signed -> active -> terminated
                                  -> expired
              -> rejected
```

Status-Transitions:
- `draft`: ['sent']
- `sent`: ['signed', 'rejected']
- `signed`: ['active']
- `active`: ['terminated', 'expired']
- `terminated`: [] (terminal)
- `expired`: [] (terminal)
- `rejected`: [] (terminal)

### 1.5 Nummernformat

Prefix `VT` (Vertrag): `VT-2026-0001`, `VT-2026-0002` etc.

---

## 2. UI-Struktur

### 2.1 Navigation

Sidebar unter Finanzen:
```
Finanzen
  +-- Rechnungen
  +-- Angebote
  +-- Vertraege        <-- NEU
  +-- Zeiterfassung
```

Finance Hub (`/intern/finance/page.tsx`) erhaelt neue Kachel "Vertraege" mit FileSignature-Icon.

### 2.2 Routen

| Route | Inhalt |
|-------|--------|
| `/intern/finance/contracts` | Vertragsliste mit Filter (Status, Kunde, Laufzeit) |
| `/intern/finance/contracts/new` | Neuer Vertrag (Template waehlen -> Formular) |
| `/intern/finance/contracts/[id]` | Vertragsdetail mit Tabs |
| `/intern/finance/contracts/templates` | Template-Verwaltung |
| `/intern/finance/contracts/templates/new` | KI-gestuetztes Template erstellen |
| `/intern/finance/contracts/clauses` | Bausteine-Bibliothek |

### 2.3 Vertragsliste

Tabelle mit Spalten: Nummer, Kunde, Titel, Status, Laufzeit (von-bis), Wert, Projekt.
Filter: Status, Kunde (Company), Laufzeitstatus (aktiv/auslaufend/abgelaufen).
Sortierung: Standard nach Nummer absteigend.

### 2.4 Vertragsdetail (Tabs)

| Tab | Inhalt |
|-----|--------|
| Uebersicht | Stammdaten, Status-Badge, Laufzeit, Kuendigung, Projekt-Link, Erneuerung |
| Vertrag | Vertragstext (HTML, editierbar), aus Template + Bausteine zusammengestellt |
| Positionen | LineItemsEditor (wiederverwendet von Rechnungen/Angeboten) |
| Dokumente | PDF-Export, Versand-Historie |

**Aktions-Buttons im Header:**
- "Angebot erstellen" - Erzeugt Angebot aus Vertragsdaten
- "Rechnung erstellen" - Erzeugt Rechnung aus Vertragsdaten
- "PDF Export" - Vertrag als PDF
- "Versenden" - Per E-Mail an Kunden
- Status-Wechsel-Dropdown

### 2.5 Neuer-Vertrag-Flow

1. Template auswaehlen (Kategorien: IT-Dienstleistung, Beratung, Softwareentwicklung, Hosting/SaaS)
2. Kunde + Projekt zuordnen
3. Platzhalter ausfuellen (Laufzeit, Kuendigung, Konditionen)
4. Bausteine hinzufuegen/entfernen/umsortieren (Drag & Drop)
5. Positionen erfassen (LineItemsEditor)
6. Speichern als Entwurf

---

## 3. KI-Funktionen & Templates

### 3.1 System-Templates (Seed)

4 vordefinierte Templates per Migration:

1. **IT-Dienstleistungsvertrag** (`it_service`) - Managed Services, Support, Wartung, SLA-basiert
2. **Beratungsvertrag** (`consulting`) - Stundenbasiert oder projektbasiert, Geheimhaltung
3. **Softwareentwicklungsvertrag** (`software_dev`) - Werkvertrag, agile Entwicklung, Abnahmekriterien
4. **Hosting/SaaS-Vertrag** (`hosting_saas`) - Cloud-Dienste, Verfuegbarkeit, Datenschutz

Jedes Template enthaelt:
- HTML-Body mit `{{Platzhaltern}}` (Firmenname, Ansprechpartner, Laufzeit etc.)
- Default-Baustein-Zuordnung (welche Klauseln standardmaessig enthalten sind)
- Placeholder-Definition (welche Felder der User ausfuellen muss)

System-Templates sind schreibgeschuetzt, koennen als Vorlage fuer eigene dupliziert werden.

### 3.2 System-Bausteine (Seed)

~20-30 vordefinierte Klauseln in 8 Kategorien:

- **Allgemein**: Praeambel, Vertragsgegenstand, Definitionen
- **Haftung**: Standardhaftung, Haftungsbegrenzung, Hoeheregewalt
- **Kuendigung**: Ordentliche Kuendigung, Ausserordentliche Kuendigung, Uebergangsregelungen
- **Zahlung**: Verguetung, Faelligkeit, Verzug, Preisanpassung
- **Geheimhaltung**: NDA-Klausel, Vertraulichkeit nach Vertragsende
- **Datenschutz**: AVV-Verweis, DSGVO-Konformitaet, Unterauftragnehmer
- **SLA**: Verfuegbarkeit, Reaktionszeiten, Eskalation, Service Credits
- **IP/Urheberrecht**: Nutzungsrechte, Eigenentwicklungen, Open-Source-Lizenz

### 3.3 KI-Template-Generierung

Wizard in 3 Schritten:

**Schritt 1 - Vertragsziel:** Freitext "Was soll der Vertrag regeln?" + Kategorie-Dropdown.

**Schritt 2 - KI-Recherche:** AI-Service recherchiert relevante rechtliche Anforderungen (BGB, HGB, DSGVO, branchenspezifisch). System-Prompt mit deutschem Rechtskontext. Strukturierter Output als separate Bausteine.

**Schritt 3 - Ergebnis pruefen:** Generierter Template-Entwurf mit Platzhaltern und Bausteinen. User kann editieren, Bausteine austauschen, Reihenfolge aendern.

**KI-Prompt-Strategie:**
- System-Prompt mit Kontext: deutsches Recht, KMU-fokussiert, praxistauglich
- Output-Struktur: Praeambel, Leistungsbeschreibung, Verguetung, Laufzeit/Kuendigung, Haftung, Datenschutz, Schlussbestimmungen
- Jeder Abschnitt als eigenstaendiger Baustein
- Hinweis-Banner in der UI: "KI-generierte Vertraege ersetzen keine Rechtsberatung"

### 3.4 Bausteine-Bibliothek UI

- Liste aller Bausteine mit Kategorie-Filter
- System-Bausteine (schreibgeschuetzt, duplizierbar)
- Eigene Bausteine erstellen/bearbeiten/loeschen
- Vorschau des Baustein-Textes

---

## 4. Konversion Vertrag -> Angebot/Rechnung

Button im Vertragsdetail-Header. Erzeugt neues Dokument:

- `type`: `'offer'` oder `'invoice'`
- `convertedFromId`: ID des Vertrags
- Uebernommen: Kunde, Kontaktperson, alle Positionen, Zahlungsbedingungen, Notizen
- Neues Dokument erhaelt eigene Nummer (`AN-YYYY-XXXX` / `RE-YYYY-XXXX`)
- Vertrag bleibt unveraendert
- Neues Dokument oeffnet sich nach Erstellung

Implementierung: Neue Methode `DocumentService.convertContractToDocument(tenantId, contractId, targetType, createdBy)` analog zu `convertOfferToInvoice`.

---

## 5. API-Endpunkte

Bestehende `/api/v1/documents/*` Routen werden wiederverwendet mit `type=contract`.

| Methode | Route | Beschreibung |
|---------|-------|-------------|
| GET | `/api/v1/documents?type=contract` | Vertragsliste |
| POST | `/api/v1/documents` (type: contract) | Vertrag erstellen |
| GET | `/api/v1/documents/next-number?type=contract` | Naechste VT-Nummer |
| GET | `/api/v1/documents/[id]` | Vertragsdetail |
| PUT | `/api/v1/documents/[id]` | Vertrag aktualisieren |
| DELETE | `/api/v1/documents/[id]` | Vertrag loeschen |
| PUT | `/api/v1/documents/[id]/status` | Status aendern |
| POST | `/api/v1/documents/[id]/send` | Per E-Mail versenden |
| POST | `/api/v1/documents/[id]/convert` | Angebot/Rechnung erzeugen |

**Neue API-Routen fuer Templates & Bausteine:**

| Methode | Route | Beschreibung |
|---------|-------|-------------|
| GET | `/api/v1/contract-templates` | Templates auflisten |
| POST | `/api/v1/contract-templates` | Template erstellen |
| GET | `/api/v1/contract-templates/[id]` | Template Detail |
| PUT | `/api/v1/contract-templates/[id]` | Template aktualisieren |
| DELETE | `/api/v1/contract-templates/[id]` | Template loeschen |
| POST | `/api/v1/contract-templates/generate` | KI-Template-Generierung |
| GET | `/api/v1/contract-clauses` | Bausteine auflisten |
| POST | `/api/v1/contract-clauses` | Baustein erstellen |
| PUT | `/api/v1/contract-clauses/[id]` | Baustein aktualisieren |
| DELETE | `/api/v1/contract-clauses/[id]` | Baustein loeschen |

---

## 6. Permissions

Verwendet bestehendes `documents`-Modul. Keine neuen Permissions noetig. Alle Rollen die Zugriff auf Dokumente haben, haben auch Zugriff auf Vertraege.

---

## 7. PDF-Export

Neuer Service `contract-pdf.service.ts` fuer Vertrags-PDF:
- Header mit Firmenlogo/Name
- Vertragsnummer, Datum, Parteien
- Vertragstext (gerendert aus body_html)
- Positionen-Tabelle
- Unterschriftsfelder (leer, fuer manuelle Unterschrift)
- Footer mit Seitenzahlen

Folgt dem bestehenden Muster von `din-pdf.service.ts` / `ir-pdf.service.ts`.

---

## 8. Seed-Daten

Migration mit:
- 4 System-Templates (IT-Dienstleistung, Beratung, Softwareentwicklung, Hosting/SaaS)
- ~20-30 System-Bausteine in 8 Kategorien
- Seed-Funktion aehnlich dem bestehenden `document-templates/seed` Endpunkt

---

## 9. Nicht in v1

- Digitale Unterschrift / Online-Akzeptanz
- Automatische wiederkehrende Rechnungen aus Vertraegen
- Versionierung von Vertraegen (Aenderungshistorie)
- Vertrags-Erinnerungen (Kuendigung, Ablauf)

Diese Features koennen in v2 ergaenzt werden.
