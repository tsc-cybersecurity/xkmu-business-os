# Portal-P6 Design — Dokumenten-Ablage

**Status:** approved (brainstorming)
**Datum:** 2026-04-24
**Kontext:** Portal-P1–P5 sind abgeschlossen (Auth/Invite, Firmendaten + Change-Requests, Contracts/Projects read-only, Orders, Chat). P6 fügt eine Dokumenten-Ablage pro Firma hinzu.

---

## 1. Ziel

Zwei-Raum-Dokumenten-Ablage pro Firma: Admin kann Dokumente für den Kunden bereitstellen, Portal-User kann Dokumente an den Admin hochladen. Kategorisiert, optional an Verträge/Projekte/Aufträge verknüpft, mit E-Mail-Notifications und Soft-Delete.

## 2. Scope

**In scope:**
- Zwei getrennte „Räume" (Admin → Kunde, Kunde → Admin), jeweils mit eigener Kategorien-Zuordnung.
- Admin-gepflegte Kategorien mit Richtungs-Feld (`direction`).
- Datei-Upload (PDF, doc/docx, xls/xlsx, jpg, png, md, txt, max 10 MB) — strikte MIME-Whitelist.
- Optionale Verknüpfung pro Dokument an Objekt-Typen `contract`, `project`, `order`.
- E-Mail-Notification an alle aktiven Portal-User (bei Admin-Upload) bzw. alle internen User (bei Portal-Upload).
- Soft-delete (Kunde darf eigene Uploads; Admin darf alles).
- Eigener authentifizierter Download-Endpoint (kein `public/`).
- Dashboard-Tile „Dokumente" im Portal + Navigation.
- Dokumenten-Sektion auf bestehenden Detail-Seiten (Contracts/Projects/Orders) im Portal.
- Admin-Tab „Dokumente" auf Firmen-Detailseite + Settings-Seite für Kategorien-Verwaltung.
- Audit-Log für alle schreibenden Operationen.
- Rate-Limits auf Portal-Write-Routen.

**Out of scope (Parking-Lot für P7+):**
- Versionierung (aktiv verworfen — Ersatz durch einfaches Neu-Upload).
- Virus-Scanning (ClamAV o.ä.) — MIME-Whitelist reicht als KMU-MVP.
- Disk-Cleanup-Job für soft-deleted Files.
- Upload-Quoten pro Firma/User.
- Preview/Thumbnails für PDFs.
- Externe Storage-Backends (S3).
- Bulk-Upload, Drag&Drop-Multi-Select, ZIP-Bulk-Download.

## 3. Architektur

### 3.1 Datenmodell

**Tabelle `portal_document_categories`** (admin-gepflegt, mit Default-Seed):

```ts
export const portalDocumentCategories = pgTable('portal_document_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  direction: varchar('direction', { length: 20 }).notNull(),
    // 'admin_to_portal' | 'portal_to_admin' | 'both'
  sortOrder: integer('sort_order').default(0),
  isSystem: boolean('is_system').default(false),  // gesperrt gegen Löschen/Rename
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_portal_doc_categories_direction').on(table.direction),
])
```

**Seed (Defaults, `isSystem=true`):**

- `admin_to_portal`: "Vertrag", "Angebot", "Rechnung", "Protokoll", "Sonstiges"
- `portal_to_admin`: "Unterschriebener Vertrag", "Nachweis", "Sonstiges"

**Tabelle `portal_documents`** (Metadaten — Datei auf Disk):

