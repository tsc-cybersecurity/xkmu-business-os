# Onlinekurse — Sub-Projekt 2b: Lesson Content Blocks

**Projekt:** xkmu-business-os
**Modul:** Lesson-Editor + Player (erweitert Sub-2)
**Datum:** 2026-04-27
**Status:** Design (genehmigt) → Plan ausstehend
**Vorgänger:** Sub-2 (`2026-04-27-onlinekurse-sub2-player-design.md`) — gemerged in main
**Nachfolger:** Sub-3 (Progress + PDF-Zertifikate)

## Kontext

Sub-2 lieferte den Public/Portal-Player; Lesson-Inhalt war auf einen einzigen Markdown-Body (`course_lessons.content_markdown`) beschränkt. Author können damit Markdown schreiben + Video + Anhänge anhängen, aber keine strukturierten Komponenten wie Callouts, Code-Blöcke mit Syntax-Highlighting oder Lernziele-Listen einbauen.

Dieses Sub-Projekt erweitert die Lesson-Inhalt-Architektur auf ein polymorphes Block-System: Markdown-Chunks und CMS-Blocks (aus dem bestehenden CMS-Block-System) werden frei mischbar in eine sortierte Block-Liste pro Lesson. Lesson-Editor wird zum Block-Listen-Editor (analog zum existierenden `CourseContentTree` für Module/Lessons), Player rendert die Blocks in Position-Reihenfolge.

Sub-2b erweitert auch den CMS-Block-Katalog um 6 neue Course-spezifische Block-Typen (callout, code, learning-objectives, key-takeaways, step-by-step, accordion) und schaltet 6 bestehende Blocks (video, image, gallery, text, divider, heading) für Lessons frei.

## Entscheidungen aus dem Brainstorming

| # | Frage | Entscheidung |
|---|---|---|
| 1 | Architektur Block-Embedding | **(d) Hybrid:** Lesson behält `contentMarkdown` (deprecated, migriert) + neue Tabelle `course_lesson_blocks` mit `position`-Reihenfolge. Polymorph: `kind ∈ {'markdown', 'cms_block'}` |
| 2 | Block-Set | **(b) Pragmatic 6:** callout, code, learning-objectives, key-takeaways, step-by-step, accordion. Plus 6 reused: video, image, gallery, text, divider, heading. `knowledge-check` aufgeschoben → Sub-4 |
| 3 | Editor-UX | **(a) Block-Picker-Sidebar** im Inhalt-Tab, Drag-Drop via `@dnd-kit`, Modal-Dialog für Edit pro Block |
| 4 | Templates | **(b) Nur System-Templates seeden** — 12 vorgefertigte (5 Callout-Varianten, 3 Code-Presets, je 1 für die anderen 4) — keine User-Templates-UI |
| 5 | Knowledge-Check | **(c) Komplett aufschieben** auf Sub-4 (echtes Quiz-System) |
| 6 | Markdown + Blocks Reihenfolge | **(b) Polymorph:** Markdown ist eine Block-Art unter den anderen, frei sortierbar. Bestehende `contentMarkdown` wird in einen ersten Markdown-Block migriert |
| 7 | Renderer | **(a) Single `LessonContentRenderer`** — eine Komponente, mappt Markdown-Chunks via `ReactMarkdown` und CMS-Blocks via existierender `CmsBlockRenderer` |
| 8 | Editor-Dialog vs Inline | **Modal-Dialog** mit dynamischem Form-Schema aus `cms_block_type_definitions.fields` |

## Zielbild

Ein Author öffnet eine Lesson im Intern-Editor → Tab „Inhalt" zeigt eine sortierbare Liste von Blocks. Jeder Block hat einen Drag-Handle, Type-Badge, Preview-Snippet und Edit/Delete-Buttons. „+ Block hinzufügen" öffnet einen Picker mit gruppierten Block-Typen (Markdown, Hinweis, Code, Lernziele, …). Wahl eines Templates fügt einen vorbefüllten Block ein. Edit öffnet einen Modal mit dynamisch generiertem Form. Drag-Drop persistiert die Reihenfolge.

Im Public/Portal-Player rendert die Lesson alle sichtbaren Blocks in Position-Reihenfolge: Markdown-Blöcke als Markdown-Artikel, CMS-Blocks via dem etablierten `CmsBlockRenderer`. Der bestehende `contentMarkdown`-Field bleibt für Sicherheit im Schema, wird aber vom Code ignoriert.

