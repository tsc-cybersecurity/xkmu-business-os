# Plan: Rechnungen & Angebote (Finanzen-Modul)

## Entscheidungen
- **Datenmodell**: Eine `documents`-Tabelle mit `type`-Feld (`invoice` | `offer`), plus `document_items` für Positionen
- **Nummernkreise**: Auto-Vorschlag mit manueller Änderungsmöglichkeit (RE-2026-0001, AN-2026-0001)
- **Umfang**: Basis-Set (CRUD, Positionen, Status-Workflow, Angebot→Rechnung Umwandlung)
- **Navigation**: Neuer Top-Level-Bereich "Finanzen" in der Sidebar

---

## Schritt 1: DB Schema

**Datei**: `src/lib/db/schema.ts`

### Tabelle `documents`
```
id              uuid PK
tenantId        uuid FK tenants (required)
type            varchar(20) required  → 'invoice' | 'offer'
number          varchar(50) required  → RE-2026-0001 / AN-2026-0001
companyId       uuid FK companies (nullable)
contactPersonId uuid FK persons (nullable)
status          varchar(30) default 'draft'
                Rechnungen: draft, sent, paid, overdue, cancelled
                Angebote:   draft, sent, accepted, rejected, expired
issueDate       timestamp (Ausstellungsdatum)
dueDate         timestamp (nullable, Fälligkeitsdatum für Rechnungen)
validUntil      timestamp (nullable, Gültig bis für Angebote)
subtotal        decimal(15,2) default 0  → Nettosumme aller Positionen
taxTotal        decimal(15,2) default 0  → MwSt-Summe
total           decimal(15,2) default 0  → Bruttosumme
discount        decimal(15,2) nullable   → Gesamtrabatt
discountType    varchar(10) nullable     → 'percent' | 'fixed'
notes           text
paymentTerms    varchar(255)
// Adress-Snapshot (Rechnung bleibt gültig auch wenn Firmendaten sich ändern)
customerName    varchar(255)
customerStreet  varchar(255)
customerHouseNumber varchar(20)
customerPostalCode  varchar(20)
customerCity    varchar(100)
customerCountry varchar(2)
customerVatId   varchar(50)
convertedFromId uuid FK documents (self-ref, nullable → Angebot→Rechnung)
createdBy       uuid FK users
createdAt       timestamp
updatedAt       timestamp
```

Indizes: `(tenant_id, type)`, `(tenant_id, status)`, `(tenant_id, company_id)`, `(tenant_id, number)`, `(tenant_id, issue_date)`

### Tabelle `document_items`
```
id              uuid PK
documentId      uuid FK documents (required, onDelete cascade)
tenantId        uuid FK tenants (required)
position        integer default 0  → Sortierung
productId       uuid FK products (nullable → Verknüpfung optional)
name            varchar(255) required
description     text nullable
quantity        decimal(10,3) default 1
unit            varchar(30) default 'Stück'
unitPrice       decimal(15,2) default 0
vatRate         decimal(5,2) default 19.00
discount        decimal(15,2) nullable
discountType    varchar(10) nullable → 'percent' | 'fixed'
lineTotal       decimal(15,2) default 0  → berechnet: quantity * unitPrice - discount
createdAt       timestamp
updatedAt       timestamp
```

Indizes: `(document_id)`, `(tenant_id, document_id)`, `(product_id)`

### Relations & Type Exports
- `documents` → tenant, company, contactPerson, createdByUser, convertedFrom, items
- `document_items` → document, product
- Tenant-Relations erweitern um `documents`
- Type Exports: `Document`, `NewDocument`, `DocumentItem`, `NewDocumentItem`

---

## Schritt 2: DB Migration
- SQL direkt via `docker exec xkmu-postgres psql` ausführen (wie bei Products)

---

## Schritt 3: Service

**Datei**: `src/lib/services/document.service.ts`

### Interfaces
```typescript
DocumentWithDetails {
  ...Document
  company: { id, name } | null
  contactPerson: { id, firstName, lastName } | null
  items: DocumentItem[]
}

DocumentFilters {
  type?: 'invoice' | 'offer'
  status?: string | string[]
  companyId?: string
  dateFrom?: string
  dateTo?: string
  search?: string  → sucht in number + customerName
  page?: number
  limit?: number
}
```

### Methoden
- `create(tenantId, data, createdBy?)` – Erstellt Dokument + Auto-Nummer + Adress-Snapshot von Company
- `getById(tenantId, id)` – Mit Company, ContactPerson, Items (JOIN)
- `update(tenantId, id, data)` – Nur im Status 'draft' editierbar
- `delete(tenantId, id)` – Nur im Status 'draft' löschbar
- `list(tenantId, filters)` – Paginierte Liste mit Filtern
- `updateStatus(tenantId, id, newStatus)` – Statuswechsel mit Validierung
- `generateNumber(tenantId, type, year?)` – Auto-Nummernvergabe: RE-2026-0001
- `getNextNumber(tenantId, type)` – Preview der nächsten Nummer
- `convertOfferToInvoice(tenantId, offerId)` – Kopiert Angebot → neue Rechnung mit allen Items
- `recalculateTotals(tenantId, documentId)` – Summen aus Items neu berechnen