```ts
export const portalDocuments = pgTable('portal_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id').notNull().references(() => portalDocumentCategories.id, { onDelete: 'restrict' }),
  direction: varchar('direction', { length: 20 }).notNull(),
    // redundant zu category.direction — Guard + Scope-Index ohne Join

  // File-Metadaten
  fileName: varchar('file_name', { length: 255 }).notNull(),       // Original-Name (Display)
  storagePath: varchar('storage_path', { length: 500 }).notNull(), // relativ zu MEDIA_UPLOAD_DIR
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  sizeBytes: integer('size_bytes').notNull(),

  // Optional-Verknüpfung
  linkedType: varchar('linked_type', { length: 20 }),   // 'contract' | 'project' | 'order' | null
  linkedId: uuid('linked_id'),

  // Upload-Kontext
  uploadedByUserId: uuid('uploaded_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  uploaderRole: varchar('uploader_role', { length: 20 }).notNull(),  // 'admin' | 'portal_user' (Snapshot)
  note: varchar('note', { length: 500 }),

  // Lifecycle
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  deletedByUserId: uuid('deleted_by_user_id').references(() => users.id, { onDelete: 'set null' }),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_portal_docs_company_dir_created').on(table.companyId, table.direction, table.createdAt),
  index('idx_portal_docs_linked').on(table.linkedType, table.linkedId),
  index('idx_portal_docs_category').on(table.categoryId),
  // CHECK constraints (als raw SQL in Migration 013 ergänzt, Drizzle v0.x hat keine native check() helper API die wir hier brauchen):
  //   CHECK (direction IN ('admin_to_portal','portal_to_admin'))
  //   CHECK (uploader_role IN ('admin','portal_user'))
  //   CHECK (linked_type IS NULL OR linked_type IN ('contract','project','order'))
  //   CHECK ((linked_type IS NULL) = (linked_id IS NULL))  -- Paar-Integrity
])
```

**Begründung der Modell-Entscheidungen:**

- `categoryId NOT NULL` + `onDelete: 'restrict'` → Kategorie mit Docs drin kann nicht hart gelöscht werden (Admin erhält 409 Conflict); nur Soft-delete ist erlaubt.
- `direction` doppelt (Category + Document) → Guard gegen Fehlzuordnung im Code; ermöglicht effiziente Index-Scopes pro Raum ohne Join.
- `storagePath` ist intern und relativ → Datei liegt außerhalb `public/`, nur via authentifizierter API erreichbar.
- `uploaderRole` als Snapshot → Rollen-Änderungen eines Users brechen Audit-Nachvollziehbarkeit nicht.
- **CHECK-Constraints** (siehe Schema-Block) erzwingen die Enum-Werte für `direction`, `uploader_role` und `linked_type` auf DB-Ebene; zusätzlicher Paar-Constraint sorgt dafür, dass `linked_type` und `linked_id` immer gemeinsam gesetzt oder gemeinsam NULL sind. Kategorien-Direction-Check (`IN ('admin_to_portal','portal_to_admin','both')`) analog auf `portal_document_categories`.

### 3.2 Migration 013

Idempotent, mit `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, und einem `DO $$ … $$` Seed-Block, der nur inseriert wenn keine Kategorien existieren. Pre-Drizzle-Block auch in `docker/app/entrypoint.prod.sh` spiegeln.

### 3.3 Storage

- Basis: `MEDIA_UPLOAD_DIR` (bereits konfigurierte Env-Var).
- Subpfad: `MEDIA_UPLOAD_DIR/portal-docs/<yyyy>/<mm>/<uuid>.<ext>`.
- Monat-Partitionierung verhindert einzelne Mega-Ordner; `uuid.ext` garantiert keine Kollisionen + keine Pfad-Traversal-Angriffe.
- Keine Nutzung von `public/uploads/` — Dateien dürfen nie direkt statisch ausgeliefert werden.

## 4. API

### 4.1 Portal-seitig (`withPortalAuth`, scope: `auth.companyId`)

```
GET    /api/v1/portal/documents
         ?direction=admin_to_portal|portal_to_admin
         [&linkedType=contract|project|order&linkedId=<uuid>]
       → Liste gruppiert nach Kategorie, nur deletedAt IS NULL

POST   /api/v1/portal/documents
       multipart: file, categoryId, [note], [linkedType, linkedId]
       → direction = 'portal_to_admin' (server-forced, body.direction wird ignoriert)
       → kategorie.direction muss IN ('portal_to_admin','both') sein
       → triggert E-Mail `portal_document_received` + Audit `portal_document.uploaded`

GET    /api/v1/portal/documents/[id]/download
       → streamt nur, wenn doc.companyId === auth.companyId und deletedAt IS NULL

DELETE /api/v1/portal/documents/[id]
       → soft-delete, nur wenn uploadedByUserId === auth.userId
         und direction === 'portal_to_admin'
       → Audit `portal_document.deleted`

GET    /api/v1/portal/document-categories?direction=...
       → Aktive Kategorien (deletedAt IS NULL), gefiltert nach direction
```

### 4.2 Admin-seitig (`withPermission('documents', <action>)`)

```
GET    /api/v1/companies/[id]/portal-documents
         ?direction=...&linkedType=...&linkedId=...&includeDeleted=<bool>
       → Liste, Admin sieht optional soft-deleted (mit Badge im UI)