## Abgrenzung

**In Scope:**
- Schema: neue Tabelle `course_lesson_blocks`, neue Spalte `cms_block_type_definitions.available_in_lessons`
- Migrationen: Bestehende `course_lessons.content_markdown` → 1 Markdown-Block pro Lesson
- Service-Layer: neuer `course-lesson-block.service.ts` (CRUD + reorder), Erweiterung von `course-public.service.ts` (Lesson-Loader liefert Blocks)
- API: `/api/v1/courses/[id]/lessons/[lessonId]/blocks/...` (GET, POST, PATCH/DELETE per blockId, POST reorder), plus read-only Catalog-Endpoint `/api/v1/cms/block-types?available_in_lessons=true`
- 6 neue Course-Block-Komponenten unter `src/app/_components/blocks/course-*-block.tsx`
- Eintrag der 6 neuen Block-Typen in `cms_block_type_definitions` via SQL-Seed
- Freigabe der 6 bestehenden Blocks (video/image/gallery/text/divider/heading) für Lessons via `available_in_lessons=true`
- 12 System-Templates in `cms_block_templates` als Quick-Insert
- Lesson-Editor: `LessonBlockListEditor` ersetzt `LessonContentForm`. Plus `LessonBlockRow`, `LessonBlockEditDialog`, `LessonBlockTypePicker`
- Player-Integration: neuer `LessonContentRenderer` ersetzt das Markdown-only Rendering in `LessonContent`
- Vorschau-Tab im Kurs-Edit: nutzt `LessonContentRenderer` für identisches Rendering
- Audit-Logs: `lesson.block.created`, `lesson.block.updated`, `lesson.block.deleted`, `lesson.block.reordered`
- Tests: Service-Unit, Validation-Unit, API-Integration, manuelles UAT

