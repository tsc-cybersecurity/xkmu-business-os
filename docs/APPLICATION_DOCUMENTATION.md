# xKMU BusinessOS - Vollständige Anwendungsdokumentation

> **Version:** 1.2.211
> **Stand:** 2026-03-23
> **Stack:** Next.js 16 App Router, React 19, Drizzle ORM, PostgreSQL
> **Sprache:** Deutsch (UI), Englisch (API/Code)

---

## Inhaltsverzeichnis

1. [Architektur-Übersicht](#1-architektur-übersicht)
2. [Authentifizierung & Autorisierung](#2-authentifizierung--autorisierung)
3. [Öffentliche Seiten](#3-öffentliche-seiten)
4. [Dashboard & Interne Seiten](#4-dashboard--interne-seiten)
5. [API-Referenz](#5-api-referenz)
6. [Module im Detail](#6-module-im-detail)
7. [KI-Integration](#7-ki-integration)
8. [CMS-System](#8-cms-system)
9. [BSI WiBA-Modul](#9-bsi-wiba-modul)
10. [n8n Workflow-Integration](#10-n8n-workflow-integration)
11. [kie.ai Video-Generierung](#11-kieai-video-generierung)
12. [Datenbank-Administration](#12-datenbank-administration)
13. [Prozesshandbuch](#13-prozesshandbuch)
14. [Task-Queue](#14-task-queue)
15. [E-Mail-Templates](#15-e-mail-templates)
16. [Zeiterfassung](#16-zeiterfassung)
17. [Projekt-Modul (Kanban)](#17-projekt-modul-kanban)
18. [Newsletter](#18-newsletter)
19. [Dokument-Generator](#19-dokument-generator)
20. [Feedback-Modul](#20-feedback-modul)
21. [KPI-Dashboard](#21-kpi-dashboard)
22. [Social Media Publishing](#22-social-media-publishing)
23. [SEO-Keyword-Recherche](#23-seo-keyword-recherche)
24. [Workflow-Engine](#24-workflow-engine)

---

## 1. Architektur-Übersicht

### Multi-Tenant-Architektur
Jede Datenbankentität ist mit einer `tenantId` versehen. Benutzer sehen nur Daten ihres eigenen Mandanten.

### Layouts
| Layout | Pfad | Beschreibung |
|--------|------|-------------|
| Root | `/` | Globales Layout mit Font-Konfiguration (Ubuntu, Inter, Roboto), DesignProvider |
| Public | `/(public)` | Öffentliche Seiten mit Navbar (Logo per Branding-API konfigurierbar), Footer, Breadcrumb |
| Auth | `/intern/(auth)` | Login/Register mit zentriertem Container |
| Dashboard | `/intern/(dashboard)` | Geschützt mit Session-Check, Sidebar, Header, PermissionProvider |

### Technische Muster
- **Auth-Middleware:** `withPermission(request, module, action, handler)`
- **API-Antworten:** `apiSuccess(data)`, `apiError(code, message)`, `apiServerError(error)`
- **Validierung:** `validateAndParse(schema, body)` mit Zod
- **Benachrichtigungen:** Toast-Feedback via `sonner`
- **Webhooks:** `WebhookService.fire()` bei relevanten Events

---

## 2. Authentifizierung & Autorisierung

### Login-Seite
| Eigenschaft | Wert |
|------------|------|
| **URL** | `/intern/login` |
| **Methode** | E-Mail + Passwort |
| **Session** | Server-seitig, Redirect bei fehlendem Login |

### Registrierung
| Eigenschaft | Wert |
|------------|------|
| **URL** | `/intern/register` |
| **Funktion** | Neuen Benutzer + Mandant anlegen |

### API-Endpunkte

#### `POST /api/v1/auth/login`
Benutzer-Anmeldung mit Credentials.

| Parameter | Typ | Pflicht | Beschreibung |
|-----------|-----|---------|-------------|
| `email` | string | Ja | E-Mail-Adresse |
| `password` | string | Ja | Passwort |

**Antwort:** Session-Cookie + Benutzerdaten

#### `POST /api/v1/auth/register`
Neuen Benutzer registrieren.

| Parameter | Typ | Pflicht | Beschreibung |
|-----------|-----|---------|-------------|
| `email` | string | Ja | E-Mail-Adresse |
| `password` | string | Ja | Passwort |
| `name` | string | Ja | Vollständiger Name |
| `companyName` | string | Ja | Firmenname (wird als Tenant angelegt) |

#### `POST /api/v1/auth/logout`
Aktuelle Session beenden.

#### `GET /api/v1/auth/me`
Aktuellen Benutzer mit Berechtigungen abrufen.

**Antwort:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "Max Mustermann",
    "role": { "name": "Admin", "permissions": [...] }
  }
}
```

#### `GET /api/v1/auth/permissions`
Berechtigungen des aktuellen Benutzers abrufen.

---

## 3. Öffentliche Seiten

### Homepage
| Eigenschaft | Wert |
|------------|------|
| **URL** | `/` |
| **Funktion** | CMS-gesteuerte Startseite mit Fallback-Landing-Komponenten |
| **Inhalte** | Hero-Section, Features, Leistungen, CTA |

### Leistungsseiten
| URL | Titel | Beschreibung |
|-----|-------|-------------|
| `/it-consulting` | IT-Consulting | IT-Beratungsdienstleistungen |
| `/cyber-security` | Cyber Security | Cybersicherheits-Dienstleistungen |
| `/ki-automation` | KI-Automation | KI-Automatisierungslösungen |

### Rechtliche Seiten
| URL | Titel |
|-----|-------|
| `/impressum` | Impressum |
| `/datenschutz` | Datenschutzerklärung |
| `/agb` | Allgemeine Geschäftsbedingungen |

### Kontakt
| Eigenschaft | Wert |
|------------|------|
| **URL** | `/kontakt` |
| **Funktion** | Kontaktformular mit Validierung |
| **API** | `POST /api/v1/contact` |

### IT-News / Blog (Öffentlich)
| URL | Funktion |
|-----|----------|
| `/it-news` | Auflistung aller veröffentlichten Blog-Beiträge |
| `/it-news/[slug]` | Einzelner Blog-Beitrag |

### CMS-Seiten (Dynamisch)
| URL | Funktion |
|-----|----------|
| `/[...slug]` | Catch-all Route für CMS-verwaltete Seiten |

---

## 4. Dashboard & Interne Seiten

### Haupt-Dashboard
| Eigenschaft | Wert |
|------------|------|
| **URL** | `/intern/dashboard` |
| **Funktion** | Übersicht mit Statistiken, Trends, neuesten Daten |
| **API** | `GET /api/v1/dashboard` |
| **Inhalte** | KPIs, Umsatztrends, letzte Kontakte, offene Angebote/Rechnungen |

---

### 4.1 Kontakte-Modul

#### Firmen (Companies)

| Seite | URL | Funktion |
|-------|-----|----------|
| Übersicht | `/intern/contacts/companies` | Firmenliste mit Suche, Filter, Sortierung |
| Neu | `/intern/contacts/companies/new` | Neue Firma anlegen |
| Detail | `/intern/contacts/companies/[id]` | Firmendetails, zugeordnete Personen, Aktivitäten |
| Bearbeiten | `/intern/contacts/companies/[id]/edit` | Firmendaten bearbeiten |

**Felder einer Firma:**
| Feld | Typ | Beschreibung |
|------|-----|-------------|
| `name` | string | Firmenname |
| `industry` | string | Branche |
| `website` | string | Webseite |
| `email` | string | E-Mail |
| `phone` | string | Telefon |
| `street` | string | Straße |
| `zip` | string | PLZ |
| `city` | string | Stadt |
| `country` | string | Land |
| `notes` | text | Notizen |
| `status` | enum | `active`, `inactive`, `prospect` |

**KI-Funktionen:**
- **Website-Crawling:** Automatisches Auslesen von Firmendaten von der Website
- **Research:** KI-gestützte Firmenrecherche mit Anwendungs-/Ablehnungsoption
- **Dokumentenanalyse:** Upload und Analyse von Firmendokumenten

#### Personen (Persons)

| Seite | URL | Funktion |
|-------|-----|----------|
| Übersicht | `/intern/contacts/persons` | Personenliste |
| Neu | `/intern/contacts/persons/new` | Neue Person anlegen |
| Detail | `/intern/contacts/persons/[id]` | Personendetails |
| Bearbeiten | `/intern/contacts/persons/[id]/edit` | Personendaten bearbeiten |

**Felder einer Person:**
| Feld | Typ | Beschreibung |
|------|-----|-------------|
| `firstName` | string | Vorname |
| `lastName` | string | Nachname |
| `email` | string | E-Mail |
| `phone` | string | Telefon |
| `position` | string | Position/Rolle |
| `companyId` | uuid | Zugehörige Firma |
| `notes` | text | Notizen |

---

### 4.2 Katalog-Modul

#### Produkte

| Seite | URL | Funktion |
|-------|-----|----------|
| Übersicht | `/intern/catalog/products` | Produktliste |
| Neu | `/intern/catalog/products/new` | Neues Produkt anlegen |
| Detail | `/intern/catalog/products/[id]` | Produktdetails |

**Felder eines Produkts:**
| Feld | Typ | Beschreibung |
|------|-----|-------------|
| `name` | string | Produktname |
| `description` | text | Beschreibung |
| `sku` | string | Artikelnummer |
| `price` | decimal | Nettopreis |
| `taxRate` | decimal | Steuersatz (%) |
| `unit` | string | Einheit (Stück, Stunde, etc.) |
| `categoryId` | uuid | Kategorie |
| `status` | enum | `active`, `inactive` |

#### Dienstleistungen (Services)

| Seite | URL | Funktion |
|-------|-----|----------|
| Übersicht | `/intern/catalog/services` | Dienstleistungsliste |
| Neu | `/intern/catalog/services/new` | Neue Dienstleistung |
| Detail | `/intern/catalog/services/[id]` | Dienstleistungsdetails |

#### Kategorien

| Seite | URL | Funktion |
|-------|-----|----------|
| Übersicht | `/intern/catalog/categories` | Kategorienverwaltung |

---

### 4.3 Finanzen-Modul

#### Angebote (Offers)

| Seite | URL | Funktion |
|-------|-----|----------|
| Übersicht | `/intern/finance/offers` | Angebotsliste mit Status-Filter |
| Neu | `/intern/finance/offers/new` | Neues Angebot erstellen |
| Detail | `/intern/finance/offers/[id]` | Angebotsdetails mit Positionen |

**Status-Workflow Angebote:** `draft` → `sent` → `accepted` / `rejected` → `converted` (→ Rechnung)

#### Rechnungen (Invoices)

| Seite | URL | Funktion |
|-------|-----|----------|
| Übersicht | `/intern/finance/invoices` | Rechnungsliste mit Status-Filter |
| Neu | `/intern/finance/invoices/new` | Neue Rechnung erstellen |
| Detail | `/intern/finance/invoices/[id]` | Rechnungsdetails mit Positionen |

**Status-Workflow Rechnungen:** `draft` → `sent` → `paid` / `overdue` → `cancelled`

**Felder eines Dokuments (Angebot/Rechnung):**
| Feld | Typ | Beschreibung |
|------|-----|-------------|
| `number` | string | Automatisch generierte Dokumentnummer |
| `type` | enum | `offer`, `invoice` |
| `companyId` | uuid | Kunde (Firma) |
| `personId` | uuid | Ansprechpartner (optional) |
| `date` | date | Dokumentdatum |
| `dueDate` | date | Fälligkeitsdatum |
| `status` | enum | Status (je nach Typ) |
| `items` | array | Positionen mit Produkt/Dienstleistung, Menge, Preis |
| `notes` | text | Anmerkungen |
| `subtotal` | decimal | Zwischensumme (netto) |
| `taxAmount` | decimal | Steuerbetrag |
| `total` | decimal | Gesamtbetrag (brutto) |

**Konvertierung:** Angebote können in Rechnungen konvertiert werden (`POST /api/v1/documents/[id]/convert`).

---

### 4.4 Leads-Modul

| Seite | URL | Funktion |
|-------|-----|----------|
| Übersicht | `/intern/leads` | Lead-Pipeline mit Kanban/Liste |
| Neu | `/intern/leads/new` | Neuen Lead anlegen |
| Detail | `/intern/leads/[id]` | Lead-Details mit Aktivitäten |

**Felder eines Leads:**
| Feld | Typ | Beschreibung |
|------|-----|-------------|
| `title` | string | Lead-Titel |
| `companyId` | uuid | Zugehörige Firma |
| `personId` | uuid | Ansprechpartner |
| `value` | decimal | Geschätzter Wert |
| `status` | enum | `new`, `contacted`, `qualified`, `proposal`, `won`, `lost` |
| `source` | string | Lead-Quelle |
| `notes` | text | Notizen |
| `probability` | integer | Wahrscheinlichkeit (0-100%) |

**KI-Funktionen:**
- **Research:** KI-gestützte Recherche zum Lead
- **Outreach:** KI-generierte Kontaktaufnahme-Texte

---

### 4.5 Ideen-Modul

| Seite | URL | Funktion |
|-------|-----|----------|
| Übersicht | `/intern/ideas` | Ideenliste |
| Detail | `/intern/ideas/[id]` | Ideendetails |

**Funktion:** Ideen erfassen und in Leads oder Projekte konvertieren (`POST /api/v1/ideas/[id]/convert`).

---

### 4.6 DIN SPEC 27076 Audit-Modul

| Seite | URL | Funktion |
|-------|-----|----------|
| Übersicht | `/intern/din-audit` | Audit-Liste |
| Neu | `/intern/din-audit/new` | Neues Audit starten |
| Detail | `/intern/din-audit/[id]` | Audit-Übersicht |
| Interview | `/intern/din-audit/[id]/interview` | Fragebogen-basiertes Interview |
| Report | `/intern/din-audit/[id]/report` | Audit-Bericht mit Scoring |
| Förderungen | `/intern/din-audit/grants` | Förderprogramme verwalten |

**Beschreibung:** Digitalisierungs-Check nach DIN SPEC 27076 für KMU. Strukturierter Fragebogen mit automatisierter Auswertung und Scoring.

**Audit-Ablauf:**
1. Audit anlegen und Firma zuordnen
2. Interview durchführen (strukturierte Fragen nach DIN SPEC)
3. Antworten speichern und Scoring berechnen
4. Report generieren mit Handlungsempfehlungen und passenden Fördermitteln

**PDF-Bericht (DIN-konform):**
- Seite 1: Unternehmensdaten, Gesamtscore, Ergebnis je Themenbereich
- Seite 2: TOP- und Basis-Handlungsempfehlungen, Unterschriftenfelder
- Anhang A: Detailergebnisse aller Anforderungen
- Anhang B: Passende Förderprogramme (Querformat)
- Client-seitige Generierung mit jsPDF

---

### 4.7 Cybersecurity-Modul

| Seite | URL | Funktion |
|-------|-----|----------|
| Übersicht | `/intern/cybersecurity` | Cybersecurity-Dashboard mit Links zu DIN- und WiBA-Checks |

**Beschreibung:** Einstiegsseite für IT-Sicherheit. Verlinkt auf DIN SPEC 27076 Audits und BSI WiBA-Checks.

### 4.8 BSI WiBA-Modul

| Seite | URL | Funktion |
|-------|-----|----------|
| Übersicht | `/intern/wiba` | WiBA-Check-Liste |
| Neu | `/intern/wiba/new` | Neuen WiBA-Check starten |
| Detail | `/intern/wiba/[id]` | Check-Übersicht mit Kategorie-Fortschritt |
| Interview | `/intern/wiba/[id]/interview` | Fragebogen mit 257 Anforderungen |
| Report | `/intern/wiba/[id]/report` | Ergebnisbericht mit PDF-Download |

**Beschreibung:** Weg in die Basis-Absicherung (WiBA) nach BSI. Strukturierte Prüfung von 257 Anforderungen in 19 Kategorien.

**BSI-Bearbeitungsreihenfolge:**
Kategorien sind nach BSI-Empfehlung in 4 Prioritätsgruppen sortiert:
- **Priorität 1:** Organisation & Personal, Sensibilisierung und Schulung, Vorfallerkennung und -behandlung
- **Priorität 2:** Netze und Kommunikation, IT-Systeme, Detektion von sicherheitsrelevanten Ereignissen, u.a.
- **Priorität 3:** Zugangs-/Zugriffsregelung, Datensicherung, Geschäftskontinuität, u.a.
- **Priorität 4:** Kryptokonzept, Physische Sicherheit, Entwicklung, u.a.

**PDF-Bericht:**
- Deckblatt mit Unternehmensdaten und Gesamtscore
- Kategorieübersicht nach BSI-Priorität gruppiert
- Alle 257 Anforderungen mit farbcodierten Antworten (Grün=Ja, Rot=Nein, Grau=N/R)
- Handlungsempfehlungen für nicht-erfüllte Anforderungen

---

### 4.9 Blog-Modul

| Seite | URL | Funktion |
|-------|-----|----------|
| Übersicht | `/intern/blog` | Blog-Beiträge verwalten |
| Neu | `/intern/blog/new` | Neuen Beitrag erstellen |
| Detail | `/intern/blog/[id]` | Beitrag bearbeiten |

**Felder eines Blog-Beitrags:**
| Feld | Typ | Beschreibung |
|------|-----|-------------|
| `title` | string | Titel |
| `slug` | string | URL-Slug |
| `content` | richtext | Inhalt (Markdown/HTML) |
| `excerpt` | text | Kurzauszug |
| `coverImage` | string | Titelbild-URL |
| `status` | enum | `draft`, `published` |
| `publishedAt` | datetime | Veröffentlichungsdatum |
| `seoTitle` | string | SEO-Titel |
| `seoDescription` | string | SEO-Beschreibung |
| `seoKeywords` | string | SEO-Keywords |

**KI-Funktionen:**
- **Beitrag generieren:** Kompletten Blog-Beitrag per KI erstellen (`POST /api/v1/blog/posts/generate`)
- **SEO generieren:** SEO-Metadaten automatisch erstellen (`POST /api/v1/blog/posts/[id]/seo/generate`)
- **Veröffentlichen:** Beitrag freigeben (`POST /api/v1/blog/posts/[id]/publish`)

---

### 4.10 CMS-Modul

| Seite | URL | Funktion |
|-------|-----|----------|
| Seitenübersicht | `/intern/cms` | Alle CMS-Seiten verwalten |
| Seiteneditor | `/intern/cms/[id]` | Seite bearbeiten (Block-basiert) |
| Block-Editor | `/intern/cms/[id]/blocks/[blockId]` | Einzelnen Block bearbeiten |
| Navigation | `/intern/cms/navigation` | Website-Navigation verwalten |

**Block-basiertes CMS:**
- Seiten bestehen aus verschiebbaren Blöcken
- Verschiedene Block-Typen (Text, Bild, Hero, Features, etc.)
- Blöcke können dupliziert und sortiert werden
- Vorlagen-System für wiederverwendbare Seitenlayouts

**Navigation:**
- Hierarchische Navigationsstruktur
- Drag & Drop Sortierung
- Verknüpfung mit CMS-Seiten oder externen URLs

---

### 4.11 Marketing-Modul

| Seite | URL | Funktion |
|-------|-----|----------|
| Kampagnen | `/intern/marketing` | Marketing-Kampagnen verwalten |
| Neue Kampagne | `/intern/marketing/new` | Kampagne erstellen |
| Kampagnendetail | `/intern/marketing/[id]` | Kampagne mit Aufgaben |
| Vorlagen | `/intern/marketing/templates` | Kampagnenvorlagen |

**Felder einer Kampagne:**
| Feld | Typ | Beschreibung |
|------|-----|-------------|
| `name` | string | Kampagnenname |
| `description` | text | Beschreibung |
| `type` | string | Kampagnentyp |
| `status` | enum | `draft`, `active`, `paused`, `completed` |
| `startDate` | date | Startdatum |
| `endDate` | date | Enddatum |
| `budget` | decimal | Budget |
| `targetAudience` | text | Zielgruppe |

**KI-Funktionen:**
- **Aufgaben generieren:** KI erstellt Aufgabenliste für Kampagne (`POST /api/v1/marketing/tasks/generate`)

---

### 4.12 Social-Media-Modul

| Seite | URL | Funktion |
|-------|-----|----------|
| Beiträge | `/intern/social-media` | Social-Media-Beiträge verwalten |
| Neuer Beitrag | `/intern/social-media/new` | Beitrag erstellen |
| Beitragsdetail | `/intern/social-media/[id]` | Beitrag bearbeiten |
| Content-Plan | `/intern/social-media/content-plan` | Redaktionsplanung |
| Themen | `/intern/social-media/topics` | Themen verwalten |

**Felder eines Social-Media-Beitrags:**
| Feld | Typ | Beschreibung |
|------|-----|-------------|
| `content` | text | Beitragstext |
| `platform` | enum | `linkedin`, `facebook`, `instagram`, `twitter`, `xing` |
| `status` | enum | `draft`, `scheduled`, `published` |
| `scheduledAt` | datetime | Geplanter Veröffentlichungszeitpunkt |
| `topicId` | uuid | Zugehöriges Thema |
| `hashtags` | string[] | Hashtags |
| `mediaUrl` | string | Medien-URL |

**KI-Funktionen:**
- **Beitrag generieren:** KI-generierter Social-Media-Post (`POST /api/v1/social-media/posts/generate`)
- **Beitrag verbessern:** KI-Optimierung eines bestehenden Posts (`POST /api/v1/social-media/posts/[id]/improve`)
- **Content-Plan generieren:** Automatischer Redaktionsplan (`POST /api/v1/social-media/posts/generate-plan`)

---

### 4.13 Business Intelligence

| Seite | URL | Funktion |
|-------|-----|----------|
| BI-Dashboard | `/intern/business-intelligence` | Geschäftsanalysen und KPIs |

**API-Endpunkte:**
- `GET /api/v1/business-intelligence/profile` – Unternehmensprofil-Analyse
- `GET /api/v1/business-intelligence/documents/[id]` – Dokumenten-Analyse

---

### 4.14 Einstellungen

| Seite | URL | Funktion |
|-------|-----|----------|
| Übersicht | `/intern/settings` | Einstellungs-Übersicht |
| Mandant | `/intern/settings/tenant` | Firmendaten, Branding (Logo-Upload) |
| Benutzer | `/intern/settings/users` | Benutzerverwaltung |
| Benutzerdetail | `/intern/settings/users/[id]` | Benutzer bearbeiten |
| Rollen | `/intern/settings/roles` | Rollenverwaltung |
| Rollendetail | `/intern/settings/roles/[id]` | Rolle mit Berechtigungen |
| API-Schlüssel | `/intern/settings/api-keys` | API-Schlüssel verwalten |
| KI-Anbieter | `/intern/settings/ai-providers` | KI-Provider konfigurieren |
| KI-Prompts | `/intern/settings/ai-prompts` | KI-Prompt-Vorlagen |
| KI-Logs | `/intern/settings/ai-logs` | KI-Nutzungsprotokolle |
| Webhooks | `/intern/settings/webhooks` | Webhook-Konfiguration |
| API-Doku | `/intern/settings/api-docs` | Interaktive API-Dokumentation |
| n8n | `/intern/settings/n8n` | n8n-Verbindung konfigurieren |
| Datenbank | `/intern/settings/database` | Datenbank-Browser (Tabellen anzeigen, bearbeiten, löschen) |
| Datenexport | `/intern/settings/export` | Datenbankexport als SQL-Datei |
| Datenimport | `/intern/settings/import` | SQL-Datei importieren (Merge/Replace) |

---

## 5. API-Referenz

### Allgemeine Konventionen

**Basis-URL:** `/api/v1/`

**Authentifizierung:** Session-Cookie oder API-Key (`X-API-Key` Header)

**Standard-Antwortformat:**
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20
  }
}
```

**Fehler-Antwortformat:**
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Ressource nicht gefunden"
  }
}
```

**Paginierung (Query-Parameter):**
| Parameter | Typ | Standard | Beschreibung |
|-----------|-----|----------|-------------|
| `page` | integer | 1 | Seitennummer |
| `limit` | integer | 20 | Einträge pro Seite |
| `search` | string | – | Volltextsuche |
| `sortBy` | string | `createdAt` | Sortierfeld |
| `sortOrder` | string | `desc` | `asc` oder `desc` |

---

### 5.1 Firmen-API

#### `GET /api/v1/companies`
Firmenliste abrufen.

| Query-Parameter | Typ | Beschreibung |
|----------------|-----|-------------|
| `search` | string | Suche nach Name, E-Mail |
| `status` | string | Filter nach Status |
| `page` | integer | Seitennummer |
| `limit` | integer | Einträge pro Seite |

#### `POST /api/v1/companies`
Neue Firma anlegen.

| Body-Parameter | Typ | Pflicht | Beschreibung |
|---------------|-----|---------|-------------|
| `name` | string | Ja | Firmenname |
| `industry` | string | Nein | Branche |
| `website` | string | Nein | Website-URL |
| `email` | string | Nein | E-Mail |
| `phone` | string | Nein | Telefon |
| `street` | string | Nein | Straße |
| `zip` | string | Nein | PLZ |
| `city` | string | Nein | Stadt |
| `country` | string | Nein | Land |
| `notes` | string | Nein | Notizen |

#### `GET /api/v1/companies/[id]`
Einzelne Firma abrufen.

#### `PUT /api/v1/companies/[id]`
Firma aktualisieren. Body wie bei POST.

#### `DELETE /api/v1/companies/[id]`
Firma löschen (Soft-Delete oder Hard-Delete je nach Konfiguration).

#### `POST /api/v1/companies/[id]/crawl`
Website der Firma crawlen und Daten extrahieren.

#### `POST /api/v1/companies/[id]/research`
KI-Research zur Firma starten.

#### `POST /api/v1/companies/[id]/research/[researchId]/apply`
Research-Ergebnisse auf die Firmendaten anwenden.

#### `POST /api/v1/companies/[id]/research/[researchId]/reject`
Research-Ergebnisse ablehnen.

#### `POST /api/v1/companies/[id]/analyze-document`
Dokument analysieren und Firmendaten extrahieren.

#### `GET /api/v1/companies/[id]/persons`
Personen einer Firma auflisten.

#### `POST /api/v1/companies/[id]/persons`
Person einer Firma zuordnen.

---

### 5.2 Personen-API

#### `GET /api/v1/persons`
Personenliste abrufen.

#### `POST /api/v1/persons`
Neue Person anlegen.

| Body-Parameter | Typ | Pflicht | Beschreibung |
|---------------|-----|---------|-------------|
| `firstName` | string | Ja | Vorname |
| `lastName` | string | Ja | Nachname |
| `email` | string | Nein | E-Mail |
| `phone` | string | Nein | Telefon |
| `position` | string | Nein | Position |
| `companyId` | uuid | Nein | Firma |

#### `GET /api/v1/persons/[id]`
Einzelne Person abrufen.

#### `PUT /api/v1/persons/[id]`
Person aktualisieren.

#### `DELETE /api/v1/persons/[id]`
Person löschen.

#### `POST /api/v1/persons/[id]/research`
KI-Research zur Person starten.

---

### 5.3 Produkte-API

#### `GET /api/v1/products`
Produktliste abrufen.

#### `POST /api/v1/products`
Neues Produkt anlegen.

| Body-Parameter | Typ | Pflicht | Beschreibung |
|---------------|-----|---------|-------------|
| `name` | string | Ja | Name |
| `description` | string | Nein | Beschreibung |
| `sku` | string | Nein | Artikelnummer |
| `price` | number | Ja | Nettopreis |
| `taxRate` | number | Nein | Steuersatz (Standard: 19) |
| `unit` | string | Nein | Einheit |
| `categoryId` | uuid | Nein | Kategorie |

#### `GET /api/v1/products/[id]`
Einzelnes Produkt abrufen.

#### `PUT /api/v1/products/[id]`
Produkt aktualisieren.

#### `DELETE /api/v1/products/[id]`
Produkt löschen.

---

### 5.4 Produktkategorien-API

#### `GET /api/v1/product-categories`
Kategorien auflisten.

#### `POST /api/v1/product-categories`
Kategorie anlegen.

#### `GET /api/v1/product-categories/[id]`
Kategorie abrufen.

#### `PUT /api/v1/product-categories/[id]`
Kategorie aktualisieren.

#### `DELETE /api/v1/product-categories/[id]`
Kategorie löschen.

---

### 5.5 Dokumente-API (Angebote & Rechnungen)

#### `GET /api/v1/documents`
Dokumentliste abrufen.

| Query-Parameter | Typ | Beschreibung |
|----------------|-----|-------------|
| `type` | string | `offer` oder `invoice` |
| `status` | string | Statusfilter |
| `companyId` | uuid | Nach Firma filtern |

#### `POST /api/v1/documents`
Neues Dokument anlegen.

| Body-Parameter | Typ | Pflicht | Beschreibung |
|---------------|-----|---------|-------------|
| `type` | enum | Ja | `offer` oder `invoice` |
| `companyId` | uuid | Ja | Kunde |
| `personId` | uuid | Nein | Ansprechpartner |
| `date` | date | Ja | Dokumentdatum |
| `dueDate` | date | Nein | Fälligkeitsdatum |
| `notes` | string | Nein | Anmerkungen |

#### `GET /api/v1/documents/[id]`
Dokument mit Positionen abrufen.

#### `PUT /api/v1/documents/[id]`
Dokument aktualisieren.

#### `DELETE /api/v1/documents/[id]`
Dokument löschen.

#### `GET /api/v1/documents/next-number`
Nächste Dokumentnummer generieren.

| Query-Parameter | Typ | Beschreibung |
|----------------|-----|-------------|
| `type` | string | `offer` oder `invoice` |

#### `PUT /api/v1/documents/[id]/status`
Dokumentstatus ändern.

| Body-Parameter | Typ | Beschreibung |
|---------------|-----|-------------|
| `status` | string | Neuer Status |

#### `POST /api/v1/documents/[id]/convert`
Angebot in Rechnung konvertieren.

#### `GET /api/v1/documents/[id]/items`
Positionen eines Dokuments auflisten.

#### `POST /api/v1/documents/[id]/items`
Position hinzufügen.

| Body-Parameter | Typ | Pflicht | Beschreibung |
|---------------|-----|---------|-------------|
| `productId` | uuid | Nein | Produkt/Dienstleistung |
| `description` | string | Ja | Beschreibung |
| `quantity` | number | Ja | Menge |
| `unitPrice` | number | Ja | Einzelpreis |
| `taxRate` | number | Nein | Steuersatz |

#### `PUT /api/v1/documents/[id]/items/[itemId]`
Position aktualisieren.

#### `DELETE /api/v1/documents/[id]/items/[itemId]`
Position entfernen.

---

### 5.6 Leads-API

#### `GET /api/v1/leads`
Lead-Liste abrufen.

#### `POST /api/v1/leads`
Neuen Lead anlegen.

#### `GET /api/v1/leads/[id]`
Lead abrufen.

#### `PUT /api/v1/leads/[id]`
Lead aktualisieren.

#### `DELETE /api/v1/leads/[id]`
Lead löschen.

#### `POST /api/v1/leads/[id]/research`
KI-Research zum Lead.

#### `POST /api/v1/leads/[id]/outreach`
KI-generierte Kontaktaufnahme.

---

### 5.7 Ideen-API

#### `GET /api/v1/ideas`
Ideenliste abrufen.

#### `POST /api/v1/ideas`
Neue Idee anlegen.

#### `GET /api/v1/ideas/[id]`
Idee abrufen.

#### `PUT /api/v1/ideas/[id]`
Idee aktualisieren.

#### `DELETE /api/v1/ideas/[id]`
Idee löschen.

#### `POST /api/v1/ideas/[id]/convert`
Idee in Lead oder Projekt konvertieren.

---

### 5.8 Aktivitäten-API

#### `GET /api/v1/activities`
Aktivitäten auflisten (Anrufe, E-Mails, Notizen, Meetings).

| Query-Parameter | Typ | Beschreibung |
|----------------|-----|-------------|
| `companyId` | uuid | Nach Firma filtern |
| `personId` | uuid | Nach Person filtern |
| `leadId` | uuid | Nach Lead filtern |

#### `POST /api/v1/activities`
Aktivität anlegen.

#### `GET /api/v1/activities/[id]`
Aktivität abrufen.

#### `PUT /api/v1/activities/[id]`
Aktivität aktualisieren.

#### `DELETE /api/v1/activities/[id]`
Aktivität löschen.

---

### 5.9 DIN-Audit-API

#### `GET /api/v1/din/audits`
Audit-Liste abrufen.

#### `POST /api/v1/din/audits`
Neues Audit anlegen.

#### `GET /api/v1/din/audits/[id]`
Audit abrufen.

#### `PUT /api/v1/din/audits/[id]`
Audit aktualisieren.

#### `DELETE /api/v1/din/audits/[id]`
Audit löschen.

#### `POST /api/v1/din/audits/[id]/answers`
Audit-Antworten speichern.

#### `GET /api/v1/din/audits/[id]/scoring`
Audit-Scoring berechnen.

#### `GET /api/v1/din/requirements`
DIN-Anforderungen auflisten.

#### `POST /api/v1/din/requirements`
DIN-Anforderung anlegen.

#### `GET /api/v1/din/grants`
Förderprogramme auflisten.

#### `POST /api/v1/din/grants`
Förderprogramm anlegen.

#### `GET /api/v1/din/grants/[id]`
Förderprogramm abrufen.

#### `PUT /api/v1/din/grants/[id]`
Förderprogramm aktualisieren.

#### `DELETE /api/v1/din/grants/[id]`
Förderprogramm löschen.

---

### 5.10 Blog-API

#### `GET /api/v1/blog/posts`
Blog-Beiträge auflisten.

#### `POST /api/v1/blog/posts`
Blog-Beitrag anlegen.

#### `GET /api/v1/blog/posts/[id]`
Beitrag abrufen.

#### `PUT /api/v1/blog/posts/[id]`
Beitrag aktualisieren.

#### `DELETE /api/v1/blog/posts/[id]`
Beitrag löschen.

#### `POST /api/v1/blog/posts/[id]/publish`
Beitrag veröffentlichen.

#### `POST /api/v1/blog/posts/[id]/seo/generate`
SEO-Metadaten per KI generieren.

#### `POST /api/v1/blog/posts/generate`
Kompletten Blog-Beitrag per KI generieren.

| Body-Parameter | Typ | Beschreibung |
|---------------|-----|-------------|
| `topic` | string | Thema des Beitrags |
| `keywords` | string[] | Ziel-Keywords |
| `tone` | string | Tonalität |
| `length` | string | Gewünschte Länge |

---

### 5.11 CMS-API

#### Seiten

#### `GET /api/v1/cms/pages`
CMS-Seiten auflisten.

#### `POST /api/v1/cms/pages`
Neue CMS-Seite anlegen.

#### `GET /api/v1/cms/pages/[id]`
Seite abrufen.

#### `PUT /api/v1/cms/pages/[id]`
Seite aktualisieren.

#### `DELETE /api/v1/cms/pages/[id]`
Seite löschen.

#### `POST /api/v1/cms/pages/[id]/publish`
Seite veröffentlichen.

#### `POST /api/v1/cms/pages/[id]/seo/generate`
SEO per KI generieren.

#### Blöcke

#### `GET /api/v1/cms/pages/[id]/blocks`
Blöcke einer Seite auflisten.

#### `POST /api/v1/cms/pages/[id]/blocks`
Block zu einer Seite hinzufügen.

#### `PUT /api/v1/cms/pages/[id]/blocks/reorder`
Block-Reihenfolge ändern.

#### `GET /api/v1/cms/blocks/[id]`
Block abrufen.

#### `PUT /api/v1/cms/blocks/[id]`
Block aktualisieren.

#### `DELETE /api/v1/cms/blocks/[id]`
Block löschen.

#### `POST /api/v1/cms/blocks/[id]/duplicate`
Block duplizieren.

#### Block-Typen

#### `GET /api/v1/cms/block-types`
Block-Typen auflisten.

#### `POST /api/v1/cms/block-types`
Block-Typ anlegen.

#### `GET /api/v1/cms/block-types/[id]`
Block-Typ abrufen.

#### `PUT /api/v1/cms/block-types/[id]`
Block-Typ aktualisieren.

#### `DELETE /api/v1/cms/block-types/[id]`
Block-Typ löschen.

#### Navigation

#### `GET /api/v1/cms/navigation`
Navigationseinträge auflisten.

#### `POST /api/v1/cms/navigation`
Navigationseintrag anlegen.

#### `GET /api/v1/cms/navigation/[id]`
Eintrag abrufen.

#### `PUT /api/v1/cms/navigation/[id]`
Eintrag aktualisieren.

#### `DELETE /api/v1/cms/navigation/[id]`
Eintrag löschen.

#### `PUT /api/v1/cms/navigation/reorder`
Navigation umsortieren.

#### `POST /api/v1/cms/navigation/seed`
Standard-Navigation seeden.

#### Templates

#### `GET /api/v1/cms/templates`
Vorlagen auflisten.

#### `POST /api/v1/cms/templates`
Vorlage anlegen.

#### `GET /api/v1/cms/templates/[id]`
Vorlage abrufen.

#### `PUT /api/v1/cms/templates/[id]`
Vorlage aktualisieren.

#### `DELETE /api/v1/cms/templates/[id]`
Vorlage löschen.

---

### 5.12 Marketing-API

#### `GET /api/v1/marketing/campaigns`
Kampagnenliste abrufen.

#### `POST /api/v1/marketing/campaigns`
Kampagne anlegen.

#### `GET /api/v1/marketing/campaigns/[id]`
Kampagne abrufen.

#### `PUT /api/v1/marketing/campaigns/[id]`
Kampagne aktualisieren.

#### `DELETE /api/v1/marketing/campaigns/[id]`
Kampagne löschen.

#### `GET /api/v1/marketing/campaigns/[id]/tasks`
Aufgaben einer Kampagne.

#### `POST /api/v1/marketing/campaigns/[id]/tasks`
Aufgabe zu Kampagne hinzufügen.

#### `GET /api/v1/marketing/tasks`
Alle Marketing-Aufgaben.

#### `POST /api/v1/marketing/tasks`
Aufgabe anlegen.

#### `GET /api/v1/marketing/tasks/[id]`
Aufgabe abrufen.

#### `PUT /api/v1/marketing/tasks/[id]`
Aufgabe aktualisieren.

#### `DELETE /api/v1/marketing/tasks/[id]`
Aufgabe löschen.

#### `POST /api/v1/marketing/tasks/generate`
Aufgaben per KI generieren.

#### `GET /api/v1/marketing/templates`
Kampagnenvorlagen.

#### `POST /api/v1/marketing/templates`
Vorlage anlegen.

#### `GET /api/v1/marketing/templates/[id]`
Vorlage abrufen.

#### `PUT /api/v1/marketing/templates/[id]`
Vorlage aktualisieren.

#### `DELETE /api/v1/marketing/templates/[id]`
Vorlage löschen.

---

### 5.13 Social-Media-API

#### `GET /api/v1/social-media/posts`
Social-Media-Beiträge auflisten.

#### `POST /api/v1/social-media/posts`
Beitrag anlegen.

#### `GET /api/v1/social-media/posts/[id]`
Beitrag abrufen.

#### `PUT /api/v1/social-media/posts/[id]`
Beitrag aktualisieren.

#### `DELETE /api/v1/social-media/posts/[id]`
Beitrag löschen.

#### `POST /api/v1/social-media/posts/generate`
Beitrag per KI generieren.

#### `POST /api/v1/social-media/posts/generate-plan`
Content-Plan per KI erstellen.

#### `POST /api/v1/social-media/posts/[id]/improve`
Beitrag per KI optimieren.

#### `GET /api/v1/social-media/topics`
Themen auflisten.

#### `POST /api/v1/social-media/topics`
Thema anlegen.

#### `GET /api/v1/social-media/topics/[id]`
Thema abrufen.

#### `PUT /api/v1/social-media/topics/[id]`
Thema aktualisieren.

#### `DELETE /api/v1/social-media/topics/[id]`
Thema löschen.

---

### 5.14 Medien-API

#### `GET /api/v1/media`
Mediendateien auflisten.

#### `POST /api/v1/media`
Medieneintrag anlegen.

#### `GET /api/v1/media/[id]`
Medium abrufen.

#### `PUT /api/v1/media/[id]`
Medium aktualisieren.

#### `DELETE /api/v1/media/[id]`
Medium löschen.

#### `POST /api/v1/media/upload`
Datei hochladen (multipart/form-data). Erlaubte Typen: JPEG, PNG, WebP, GIF. Max. 5 MB.
In Produktion werden Dateien unter `MEDIA_UPLOAD_DIR` (Docker-Volume) persistiert statt in `/public/uploads/`.

#### `GET /api/v1/media/serve/[tenantId]/[filename]`
Hochgeladene Datei ausliefern (öffentlich, kein Auth). Wird automatisch als Pfad bei Uploads in Produktionsumgebung vergeben. Cache-Header: 1 Jahr, immutable.

---

### 5.15 Benutzer- & Rollenverwaltung-API

#### Benutzer

#### `GET /api/v1/users`
Benutzerliste abrufen.

#### `POST /api/v1/users`
Benutzer anlegen.

#### `GET /api/v1/users/[id]`
Benutzer abrufen.

#### `PUT /api/v1/users/[id]`
Benutzer aktualisieren.

#### `DELETE /api/v1/users/[id]`
Benutzer löschen.

#### Rollen

#### `GET /api/v1/roles`
Rollenliste abrufen.

#### `POST /api/v1/roles`
Rolle anlegen.

#### `GET /api/v1/roles/[id]`
Rolle abrufen (mit Berechtigungen).

#### `PUT /api/v1/roles/[id]`
Rolle aktualisieren (inkl. Berechtigungen).

#### `DELETE /api/v1/roles/[id]`
Rolle löschen.

---

### 5.16 API-Schlüssel

#### `GET /api/v1/api-keys`
API-Schlüssel auflisten.

#### `POST /api/v1/api-keys`
API-Schlüssel generieren.

#### `GET /api/v1/api-keys/[id]`
Schlüssel abrufen.

#### `PUT /api/v1/api-keys/[id]`
Schlüssel aktualisieren.

#### `DELETE /api/v1/api-keys/[id]`
Schlüssel widerrufen.

---

### 5.17 Webhooks-API

#### `GET /api/v1/webhooks`
Webhooks auflisten.

#### `POST /api/v1/webhooks`
Webhook anlegen.

| Body-Parameter | Typ | Pflicht | Beschreibung |
|---------------|-----|---------|-------------|
| `url` | string | Ja | Ziel-URL |
| `events` | string[] | Ja | Events (z.B. `company.created`, `invoice.paid`) |
| `active` | boolean | Nein | Aktiv/Inaktiv |

#### `GET /api/v1/webhooks/[id]`
Webhook abrufen.

#### `PUT /api/v1/webhooks/[id]`
Webhook aktualisieren.

#### `DELETE /api/v1/webhooks/[id]`
Webhook löschen.

---

### 5.18 Mandant-API

#### `GET /api/v1/tenant`
Mandanten-Informationen abrufen (Firmenname, Einstellungen, etc.).

---

### 5.19 E-Mail-API

#### `POST /api/v1/email/send`
E-Mail versenden.

| Body-Parameter | Typ | Pflicht | Beschreibung |
|---------------|-----|---------|-------------|
| `to` | string | Ja | Empfänger |
| `subject` | string | Ja | Betreff |
| `body` | string | Ja | Inhalt (HTML) |

---

### 5.20 Import/Export-API

#### `GET /api/v1/export/database`
Datenbankexport als SQL-Datei herunterladen. Exportiert alle Tenant-spezifischen Tabellen (gefiltert nach `tenant_id`), `role_permissions` (über Join), und globale Referenztabellen (`din_requirements`, `din_grants`, `wiba_requirements`, `cms_block_type_definitions`).

**Antwort:** SQL-Datei als Download (`Content-Disposition: attachment`)

#### `POST /api/v1/import/database`
SQL-Datei importieren. Akzeptiert `.sql`-Dateien bis 50 MB.

| FormData-Parameter | Typ | Pflicht | Beschreibung |
|-------------------|-----|---------|-------------|
| `file` | File | Ja | SQL-Datei (.sql) |
| `mode` | string | Nein | `merge` (Standard, ON CONFLICT DO NOTHING) oder `replace` (bestehende Daten löschen) |

**Unterstützte Tabellen:** 55 Tabellen inkl. CRM, Finanzen, DIN, WiBA, CMS, Marketing, Social Media, n8n

---

### 5.21 Business Intelligence-API

#### `GET /api/v1/business-intelligence/profile`
Unternehmensprofil-Daten für BI-Dashboard.

#### `GET /api/v1/business-intelligence/documents/[id]`
Dokumenten-Analyse abrufen.

---

### 5.22 Öffentliche API (ohne Auth)

#### `GET /api/v1/public/blog/posts`
Veröffentlichte Blog-Beiträge (öffentlich).

#### `GET /api/v1/public/blog/posts/[slug]`
Einzelner Blog-Beitrag nach Slug (öffentlich).

#### `GET /api/v1/public/pages/[...slug]`
CMS-Seite nach Slug (öffentlich).

#### `GET /api/v1/public/navigation`
Website-Navigation (öffentlich).

#### `GET /api/v1/public/branding`
Branding-Informationen (Logo-URL, Alt-Text) aus `tenants.settings`. Fallback auf Standard-Logo wenn keins konfiguriert.
**Response:** `{ logoUrl: string, logoAlt: string }`

#### `POST /api/v1/contact`
Kontaktformular absenden (öffentlich).

---

### 5.23 WiBA-API (BSI Weg in die Basis-Absicherung)

#### `GET /api/v1/wiba/audits`
WiBA-Checks auflisten. Unterstützt Pagination und Status-Filter.

#### `POST /api/v1/wiba/audits`
Neuen WiBA-Check anlegen.

| Body-Parameter | Typ | Pflicht | Beschreibung |
|---------------|-----|---------|-------------|
| `companyId` | string | Ja | Zugeordnete Firma |

#### `GET /api/v1/wiba/audits/[id]`
WiBA-Check abrufen (inkl. Firmen- und Berater-Daten).

#### `PUT /api/v1/wiba/audits/[id]`
WiBA-Check aktualisieren (Status, Zeitstempel).

#### `DELETE /api/v1/wiba/audits/[id]`
WiBA-Check löschen.

#### `GET /api/v1/wiba/audits/[id]/answers`
Antworten eines WiBA-Checks abrufen.

#### `POST /api/v1/wiba/audits/[id]/answers`
Antworten speichern (einzeln oder als Bulk).

| Body-Parameter | Typ | Pflicht | Beschreibung |
|---------------|-----|---------|-------------|
| `requirementId` | number | Ja | Anforderungs-ID |
| `status` | string | Ja | `ja`, `nein`, `nicht_relevant` |
| `notes` | string | Nein | Begründung/Notizen |

#### `GET /api/v1/wiba/audits/[id]/scoring`
Scoring berechnen mit Risikobewertung, Kategorie-Fortschritt, BSI-Prioritätsreihenfolge.

#### `GET /api/v1/wiba/requirements`
Alle 257 WiBA-Anforderungen auflisten. Liefert zusätzlich `categoryNames`, `categoryOrder` (BSI-Reihenfolge) und `categoryPriorities`.

---

### 5.24 Datenbank-Administration-API

#### `GET /api/v1/admin/database/tables`
Alle Datenbanktabellen mit Zeilenanzahl auflisten. Berechtigung: `database:read`.

#### `GET /api/v1/admin/database/tables/[tableName]`
Tabellendaten lesen mit Pagination und Spalten-Metadaten. Tenant-gefiltert bei Tabellen mit `tenant_id`.

#### `PUT /api/v1/admin/database/tables/[tableName]`
Einzelne Zeile aktualisieren. Berechtigung: `database:update`.

| Body-Parameter | Typ | Pflicht | Beschreibung |
|---------------|-----|---------|-------------|
| `id` | string | Ja | Zeilen-ID |
| `...` | mixed | Ja | Zu aktualisierende Spalten |

#### `DELETE /api/v1/admin/database/tables/[tableName]`
Einzelne Zeile löschen. Berechtigung: `database:delete`.

| Query-Parameter | Typ | Pflicht | Beschreibung |
|----------------|-----|---------|-------------|
| `id` | string | Ja | Zeilen-ID |

**Erlaubte Tabellen:** 55 Tabellen (alle pgTable-Definitionen aus dem Schema)

---

### 5.25 AI-Providers-API

#### `GET /api/v1/ai-providers`
Alle KI-Anbieter auflisten (API-Keys maskiert).

#### `POST /api/v1/ai-providers`
Neuen KI-Anbieter anlegen.

| Body-Parameter | Typ | Pflicht | Beschreibung |
|---------------|-----|---------|-------------|
| `name` | string | Ja | Anzeigename |
| `providerType` | string | Ja | `gemini`, `openai`, `openrouter`, `deepseek`, `kimi`, `ollama`, `firecrawl`, `kie` |
| `model` | string | Nein | Modellname |
| `apiKey` | string | Ja* | API-Key (*nicht bei Ollama) |
| `baseUrl` | string | Nein | Basis-URL (für Ollama/Self-Hosted) |

#### `GET /api/v1/ai-providers/[id]`
KI-Anbieter abrufen.

#### `PUT /api/v1/ai-providers/[id]`
KI-Anbieter aktualisieren.

#### `DELETE /api/v1/ai-providers/[id]`
KI-Anbieter löschen.

---

## 6. Module im Detail

### Berechtigungssystem

Jedes Modul hat definierte Aktionen. Berechtigungen werden über Rollen vergeben.

| Modul | Aktionen |
|-------|----------|
| `contacts` | `read`, `create`, `update`, `delete` |
| `catalog` | `read`, `create`, `update`, `delete` |
| `finance` | `read`, `create`, `update`, `delete` |
| `leads` | `read`, `create`, `update`, `delete` |
| `ideas` | `read`, `create`, `update`, `delete` |
| `blog` | `read`, `create`, `update`, `delete`, `publish` |
| `cms` | `read`, `create`, `update`, `delete`, `publish` |
| `marketing` | `read`, `create`, `update`, `delete` |
| `social-media` | `read`, `create`, `update`, `delete` |
| `din-audit` | `read`, `create`, `update`, `delete` |
| `wiba` | `read`, `create`, `update`, `delete` |
| `cybersecurity` | `read`, `create`, `update`, `delete` |
| `n8n_workflows` | `read`, `create`, `update`, `delete` |
| `database` | `read`, `update`, `delete` |
| `settings` | `read`, `update` |
| `users` | `read`, `create`, `update`, `delete` |
| `roles` | `read`, `create`, `update`, `delete` |
| `ai` | `read`, `create` |
| `business-intelligence` | `read` |

---

## 7. KI-Integration

### Unterstützte KI-Anbieter

| Anbieter | Beschreibung |
|----------|-------------|
| **Gemini** | Google Gemini 2.5 Flash/Pro (mit Thinking-Parts-Handling) |
| **OpenAI** | GPT-4o, GPT-4, GPT-3.5 |
| **OpenRouter** | Zugang zu verschiedenen Modellen |
| **Deepseek** | Deepseek-Modelle |
| **Kimi** | Moonshot AI |
| **Ollama** | Lokale Modelle |
| **Firecrawl** | Web-Scraping und Recherche |
| **kie.ai** | Video-Generierung mit Kling 3.0 (Text-to-Video, Image-to-Video) |

### KI-API-Endpunkte

#### `POST /api/v1/ai/completion`
KI-Textgenerierung.

| Body-Parameter | Typ | Pflicht | Beschreibung |
|---------------|-----|---------|-------------|
| `prompt` | string | Ja | Eingabe-Prompt |
| `model` | string | Nein | Modell (optional) |
| `temperature` | number | Nein | Kreativität (0-2) |
| `maxTokens` | number | Nein | Maximale Tokens |

#### `POST /api/v1/ai/research`
KI-gestützte Recherche.

#### `GET /api/v1/ai/status`
Status aller konfigurierten KI-Anbieter.

### KI-Prompt-Vorlagen

Verwaltung über `/intern/settings/ai-prompts`. Jede Vorlage hat einen eindeutigen `slug`, der im Code referenziert wird. System nutzt `AiPromptTemplateService.getOrDefault(tenantId, slug)`.

### KI-Nutzungsprotokolle

Alle KI-Aufrufe werden geloggt unter `/intern/settings/ai-logs`:
- Verwendetes Modell
- Token-Verbrauch
- Dauer
- Kosten
- Statistik-Übersicht via `GET /api/v1/ai-logs/stats`

---

## 8. CMS-System

### Architektur

Das CMS basiert auf einem **Block-basierten** Editor:

```
Seite (Page)
├── Block 1 (z.B. Hero)
│   └── Inhalt (JSON-basiert)
├── Block 2 (z.B. Features-Grid)
│   └── Inhalt (JSON-basiert)
├── Block 3 (z.B. Text)
│   └── Inhalt (JSON-basiert)
└── Block N
```

### Block-Typen

Block-Typen definieren das Schema und die Darstellung jedes Blocks. Neue Block-Typen können über die API angelegt werden.

### Navigation

- Hierarchische Struktur (Parent/Child)
- Verknüpfung mit CMS-Seiten oder externen URLs
- Sortierbar per Drag & Drop
- Öffentlich abrufbar unter `GET /api/v1/public/navigation`

### SEO

Jede Seite und jeder Blog-Beitrag unterstützt:
- SEO-Titel
- SEO-Beschreibung
- SEO-Keywords
- Automatische SEO-Generierung per KI

---

## 9. BSI WiBA-Modul

### Überblick
Der BSI „Weg in die Basis-Absicherung" (WiBA) Check prüft 257 Anforderungen in 19 Kategorien. Die Kategorien sind nach BSI-Empfehlung in 4 Prioritätsgruppen sortiert.

### Datenmodell
| Tabelle | Beschreibung |
|---------|-------------|
| `wiba_requirements` | 257 Anforderungen mit Kategorie, Hilfetext, Aufwand (global, ohne tenant_id) |
| `wiba_audit_sessions` | WiBA-Checks pro Tenant mit Status und Zeitstempeln |
| `wiba_answers` | Antworten (ja/nein/nicht_relevant) mit Notizen |

### Scoring
- **Gesamtscore:** Prozentuale Erfüllung über alle relevanten Anforderungen
- **Kategorie-Fortschritt:** Prozent pro Kategorie
- **Risikobewertung:** 5-stufig (Grün → Rot) basierend auf Gesamtprozent
- **Spider-Chart:** Radar-Diagramm nach BSI-Prioritätsreihenfolge

### PDF-Bericht
Client-seitige Generierung mit `jsPDF` und `jspdf-autotable`:
- Deckblatt mit Unternehmensdaten und Score
- Kategorieübersicht nach BSI-Priorität
- Detailtabelle aller 257 Anforderungen (farbcodiert)
- Handlungsempfehlungen mit Hilfetext und Aufwand

---

## 12. Datenbank-Administration

### Überblick
Der Datenbank-Browser unter `/intern/settings/database` ermöglicht direkten Zugriff auf alle Tabellen:
- Tabellen auflisten mit Zeilenanzahl
- Daten anzeigen mit Pagination
- Zeilen bearbeiten und löschen
- Spalten-Metadaten (Typ, Nullable, Default)

### Sicherheit
- **Tabellen-Whitelist:** Nur 55 definierte Tabellen sind zugänglich
- **Tenant-Isolation:** Tabellen mit `tenant_id` werden automatisch gefiltert
- **Berechtigungen:** Modul `database` mit Aktionen `read`, `update`, `delete`
- **Schutz:** `tenant_id` kann nicht verändert werden

---

## Anhang: Webhook-Events

| Event | Beschreibung |
|-------|-------------|
| `company.created` | Firma angelegt |
| `company.updated` | Firma aktualisiert |
| `company.deleted` | Firma gelöscht |
| `person.created` | Person angelegt |
| `person.updated` | Person aktualisiert |
| `lead.created` | Lead angelegt |
| `lead.updated` | Lead aktualisiert |
| `document.created` | Dokument angelegt |
| `document.status_changed` | Dokumentstatus geändert |
| `invoice.paid` | Rechnung bezahlt |
| `blog.published` | Blog-Beitrag veröffentlicht |
| `cms.page.published` | CMS-Seite veröffentlicht |

---

## 10. n8n Workflow-Integration

### Überblick
Das BusinessOS bietet eine vollständige n8n-Integration für Workflow-Automatisierung:
- Verbindung zu n8n Cloud oder Self-Hosted Instanzen
- Workflows auflisten, erstellen, aktivieren, ausführen und löschen
- KI-gestützter Workflow-Generator: Workflows aus natürlicher Sprache generieren
- Automatisches Deployment generierter Workflows auf n8n

### Seiten
| Route | Beschreibung |
|-------|-------------|
| `/intern/n8n-workflows` | Workflow-Übersicht |
| `/intern/n8n-workflows/new` | Neuen Workflow mit KI erstellen |
| `/intern/n8n-workflows/:id` | Workflow-Details und Ausführungen |
| `/intern/settings/n8n` | n8n-Verbindung konfigurieren |

### API-Endpunkte
| Methode | Pfad | Beschreibung |
|---------|------|-------------|
| GET | `/api/v1/n8n/connection` | Verbindung anzeigen |
| POST | `/api/v1/n8n/connection` | Verbindung erstellen/aktualisieren |
| POST | `/api/v1/n8n/connection/test` | Verbindung testen |
| GET | `/api/v1/n8n/workflows` | Workflows auflisten |
| POST | `/api/v1/n8n/workflows` | Workflow erstellen (JSON) |
| GET | `/api/v1/n8n/workflows/:id` | Workflow-Details |
| PUT | `/api/v1/n8n/workflows/:id` | Workflow aktualisieren |
| DELETE | `/api/v1/n8n/workflows/:id` | Workflow löschen |
| POST | `/api/v1/n8n/workflows/:id/activate` | Aktivieren/Deaktivieren |
| POST | `/api/v1/n8n/workflows/:id/execute` | Workflow ausführen |
| POST | `/api/v1/n8n/workflows/generate` | KI-Workflow-Generator |

### DB-Tabellen
- `n8n_connections` - n8n-Verbindungsdaten pro Tenant
- `n8n_workflow_logs` - Generierungs- und Deploy-Logs

### Berechtigungen
Modul: `n8n_workflows` (CRUD) - konfigurierbar über Rollenverwaltung

---

## 11. kie.ai Video-Generierung

### Überblick
kie.ai ist als KI-Provider integriert für Video-Generierung mit Kling 3.0:
- Text-to-Video und Image-to-Video
- Asynchrone Verarbeitung mit Task-Status-Abfrage
- Integration in n8n-Workflows möglich

### Provider anlegen
In Einstellungen > Integrations als Provider-Typ `kie` mit API Key anlegen.

### API-Endpunkte
| Methode | Pfad | Beschreibung |
|---------|------|-------------|
| POST | `/api/v1/kie/generate` | Video-Generierung starten |
| GET | `/api/v1/kie/status/:taskId` | Status abfragen |

### Parameter für Video-Generierung
| Parameter | Typ | Beschreibung |
|-----------|-----|-------------|
| `prompt` | string | Beschreibung des Videos |
| `model` | string | z.B. `market/kling/kling-3.0` |
| `aspectRatio` | string | `9:16`, `16:9`, `1:1` |
| `mode` | string | `std` oder `pro` |
| `sound` | boolean | Audio generieren |
| `imageUrls` | string[] | Bilder für Image-to-Video |

---

## Anhang: Umgebungsvariablen

| Variable | Beschreibung |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL-Verbindungs-URL |
| `NEXTAUTH_SECRET` | Session-Verschlüsselung |
| `NEXTAUTH_URL` | Basis-URL der Anwendung |
| `GEMINI_API_KEY` | Google Gemini API-Key |
| `OPENAI_API_KEY` | OpenAI API-Key |
| `OPENROUTER_API_KEY` | OpenRouter API-Key |
| `DEEPSEEK_API_KEY` | Deepseek API-Key |
| `KIE_API_KEY` | kie.ai API-Key (optional, alternativ per DB) |
| `FIRECRAWL_API_KEY` | Firecrawl API-Key (optional, alternativ per DB) |
| `REDIS_URL` | Redis-Verbindungs-URL (für Session-Cache und Rate-Limiting) |
| `SMTP_HOST` | SMTP-Server |
| `SMTP_PORT` | SMTP-Port |
| `SMTP_USER` | SMTP-Benutzername |
| `SMTP_PASS` | SMTP-Passwort |

---

---

## 13. Prozesshandbuch

Digitales SOP-Handbuch mit 93 Aufgaben in 9 Prozessbereichen (KP1-KP7, MP, UP).

### Seiten
| Seite | Beschreibung |
|-------|-------------|
| `/intern/prozesse` | Uebersicht mit collapsible Sidebar-Navigation (Prozess > Teilprozess > Aufgabe), Accordion-Ansicht |
| `/intern/prozesse/dev` | Programmierauftraege: filterbar nach Prioritaet/Aufwand/Tool, inline-editierbar, MD-Export, KI-Analyse pro Aufgabe |

### API-Endpoints
| Methode | Pfad | Beschreibung |
|---------|------|-------------|
| GET | `/api/v1/processes` | Alle Prozessbereiche mit Task-Zaehler |
| POST | `/api/v1/processes` | Neuer Prozessbereich |
| GET | `/api/v1/processes/[id]` | Prozess mit allen Tasks |
| PUT | `/api/v1/processes/[id]` | Prozess aktualisieren |
| DELETE | `/api/v1/processes/[id]` | Prozess loeschen |
| GET | `/api/v1/processes/[id]/tasks` | Tasks eines Prozesses |
| POST | `/api/v1/processes/[id]/tasks` | Neue Aufgabe |
| PUT | `/api/v1/processes/tasks/[taskId]` | Aufgabe aktualisieren |
| DELETE | `/api/v1/processes/tasks/[taskId]` | Aufgabe loeschen |
| POST | `/api/v1/processes/seed` | JSON-Import (Body oder Server-Dateien) |
| POST | `/api/v1/processes/mapping` | Bulk-Update App-Status/devRequirements |
| GET | `/api/v1/processes/dev-tasks` | Alle Tasks mit Programmieranforderungen |
| POST | `/api/v1/processes/dev-tasks/generate` | KI-Batch-Analyse fuer devRequirements |

### DB-Tabellen
- `processes` — Prozessbereiche (key, name, description, sortOrder)
- `process_tasks` — Aufgaben mit steps/checklist/tools (JSONB), appStatus, appNotes, appModule, devRequirements

---

## 14. Task-Queue

Ersetzt Cron-Jobs. Tasks werden in DB gequeued und per Button ausgefuehrt.

### Seite
| Seite | Beschreibung |
|-------|-------------|
| `/intern/settings/task-queue` | Tabelle mit Filter (Status, Typ), Checkboxen, "Ausgewaehlte ausfuehren" / "Alle ausfuehren" |

### API-Endpoints
| Methode | Pfad | Beschreibung |
|---------|------|-------------|
| GET | `/api/v1/task-queue` | Tasks mit ?status=&type= Filter |
| POST | `/api/v1/task-queue` | Neuen Task erstellen |
| GET | `/api/v1/task-queue/[id]` | Task-Detail |
| PUT | `/api/v1/task-queue/[id]` | Task stornieren (action=cancel) |
| DELETE | `/api/v1/task-queue/[id]` | Task loeschen |
| POST | `/api/v1/task-queue/execute` | Ausfuehren: {ids:[]}, {id:""} oder {all:true} |

### Task-Typen
| Typ | Handler | Beschreibung |
|-----|---------|-------------|
| `email` | EmailService.send/sendWithTemplate | E-Mail versenden (direkt oder via Template) |
| `dunning` | DunningHandler | 3-Stufen-Mahnwesen (7/14/21 Tage) |
| `follow_up` | EmailService.sendWithTemplate | Follow-up E-Mail |
| `reminder` | EmailService.sendWithTemplate | Erinnerung |

### DB-Tabelle
- `task_queue` — type, status, priority, payload (JSONB), scheduledFor, referenceType/Id

---

## 15. E-Mail-Templates

Template-System fuer automatisierte E-Mails mit {{Platzhalter}}-Syntax.

### Seite
| Seite | Beschreibung |
|-------|-------------|
| `/intern/settings/email-templates` | CRUD, Vorschau, Seed-Import (12 Defaults) |

### API-Endpoints
| Methode | Pfad | Beschreibung |
|---------|------|-------------|
| GET | `/api/v1/email-templates` | Alle Templates |
| POST | `/api/v1/email-templates` | Neues Template |
| GET | `/api/v1/email-templates/[id]` | Template-Detail |
| PUT | `/api/v1/email-templates/[id]` | Template aktualisieren |
| DELETE | `/api/v1/email-templates/[id]` | Template loeschen |
| POST | `/api/v1/email-templates/seed` | 12 Default-Templates importieren |

### Default-Templates
lead_first_response, offer_send, follow_up_offer, welcome, reminder_7d, dunning_14d, dunning_21d, testimonial_request, birthday, christmas, after_sales_6w, meeting_invite

### DB-Tabelle
- `email_templates` — slug, name, subject, bodyHtml, placeholders (JSONB)

---

## 16. Zeiterfassung

Start/Stop-Timer und manuelle Zeiteintraege mit Firmenzuordnung.

### Seite
| Seite | Beschreibung |
|-------|-------------|
| `/intern/zeiterfassung` | Timer, manuelle Eingabe, Tagesuebersicht, Tabelle |

### API-Endpoints
| Methode | Pfad | Beschreibung |
|---------|------|-------------|
| GET | `/api/v1/time-entries` | Eintraege mit ?companyId=&from=&to= |
| POST | `/api/v1/time-entries` | Neuer Eintrag |
| GET | `/api/v1/time-entries/[id]` | Detail |
| PUT | `/api/v1/time-entries/[id]` | Aktualisieren |
| DELETE | `/api/v1/time-entries/[id]` | Loeschen |
| GET | `/api/v1/time-entries/timer` | Laufender Timer |
| POST | `/api/v1/time-entries/timer` | Timer starten/stoppen ({action: "start"/"stop"}) |
| POST | `/api/v1/time-entries/invoice` | Rechnung aus Zeiteintraegen erstellen |

### DB-Tabelle
- `time_entries` — userId, companyId, date, startTime, endTime, durationMinutes, billable, hourlyRate

### Erweiterung documents-Tabelle
- `paymentStatus` (unpaid/paid/overdue), `paidAt`, `paidAmount`, `dunningLevel`

---

## 17. Projekt-Modul (Kanban)

Kanban-Board mit Drag&Drop (@dnd-kit) fuer Projektmanagement.

### Seiten
| Seite | Beschreibung |
|-------|-------------|
| `/intern/projekte` | Projektuebersicht als Cards |
| `/intern/projekte/[id]` | Kanban-Board mit Spalten, Drag&Drop |

### API-Endpoints
| Methode | Pfad | Beschreibung |
|---------|------|-------------|
| GET | `/api/v1/projects` | Projektliste mit ?status= |
| POST | `/api/v1/projects` | Neues Projekt |
| GET | `/api/v1/projects/[id]` | Projekt mit Tasks |
| PUT | `/api/v1/projects/[id]` | Projekt aktualisieren |
| DELETE | `/api/v1/projects/[id]` | Projekt loeschen |
| GET | `/api/v1/projects/[id]/tasks` | Tasks eines Projekts |
| POST | `/api/v1/projects/[id]/tasks` | Neue Aufgabe |
| PUT | `/api/v1/projects/[id]/tasks/[taskId]` | Aufgabe verschieben/aktualisieren |
| DELETE | `/api/v1/projects/[id]/tasks/[taskId]` | Aufgabe loeschen |

### DB-Tabellen
- `projects` — name, companyId, status, projectType (kanban/okr/content), columns (JSONB)
- `project_tasks` — title, columnId, position, assignedTo, dueDate, checklist (JSONB), labels

---

## 18. Newsletter

Subscriber-Verwaltung, Kampagnen-Erstellung und Versand.

### API-Endpoints
| Methode | Pfad | Beschreibung |
|---------|------|-------------|
| GET | `/api/v1/newsletter/subscribers` | Subscriber-Liste mit ?status=&search= |
| POST | `/api/v1/newsletter/subscribers` | Einzeln oder Bulk-Import ({subscribers:[]}) |
| GET | `/api/v1/newsletter/campaigns` | Kampagnen-Liste |
| POST | `/api/v1/newsletter/campaigns` | Neue Kampagne |
| POST | `/api/v1/newsletter/campaigns/[id]/send` | Kampagne versenden |

### DB-Tabellen
- `newsletter_subscribers` — email, name, tags, status (active/unsubscribed/bounced)
- `newsletter_campaigns` — name, subject, bodyHtml, status, stats (JSONB), segmentTags

---

## 19. Dokument-Generator

KI-gestuetztes Template-System fuer Berichte, Richtlinien und Playbooks.

### API-Endpoints
| Methode | Pfad | Beschreibung |
|---------|------|-------------|
| GET | `/api/v1/document-templates` | Templates mit ?category= |
| POST | `/api/v1/document-templates` | Neues Template |
| POST | `/api/v1/document-templates/[id]/generate` | KI fuellt Template ({context: "..."}) |
| POST | `/api/v1/document-templates/seed` | 7 Default-Templates importieren |
| POST | `/api/v1/din/audits/[id]/roadmap` | Security-Roadmap aus Audit-Ergebnissen |

### Default-Templates
Massnahmenplan, Security-Roadmap, Betriebshandbuch, Backup-Strategie, Security-Richtlinie, Notfall-Playbook, Awareness-Schulung

### DB-Tabelle
- `document_templates` — name, category, bodyHtml, placeholders (JSONB), headerHtml, footerHtml

---

## 20. Feedback-Modul

Feedback-Formulare mit oeffentlichem Antwort-Endpoint und NPS-Berechnung.

### API-Endpoints
| Methode | Pfad | Beschreibung |
|---------|------|-------------|
| GET | `/api/v1/feedback` | Formulare mit Response-Zaehler |
| POST | `/api/v1/feedback` | Neues Formular |
| POST | `/api/v1/feedback/[token]/respond` | Oeffentlicher Antwort-Endpoint (kein Auth) |

### DB-Tabellen
- `feedback_forms` — name, questions (JSONB), token (unique), companyId
- `feedback_responses` — formId, answers (JSONB), npsScore

---

## 21. KPI-Dashboard

Aggregierte Business-Metriken mit Zeitraum-Filter.

### API-Endpoint
| Methode | Pfad | Beschreibung |
|---------|------|-------------|
| GET | `/api/v1/kpi?from=&to=` | Leads, Conversion, Umsatz, offene/ueberfaellige Rechnungen |

### Metriken
newLeads, wonLeads, conversionRate, revenue, openInvoices, overdueInvoices

---

## 22. Social Media Publishing

Direktes Posten auf LinkedIn und Twitter/X.

### API-Endpoints
| Methode | Pfad | Beschreibung |
|---------|------|-------------|
| POST | `/api/v1/social-media/posts/[id]/publish` | Post auf Plattform(en) veroeffentlichen |

### Konfiguration
LinkedIn: AI-Provider type=`linkedin`, apiKey=`accessToken|authorUrn`
Twitter: AI-Provider type=`twitter`, apiKey=`bearerToken`

---

## 23. SEO-Keyword-Recherche

KI-basierte Keyword-Analyse mit optionaler SerpAPI-Integration.

### API-Endpoint
| Methode | Pfad | Beschreibung |
|---------|------|-------------|
| POST | `/api/v1/seo/keywords` | Keyword-Analyse ({keyword, language}) |

### Response
primaryKeyword, searchIntent, difficulty, relatedKeywords, longTailKeywords, contentSuggestions, estimatedMonthlySearches

---

## Weitere neue Endpoints

| Methode | Pfad | Beschreibung |
|---------|------|-------------|
| GET | `/api/v1/companies/[id]/prep` | KI-Gespraechsvorbereitung |
| POST | `/api/v1/documents/[id]/send` | Dokument per E-Mail versenden |
| POST | `/api/v1/leads/inbound` | Inbound-Lead von Formular/Webhook |
| POST | `/api/v1/blog/posts/[id]/review` | KI-Review (Lesbarkeit, SEO, Tonalitaet) |
| POST | `/api/v1/blog/posts/[id]/publish-wp` | Blog-Post auf WordPress veroeffentlichen |
| GET | `/api/v1/persons/birthdays?days=7` | Anstehende Geburtstage |
| GET | `/api/v1/receipts` | Belege (Belegverwaltung) |
| POST | `/api/v1/receipts` | Neuer Beleg |

---

## 24. Workflow-Engine

Interne, in BusinessOS eingebettete Workflow-Automatisierung. Reagiert auf System-Events (Trigger), führt eine Sequenz von Aktionen aus und unterstützt Verzweigungen (`if/else`) sowie parallele Ausführung. Migration-frei (Steps + Step-Results sind `jsonb`).

> Abgrenzung zu Section 10 (n8n): Die n8n-Integration ist optional und ruft externe n8n-Workflows. Die Workflow-Engine hier läuft inhouse, ohne externe Dependencies, und hat direkten DB-Zugriff auf BusinessOS-Tabellen (Leads, Firmen, Personen, Aktivitäten, …).

### Seiten
| Route | Beschreibung |
|-------|-------------|
| `/intern/settings/workflows` | Workflow-Übersicht (Liste, Aktivieren, Löschen, Duplizieren) |
| `/intern/settings/workflows/[id]` | Designer + Run-History für einzelnen Workflow |

### API-Endpunkte
| Methode | Pfad | Beschreibung |
|---------|------|-------------|
| GET | `/api/v1/workflows` | Liste aller Workflows |
| POST | `/api/v1/workflows` | Workflow anlegen |
| GET | `/api/v1/workflows/[id]` | Workflow-Details |
| PUT | `/api/v1/workflows/[id]` | Workflow speichern (steps, name, trigger, isActive) |
| DELETE | `/api/v1/workflows/[id]` | Workflow löschen |
| GET | `/api/v1/workflows/[id]/runs` | Ausführungshistorie |
| GET | `/api/v1/workflows/actions` | Alle verfügbaren Actions (für Designer) |

### DB-Tabellen
- `workflows` — id, name, description, trigger, steps (jsonb), isActive
- `workflow_runs` — id, workflowId, trigger, triggerData, status, currentStep, totalSteps, stepResults (jsonb), error, startedAt, completedAt

### Berechtigungen
Modul: `settings` (read/update). Wer Settings administrieren darf, kann Workflows konfigurieren.

---

### 24.1 Trigger

Trigger sind System-Events. Wenn ein Trigger feuert, werden alle aktiven Workflows mit passendem `trigger` ausgeführt. Pro Trigger gibt es ein `data.*`-Objekt mit Feldern, die in Conditions und Templates referenziert werden können.

| Trigger-Key | Wann gefeuert | Verfügbar als `{{data.*}}` |
|---|---|---|
| `contact.submitted` | Öffentliches Kontaktformular abgesendet | `firstName`, `lastName`, `email`, `phone`, `company`, `message` |
| `lead.created` | Lead angelegt | `leadId`, `companyId`, `personId`, `source` |
| `lead.scored` | Lead-Scoring abgeschlossen | `leadId`, `score`, `priority` |
| `lead.status_changed` | Lead-Status-Übergang | `leadId`, `companyId`, `fromStatus`, `toStatus` |
| `order.created` | Auftrag angelegt | `orderId`, `companyId`, `title`, `createdByRole` |
| `order.status_changed` | Auftrag-Status-Übergang | `orderId`, `companyId`, `fromStatus`, `toStatus` |
| `portal.user_invited` | Portal-Zugang erstellt mit Invite-Link | `userId`, `companyId`, `email` |
| `portal.message_sent` | Portal-Chat-Nachricht | `messageId`, `companyId`, `senderId`, `senderRole`, `bodyPreview` |
| `portal.document_uploaded` | Portal-Dokument hochgeladen | `documentId`, `companyId`, `direction`, `fileName`, `sizeBytes`, `uploaderRole` |
| `portal.change_request_created` | Firmendaten-Änderungsantrag im Portal | `changeRequestId`, `companyId`, `requestedBy`, `proposedChanges` |

Zentrale Source of Truth: `src/lib/services/workflow/triggers.ts`.

---

### 24.2 Step-Typen

Ein Workflow ist eine Liste von Steps. Jeder Step hat einen `kind`:

#### `kind: 'action'` (Standard)
Führt eine registrierte Action aus. Bestandsworkflows ohne `kind`-Feld werden als Action behandelt (Backwards-Compat).

```json
{ "id": "log1", "kind": "action", "action": "log_activity",
  "config": { "subject": "Kontakt eingegangen" },
  "condition": "data.email != null" }
```

- `id` (optional, empfohlen): Eindeutiger Key für `{{steps.<id>.*}}`-Referenzen
- `action`: Name der Action (siehe 24.3)
- `config`: Action-spezifische Konfiguration (siehe Config-Felder pro Action)
- `condition` (optional): Wenn falsch, wird der Step übersprungen (siehe 24.4)
- `label` (optional): Anzeigename im Designer + Run-History

#### `kind: 'branch'` (if/else)
Wertet `ifCondition` aus und führt entweder `then` oder `else` aus. `else` ist optional — wenn nicht gesetzt und Condition falsch, wird kein Sub-Step ausgeführt (`taken: 'none'`).

```json
{ "id": "br1", "kind": "branch",
  "ifCondition": "data.priority == 'hoch'",
  "then": [
    { "id": "alert", "kind": "action", "action": "notify_admin" }
  ],
  "else": [
    { "id": "queue", "kind": "action", "action": "send_email", "config": { "template": "lead_first_response" } }
  ] }
```

#### `kind: 'parallel'` (Fan-out)
Führt alle `steps` parallel aus (`Promise.allSettled`). Sub-Steps haben isolierte Contexts — gegenseitige Step-Result-Referenzen funktionieren nicht. Nach Abschluss läuft der Workflow normal weiter.

```json
{ "id": "fan1", "kind": "parallel",
  "steps": [
    { "id": "wh_a", "kind": "action", "action": "webhook_call", "config": { "url": "https://a.example/" } },
    { "id": "wh_b", "kind": "action", "action": "webhook_call", "config": { "url": "https://b.example/" } }
  ] }
```

Ein fehlgeschlagener Sub-Step bricht den Workflow nicht ab — `failedCount` im Summary zeigt, wieviele scheiterten.

#### Limits (defensiv)
- `MAX_DEPTH = 10` — maximale Verschachtelungstiefe (branch/parallel ineinander)
- `MAX_PARALLEL_FANOUT = 100` — maximale Sub-Step-Anzahl pro `parallel`

Bei Überschreitung wird der entsprechende Step mit Status `failed` markiert; der Workflow läuft weiter.

---

### 24.3 Action-Referenz

Alle Actions sind in `src/lib/services/workflow/action-registry.ts` registriert. Der Designer holt sie via `GET /api/v1/workflows/actions`.

#### Daten-Actions

**`find_or_create_company`** — Firma per Name suchen oder anlegen
- Liest: `data.company` (Name)
- Config: `fallbackName` (string, default `– ohne Firma –`)
- Liefert: `{ companyId, created }`

**`find_or_create_person`** — Person per E-Mail suchen oder anlegen
- Liest: `data.email`, `data.firstName`, `data.lastName`, `data.phone`
- Verknüpft mit `steps.find_or_create_company.companyId` falls vorhanden
- Liefert: `{ personId, created }`

**`link_lead`** — Lead mit Firma + Person verknüpfen
- Liest: `data.leadId`, `steps.find_or_create_company.companyId`, `steps.find_or_create_person.personId`
- Liefert: `{ companyId, personId }`

**`log_activity`** — Aktivitätseintrag erstellen (Kontaktverlauf)
- Liest: `data.leadId`, `data.interests`, `data.message`, `data.company`, plus Step-Results für Firma/Person
- Config: `subject` (string, default „Kontaktformular ausgefüllt")

#### Logik-Actions

**`score_lead`** — Lead bewerten (0–100)
- Berechnet Score aus Vollständigkeit (E-Mail/Telefon/Firma) + Interessen-Gewichtung + Nachrichten-Länge
- Config: `highValueInterests` (JSON-Array, default: Security/Hardening/IR/NIS-2/Datenschutz/Kombination)
- Liefert: `{ score }`

**`set_field`** — Feld auf Lead setzen
- Config: `field` (`status` | `tags` | `notes`), `value` (string, oder Array bei `tags`)
- Liefert: `{ field, value }`

**`delay`** — Sekunden warten
- Config: `seconds` (number, default `5`)
- Liefert: `{ waited }`
- ⚠ Lange Delays blockieren den Workflow-Run (synchron). Für lange Verzögerungen besser Task-Queue mit `scheduledFor` nutzen.

#### KI-Actions

**`ai_research_company`** — KI-Firmenrecherche (Website, Branche, Größe)
- Reiht Task in Task-Queue ein (Typ `ai`, Action `company_research`); läuft asynchron
- Liest: `data.company`, `steps.find_or_create_company.companyId`
- Liefert: `{ queued: true }` (kein direktes Ergebnis im Workflow)

**`run_custom_prompt`** — Eigenen KI-Prompt mit Firmenkontext ausführen
- Synchron via `CustomAiPromptService.execute`
- Config: `promptId` (Referenz auf Custom-Prompt), `saveAsActivity` (boolean, default `true`)
- Liefert: `{ promptId, companyId, subject, content, activityId }`

#### Kommunikations-Actions

**`send_email`** — E-Mail über Task-Queue versenden (Templating mit Platzhaltern)
- Config: `template` (Slug, default `lead_first_response`), `to` (Empfänger, default `data.email`)
- Reiht in Task-Queue ein; tatsächliches Senden erfolgt asynchron
- Liefert: `{ to, template }`

**`notify_admin`** — Admin-Benachrichtigung (E-Mail an `__ADMIN__`)
- Config: `template` (Slug, default `lead_admin_notification`)
- Reiht in Task-Queue ein
- Liefert: `{ template }`

**`webhook_call`** — HTTP-Request an externe URL
- Config:
  - `url` (string, mit `{{data.x}}`-Templating)
  - `method` (`POST` | `GET` | `PUT` | `DELETE`, default `POST`)
  - `authBearer` (string, optional — wird zu `Authorization: Bearer ...`)
  - `headers` (JSON-Objekt, mit Templating)
  - `body` (JSON, mit Templating; für GET/DELETE ignoriert)
  - `retries` (number, default `2`, max `5`) — nur bei 5xx und Netzwerkfehlern
  - `timeoutMs` (number, default `10000`)
- Liefert: `{ status, body }` (Body ist JSON wenn parsebar, sonst String)
- 4xx wird als Fehler behandelt **ohne** Retry; 5xx und Netzwerkfehler werden mit exponentiell wachsendem Delay (1s, 2s, 3s, …) wiederholt.

---

### 24.4 Conditions

Conditions sind String-Ausdrücke. Sie werden auf `condition` (action-step skip) und `ifCondition` (branch) angewandt.

#### Pfade
- `data.<feld>[.<nested>]` — verweist auf `triggerData` (vom Trigger geliefert)
- `steps.<id>.<feld>[.<nested>]` — verweist auf das `result.data` eines vorherigen Action-Steps mit dieser `id`. Fallback: wenn kein `id`, dann `steps.<actionName>.<feld>` (für Bestandsworkflows).

Beispiele:
- `data.email` — wahr wenn E-Mail nicht-leer
- `steps.score_lead.score` — wahr wenn Score gesetzt
- `steps.webhook_a.body.code == 'OK'` — verschachtelter Pfad

#### Operatoren
| Form | Beispiel | Semantik |
|---|---|---|
| Truthy (Pfad allein) | `data.email` | Wahr wenn nicht null/undefined/leerer-String/`false`/`0`/leeres-Array |
| `== null` / `!= null` | `data.companyId == null` | null/undefined/leerer-String zählen als „null" |
| `== 'wert'` / `!= 'wert'` | `data.priority == 'hoch'` | String-Vergleich (Wert in einfachen Anführungszeichen) |
| `==`, `!=`, `>`, `>=`, `<`, `<=` (numerisch) | `steps.webhook_x.status >= 400` | Wert wird zu `Number()` gecastet; non-numerisch → `false` |

#### Verhalten
- Leere Condition → `true` (Step läuft)
- Unbekanntes Format → `true` mit Warning im Log (defensiver Default)
- Alle Operatoren sind reine Vergleiche, keine Boolean-Verknüpfungen (`&&`, `||` werden **nicht** unterstützt). Für AND/OR: mehrere Steps mit `condition` hintereinander oder `branch` verschachteln.

---

### 24.5 Templating in Action-Configs

Die `webhook_call`-Action (und alle weiteren Actions, die `resolveTemplate` aufrufen) erlaubt `{{...}}`-Substitution in `url`, `headers`, `body`, `authBearer`:

- `{{data.email}}` → Wert aus Trigger-Data
- `{{steps.find_or_create_company.companyId}}` → Wert aus Step-Result
- Tiefe Pfade (`data.foo.bar.baz`) werden traversiert; `null`/`undefined` werden zu Leerstring

Beispiel-Body für `webhook_call`:
```json
{
  "kunde": "{{data.firstName}} {{data.lastName}}",
  "firma": "{{data.company}}",
  "score": "{{steps.score_lead.score}}"
}
```

---

### 24.6 Run-History

In `/intern/settings/workflows/[id]` (rechte Sidebar) zeigt die Engine pro Run:
- Status (`running` | `completed` | `failed`)
- Aktueller / Gesamt-Schritt-Counter
- Pro Step-Result: Path (`1`, `2.then.1`, `3.parallel.2`), Action, Status, Dauer, Fehler
- Indentation pro Verschachtelungs-Ebene (12px pro Tiefe)
- Kind-Badges: `Verzweigung → then/else/none`, `Parallel (N, M fail)`

Step-Results sind in `workflow_runs.stepResults` als JSON persistiert — auch für SQL-Auswertung verfügbar.

---

### 24.7 Beispiel-Workflow (Lead-Routing)

Ein typischer Lead-Workflow mit allen Konzepten:

```json
[
  { "id": "co", "kind": "action", "action": "find_or_create_company" },
  { "id": "pe", "kind": "action", "action": "find_or_create_person" },
  { "id": "ld", "kind": "action", "action": "link_lead" },
  { "id": "sc", "kind": "action", "action": "score_lead" },
  {
    "id": "route", "kind": "branch",
    "ifCondition": "steps.sc.score >= 70",
    "then": [
      { "id": "hot", "kind": "parallel", "steps": [
        { "id": "n1", "kind": "action", "action": "notify_admin" },
        { "id": "wh", "kind": "action", "action": "webhook_call",
          "config": { "url": "https://hooks.slack.com/...", "body": { "lead": "{{data.firstName}} {{data.lastName}}", "score": "{{steps.sc.score}}" } } }
      ]}
    ],
    "else": [
      { "id": "cold", "kind": "action", "action": "send_email",
        "config": { "template": "lead_first_response" } }
    ]
  },
  { "id": "log", "kind": "action", "action": "log_activity" }
]
```

Verhalten:
1. Firma + Person suchen/anlegen, Lead verknüpfen, scoren.
2. Wenn Score ≥ 70: parallel Admin benachrichtigen + Slack-Webhook feuern.
3. Sonst: First-Response-E-Mail.
4. In jedem Fall: Aktivität loggen.

---

*Diese Dokumentation wurde am 2026-04-25 aktualisiert. Workflow-Engine in 1.4.529.*
