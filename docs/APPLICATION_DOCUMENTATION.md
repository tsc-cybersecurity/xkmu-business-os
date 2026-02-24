# xKMU BusinessOS - Vollständige Anwendungsdokumentation

> **Version:** 1.1.56
> **Stand:** 2026-02-24
> **Stack:** Next.js 16 App Router, React 19, Drizzle ORM, PostgreSQL (Neon)
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

---

## 1. Architektur-Übersicht

### Multi-Tenant-Architektur
Jede Datenbankentität ist mit einer `tenantId` versehen. Benutzer sehen nur Daten ihres eigenen Mandanten.

### Layouts
| Layout | Pfad | Beschreibung |
|--------|------|-------------|
| Root | `/` | Globales Layout mit Font-Konfiguration (Ubuntu, Inter, Roboto), DesignProvider |
| Public | `/(public)` | Öffentliche Seiten mit Navbar, Footer, Breadcrumb |
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
4. Report generieren mit Handlungsempfehlungen

---

### 4.7 Cybersecurity-Modul

| Seite | URL | Funktion |
|-------|-----|----------|
| Basisabsicherung | `/intern/cybersecurity/basisabsicherung` | IT-Grundschutz Basisabsicherung |

**Beschreibung:** Selbstbewertung der IT-Sicherheit nach BSI-Grundschutz-Prinzipien.

---

### 4.8 Blog-Modul

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

### 4.9 CMS-Modul

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

### 4.10 Marketing-Modul

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

### 4.11 Social-Media-Modul

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

### 4.12 Business Intelligence

| Seite | URL | Funktion |
|-------|-----|----------|
| BI-Dashboard | `/intern/business-intelligence` | Geschäftsanalysen und KPIs |

**API-Endpunkte:**
- `GET /api/v1/business-intelligence/profile` – Unternehmensprofil-Analyse
- `GET /api/v1/business-intelligence/documents/[id]` – Dokumenten-Analyse

---

### 4.13 Einstellungen

| Seite | URL | Funktion |
|-------|-----|----------|
| Übersicht | `/intern/settings` | Einstellungs-Übersicht |
| Mandant | `/intern/settings/tenant` | Firmendaten des Mandanten |
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
| Datenexport | `/intern/settings/export` | Datenbankexport |
| Datenimport | `/intern/settings/import` | Datenbankimport |

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
Datei hochladen (multipart/form-data).

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

#### `POST /api/v1/export/database`
Datenbankexport durchführen.

#### `POST /api/v1/import/database`
Datenimport durchführen.

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

#### `POST /api/v1/contact`
Kontaktformular absenden (öffentlich).

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
| `cybersecurity` | `read`, `create`, `update`, `delete` |
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
| `SMTP_HOST` | SMTP-Server |
| `SMTP_PORT` | SMTP-Port |
| `SMTP_USER` | SMTP-Benutzername |
| `SMTP_PASS` | SMTP-Passwort |

---

*Diese Dokumentation wurde automatisch am 2026-02-24 aus der Codebasis generiert.*
