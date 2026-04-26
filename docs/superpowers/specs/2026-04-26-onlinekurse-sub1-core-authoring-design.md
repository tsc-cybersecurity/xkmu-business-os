# Onlinekurse — Sub-Projekt 1: Core Authoring + Content Model

**Projekt:** xkmu-business-os
**Modul:** `/intern/(dashboard)/elearning`
**Datum:** 2026-04-26
**Status:** Design (genehmigt) → Plan ausstehend

## Kontext

Onlinekurse werden ein neues Modul der App. Zielgruppen sind **externe Kunden im Customer Portal** (`/portal`) und **die Öffentlichkeit** (`/(public)`) — jeweils mit eigenem Player. Inhalte umfassen Markdown-Texte, Video-Uploads, Datei-Anhänge und (später) Quizzes; Lernfortschritt + PDF-Zertifikate folgen in einer späteren Phase.

Das Gesamtfeature ist zu groß für eine einzelne Spec/Plan-Phase und wurde im Brainstorming in **sechs Sub-Projekte** zerlegt:

| # | Sub-Projekt | Liefert |
|---|---|---|
| **1** | **Core Authoring + Content Model** *(diese Spec)* | Schema, Intern-Editor, Markdown + Video + Anhänge, Draft/Published, Visibility-Flag |
| 2 | Delivery: Public + Portal Player (Free) | Public/Portal-Routen, Player-UI, Lektion-Navigation |
| 3 | Progress + PDF-Zertifikate | Per-User-Fortschritt, Completion, Zertifikat-Generator, Compliance-Audit |
| 4 | Quizzes | Quiz-Authoring + Player + Grading + Pass/Fail |
| 5 | Assignment + Compliance-Dashboard | Kurs einer Firma/User zuweisen, Frist, Übersicht |
| 6 | Paid Courses | Stripe-Checkout (Public), Rechnungs-Flow (Portal), Access-Control |

Reihenfolge: 1 → 2 → 3 → 4 → 5 → 6. Diese Spec deckt **ausschließlich Sub-Projekt 1** ab.

## Zielbild Sub-Projekt 1

Admins/Autoren im `/intern`-Bereich können Onlinekurse vollständig anlegen, strukturieren und befüllen — Texte, Videos, Datei-Anhänge, Module/Lektionen-Tree, Kurs-Stammdaten, Veröffentlichen-Workflow. Eine Vorschau im Intern-Bereich erlaubt Sichtkontrolle vor Publikation. **Public-/Portal-Player sind explizit nicht Teil dieser Phase** und werden in Sub-Projekt 2 gebaut.

## Entscheidungen aus dem Brainstorming

| # | Frage | Entscheidung |
|---|---|---|
| 1 | Zielgruppen (gesamtes Feature) | Externes Portal (Kunden) + Public (Marketing) |
| 2 | Inhaltstypen pro Lektion | Voll-LMS: Markdown + Video + Anhänge + (später) Quizzes |
| 3 | Progress + Zertifikate | Voll-Tracking + PDF-Zertifikat (Sub-Projekt 3) |
| 4 | Kurs-Struktur | Pro Kurs konfigurierbar: `useModules` + `enforceSequential` |
| 5 | Zugriff & Bezahlung | Frei + Pflicht-Zuweisung + Bezahlt (Sub-Projekte 5+6) |
| 6 | Video-Storage | Lokal `/public/uploads/courses` (env-konfigurierbar) |
| 7 | Asset-System | Eigenständiger `CourseAssetService` getrennt vom bestehenden `MediaUploadService` |
| 8 | Modul-Name | `/intern/(dashboard)/elearning` |
| 9 | Editor-Layout | Tree-Übersicht + dedizierte Lektion-Seite (kein Master-Detail-Inline) |

## Abgrenzung

**In Scope Sub-Projekt 1:**
- Schema-Migration für 4 neue Tabellen (`courses`, `course_modules`, `course_lessons`, `course_assets`)
- 5 Services (course, course-module, course-lesson, course-asset, course-publish)
- API-Routen unter `/api/v1/courses/...`
- Intern-UI: Liste, Anlegen, Edit (Stammdaten + Inhalt-Tab + Vorschau-Tab), Lektion-Editor, interne Vorschau-Seite
- Audit-Logs für alle ändernden Aktionen
- Vitest-Tests: Service-Unit + API-Integration
- Range-Request-fähiger Asset-Serve-Endpoint (Vorbereitung für Video-Player in Sub-Projekt 2)
- Permissions: `courses:read`, `courses:write`, `courses:publish`