POST   /api/v1/companies/[id]/portal-documents
       multipart: file, categoryId, [note], [linkedType, linkedId]
       → direction = 'admin_to_portal' (server-forced)
       → kategorie.direction muss IN ('admin_to_portal','both') sein
       → triggert E-Mail `portal_document_shared` + Audit

GET    /api/v1/companies/[id]/portal-documents/[docId]/download
       → streamt auch deleted docs für Audit-Sicht

DELETE /api/v1/companies/[id]/portal-documents/[docId]
       → soft-delete, Admin darf in beide Richtungen
       → Audit

--- Kategorien-Verwaltung ---
GET    /api/v1/portal-document-categories
POST   /api/v1/portal-document-categories           { name, direction, sortOrder }
PATCH  /api/v1/portal-document-categories/[id]      { name?, sortOrder? }
DELETE /api/v1/portal-document-categories/[id]
       → 409 wenn noch aktive Docs referenzieren
         (COUNT portal_documents WHERE category_id=? AND deleted_at IS NULL > 0)
       → 403 wenn isSystem=true
       → sonst soft-delete (setzt deletedAt); referenzierende soft-deleted Docs
         behalten ihre categoryId — kein FK-Bruch, weil DB-Delete nicht erfolgt
```

### 4.3 Cross-cutting pro Write-Route

- **Audit-Log** (`auditLog.service`): entity `portal_document` bzw. `portal_document_category`, action `uploaded|deleted|created|updated`, metadata `{ fileName, categoryId, direction, linkedType, linkedId }`.
- **E-Mail-Queue** (bestehender `TaskQueueService.create({ type: 'email', ... })`):
  - `direction='admin_to_portal'` → Template `portal_document_shared` an alle Portal-User der Firma mit `users.status='active'` und `users.role='portal_user'` (Loop, ein Queue-Task pro Empfänger).
  - `direction='portal_to_admin'` → Template `portal_document_received` an alle internen User mit `users.status='active'` und `users.role != 'portal_user'`.
- **Rate-Limit** (bestehender `rateLimit`-Helper):
  - Portal-POST: 20/h pro User.
  - Portal-DELETE: 30/h pro User.
- **MIME-Validation** serverseitig:
  - Whitelist: `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `image/jpeg`, `image/png`, `text/plain`, `text/markdown`.
  - Reported-MIME + Extension-Match + (optional) Magic-Bytes-Check wenn `file-type`-Lib vorhanden. Fällt Magic-Byte-Check weg, reicht Reported-MIME + Extension.
- **Filename-Sanitization**: Original in `fileName` (display), auf Disk UUID-basiert — niemals user-content in Pfad.
- **Size-Limit**: 10 MB — 413 Payload Too Large.

## 5. UI

### 5.1 Portal — Seite `/portal/documents`

**Layout:** Header „Dokumente", zwei Tabs („Von uns" = admin_to_portal, „Von Ihnen" = portal_to_admin), rechts `[+ Upload]`-Button.

- „Von uns": Dokumente nach Kategorie gruppiert, pro Eintrag `fileName · sizeBytes · createdAt · note? · ⬇️-Download`. Kein Upload-Button in diesem Tab.
- „Von Ihnen": gleiche Gruppierung, Upload-Button aktiv. Eigene Uploads haben 🗑-Icon (Soft-delete mit Confirm-Dialog).

**Upload-Dialog (Portal):**
- Kategorie-Dropdown (Fetch: `GET /portal/document-categories?direction=portal_to_admin`).
- Datei-Picker.
- Notiz-Feld (optional, 500 Zeichen).
- Dropdown „Verknüpfen mit" (optional): Typ-Auswahl (Vertrag/Projekt/Auftrag), dann Autocomplete über bestehende Portal-APIs (nur eigene Firma-Scope).
- Submit-Button deaktiviert bis Datei + Kategorie gewählt.

**Integration bestehende Seiten:**
- Dashboard: Tile „Dokumente" wird mit Dokumentenzahl aktiviert (Fetch `/portal/documents`, count).
- Navigation: neuer Eintrag „Dokumente" zwischen „Aufträge" und „Chat".
- `/portal/contracts/[id]`, `/portal/projects/[id]`, `/portal/orders/[id]`: neue Sektion „Dokumente" am Ende der Seite, zwei kleine Sub-Listen („Von uns" / „Von Ihnen") gefiltert nach `linkedType=<typ>&linkedId=<id>`, Upload-Button unter „Von Ihnen" (pre-fillt `linkedType/linkedId` im Dialog).