**Out of Scope:**
- `knowledge-check`-Block (Sub-4 — echte Quiz-Persistenz mit Scoring)
- User-eigene Block-Templates (UI für „Als Vorlage speichern") — nur System-Seeds
- Inline-Markdown-Block-Splitting (Notion-style: jeder Absatz ein Block) — bleibt 1 Markdown-Block pro Editor-Eintrag
- Block-Templates für die 25 bestehenden Marketing-Blocks — bleibt unverändert
- Per-User-Fortschritt → Sub-3
- Drop der `course_lessons.content_markdown`-Spalte — Folge-PR nach Stabilisierung
- Performance-Tuning (Block-Caching, etc.) — bei Bedarf später

## Architektur

```
┌──────────────────────────────────────────────┐
│ Lesson-Editor (Intern)                        │
│  /intern/elearning/[id]/lektionen/[lessonId]  │
│  └── Inhalt-Tab                               │
│       └── LessonBlockListEditor               │
│            ├── LessonBlockRow (×N, dnd-kit)   │
│            ├── LessonBlockEditDialog (Modal)  │
│            └── LessonBlockTypePicker          │
└──────────────┬───────────────────────────────┘
               │ /api/v1/courses/[id]/lessons/
               │   [lessonId]/blocks/...
               ▼
┌──────────────────────────────────────────────┐
│ course-lesson-block.service.ts                │
│  list/create/update/delete/reorder            │
│  + audit-log                                  │
└──────────────┬───────────────────────────────┘
               │ drizzle
               ▼
┌──────────────────────────────────────────────┐
│ DB: course_lesson_blocks (polymorph)          │
│  kind: markdown → markdownBody                │
│  kind: cms_block → blockType+content+settings │
└──────────────────────────────────────────────┘
               ▲
               │ getPublicLesson / getPortalLesson
               │ (course-public.service.ts)
               │
┌──────────────────────────────────────────────┐
│ Player (Public + Portal)                      │
│  /(public)/kurse/.../[lesson-slug]            │
│  /portal/kurse/.../[lesson-slug]              │
│  └── LessonContent                            │
│       └── LessonContentRenderer               │
│            ├── ReactMarkdown (für markdown)   │
│            └── CmsBlockRenderer (für cms-block)│
└──────────────────────────────────────────────┘
```

Geteilte Komponenten leben in `src/components/elearning/`. Block-Komponenten in `src/app/_components/blocks/`. Service in `src/lib/services/`. API-Routen unter `/api/v1/courses/[id]/lessons/[lessonId]/blocks/`.

## Datenmodell

### `course_lesson_blocks` (neu)

```
id              UUID PK
lesson_id       UUID NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE
position        INTEGER NOT NULL
kind            VARCHAR(20) NOT NULL              -- 'markdown' | 'cms_block'
markdown_body   TEXT NULL                         -- belegt nur wenn kind='markdown'
block_type      VARCHAR(50) NULL                  -- belegt nur wenn kind='cms_block'
content         JSONB NOT NULL DEFAULT '{}'       -- für cms_block; für markdown {}
settings        JSONB NOT NULL DEFAULT '{}'       -- für cms_block; für markdown {}
is_visible      BOOLEAN NOT NULL DEFAULT true
created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()

INDEX idx_course_lesson_blocks_lesson (lesson_id, position)

CHECK (
  (kind = 'markdown'  AND markdown_body IS NOT NULL AND block_type IS NULL)
  OR
  (kind = 'cms_block' AND block_type IS NOT NULL AND markdown_body IS NULL)
)
```

### `cms_block_type_definitions` (modifiziert)

Neue Spalte:

```
available_in_lessons BOOLEAN NOT NULL DEFAULT false
```

Update für 6 bestehende Blocks (`video`, `image`, `gallery`, `text`, `divider`, `heading`) → `available_in_lessons = true`.

INSERT für 6 neue Course-Block-Typen mit `category='course'`, `available_in_lessons=true`.

### `cms_block_templates` (modifiziert)

Neuer Partial Unique Index für idempotenten Seed:

```
CREATE UNIQUE INDEX uq_cms_block_templates_system_name_type
  ON cms_block_templates (name, block_type)
  WHERE is_system = true;
```

Plus 12 System-Templates per ON CONFLICT-fähigen INSERT.

### `course_lessons` (Migration)

`content_markdown` bleibt als deprecated-Spalte. Migration:

```sql
INSERT INTO course_lesson_blocks (lesson_id, position, kind, markdown_body)
SELECT id, 1, 'markdown', content_markdown
FROM course_lessons
WHERE content_markdown IS NOT NULL AND content_markdown <> ''
  AND NOT EXISTS (SELECT 1 FROM course_lesson_blocks WHERE lesson_id = course_lessons.id);
```

(Bereits in den Migrations-Commits `017_course_lesson_blocks.sql` + `018_course_block_templates_seed.sql` enthalten — das DB-Schema-Setup ist also pre-merged.)

## Block-Typen-Katalog (6 neue)

Jeder Block: React-Komponente unter `src/app/_components/blocks/course-*-block.tsx` + Eintrag in `cms_block_type_definitions`. Render-Vertrag: `(content, settings) → JSX`, eingehängt im bestehenden `CmsBlockRenderer`-switch.

| Slug | Content-Schema | Render |
|---|---|---|
| `course-callout` | `{ variant: 'note'\|'tip'\|'warning'\|'danger'\|'info', title?: string, body: string }` | shadcn `Alert` mit variant-spezifischer Farbe + Lucide-Icon (`Info`/`Lightbulb`/`AlertTriangle`/`OctagonAlert`/`CircleAlert`) |
| `course-code` | `{ language: string, code: string, filename?: string, showLineNumbers?: boolean }` | `Card` + `react-syntax-highlighter` (prism style) + Copy-Button + optional Filename-Header |
| `course-learning-objectives` | `{ title?: string, items: string[] }` | `Card` border-l-primary, `CheckCircle2`-Icon vor jedem Item, default-Title „Was du lernst" |
| `course-key-takeaways` | `{ title?: string, items: string[] }` | `Card` mit `bg-primary/5`, `Sparkles`-Icon, default-Title „Wichtigste Punkte" |
| `course-step-by-step` | `{ title?: string, steps: Array<{ title: string, description?: string }> }` | nummerierte Liste in `Card`, jedes Step mit Circle-Number-Badge + Title + optional Beschreibung |
| `course-accordion` | `{ items: Array<{ question: string, answer: string }> }` | shadcn `Accordion` (multiple), answer als Markdown gerendert |

**Field-Schemas in `cms_block_type_definitions.fields`** treiben das dynamische Form-Rendering im `LessonBlockEditDialog`. Field-Types: `text`, `textarea`, `select`, `boolean`, `list-text`, `list-object`. Bestehende Field-Types werden im Editor-Dialog gerendert; `list-object` ist neu (für `step-by-step.steps` und `accordion.items`).

**Neue NPM-Dependency:** `react-syntax-highlighter` (~70KB minified, prism-light theme) für `course-code`. Installation in einem dedizierten Plan-Task.

## Service-Layer

### `course-lesson-block.service.ts` (neu)

```ts
export interface Actor { userId: string | null; userRole: string | null }

export interface CreateBlockInput {
  kind: 'markdown' | 'cms_block'
  markdownBody?: string                  // wenn kind='markdown'
  blockType?: string                     // wenn kind='cms_block'
  content?: Record<string, unknown>      // wenn kind='cms_block'
  settings?: Record<string, unknown>     // wenn kind='cms_block'
  position?: number                      // optional, sonst hinten anhängen
}

export interface UpdateBlockInput {
  markdownBody?: string | null
  content?: Record<string, unknown>
  settings?: Record<string, unknown>
  isVisible?: boolean
}

export const CourseLessonBlockService = {
  listByLesson(lessonId: string, opts?: { includeHidden?: boolean }): Promise<CourseLessonBlock[]>
  create(lessonId: string, input: CreateBlockInput, actor: Actor): Promise<CourseLessonBlock>
  update(blockId: string, patch: UpdateBlockInput, actor: Actor): Promise<CourseLessonBlock>
  delete(blockId: string, actor: Actor): Promise<void>
  reorder(lessonId: string, items: Array<{ id: string; position: number }>, actor: Actor): Promise<void>
}
```

Audit-Actions: `lesson.block.created`, `lesson.block.updated`, `lesson.block.deleted`, `lesson.block.reordered`.

Reorder läuft als DB-Transaction: alle position-Updates atomar.

### `course-public.service.ts` (erweitert)

Bestehende `getPublicLesson` und `getPortalLesson` laden zusätzlich:

```ts
const blocks = await db.select().from(courseLessonBlocks)
  .where(and(
    eq(courseLessonBlocks.lessonId, lesson.id),
    eq(courseLessonBlocks.isVisible, true),
  ))
  .orderBy(courseLessonBlocks.position)
```

Result-Shape erweitert um `lesson.blocks: CourseLessonBlock[]`. Player-Pages reichen das an `LessonContentRenderer` durch.

## API-Endpoints

Unter `/api/v1/courses/[id]/lessons/[lessonId]/blocks/...`:

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| `GET` | `/blocks` | `('courses','read')` | — | `{ data: CourseLessonBlock[] }` |
| `POST` | `/blocks` | `('courses','update')` | `CreateBlockInput` | 201 + `{ data: CourseLessonBlock }` |
| `PATCH` | `/blocks/[blockId]` | `('courses','update')` | `UpdateBlockInput` | `{ data: CourseLessonBlock }` |
| `DELETE` | `/blocks/[blockId]` | `('courses','update')` | — | `{ data: { deleted: true } }` |
| `POST` | `/blocks/reorder` | `('courses','update')` | `Array<{id,position}>` | `{ data: { reordered: number } }` |

Plus Catalog-Endpoint:

| Method | Path | Auth | Response |
|---|---|---|---|
| `GET` | `/api/v1/cms/block-types?available_in_lessons=true` | `('courses','read')` | `{ data: CmsBlockTypeDefinition[] }` |

Validation-Schemas (in `src/lib/utils/validation.ts`):

```ts
export const createLessonBlockSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('markdown'),
    markdownBody: z.string(),
    position: z.number().int().nonnegative().optional(),
  }),
  z.object({
    kind: z.literal('cms_block'),
    blockType: z.string().min(1).max(50),
    content: z.record(z.unknown()).optional(),
    settings: z.record(z.unknown()).optional(),
    position: z.number().int().nonnegative().optional(),
  }),
])

export const updateLessonBlockSchema = z.object({
  markdownBody: z.string().nullable().optional(),
  content: z.record(z.unknown()).optional(),
  settings: z.record(z.unknown()).optional(),
  isVisible: z.boolean().optional(),
})

export const reorderLessonBlocksSchema = z.array(z.object({
  id: z.string().uuid(),
  position: z.number().int().nonnegative(),
}))
```

Status-Codes Standard (200/201/204/400/403/404).

## Lesson-Editor-UX

Neue Komponenten unter `src/app/intern/(dashboard)/elearning/[id]/lektionen/[lessonId]/_components/`:

- **`LessonBlockListEditor.tsx`** — Hauptkomponente. Lädt Block-Liste, rendert via `@dnd-kit` als sortierbare Liste, „+ Block hinzufügen"-Button am Ende. Ersetzt die existierende `LessonContentForm.tsx`.
- **`LessonBlockRow.tsx`** — Eine Block-Zeile: Drag-Handle (`GripVertical`), Block-Type-Badge mit Icon aus type-definition, Preview-Snippet (erste 80 Zeichen markdownBody oder relevantes content-Feld), Action-Buttons (Edit-Pencil, Delete-Trash).
- **`LessonBlockEditDialog.tsx`** — Modal-Dialog. Holt Field-Schema aus `cms_block_type_definitions.fields` (für CMS-Blocks) bzw. zeigt Markdown-Textarea mit Live-Preview (für Markdown-Blocks). Renderer pro Field-Type:
  - `text` → `Input`
  - `textarea` → `Textarea`
  - `select` → `Select` mit options aus field
  - `boolean` → `Switch`
  - `list-text` → Items als `Input`-Liste, Add/Remove-Buttons
  - `list-object` → Items als Sub-Cards, jede mit Sub-Form aus `field.schema`
- **`LessonBlockTypePicker.tsx`** — Dropdown unter „+ Block hinzufügen"-Button. Lädt Block-Type-Catalog (filtered nach `available_in_lessons=true`) plus Markdown-Synthetic-Eintrag. Zwei-Ebenen-Struktur: Block-Typ (Header) + System-Templates darunter (falls vorhanden). Klick auf Template → POST mit Template-content; Klick auf Block-Typ-Header → POST mit type-definition default-content.

**Drag-Drop:** `@dnd-kit/core` + `@dnd-kit/sortable` (aus Sub-1 schon im Projekt). Drop persistiert via `POST /blocks/reorder` mit allen sichtbaren Block-IDs in neuer Reihenfolge.

**Layout:** der Inhalt-Tab im Lesson-Editor zeigt nur die Block-Liste, kein zusätzliches Stammdaten-Form mehr (das blieb im Stammdaten-Tab).

## Renderer-Integration

### `LessonContentRenderer.tsx` (neu, `src/components/elearning/`)

```tsx
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { CmsBlockRenderer } from '@/app/_components/cms-block-renderer'
import type { CourseLessonBlock } from '@/lib/db/schema'

interface Props {
  blocks: CourseLessonBlock[]
}

export function LessonContentRenderer({ blocks }: Props) {
  const visible = blocks.filter((b) => b.isVisible)
  return (
    <div className="space-y-6">
      {visible.map((b) => {
        if (b.kind === 'markdown') {
          return (
            <article key={b.id} className="prose prose-sm max-w-none dark:prose-invert sm:prose-base">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{b.markdownBody ?? ''}</ReactMarkdown>
            </article>
          )
        }
        return (
          <CmsBlockRenderer
            key={b.id}
            blockType={b.blockType ?? ''}
            content={(b.content as Record<string, unknown>) ?? {}}
            settings={(b.settings as Record<string, unknown>) ?? {}}
          />
        )
      })}
    </div>
  )
}
```

### `LessonContent.tsx` Erweiterung (Sub-2-Bestand)

```tsx
export function LessonContent({ lesson, assets }: Props) {
  const docs = assets.filter((a) => a.kind === 'document')
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{lesson.title}</h1>
      <LessonContentRenderer blocks={lesson.blocks ?? []} />
      {docs.length > 0 && <Card>{/* Anhänge wie bisher */}</Card>}
    </div>
  )
}
```

`Props.lesson` bekommt `blocks: CourseLessonBlock[]`-Erweiterung; Service liefert das mit.

### Vorschau-Tab im Kurs-Editor

`CourseEditView.tsx` (Sub-1) lädt im Vorschau-Tab pro Lesson alle Detail-Daten und rendert. Wird angepasst, damit es ebenfalls `lesson.blocks` über `LessonContentRenderer` rendert. Identisches Rendering Author ↔ Lerner.

## Permissions

Keine neuen. `('courses', 'update')` für alle Block-Mutationen, `('courses', 'read')` für GET-Endpoints.

Public/Portal-Player nutzen den Service-Layer ohne Permission-Check (lesson.blocks wird über `getPublicLesson`/`getPortalLesson` geladen, die selbst durch Visibility gefiltert sind).

## Block-Templates (System-Seeds)

12 System-Templates, gefseedet via `018_course_block_templates_seed.sql`:

| Block-Typ | Templates |
|---|---|
| `course-callout` | Tipp / Wichtig / Hinweis / Achtung / Notiz |
| `course-code` | TypeScript-Beispiel / Bash-Befehl / SQL-Query |
| `course-learning-objectives` | Standard-Lernziele |
| `course-key-takeaways` | Standard-Zusammenfassung |
| `course-step-by-step` | Anleitung |
| `course-accordion` | FAQ |

Idempotent via Partial Unique Index `(name, block_type) WHERE is_system = true` + `ON CONFLICT DO UPDATE`.

## Testing

### Unit (Service)
- `course-lesson-block.service.test.ts` (neu)
  - listByLesson: alle vs. nur visible
  - create markdown: schreibt markdownBody, ignoriert blockType
  - create cms_block: schreibt blockType+content, ignoriert markdownBody
  - create ohne position: hängt am Ende an
  - update: ändert nur erlaubte Felder, audit-log
  - delete: audit-log
  - reorder: transactional update
- `course-public.service.test.ts` Erweiterungen
  - getPublicLesson liefert blocks (sorted, visibility-filtered)
  - getPortalLesson analog

### Unit (Validation)
- `validation.test.ts` Erweiterungen
  - createLessonBlockSchema: markdown valid / cms_block valid / wrong kind 400
  - updateLessonBlockSchema
  - reorderLessonBlocksSchema

### Integration (API)
- `course-lesson-blocks.route.test.ts` (neu)
  - GET liefert sortierte Liste
  - POST markdown → 201
  - POST cms_block → 201
  - POST invalid kind → 400
  - PATCH updates content
  - DELETE returns deleted=true
  - POST /reorder returns reordered count
  - 401 ohne Session
  - 403 ohne courses:update

### Manuelles UAT
1. Lesson öffnen → Inhalt-Tab zeigt Block-Liste mit migriertem Markdown-Block
2. „+ Block hinzufügen" → Picker zeigt 12 Block-Typen + Markdown, gruppiert mit Templates
3. Callout-Tipp-Template einfügen → Edit-Dialog öffnet mit Title „Tipp" vorbelegt
4. Body schreiben → Speichern → Block in Liste
5. Drag-Drop: Callout vor Markdown-Block ziehen → Reload → Reihenfolge persistiert
6. Code-Block-TypeScript-Template → Code reinpasten → Speichern → Player zeigt Syntax-Highlighting + Copy-Button
7. Vorschau-Tab im Kurs-Editor zeigt identisches Rendering wie Player
8. Public-Player + Portal-Player rendern Blocks korrekt
9. Migration-Verify: alte Lessons mit `contentMarkdown` zeigen unveränderten Inhalt (jetzt aus `course_lesson_blocks` statt aus dem alten Feld)

### Performance-Check
- Lesson-Detail-Endpoint mit 50 Blocks pro Lesson: < 200ms Server-Response erwartet
- Asset-ACL-Cache aus Sub-2 wird durch Block-Inhalte nicht beeinflusst

## Migration / Backwards-Compat

- Schema-Änderungen ergänzen, nichts wird gelöscht. `course_lessons.content_markdown` bleibt erhalten (deprecated).
- DB-Migration läuft automatisch via Migration-Registry beim Deploy (Migrations 017 + 018 — bereits committed in `1746fabd` + `08101c1d` vor diesem Spec).
- Code, der `lesson.contentMarkdown` direkt liest, wird auf `lesson.blocks` umgestellt:
  - `LessonContent.tsx` (Sub-2)
  - `CoursePreview.tsx` (Sub-1, Vorschau-Tab)
  - `LessonContentForm.tsx` (Sub-1, Editor) → ersetzt durch `LessonBlockListEditor`

## Body-Limits / Deployment

Keine neuen. Block-Inhalte sind klein (Text + JSON), kein Asset-Upload betroffen.

## Offene Punkte (out of scope, für Folge-PRs)

- Drop der `course_lessons.content_markdown`-Spalte nach Stabilisierung
- User-eigene Block-Templates (Speichern-als-Vorlage UI)
- Inline-Markdown-Block-Splitting für Notion-style-Authoring
- Block-Caching auf Service-Ebene (falls > 100 Blocks pro Lesson)
- JSON-Schema-Validierung für `content` pro Block-Typ (aktuell wird nur das Field-Schema im Editor benutzt; Server akzeptiert beliebiges JSON)
- Knowledge-Check-Block (Sub-4)