**Out of Scope (spätere Sub-Projekte):**
- Player auf Public/Portal — Sub-Projekt 2
- Quiz-Authoring/Player — Sub-Projekt 4
- Per-User-Fortschritt, PDF-Zertifikate — Sub-Projekt 3
- Assignment einer Firma/User, Compliance-Dashboard — Sub-Projekt 5
- Bezahlung (Stripe / Rechnung), Access-Control für Paid — Sub-Projekt 6

**Out of Scope (gesamtes Feature):**
- Suche, Kategorien, Tagging, Bewertungen, Kommentare
- Mehrsprachigkeit pro Kurs
- Externes Video-Hosting (YouTube/Vimeo) — `videoExternalUrl` ist als Feld vorgesehen, der Editor-Workflow ist aber Upload-zentriert

## Datenmodell

Globaler Content (kein `tenant_id`, analog zu CMS/Blog).

### `courses`

```
id                UUID PK
slug              VARCHAR(160) UNIQUE NOT NULL
title             VARCHAR(200) NOT NULL
subtitle          VARCHAR(300) NULL
description       TEXT NULL                       -- Markdown, Kurzbeschreibung
coverImageId      UUID NULL REFERENCES media_uploads(id) ON DELETE SET NULL
visibility        course_visibility NOT NULL DEFAULT 'portal'
                                                  -- enum: 'public' | 'portal' | 'both'
status            VARCHAR(20) NOT NULL DEFAULT 'draft'
                                                  -- 'draft' | 'published' | 'archived'
useModules        BOOLEAN NOT NULL DEFAULT false
enforceSequential BOOLEAN NOT NULL DEFAULT false  -- wirkt erst in Sub-Projekt 2
estimatedMinutes  INTEGER NULL
createdBy         UUID NULL REFERENCES users(id) ON DELETE SET NULL
publishedAt       TIMESTAMPTZ NULL
createdAt         TIMESTAMPTZ NOT NULL DEFAULT NOW()
updatedAt         TIMESTAMPTZ NOT NULL DEFAULT NOW()

INDEX idx_courses_status (status)
INDEX idx_courses_visibility (visibility, status)
UNIQUE INDEX uq_courses_slug (slug)
```

**Status-Übergänge:**
- `draft → published` (über `course-publish.service.publish` mit Validierung)
- `published → draft` (Unpublish; setzt `publishedAt` nicht zurück)
- `draft → archived`, `published → archived`
- `archived → draft` (Wiederbelebung)
- Direkter `archived → published` ist nicht erlaubt — Wiederbeleben muss über `draft` gehen, damit Publish-Validierung läuft.

### `course_modules`

```
id           UUID PK
courseId     UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE
position     INTEGER NOT NULL
title        VARCHAR(200) NOT NULL
description  TEXT NULL                            -- Markdown
createdAt    TIMESTAMPTZ NOT NULL DEFAULT NOW()
updatedAt    TIMESTAMPTZ NOT NULL DEFAULT NOW()

INDEX idx_course_modules_course (courseId, position)
```

Nur relevant wenn `courses.useModules = true`. Bei `false` werden Lektionen direkt unter `courseId` ohne `moduleId` geführt.

### `course_lessons`

```
id               UUID PK
courseId         UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE
moduleId         UUID NULL REFERENCES course_modules(id) ON DELETE SET NULL
position         INTEGER NOT NULL
slug             VARCHAR(160) NOT NULL
title            VARCHAR(200) NOT NULL
contentMarkdown  TEXT NULL
videoAssetId     UUID NULL REFERENCES course_assets(id) ON DELETE SET NULL
videoExternalUrl TEXT NULL
durationMinutes  INTEGER NULL
createdAt        TIMESTAMPTZ NOT NULL DEFAULT NOW()
updatedAt        TIMESTAMPTZ NOT NULL DEFAULT NOW()

INDEX idx_course_lessons_course (courseId, position)
INDEX idx_course_lessons_module (moduleId, position)
UNIQUE INDEX uq_course_lessons_slug (courseId, slug)
```