### 5.2 Admin — Firmen-Detailseite, neuer Tab „Dokumente"

Analog bestehendem Tab „Portal-Zugänge" (aus P1):

- Sub-Tabs „An Kunde" / „Vom Kunden".
- Filter-Dropdown: Kategorie.
- Toggle „Gelöschte anzeigen" (default off).
- Tabellarische Liste: Name · Kategorie · Verknüpft mit · Hochgeladen von (Name + Role-Badge) · Datum · Größe · Actions.
- Actions: ⬇️ Download, 🗑 Delete (mit Confirm). Gelöschte Einträge haben grauen „Gelöscht"-Badge; für sie Download weiterhin möglich (Admin-Audit), aber kein erneutes Delete.

**Upload-Dialog (Admin):** analog Portal, aber Kategorie-Dropdown filtert auf `admin_to_portal`/`both`, und Verknüpfungs-Autocomplete scope auf die aktuell betrachtete Firma.

### 5.3 Admin — Settings-Seite `/intern/settings/portal-document-categories`

- Liste aller Kategorien, gruppiert nach `direction` (Admin → Kunde / Kunde → Admin / Beide).
- Pro Zeile: Name (inline editable wenn `isSystem=false`), Sortier-Buttons (↑/↓ für `sortOrder`), Direction-Badge, 🗑-Button (gesperrt wenn `isSystem` oder aktive Docs referenzieren — Tooltip erklärt warum).
- „+ Kategorie"-Button oben → Modal mit Name + Direction-Dropdown.
- Eintrag in Settings-Sidebar: „Portal → Dokumenten-Kategorien".

## 6. Sicherheit

- Alle Write-/Download-Routen gaten über `withPortalAuth` bzw. `withPermission`.
- Server-Side Scope-Check `doc.companyId === auth.companyId` vor jedem Return auf Portal-Seite — zwingend, auch bei Download.
- Cross-Company-Isolation via Integration-Test (analog P3/P4/P5).
- MIME-Whitelist + Size-Limit server-seitig (siehe §4.3).
- Storage-Pfad außerhalb `public/`, UUID-basiert auf Disk.
- Download-Stream mit `Content-Disposition: attachment; filename="<sanitized>"` und korrektem `Content-Type` — kein Inline-Rendering von fremdem Content, keine HTML-Injection über `fileName`.
- Soft-delete = komplett unsichtbar im Portal; nur Admin sieht gelöschte.
- Rate-Limits (siehe §4.3) gegen Upload-Floods.
- `uploaderRole` Snapshot → Rollen-Degradierung bricht Audit nicht.

## 7. Error-Handling

| Fehler | HTTP | Handling |
|---|---|---|
| File zu groß | 413 | `apiError('FILE_TOO_LARGE', 'Datei zu groß (max 10 MB)')` |
| MIME unerlaubt | 415 | `apiError('UNSUPPORTED_MEDIA_TYPE', …)` |
| Kategorie direction mismatch | 400 | `apiError('VALIDATION_ERROR', 'Kategorie passt nicht zur Richtung')` |
| Kategorie nicht gefunden oder gelöscht | 400 | `apiError('INVALID_CATEGORY', …)` |
| Firma nicht gefunden | 404 | `apiError('NOT_FOUND', …)` |
| Portal-User versucht fremden Doc zu sehen | 404 | maskiert als Not-Found |
| Portal-User will Admin-Doc löschen | 403 | `apiError('FORBIDDEN', …)` |
| Portal-User will fremden eigenen Doc löschen | 403 | gleiche Response |
| Kategorie-Delete mit aktiven Refs | 409 | `apiError('CONFLICT', 'Kategorie hat noch Dokumente')` |
| Kategorie-Delete auf isSystem | 403 | `apiError('FORBIDDEN', 'Systemkategorie nicht löschbar')` |
| Disk-Write-Fehler | 500 | DB-Insert wird rolled back, sanitized Message |
| E-Mail-Queue-Fehler | — | Upload schlägt NICHT fehl, Fehler nur geloggt (async) |

## 8. Testing