### Item-Methoden
- `addItem(tenantId, documentId, data)` – Position hinzufügen + Totals neu berechnen
- `updateItem(tenantId, documentId, itemId, data)` – Position aktualisieren + Totals
- `removeItem(tenantId, documentId, itemId)` – Position entfernen + Totals
- `reorderItems(tenantId, documentId, itemIds[])` – Reihenfolge ändern

### Status-Workflow Validierung
```
Rechnungen:  draft → sent → paid | overdue | cancelled
                     sent → cancelled
                     overdue → paid | cancelled
Angebote:    draft → sent → accepted | rejected | expired
                     sent → expired
```

---

## Schritt 4: Validation

**Datei**: `src/lib/utils/validation.ts`

Neue Schemas:
- `documentTypeSchema`: z.enum(['invoice', 'offer'])
- `invoiceStatusSchema`: z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled'])
- `offerStatusSchema`: z.enum(['draft', 'sent', 'accepted', 'rejected', 'expired'])
- `discountTypeSchema`: z.enum(['percent', 'fixed'])
- `createDocumentSchema`: type, number?, companyId, contactPersonId?, issueDate, dueDate?, validUntil?, notes?, paymentTerms?, discount?, discountType?
- `updateDocumentSchema`: .partial()
- `createDocumentItemSchema`: productId?, name, description?, quantity, unit?, unitPrice, vatRate?, discount?, discountType?
- `updateDocumentItemSchema`: .partial()
- `updateDocumentStatusSchema`: status

---

## Schritt 5: API Routes

| Route | Methode | Beschreibung |
|-------|---------|-------------|
| `/api/v1/documents` | GET | Liste mit Filtern (type, status, companyId, dateFrom, dateTo, search) |
| `/api/v1/documents` | POST | Neues Dokument erstellen |
| `/api/v1/documents/next-number` | GET | Nächste verfügbare Nummer (?type=invoice) |
| `/api/v1/documents/[id]` | GET | Einzelnes Dokument mit Items |
| `/api/v1/documents/[id]` | PUT | Dokument aktualisieren (nur draft) |
| `/api/v1/documents/[id]` | DELETE | Dokument löschen (nur draft) |
| `/api/v1/documents/[id]/items` | GET | Alle Positionen |
| `/api/v1/documents/[id]/items` | POST | Neue Position hinzufügen |
| `/api/v1/documents/[id]/items/[itemId]` | PUT | Position aktualisieren |
| `/api/v1/documents/[id]/items/[itemId]` | DELETE | Position entfernen |
| `/api/v1/documents/[id]/status` | PUT | Statuswechsel mit Validierung |
| `/api/v1/documents/[id]/convert` | POST | Angebot → Rechnung umwandeln |

Dateien:
- `src/app/api/v1/documents/route.ts` (GET, POST)
- `src/app/api/v1/documents/next-number/route.ts` (GET)
- `src/app/api/v1/documents/[id]/route.ts` (GET, PUT, DELETE)
- `src/app/api/v1/documents/[id]/items/route.ts` (GET, POST)
- `src/app/api/v1/documents/[id]/items/[itemId]/route.ts` (PUT, DELETE)
- `src/app/api/v1/documents/[id]/status/route.ts` (PUT)
- `src/app/api/v1/documents/[id]/convert/route.ts` (POST)

---

## Schritt 6: Sidebar Navigation

**Datei**: `src/components/layout/sidebar.tsx`

- Neues Icon: `FileText` von lucide-react
- Neuer Eintrag "Finanzen" zwischen "Katalog" und "Leads":
  - Rechnungen → `/finance/invoices`
  - Angebote → `/finance/offers`

---

## Schritt 7: Shared UI Components

### `src/app/(dashboard)/finance/_components/document-form.tsx`
Shared Form für Rechnungen und Angebote (wie ProductForm-Pattern):
- Props: `mode`, `documentType`, `document?`, `onSaved?`, `onCancel?`
- Felder: Nummer (Auto + manuell editierbar), Firma (Select/Suche), Ansprechpartner (Select gefiltert nach Firma), Datum, Fälligkeitsdatum/Gültig bis, Zahlungsbedingungen, Notizen, Rabatt
- Firma-Auswahl füllt automatisch den Adress-Snapshot