`slug` ist eindeutig pro Kurs (nicht global), damit URLs in Sub-Projekt 2 sprechend werden: `/(public)/kurse/[course-slug]/[lesson-slug]`.

### `course_assets`

```
id            UUID PK
courseId      UUID NULL REFERENCES courses(id) ON DELETE CASCADE
lessonId      UUID NULL REFERENCES course_lessons(id) ON DELETE CASCADE
kind          VARCHAR(20) NOT NULL                -- 'video' | 'document'
filename      VARCHAR(255) NOT NULL               -- internal random name
originalName  VARCHAR(255) NOT NULL
mimeType      VARCHAR(120) NOT NULL
sizeBytes     BIGINT NOT NULL
path          VARCHAR(500) NOT NULL               -- relativ zu COURSE_ASSET_DIR
label         VARCHAR(200) NULL                   -- Anzeigename für Anhänge
position      INTEGER NULL                        -- Reihenfolge bei Anhängen
uploadedBy    UUID NULL REFERENCES users(id) ON DELETE SET NULL
createdAt     TIMESTAMPTZ NOT NULL DEFAULT NOW()

INDEX idx_course_assets_course (courseId)
INDEX idx_course_assets_lesson (lessonId)
```

`kind` kennt in Sub-Projekt 1 nur `video` und `document`. Cover-Bilder werden bewusst über `mediaUploads` referenziert (`courses.coverImageId`), damit der Image-Optimizer-Pipeline weiterhin greift. Damit bleibt `course_assets` strikt für Roh-Dateien (Video + PDF/ZIP/Office).

### Storage

- ENV: `COURSE_ASSET_DIR` (Default: `process.cwd()/public/uploads/courses`)
- Verzeichnis-Struktur: `{COURSE_ASSET_DIR}/{courseId}/{assetId}.{ext}`
- Datei-Lifecycle gekoppelt an DB-Eintrag: Service löscht Datei zusammen mit DB-Zeile

## Services

Alle in `src/lib/services/`. Pattern: `object`-mit-Methoden, Drizzle direkt, kein DI, Audit-Logs via `AuditLogService.log(...)`. Permission-Checks in API-Routen, **nicht** im Service.

### `course.service.ts`

```ts
list({ status?, visibility?, q?, page?, limit? }): Promise<{ items: Course[]; total: number }>
get(id): Promise<Course | null>
getBySlug(slug): Promise<Course | null>
create(input: CourseCreateInput, actor: { userId, role }): Promise<Course>
update(id, patch: CourseUpdateInput, actor): Promise<Course>
archive(id, actor): Promise<Course>
unpublish(id, actor): Promise<Course>     // published → draft
delete(id, actor): Promise<void>          // cascade über DB
```

Audit-Actions: `course.created`, `course.updated`, `course.archived`, `course.unpublished`, `course.deleted`.

Validierung:
- `slug` lower-kebab, Umlaute werden via Slugify-Helper transliteriert (ä→ae etc.)
- bei `update`: `slug`-Änderung warnt UI vorher, weil URLs brechen können
- 409 bei doppeltem Slug

### `course-module.service.ts`

```ts
listByCourse(courseId): Promise<CourseModule[]>
create(courseId, input, actor): Promise<CourseModule>
update(id, patch, actor): Promise<CourseModule>
delete(id, actor): Promise<void>
reorder(courseId, [{ id, position }], actor): Promise<void>   // transactional
```

Audit-Actions: `course_module.created/updated/deleted/reordered`.

### `course-lesson.service.ts`

```ts
listByCourse(courseId): Promise<CourseLesson[]>     // inkl. Modul-Zuordnung
get(id): Promise<CourseLesson | null>
create(courseId, input, actor): Promise<CourseLesson>
update(id, patch, actor): Promise<CourseLesson>
delete(id, actor): Promise<void>
reorder(courseId, [{ id, position, moduleId? }], actor): Promise<void>  // transactional
```

`reorder` kann gleichzeitig Modul-Wechsel mit-erledigen (Drag-Drop verschiebt Lektion zwischen Modulen).