**Unit (vitest, mocked db):**
- `PortalDocumentService.upload` — MIME/Size Rejection, Direction-Match, Kategorie-Existenz.
- `PortalDocumentService.softDelete` — Ownership-Check (portal-user nur eigene), Admin darf alles.
- `PortalDocumentService.listForPortal` — filtert `deletedAt`, `direction`, optional `linkedType+linkedId`.
- `PortalDocumentCategoryService` — CRUD, `isSystem`-Lock, Referenz-Check beim Delete.

**Integration (echte DB):**
- `portal-documents-flow.test.ts`:
  1. Admin upload → Portal listet → Portal download streamt
  2. Portal kann Admin-Doc nicht löschen (403)
  3. Portal upload → Admin listet → Admin download
  4. Portal soft-delete eigenen Upload → nicht mehr sichtbar im Portal
  5. Admin sieht den gelöschten mit Badge
- `portal-documents-isolation.test.ts`: Firma A Portal-User sieht Firma B Docs weder in Liste noch im Download (404).
- `portal-document-categories.test.ts`: Delete mit Referenzen blockiert; `isSystem`-Delete blockiert.

**Manual E2E:**
1. Admin lädt PDF hoch (Firmen-Detail → Tab Dokumente → An Kunde).
2. Task-Queue läuft → Portal-User kriegt E-Mail mit Link auf `/portal/documents`.
3. Portal-User loggt ein → sieht Doc im Tab „Von uns" → Download funktioniert.
4. Portal-User lädt Nachweis hoch.
5. Admin kriegt E-Mail → sieht Doc im Tab „Vom Kunden".
6. Portal-User löscht eigenen Upload → verschwindet im Portal.
7. Admin toggled „Gelöschte anzeigen" → sieht ihn mit Badge.
8. Verknüpfung: Admin lädt Vertrag-PDF mit `linkedType=contract&linkedId=<x>` hoch → Portal-User sieht es sowohl auf `/portal/documents` als auch auf `/portal/contracts/<x>` unten.
9. Cross-Firma-Check: URL manipulation auf fremde `id` → 404.

## 9. Audit

Jede Write-Operation schreibt einen Audit-Log-Eintrag analog zu P5-Chat:

- `portal_document.uploaded` — `{ fileName, categoryId, direction, linkedType, linkedId, sizeBytes }`
- `portal_document.deleted` — `{ fileName, direction, deletedByRole }`
- `portal_document_category.created` — `{ name, direction }`
- `portal_document_category.updated` — `{ name, changes }`
- `portal_document_category.deleted` — `{ name }`

## 10. Scope-Grenzen / Abgrenzung zu bestehenden Features

- **`media_uploads` + `MediaUploadService`** bleibt unverändert und wird weiterhin für Bilder (mit Image-Optimizer) im CMS/Blog-Kontext genutzt. Portal-Docs sind eine eigene Domain mit anderen Anforderungen (sensible Files, auth-protected Download, keine Optimierung).
- **`business_documents` / `DocumentService`** (Rechnungen/Angebote) bleiben eine separate Domain (generiert aus Templates, eigene Nummernkreise). Portal-P6 dupliziert nichts davon; Admin kann allerdings eine gerenderte Business-Doc-PDF manuell in `portal_documents` hochladen und dem Kunden bereitstellen.
- **Permission-Scope:** Neuer Permission-Key `documents` (Aktionen `read`, `create`, `delete`, `manage` für Kategorien) — Migration ergänzt die Permission-Registry. `portal_user`-Rolle kriegt keine dieser Berechtigungen; Portal-APIs nutzen `withPortalAuth` unabhängig vom Permission-System.

## 11. Implementierungs-Reihenfolge (für Planning)

Grobe Phasen für den Plan, details → writing-plans:

1. Schema + Migration 013 + Seed + Pre-Drizzle.
2. Permission-Key `documents` registrieren.
3. `PortalDocumentCategoryService` + Tests + Admin-Kategorien-API + Settings-UI.
4. `PortalDocumentService` (upload, download, list, softDelete) + Tests.
5. Portal-APIs + Rate-Limit + Audit + E-Mail-Queue-Integration.
6. Admin-APIs + Audit + E-Mail-Queue-Integration.
7. E-Mail-Template-Seed (`portal_document_shared`, `portal_document_received`).
8. Portal-UI: `/portal/documents` + Dashboard-Tile + Nav.
9. Portal-UI: Dokumente-Sektion auf Contract/Project/Order Detail.
10. Admin-UI: Tab „Dokumente" auf Firmen-Detail.
11. Integration-Tests (flow + isolation + categories).
12. Manual E2E + Deploy.