### `src/app/(dashboard)/finance/_components/line-items-editor.tsx`
Inline-Editor für Positionen:
- Tabelle: Pos, Name, Menge, Einheit, Einzelpreis (netto), MwSt%, Gesamt
- "Position hinzufügen"-Button: manuell oder aus Produkt-Katalog wählen (Autocomplete)
- Inline-Bearbeitung jeder Zeile
- Löschen-Button pro Zeile
- Summen-Footer: Zwischensumme, MwSt-Aufschlüsselung, ggf. Rabatt, Gesamtbetrag

### `src/app/(dashboard)/finance/_components/status-badge.tsx`
Status-Badge mit Farben für alle Status-Typen (shared für Rechnungen + Angebote)

---

## Schritt 8: UI - Rechnungen Liste
**Datei**: `src/app/(dashboard)/finance/invoices/page.tsx`
- Header: "Rechnungen" + "Neue Rechnung"-Button
- Filter: Suche (Nummer/Firma), Status-Dropdown, Datumsbereich
- Tabelle: Nummer, Firma, Datum, Fällig am, Betrag, Status
- Pagination

## Schritt 9: UI - Rechnungen Detail + Edit
**Datei**: `src/app/(dashboard)/finance/invoices/[id]/page.tsx`
- Header: Rechnungsnummer + Status-Badge + Bearbeiten/Löschen
- Inline-Edit-Modus (wie bei Produkten, mit onSaved/onCancel)
- Kundendaten-Card (Adress-Snapshot)
- Positionen (line-items-editor im Edit-Modus, readonly im View-Modus)
- Summen-Übersicht (Netto, MwSt, Brutto)
- Status-Aktionen als Buttons: "Als versendet markieren", "Als bezahlt markieren", "Stornieren"

## Schritt 10: UI - Neue Rechnung
**Datei**: `src/app/(dashboard)/finance/invoices/new/page.tsx`
- document-form mit type='invoice'
- Nach Erstellung → Detailseite (dort Positionen hinzufügen)

## Schritt 11: UI - Angebote Liste
**Datei**: `src/app/(dashboard)/finance/offers/page.tsx`
- Gleiche Struktur wie Rechnungen-Liste, aber type='offer'
- Status-Filter: Entwurf, Versendet, Angenommen, Abgelehnt, Abgelaufen

## Schritt 12: UI - Angebote Detail + Edit
**Datei**: `src/app/(dashboard)/finance/offers/[id]/page.tsx`
- Gleiche Struktur wie Rechnungen-Detail
- Zusätzlich: "In Rechnung umwandeln"-Button
- Status-Aktionen: "Versenden", "Angenommen", "Ablehnen"

## Schritt 13: UI - Neues Angebot
**Datei**: `src/app/(dashboard)/finance/offers/new/page.tsx`
- document-form mit type='offer'

---

## Implementierungs-Reihenfolge

1. DB Schema (documents + document_items)
2. DB Migration
3. Service: document.service.ts
4. Validation: Zod-Schemas
5. API Routes (7 Dateien)
6. Sidebar Navigation
7. Shared Components (document-form, line-items-editor, status-badge)
8. UI: Rechnungen-Liste
9. UI: Rechnungen-Detail (mit Inline-Edit)
10. UI: Neue Rechnung
11. UI: Angebote-Liste
12. UI: Angebote-Detail (mit Umwandlung)
13. UI: Neues Angebot

---

## Dateien Übersicht (17 neue + 3 Änderungen)

### Änderungen:
1. `src/lib/db/schema.ts` – 2 neue Tabellen + Relations + Types
2. `src/lib/utils/validation.ts` – Neue Zod-Schemas
3. `src/components/layout/sidebar.tsx` – Finanzen-Bereich

### Neue Dateien:
4. `src/lib/services/document.service.ts`
5. `src/app/api/v1/documents/route.ts`
6. `src/app/api/v1/documents/next-number/route.ts`
7. `src/app/api/v1/documents/[id]/route.ts`
8. `src/app/api/v1/documents/[id]/items/route.ts`
9. `src/app/api/v1/documents/[id]/items/[itemId]/route.ts`
10. `src/app/api/v1/documents/[id]/status/route.ts`
11. `src/app/api/v1/documents/[id]/convert/route.ts`
12. `src/app/(dashboard)/finance/_components/document-form.tsx`
13. `src/app/(dashboard)/finance/_components/line-items-editor.tsx`
14. `src/app/(dashboard)/finance/_components/status-badge.tsx`
15. `src/app/(dashboard)/finance/invoices/page.tsx`
16. `src/app/(dashboard)/finance/invoices/new/page.tsx`
17. `src/app/(dashboard)/finance/invoices/[id]/page.tsx`
18. `src/app/(dashboard)/finance/offers/page.tsx`
19. `src/app/(dashboard)/finance/offers/new/page.tsx`
20. `src/app/(dashboard)/finance/offers/[id]/page.tsx`