Audit-Actions: `course_lesson.created/updated/deleted/reordered`.

### `course-asset.service.ts`

```ts
uploadForLesson(lessonId, file, kind: 'video' | 'document', label?, actor): Promise<CourseAsset>
listByLesson(lessonId): Promise<CourseAsset[]>
listByCourse(courseId): Promise<CourseAsset[]>
get(id): Promise<CourseAsset | null>
delete(id, actor): Promise<void>      // löscht DB + Datei
resolveAbsolutePath(asset): string    // mit Path-Traversal-Schutz
```

Validierung pro `kind`:

| kind | MIME-Whitelist | Max-Size (env-konfigurierbar) |
|---|---|---|
| `video` | mp4, webm, quicktime | 2 GB |
| `document` | pdf, zip, docx, pptx, xlsx | 50 MB |

ENV: `COURSE_ASSET_VIDEO_MAX_MB`, `COURSE_ASSET_DOC_MAX_MB`.

Audit-Actions: `course_asset.uploaded`, `course_asset.deleted`.

### `course-publish.service.ts`

```ts
publish(courseId, actor): Promise<Course>
```

Validierung vor Publish (alle gemeinsam, Sammel-Fehler):
1. Mindestens 1 Lektion vorhanden
2. Alle Lektionen haben `title` + (mind. eines: `contentMarkdown`, `videoAssetId`, `videoExternalUrl`, oder Anhang)
3. Bei `useModules = true`: alle Lektionen einer `moduleId` zugeordnet, mind. 1 Modul vorhanden
4. `slug` auf Kurs gesetzt; `slug` auf allen Lektionen gesetzt
5. Bei `visibility = public`: zusätzlich `description` Pflicht (Marketing-Anforderung)

Wirft `PublishValidationError` (eigene Error-Klasse, definiert im Service-Modul) mit `details: { lessonId?, code, message }[]` damit die UI sie als Liste zeigen kann.

Bei Erfolg: `status = 'published'`, `publishedAt = NOW()`. Audit-Action: `course.published`.

### Querschnitts-Konventionen

- Reorder-Methoden in einer Drizzle-Transaktion
- Fehler als `Error` mit `code`-Property + Message, damit UI lokalisieren kann
- `logger.info/error` aus `@/lib/utils/logger` für nicht-Audit-Events

## API-Routen

Alle unter `/api/v1/courses/...`, Auth über bestehende `getSessionUser`-Helper, JSON wenn nicht anders genannt.

```
GET    /api/v1/courses                            — Liste
POST   /api/v1/courses                            — Anlegen
GET    /api/v1/courses/[id]                       — Detail (inkl. Module + Lektionen)
PATCH  /api/v1/courses/[id]                       — Stammdaten ändern
DELETE /api/v1/courses/[id]                       — Löschen (cascade)
POST   /api/v1/courses/[id]/publish               — Publish (422 bei Mängeln)
POST   /api/v1/courses/[id]/unpublish             — published → draft
POST   /api/v1/courses/[id]/archive               — Archivieren

POST   /api/v1/courses/[id]/modules               — Modul anlegen
PATCH  /api/v1/courses/[id]/modules/[moduleId]    — Modul ändern
DELETE /api/v1/courses/[id]/modules/[moduleId]    — Modul löschen
POST   /api/v1/courses/[id]/modules/reorder       — Bulk-Reorder
       Body: [{ id, position }]

POST   /api/v1/courses/[id]/lessons               — Lektion anlegen
GET    /api/v1/courses/[id]/lessons/[lessonId]    — Lektion-Detail (inkl. Assets)
PATCH  /api/v1/courses/[id]/lessons/[lessonId]    — Lektion ändern
DELETE /api/v1/courses/[id]/lessons/[lessonId]    — Lektion löschen
POST   /api/v1/courses/[id]/lessons/reorder       — Bulk-Reorder
       Body: [{ id, position, moduleId? }]

POST   /api/v1/courses/[id]/assets                — Multipart-Upload
       Form: file, kind, lessonId, label?
DELETE /api/v1/courses/[id]/assets/[assetId]      — Löschen

GET    /api/v1/courses/assets/serve/[...path]     — Range-fähiger Datei-Serve
                                                    Sub-Projekt 1: nur eingeloggt mit
                                                    courses:read
                                                    Sub-Projekt 2 wird Public/Portal-
                                                    Zugang nachrüsten
```

### Permissions

Neue Konstanten in `src/lib/constants/permissions.ts`:
- `courses:read` — Kurse lesen + Vorschau im Intern
- `courses:write` — Kurse anlegen/ändern/löschen + Module/Lektionen/Assets
- `courses:publish` — `publish`/`unpublish`/`archive` (separater Schnitt für späteres Vier-Augen-Prinzip)

### Status-Codes

- `200` / `201` / `204` Standard
- `400` Validierung (fehlende Felder, falscher MIME)
- `403` Permission fehlt
- `404` ID nicht gefunden
- `409` Slug-Konflikt
- `413` Datei zu groß
- `422` Publish-Validierung — Body: `{ error, code: 'publish_validation', details: [...] }`

### Body-Limits

- Default-Body-Limit in Next.js (4 MB) reicht nicht. In `next.config.ts` für die Asset-Upload-Route auf das Maximum (`COURSE_ASSET_VIDEO_MAX_MB + 64 MB` Puffer) anheben.
- Coolify-Reverse-Proxy-Limit (`client_max_body_size`) prüfen und entsprechend setzen.

## UI (Intern)

```
/intern/(dashboard)/elearning/                    — Kursliste
                                                    Tabelle: Titel, Status, Visibility,
                                                    #Lektionen, geändert am, Aktionen
                                                    Filter: status, visibility, Suche
                                                    CTA: „Neuen Kurs anlegen"

/intern/(dashboard)/elearning/new/                — Neuer Kurs (Stammdaten-Form)

/intern/(dashboard)/elearning/[id]/               — Kurs-Edit
                                                    Tabs: Stammdaten | Inhalt | Vorschau
                                                    Header: Status-Badge, Publish-Button

/intern/(dashboard)/elearning/[id]/lektionen/[lessonId]/
                                                  — Lektion-Editor (eigene Seite)
                                                    Tabs: Inhalt | Video | Anhänge

/intern/(dashboard)/elearning/[id]/vorschau/      — Internes Render-Layout zur
                                                    Sichtkontrolle vor Publish
                                                    (eigenständige Komponente —
                                                     der Public-/Portal-Player wird
                                                     erst in Sub-Projekt 2 gebaut)
```

### Komponenten in `src/app/intern/(dashboard)/elearning/_components/`

- `CourseList.tsx`
- `CourseStammdatenForm.tsx`
- `CourseContentTree.tsx` — Module + Lektionen, @dnd-kit within-container Reorder, „Bearbeiten →"-Link auf jede Lektion
- `LessonEditorForm.tsx`, `LessonAttachmentList.tsx`, `LessonVideoUploader.tsx`
- `PublishValidationDialog.tsx` — listet Mängel beim Publish-Versuch
- `CoursePreview.tsx` — rendert Lektionen sequentiell für interne Sichtkontrolle

### Layout-Entscheidung

Tab „Inhalt" zeigt **nur den Tree** (Modul + Lektionen mit Reorder). Lektion-Bearbeitung passiert auf einer **eigenen Seite** unter `/lektionen/[lessonId]`. Master-Detail-Inline wurde verworfen wegen geringerer Robustheit (Save-State pro Lektion, Mobile, Bookmark-Fähigkeit).

### Markdown-Editor

Falls noch keine Komponente existiert: leichten Editor einbinden (z. B. `@uiw/react-md-editor`), oder Texteingabe + Preview-Pane via `react-markdown`. Konkrete Wahl in der Plan-Phase.

## Audit-Foundation

Pattern aus Portal-P1.5 wiederverwenden. Jede ändernde Aktion auf Kurs/Modul/Lektion/Asset ruft `AuditLogService.log({ userId, userRole, action, entityType, entityId, payload })`. Payload enthält Diff bei Updates, Datei-Metadaten bei Asset-Operationen.

Action-Konstanten zentral in `src/lib/constants/audit-actions.ts` (oder vorhandene Stelle, je nach bisherigem Pattern).

## Testing

### Vitest-Tests

```
src/__tests__/services/course.service.test.ts
src/__tests__/services/course-module.service.test.ts
src/__tests__/services/course-lesson.service.test.ts
src/__tests__/services/course-asset.service.test.ts
src/__tests__/services/course-publish.service.test.ts
src/__tests__/api/courses.api.test.ts
src/__tests__/api/course-assets.api.test.ts
```

Schwerpunkte:
- Slug-Eindeutigkeit (global für Kurs, pro Kurs für Lektion)
- Reorder transactional (alle Positionen in einem Commit)
- Publish-Validation: alle Fehlerpfade einzeln + happy path
- Asset-Upload: MIME + Size-Limits, Datei + DB konsistent
- Asset-Delete: löscht DB + Datei, kein Throw bei fehlender Datei
- `resolveAbsolutePath`: Path-Traversal (`../`) wird abgewiesen
- Asset-Serve: 200 vollständig, 206 mit Range-Header, korrekter `Content-Range`
- Auth/Permissions: `courses:read` für Read, `courses:write` für Mutations, `courses:publish` für Publish

Test-Konventionen aus bestehenden Tests:
- Test-DB-Setup über bestehenden Helper
- Asset-Tests in temporärem Verzeichnis (`COURSE_ASSET_DIR=/tmp/test-...`), Cleanup im `afterAll`
- Audit-Log-Aufrufe gemockt (Audit hat eigene Tests)

### Manuelle UAT (für `/gsd-verify-work`)

1. Kurs anlegen → Modul anlegen → 2 Lektionen → Reorder per Drag-Drop → Refresh → Reihenfolge bleibt
2. Video > 100 MB hochladen → Progress sichtbar, kein Timeout
3. Publish-Versuch ohne Lektionen → Validierungs-Dialog mit Mängelliste
4. Cover-Bild via Bild-Picker zuweisen
5. Kurs löschen → Lektionen + Assets weg, Dateien auf Disk weg
6. Vorschau-Seite zeigt Lektionen in Reihenfolge mit Markdown + Video-Player

## Implementierungs-Reihenfolge

(Pre-Plan-Skizze; verbindlich wird der Plan in der Plan-Phase.)

1. Drizzle-Migration + Schema + Types + (optional) Seed-Helper
2. Services in Reihenfolge: course → module → lesson → asset → publish (jeweils mit Tests)
3. API-Routen + Permission-Konstanten + Integration-Tests
4. Intern-UI: Liste + New + Stammdaten-Tab
5. Tree-Komponente + Modul/Lektion-CRUD-UI mit @dnd-kit
6. Lektion-Editor-Seite (Inhalt-Tab → Video-Tab → Anhänge-Tab)
7. Range-Request-Serve-Endpoint + Vorschau-Seite
8. Publish-Validation-Dialog + Audit-Log-Verifikation

## Risiken

- **Große Video-Uploads** — Next-Default-Body-Limit (4 MB) und Reverse-Proxy-Limit müssen passen. Übersehen führt zu kryptischen 413-Fehlern.
- **Range-Requests** — leicht falsch zu machen (off-by-one bei `Content-Range`, fehlender `Accept-Ranges`-Header).
- **Disk-Volume auf Coolify** — bei wenigen Stunden Video-Material schnell mehrere GB. Mindestens Warn-Schwellwert dokumentieren; Backup-Strategie für Coolify-Volume erwähnen.
- **Path-Traversal im serve-Endpoint** — User-Input darf nicht aus `COURSE_ASSET_DIR` herausführen. Test deckt's ab, aber ist häufiger CVE-Vektor.
- **Slug-Generierung bei Umlauten** — bestehender Slugify-Helper prüfen; sonst neuen mit Transliteration einsetzen.

## Folgefragen / nicht entschieden

Bewusst offen gelassen, weil sie erst in späteren Sub-Projekten relevant werden:

- Konkrete Markdown-Editor-Komponente (Plan-Phase)
- Genaue Cover-Image-Größen / Crops (Plan-Phase, Defaults vom Image-Optimizer)
- Wie der Public-Player in Sub-Projekt 2 SEO-Ready wird (eigene Spec dort)
- Wie Sub-Projekt 6 Signed-URLs für Paid-Assets nachrüstet (eigene Spec dort)
