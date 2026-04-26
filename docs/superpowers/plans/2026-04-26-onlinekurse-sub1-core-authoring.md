# Onlinekurse Sub-Projekt 1a — Foundation + Services — Implementation Plan

> **Plan-Pakete für Sub-Projekt 1**
> - **1a (diese Datei):** Schema, Migration, Permissions, alle 5 Services
> - **1b:** API-Routen (`docs/superpowers/plans/2026-04-26-onlinekurse-sub1b-api.md`)
> - **1c:** Intern-UI (`docs/superpowers/plans/2026-04-26-onlinekurse-sub1c-ui.md`)
>
> Reihenfolge: 1a → 1b → 1c. Jedes Paket kann mit `superpowers:subagent-driven-development` separat ausgeführt werden.

---


> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admins/Autoren können im `/intern/(dashboard)/elearning`-Bereich Onlinekurse (Module + Lektionen + Markdown + Video-Upload + Datei-Anhänge) anlegen, bearbeiten und veröffentlichen. Public-/Portal-Player kommen in Sub-Projekt 2.

**Architecture:** Vier neue Tabellen (`courses`, `course_modules`, `course_lessons`, `course_assets`), fünf Services nach bestehendem `XxxService = { ... }`-Pattern, ~15 API-Routen unter `/api/v1/courses/...` mit `withPermission(...)`-Wrapper, Intern-UI mit Tree-Übersicht + dedizierter Lektion-Seite (kein Master-Detail-Inline). Asset-System eigenständig, Range-Request-fähig, lokal in `COURSE_ASSET_DIR`.

**Tech Stack:** Next.js 15 App Router, Drizzle ORM (Postgres), Zod, Vitest, @dnd-kit, react-markdown.

**Spec:** `docs/superpowers/specs/2026-04-26-onlinekurse-sub1-core-authoring-design.md`

**Codebase-Patterns, die der Plan strikt befolgt:**
- Services: `export const FooService = { method() { ... } }` (kein DI)
- API: `withPermission(request, MODULE, ACTION, async (auth) => { ... })` aus `@/lib/auth/require-permission`
- Permissions: nur CRUD-Actions (`create | read | update | delete`); **kein** separates `courses:publish` — publish/unpublish/archive hängen pragmatisch an `('courses', 'update')`. Vier-Augen-Trennung kommt in Sub-Projekt 5.
- Audit: `AuditLogService.log({ userId, userRole, action, entityType, entityId, payload, request })`
- Test: `setupDbMock()` aus `src/__tests__/helpers/mock-db.ts` + `vi.resetModules()` + dynamic import des Services
- API-Tests: in `src/__tests__/integration/api/...`; Service-Tests in `src/__tests__/unit/services/...`

---

## Phase A — Foundation

### Task 1: Drizzle-Migration + Schema-Erweiterung

**Files:**
- Create: `drizzle/migrations/0033_courses.sql`
- Modify: `src/lib/db/schema.ts` (am Ende anhängen)

- [ ] **Step 1: SQL-Migration anlegen**

Datei `drizzle/migrations/0033_courses.sql`:

```sql
-- Onlinekurse Sub-Projekt 1: Core Authoring + Content Model

CREATE TYPE course_visibility AS ENUM ('public', 'portal', 'both');

CREATE TABLE courses (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug               varchar(160) NOT NULL UNIQUE,
  title              varchar(200) NOT NULL,
  subtitle           varchar(300),
  description        text,
  cover_image_id     uuid REFERENCES media_uploads(id) ON DELETE SET NULL,
  visibility         course_visibility NOT NULL DEFAULT 'portal',
  status             varchar(20) NOT NULL DEFAULT 'draft',
  use_modules        boolean NOT NULL DEFAULT false,
  enforce_sequential boolean NOT NULL DEFAULT false,
  estimated_minutes  integer,
  created_by         uuid REFERENCES users(id) ON DELETE SET NULL,
  published_at       timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_courses_status ON courses(status);
CREATE INDEX idx_courses_visibility ON courses(visibility, status);

CREATE TABLE course_modules (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id   uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  position    integer NOT NULL,
  title       varchar(200) NOT NULL,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_course_modules_course ON course_modules(course_id, position);

CREATE TABLE course_assets (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id     uuid REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id     uuid,                                 -- FK später (zirkuläre Abhängigkeit)
  kind          varchar(20) NOT NULL,                 -- 'video' | 'document'
  filename      varchar(255) NOT NULL,
  original_name varchar(255) NOT NULL,
  mime_type     varchar(120) NOT NULL,
  size_bytes    bigint NOT NULL,
  path          varchar(500) NOT NULL,
  label         varchar(200),
  position      integer,
  uploaded_by   uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_course_assets_course ON course_assets(course_id);
CREATE INDEX idx_course_assets_lesson ON course_assets(lesson_id);

CREATE TABLE course_lessons (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id          uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  module_id          uuid REFERENCES course_modules(id) ON DELETE SET NULL,
  position           integer NOT NULL,
  slug               varchar(160) NOT NULL,
  title              varchar(200) NOT NULL,
  content_markdown   text,
  video_asset_id     uuid REFERENCES course_assets(id) ON DELETE SET NULL,
  video_external_url text,
  duration_minutes   integer,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, slug)
);
CREATE INDEX idx_course_lessons_course ON course_lessons(course_id, position);
CREATE INDEX idx_course_lessons_module ON course_lessons(module_id, position);

-- Jetzt FK auf course_assets.lesson_id nachziehen
ALTER TABLE course_assets
  ADD CONSTRAINT course_assets_lesson_id_fkey
  FOREIGN KEY (lesson_id) REFERENCES course_lessons(id) ON DELETE CASCADE;
```

- [ ] **Step 2: Schema in `src/lib/db/schema.ts` ergänzen**

Am Ende der Datei (vor evtl. trailing exports) anfügen:

```ts
import { pgEnum, pgTable, uuid, varchar, text, boolean, integer, bigint, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core'
// (Imports oben in Datei ergänzen falls nicht alle vorhanden)

export const courseVisibility = pgEnum('course_visibility', ['public', 'portal', 'both'])

export const courses = pgTable('courses', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: varchar('slug', { length: 160 }).notNull().unique(),
  title: varchar('title', { length: 200 }).notNull(),
  subtitle: varchar('subtitle', { length: 300 }),
  description: text('description'),
  coverImageId: uuid('cover_image_id').references(() => mediaUploads.id, { onDelete: 'set null' }),
  visibility: courseVisibility('visibility').notNull().default('portal'),
  status: varchar('status', { length: 20 }).notNull().default('draft'),
  useModules: boolean('use_modules').notNull().default(false),
  enforceSequential: boolean('enforce_sequential').notNull().default(false),
  estimatedMinutes: integer('estimated_minutes'),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  statusIdx: index('idx_courses_status').on(t.status),
  visIdx: index('idx_courses_visibility').on(t.visibility, t.status),
}))

export const courseModules = pgTable('course_modules', {
  id: uuid('id').primaryKey().defaultRandom(),
  courseId: uuid('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  position: integer('position').notNull(),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  courseIdx: index('idx_course_modules_course').on(t.courseId, t.position),
}))

export const courseAssets = pgTable('course_assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  courseId: uuid('course_id').references(() => courses.id, { onDelete: 'cascade' }),
  lessonId: uuid('lesson_id'),
  kind: varchar('kind', { length: 20 }).notNull(),
  filename: varchar('filename', { length: 255 }).notNull(),
  originalName: varchar('original_name', { length: 255 }).notNull(),
  mimeType: varchar('mime_type', { length: 120 }).notNull(),
  sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
  path: varchar('path', { length: 500 }).notNull(),
  label: varchar('label', { length: 200 }),
  position: integer('position'),
  uploadedBy: uuid('uploaded_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  courseIdx: index('idx_course_assets_course').on(t.courseId),
  lessonIdx: index('idx_course_assets_lesson').on(t.lessonId),
}))

export const courseLessons = pgTable('course_lessons', {
  id: uuid('id').primaryKey().defaultRandom(),
  courseId: uuid('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  moduleId: uuid('module_id').references(() => courseModules.id, { onDelete: 'set null' }),
  position: integer('position').notNull(),
  slug: varchar('slug', { length: 160 }).notNull(),
  title: varchar('title', { length: 200 }).notNull(),
  contentMarkdown: text('content_markdown'),
  videoAssetId: uuid('video_asset_id').references(() => courseAssets.id, { onDelete: 'set null' }),
  videoExternalUrl: text('video_external_url'),
  durationMinutes: integer('duration_minutes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  courseIdx: index('idx_course_lessons_course').on(t.courseId, t.position),
  moduleIdx: index('idx_course_lessons_module').on(t.moduleId, t.position),
  slugUnique: uniqueIndex('uq_course_lessons_slug').on(t.courseId, t.slug),
}))

export type Course = typeof courses.$inferSelect
export type NewCourse = typeof courses.$inferInsert
export type CourseModule = typeof courseModules.$inferSelect
export type NewCourseModule = typeof courseModules.$inferInsert
export type CourseLesson = typeof courseLessons.$inferSelect
export type NewCourseLesson = typeof courseLessons.$inferInsert
export type CourseAsset = typeof courseAssets.$inferSelect
export type NewCourseAsset = typeof courseAssets.$inferInsert
```

- [ ] **Step 3: Migration anwenden**

Run: `npm run db:migrate`
Expected: `0033_courses.sql applied`. Tabellen vorhanden in DB.

- [ ] **Step 4: Schema-Whitelist updaten**

Modify `src/lib/db/table-whitelist.ts`: ergänze `'courses'`, `'course_modules'`, `'course_lessons'`, `'course_assets'` in der exportierten Liste (alphabetisch einsortieren).

- [ ] **Step 5: Commit**

```bash
git add drizzle/migrations/0033_courses.sql src/lib/db/schema.ts src/lib/db/table-whitelist.ts
git commit -m "feat(elearning): schema for courses, modules, lessons, assets"
```

---

### Task 2: Permission-Modul `'courses'` registrieren

**Files:**
- Modify: `src/lib/types/permissions.ts`

- [ ] **Step 1: Modul ergänzen**

Im `MODULES`-Array `'courses'` alphabetisch einsortieren (zwischen `'cockpit'` und `'database'`):

```ts
export const MODULES = [
  // ... bestehend
  'cockpit',
  'courses',
  'database',
  // ... bestehend
] as const
```

- [ ] **Step 2: Build prüfen**

Run: `npx tsc --noEmit`
Expected: keine Fehler.

- [ ] **Step 3: Commit**

```bash
git add src/lib/types/permissions.ts
git commit -m "feat(elearning): add 'courses' permission module"
```

---

## Phase B — Services (TDD)

### Task 3: `course.service.ts` — CRUD-Grundgerüst

**Files:**
- Create: `src/lib/services/course.service.ts`
- Create: `src/__tests__/unit/services/course.service.test.ts`

- [ ] **Step 1: Failing test schreiben**

Datei `src/__tests__/unit/services/course.service.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'
import { TEST_USER_ID } from '../../helpers/fixtures'

const TEST_COURSE_ID = '00000000-0000-0000-0000-0000000000c1'

function courseFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_COURSE_ID,
    slug: 'kurs-1',
    title: 'Kurs 1',
    subtitle: null,
    description: null,
    coverImageId: null,
    visibility: 'portal',
    status: 'draft',
    useModules: false,
    enforceSequential: false,
    estimatedMinutes: null,
    createdBy: TEST_USER_ID,
    publishedAt: null,
    createdAt: new Date('2026-04-26T00:00:00Z'),
    updatedAt: new Date('2026-04-26T00:00:00Z'),
    ...overrides,
  }
}

describe('CourseService', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
    vi.doMock('@/lib/services/audit-log.service', () => ({
      AuditLogService: { log: vi.fn().mockResolvedValue(undefined) },
    }))
  })

  async function getService() {
    const mod = await import('@/lib/services/course.service')
    return mod.CourseService
  }

  describe('create', () => {
    it('creates a course with auto-generated slug', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])             // slug uniqueness probe
      dbMock.mockInsert.mockResolvedValue([courseFixture()])

      const svc = await getService()
      const result = await svc.create({ title: 'Kurs 1' }, { userId: TEST_USER_ID, userRole: 'admin' })

      expect(result.slug).toBe('kurs-1')
      expect(dbMock.db.insert).toHaveBeenCalled()
    })

    it('rejects duplicate slug with code SLUG_CONFLICT', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([courseFixture()])

      const svc = await getService()
      await expect(svc.create({ title: 'Kurs 1', slug: 'kurs-1' }, { userId: TEST_USER_ID, userRole: 'admin' }))
        .rejects.toMatchObject({ code: 'SLUG_CONFLICT' })
    })
  })

  describe('getBySlug', () => {
    it('returns course when found', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([courseFixture()])
      const svc = await getService()
      const result = await svc.getBySlug('kurs-1')
      expect(result?.id).toBe(TEST_COURSE_ID)
    })

    it('returns null when not found', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      const svc = await getService()
      expect(await svc.getBySlug('nope')).toBeNull()
    })
  })

  describe('update', () => {
    it('updates and returns course', async () => {
      const updated = courseFixture({ title: 'Neu' })
      dbMock.mockSelect.mockResolvedValueOnce([courseFixture()]) // existence
      dbMock.mockUpdate.mockResolvedValue([updated])
      const svc = await getService()
      const result = await svc.update(TEST_COURSE_ID, { title: 'Neu' }, { userId: TEST_USER_ID, userRole: 'admin' })
      expect(result.title).toBe('Neu')
    })
  })
})
```

- [ ] **Step 2: Test laufen lassen — fail**

Run: `npx vitest run src/__tests__/unit/services/course.service.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Service implementieren**

Datei `src/lib/services/course.service.ts`:

```ts
import { db } from '@/lib/db'
import { courses } from '@/lib/db/schema'
import type { Course } from '@/lib/db/schema'
import { eq, and, ilike, desc, sql } from 'drizzle-orm'
import { AuditLogService } from './audit-log.service'
import { logger } from '@/lib/utils/logger'

export interface Actor { userId: string | null; userRole: string | null }

export interface CourseCreateInput {
  title: string
  slug?: string
  subtitle?: string | null
  description?: string | null
  visibility?: 'public' | 'portal' | 'both'
  useModules?: boolean
  enforceSequential?: boolean
  estimatedMinutes?: number | null
  coverImageId?: string | null
}

export interface CourseUpdateInput extends Partial<CourseCreateInput> {}

export interface CourseListFilter {
  status?: string
  visibility?: string
  q?: string
  page?: number
  limit?: number
}

export class CourseError extends Error {
  constructor(public code: string, message: string) { super(message) }
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 160) || 'kurs'
}

export const CourseService = {
  async list(filter: CourseListFilter = {}): Promise<{ items: Course[]; total: number }> {
    const page = filter.page ?? 1
    const limit = filter.limit ?? 50
    const offset = (page - 1) * limit
    const conds = []
    if (filter.status) conds.push(eq(courses.status, filter.status))
    if (filter.visibility) conds.push(eq(courses.visibility, filter.visibility as 'public' | 'portal' | 'both'))
    if (filter.q) conds.push(ilike(courses.title, `%${filter.q}%`))
    const where = conds.length > 0 ? and(...conds) : undefined

    const [items, totalRows] = await Promise.all([
      db.select().from(courses).where(where).orderBy(desc(courses.updatedAt)).limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(courses).where(where),
    ])
    return { items, total: totalRows[0]?.count ?? 0 }
  },

  async get(id: string): Promise<Course | null> {
    const [row] = await db.select().from(courses).where(eq(courses.id, id)).limit(1)
    return row ?? null
  },

  async getBySlug(slug: string): Promise<Course | null> {
    const [row] = await db.select().from(courses).where(eq(courses.slug, slug)).limit(1)
    return row ?? null
  },

  async create(input: CourseCreateInput, actor: Actor): Promise<Course> {
    const slug = (input.slug ?? slugify(input.title)).trim()
    const existing = await db.select().from(courses).where(eq(courses.slug, slug)).limit(1)
    if (existing.length > 0) throw new CourseError('SLUG_CONFLICT', `Slug bereits vergeben: ${slug}`)

    const [row] = await db.insert(courses).values({
      slug,
      title: input.title,
      subtitle: input.subtitle ?? null,
      description: input.description ?? null,
      coverImageId: input.coverImageId ?? null,
      visibility: input.visibility ?? 'portal',
      useModules: input.useModules ?? false,
      enforceSequential: input.enforceSequential ?? false,
      estimatedMinutes: input.estimatedMinutes ?? null,
      createdBy: actor.userId,
    }).returning()

    await AuditLogService.log({
      userId: actor.userId, userRole: actor.userRole,
      action: 'course.created', entityType: 'course', entityId: row.id,
      payload: { slug, title: input.title },
    })
    return row
  },

  async update(id: string, patch: CourseUpdateInput, actor: Actor): Promise<Course> {
    const existing = await this.get(id)
    if (!existing) throw new CourseError('NOT_FOUND', `Kurs ${id} nicht gefunden`)

    if (patch.slug && patch.slug !== existing.slug) {
      const conflict = await db.select().from(courses).where(eq(courses.slug, patch.slug)).limit(1)
      if (conflict.length > 0) throw new CourseError('SLUG_CONFLICT', `Slug bereits vergeben: ${patch.slug}`)
    }

    const update: Record<string, unknown> = { updatedAt: new Date() }
    for (const k of ['slug','title','subtitle','description','coverImageId','visibility','useModules','enforceSequential','estimatedMinutes'] as const) {
      if (k in patch) update[k] = (patch as Record<string, unknown>)[k]
    }

    const [row] = await db.update(courses).set(update).where(eq(courses.id, id)).returning()
    await AuditLogService.log({
      userId: actor.userId, userRole: actor.userRole,
      action: 'course.updated', entityType: 'course', entityId: id,
      payload: { changes: Object.keys(update).filter(k => k !== 'updatedAt') },
    })
    return row
  },
}
```

- [ ] **Step 4: Test laufen lassen — pass**

Run: `npx vitest run src/__tests__/unit/services/course.service.test.ts`
Expected: 4 passing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/course.service.ts src/__tests__/unit/services/course.service.test.ts
git commit -m "feat(elearning): CourseService CRUD with slug + audit"
```

---

### Task 4: `course.service.ts` — archive / unpublish / delete

**Files:**
- Modify: `src/lib/services/course.service.ts` (Methoden ergänzen)
- Modify: `src/__tests__/unit/services/course.service.test.ts`

- [ ] **Step 1: Tests ergänzen**

Im bestehenden `describe('CourseService', ...)`-Block hinzufügen:

```ts
  describe('archive', () => {
    it('sets status=archived', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([courseFixture({ status: 'published' })])
      dbMock.mockUpdate.mockResolvedValue([courseFixture({ status: 'archived' })])
      const svc = await getService()
      const r = await svc.archive(TEST_COURSE_ID, { userId: TEST_USER_ID, userRole: 'admin' })
      expect(r.status).toBe('archived')
    })
  })

  describe('unpublish', () => {
    it('sets status=draft', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([courseFixture({ status: 'published' })])
      dbMock.mockUpdate.mockResolvedValue([courseFixture({ status: 'draft' })])
      const svc = await getService()
      const r = await svc.unpublish(TEST_COURSE_ID, { userId: TEST_USER_ID, userRole: 'admin' })
      expect(r.status).toBe('draft')
    })

    it('rejects unpublish on draft course', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([courseFixture({ status: 'draft' })])
      const svc = await getService()
      await expect(svc.unpublish(TEST_COURSE_ID, { userId: TEST_USER_ID, userRole: 'admin' }))
        .rejects.toMatchObject({ code: 'INVALID_STATE' })
    })
  })

  describe('delete', () => {
    it('deletes course and logs audit', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([courseFixture()])
      dbMock.mockDelete.mockResolvedValue(undefined)
      const svc = await getService()
      await svc.delete(TEST_COURSE_ID, { userId: TEST_USER_ID, userRole: 'admin' })
      expect(dbMock.db.delete).toHaveBeenCalled()
    })
  })
```

- [ ] **Step 2: Test laufen lassen — fail (Methoden fehlen)**

Run: `npx vitest run src/__tests__/unit/services/course.service.test.ts`
Expected: FAIL.

- [ ] **Step 3: Methoden ergänzen**

Im `CourseService`-Object am Ende vor der schließenden `}` ergänzen:

```ts
  async archive(id: string, actor: Actor): Promise<Course> {
    const existing = await this.get(id)
    if (!existing) throw new CourseError('NOT_FOUND', `Kurs ${id} nicht gefunden`)
    const [row] = await db.update(courses)
      .set({ status: 'archived', updatedAt: new Date() })
      .where(eq(courses.id, id)).returning()
    await AuditLogService.log({
      userId: actor.userId, userRole: actor.userRole,
      action: 'course.archived', entityType: 'course', entityId: id, payload: {},
    })
    return row
  },

  async unpublish(id: string, actor: Actor): Promise<Course> {
    const existing = await this.get(id)
    if (!existing) throw new CourseError('NOT_FOUND', `Kurs ${id} nicht gefunden`)
    if (existing.status !== 'published') throw new CourseError('INVALID_STATE', `Kurs ist nicht published (status=${existing.status})`)
    const [row] = await db.update(courses)
      .set({ status: 'draft', updatedAt: new Date() })
      .where(eq(courses.id, id)).returning()
    await AuditLogService.log({
      userId: actor.userId, userRole: actor.userRole,
      action: 'course.unpublished', entityType: 'course', entityId: id, payload: {},
    })
    return row
  },

  async delete(id: string, actor: Actor): Promise<void> {
    const existing = await this.get(id)
    if (!existing) throw new CourseError('NOT_FOUND', `Kurs ${id} nicht gefunden`)
    await db.delete(courses).where(eq(courses.id, id))
    await AuditLogService.log({
      userId: actor.userId, userRole: actor.userRole,
      action: 'course.deleted', entityType: 'course', entityId: id,
      payload: { slug: existing.slug, title: existing.title },
    })
    logger.info('Course deleted', { module: 'CourseService', id })
  },
```

- [ ] **Step 4: Test laufen lassen — pass**

Run: `npx vitest run src/__tests__/unit/services/course.service.test.ts`
Expected: 7 passing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/course.service.ts src/__tests__/unit/services/course.service.test.ts
git commit -m "feat(elearning): CourseService archive/unpublish/delete"
```

---

### Task 5: `course-module.service.ts`

**Files:**
- Create: `src/lib/services/course-module.service.ts`
- Create: `src/__tests__/unit/services/course-module.service.test.ts`

- [ ] **Step 1: Failing test schreiben**

Datei `src/__tests__/unit/services/course-module.service.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'
import { TEST_USER_ID } from '../../helpers/fixtures'

const COURSE_ID = '00000000-0000-0000-0000-0000000000c1'
const MOD_ID    = '00000000-0000-0000-0000-0000000000d1'

function modFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: MOD_ID, courseId: COURSE_ID, position: 1, title: 'Modul 1',
    description: null,
    createdAt: new Date('2026-04-26T00:00:00Z'),
    updatedAt: new Date('2026-04-26T00:00:00Z'),
    ...overrides,
  }
}

describe('CourseModuleService', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
    vi.doMock('@/lib/services/audit-log.service', () => ({
      AuditLogService: { log: vi.fn().mockResolvedValue(undefined) },
    }))
  })

  async function getService() {
    return (await import('@/lib/services/course-module.service')).CourseModuleService
  }

  it('creates a module appended at next position', async () => {
    dbMock.mockSelect.mockResolvedValueOnce([{ max: 2 }])
    dbMock.mockInsert.mockResolvedValue([modFixture({ position: 3 })])
    const svc = await getService()
    const r = await svc.create(COURSE_ID, { title: 'Modul 1' }, { userId: TEST_USER_ID, userRole: 'admin' })
    expect(r.position).toBe(3)
  })

  it('lists modules for a course', async () => {
    dbMock.mockSelect.mockResolvedValueOnce([modFixture(), modFixture({ id: 'x', position: 2 })])
    const svc = await getService()
    const r = await svc.listByCourse(COURSE_ID)
    expect(r).toHaveLength(2)
  })

  it('reorder calls update once per item in transaction', async () => {
    dbMock.mockTransaction.mockImplementation(async (cb: any) => cb(dbMock.db))
    dbMock.mockUpdate.mockResolvedValue(undefined)
    const svc = await getService()
    await svc.reorder(COURSE_ID, [{ id: MOD_ID, position: 1 }, { id: 'x', position: 2 }],
      { userId: TEST_USER_ID, userRole: 'admin' })
    expect(dbMock.db.update).toHaveBeenCalledTimes(2)
  })
})
```

If `mockTransaction` doesn't exist on the helper yet, extend `src/__tests__/helpers/mock-db.ts` to expose it:

```ts
// in setupDbMock(), after createFreshChain setup:
const mockTransaction = vi.fn().mockImplementation(async (cb: (tx: unknown) => unknown) => cb(db))
;(db as Record<string, unknown>).transaction = mockTransaction
return { /* existing */, mockTransaction }
```

- [ ] **Step 2: Test laufen lassen — fail**

Run: `npx vitest run src/__tests__/unit/services/course-module.service.test.ts`
Expected: FAIL.

- [ ] **Step 3: Service implementieren**

Datei `src/lib/services/course-module.service.ts`:

```ts
import { db } from '@/lib/db'
import { courseModules } from '@/lib/db/schema'
import type { CourseModule } from '@/lib/db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { AuditLogService } from './audit-log.service'
import type { Actor } from './course.service'

export interface CourseModuleCreateInput { title: string; description?: string | null }
export interface CourseModuleUpdateInput extends Partial<CourseModuleCreateInput> {}
export class CourseModuleError extends Error {
  constructor(public code: string, message: string) { super(message) }
}

export const CourseModuleService = {
  async listByCourse(courseId: string): Promise<CourseModule[]> {
    return db.select().from(courseModules)
      .where(eq(courseModules.courseId, courseId))
      .orderBy(courseModules.position)
  },

  async create(courseId: string, input: CourseModuleCreateInput, actor: Actor): Promise<CourseModule> {
    const [{ max }] = await db
      .select({ max: sql<number>`coalesce(max(${courseModules.position}), 0)` })
      .from(courseModules).where(eq(courseModules.courseId, courseId))
    const [row] = await db.insert(courseModules).values({
      courseId, title: input.title, description: input.description ?? null, position: (max ?? 0) + 1,
    }).returning()
    await AuditLogService.log({
      userId: actor.userId, userRole: actor.userRole,
      action: 'course_module.created', entityType: 'course_module', entityId: row.id,
      payload: { courseId, title: input.title },
    })
    return row
  },

  async update(id: string, patch: CourseModuleUpdateInput, actor: Actor): Promise<CourseModule> {
    const update: Record<string, unknown> = { updatedAt: new Date() }
    if ('title' in patch) update.title = patch.title
    if ('description' in patch) update.description = patch.description
    const [row] = await db.update(courseModules).set(update).where(eq(courseModules.id, id)).returning()
    if (!row) throw new CourseModuleError('NOT_FOUND', `Modul ${id} nicht gefunden`)
    await AuditLogService.log({
      userId: actor.userId, userRole: actor.userRole,
      action: 'course_module.updated', entityType: 'course_module', entityId: id,
      payload: { changes: Object.keys(update).filter(k => k !== 'updatedAt') },
    })
    return row
  },

  async delete(id: string, actor: Actor): Promise<void> {
    await db.delete(courseModules).where(eq(courseModules.id, id))
    await AuditLogService.log({
      userId: actor.userId, userRole: actor.userRole,
      action: 'course_module.deleted', entityType: 'course_module', entityId: id, payload: {},
    })
  },

  async reorder(courseId: string, items: { id: string; position: number }[], actor: Actor): Promise<void> {
    await db.transaction(async (tx) => {
      for (const it of items) {
        await tx.update(courseModules).set({ position: it.position, updatedAt: new Date() })
          .where(and(eq(courseModules.id, it.id), eq(courseModules.courseId, courseId)))
      }
    })
    await AuditLogService.log({
      userId: actor.userId, userRole: actor.userRole,
      action: 'course_module.reordered', entityType: 'course', entityId: courseId,
      payload: { items },
    })
  },
}
```

- [ ] **Step 4: Test laufen lassen — pass**

Run: `npx vitest run src/__tests__/unit/services/course-module.service.test.ts`
Expected: 3 passing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/course-module.service.ts src/__tests__/unit/services/course-module.service.test.ts src/__tests__/helpers/mock-db.ts
git commit -m "feat(elearning): CourseModuleService with reorder transaction"
```

---

### Task 6: `course-lesson.service.ts`

**Files:**
- Create: `src/lib/services/course-lesson.service.ts`
- Create: `src/__tests__/unit/services/course-lesson.service.test.ts`

- [ ] **Step 1: Failing test schreiben**

Datei `src/__tests__/unit/services/course-lesson.service.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'
import { TEST_USER_ID } from '../../helpers/fixtures'

const COURSE_ID = '00000000-0000-0000-0000-0000000000c1'
const LESSON_ID = '00000000-0000-0000-0000-0000000000e1'

function lessonFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: LESSON_ID, courseId: COURSE_ID, moduleId: null, position: 1,
    slug: 'lektion-1', title: 'Lektion 1', contentMarkdown: null,
    videoAssetId: null, videoExternalUrl: null, durationMinutes: null,
    createdAt: new Date(), updatedAt: new Date(),
    ...overrides,
  }
}

describe('CourseLessonService', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
    vi.doMock('@/lib/services/audit-log.service', () => ({
      AuditLogService: { log: vi.fn().mockResolvedValue(undefined) },
    }))
  })

  async function getService() {
    return (await import('@/lib/services/course-lesson.service')).CourseLessonService
  }

  it('creates lesson with auto slug + position', async () => {
    dbMock.mockSelect.mockResolvedValueOnce([])              // slug uniqueness
    dbMock.mockSelect.mockResolvedValueOnce([{ max: 0 }])    // max position
    dbMock.mockInsert.mockResolvedValue([lessonFixture()])
    const svc = await getService()
    const r = await svc.create(COURSE_ID, { title: 'Lektion 1' }, { userId: TEST_USER_ID, userRole: 'admin' })
    expect(r.slug).toBe('lektion-1')
    expect(r.position).toBe(1)
  })

  it('rejects duplicate slug per course', async () => {
    dbMock.mockSelect.mockResolvedValueOnce([lessonFixture()])
    const svc = await getService()
    await expect(svc.create(COURSE_ID, { title: 'Lektion 1', slug: 'lektion-1' },
      { userId: TEST_USER_ID, userRole: 'admin' }))
      .rejects.toMatchObject({ code: 'SLUG_CONFLICT' })
  })

  it('reorder updates position + moduleId in transaction', async () => {
    dbMock.mockTransaction.mockImplementation(async (cb: any) => cb(dbMock.db))
    dbMock.mockUpdate.mockResolvedValue(undefined)
    const svc = await getService()
    await svc.reorder(COURSE_ID, [
      { id: LESSON_ID, position: 1, moduleId: 'm1' },
      { id: 'x', position: 2, moduleId: 'm1' },
    ], { userId: TEST_USER_ID, userRole: 'admin' })
    expect(dbMock.db.update).toHaveBeenCalledTimes(2)
  })
})
```

- [ ] **Step 2: Test laufen lassen — fail**

Run: `npx vitest run src/__tests__/unit/services/course-lesson.service.test.ts`
Expected: FAIL.

- [ ] **Step 3: Service implementieren**

Datei `src/lib/services/course-lesson.service.ts`:

```ts
import { db } from '@/lib/db'
import { courseLessons } from '@/lib/db/schema'
import type { CourseLesson } from '@/lib/db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { AuditLogService } from './audit-log.service'
import type { Actor } from './course.service'

export interface CourseLessonCreateInput {
  title: string
  slug?: string
  moduleId?: string | null
  contentMarkdown?: string | null
  videoAssetId?: string | null
  videoExternalUrl?: string | null
  durationMinutes?: number | null
}
export interface CourseLessonUpdateInput extends Partial<CourseLessonCreateInput> {}
export class CourseLessonError extends Error {
  constructor(public code: string, message: string) { super(message) }
}

function slugify(input: string): string {
  return input.toLowerCase()
    .replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,160) || 'lektion'
}

export const CourseLessonService = {
  async listByCourse(courseId: string): Promise<CourseLesson[]> {
    return db.select().from(courseLessons)
      .where(eq(courseLessons.courseId, courseId))
      .orderBy(courseLessons.position)
  },

  async get(id: string): Promise<CourseLesson | null> {
    const [row] = await db.select().from(courseLessons).where(eq(courseLessons.id, id)).limit(1)
    return row ?? null
  },

  async create(courseId: string, input: CourseLessonCreateInput, actor: Actor): Promise<CourseLesson> {
    const slug = (input.slug ?? slugify(input.title)).trim()
    const dup = await db.select().from(courseLessons)
      .where(and(eq(courseLessons.courseId, courseId), eq(courseLessons.slug, slug))).limit(1)
    if (dup.length > 0) throw new CourseLessonError('SLUG_CONFLICT', `Slug '${slug}' im Kurs vergeben`)

    const [{ max }] = await db.select({
      max: sql<number>`coalesce(max(${courseLessons.position}), 0)`,
    }).from(courseLessons).where(eq(courseLessons.courseId, courseId))

    const [row] = await db.insert(courseLessons).values({
      courseId, moduleId: input.moduleId ?? null, slug, title: input.title,
      contentMarkdown: input.contentMarkdown ?? null,
      videoAssetId: input.videoAssetId ?? null,
      videoExternalUrl: input.videoExternalUrl ?? null,
      durationMinutes: input.durationMinutes ?? null,
      position: (max ?? 0) + 1,
    }).returning()
    await AuditLogService.log({
      userId: actor.userId, userRole: actor.userRole,
      action: 'course_lesson.created', entityType: 'course_lesson', entityId: row.id,
      payload: { courseId, title: input.title, slug },
    })
    return row
  },

  async update(id: string, patch: CourseLessonUpdateInput, actor: Actor): Promise<CourseLesson> {
    const existing = await this.get(id)
    if (!existing) throw new CourseLessonError('NOT_FOUND', `Lektion ${id} nicht gefunden`)

    if (patch.slug && patch.slug !== existing.slug) {
      const dup = await db.select().from(courseLessons)
        .where(and(eq(courseLessons.courseId, existing.courseId), eq(courseLessons.slug, patch.slug)))
        .limit(1)
      if (dup.length > 0) throw new CourseLessonError('SLUG_CONFLICT', `Slug '${patch.slug}' bereits vergeben`)
    }

    const update: Record<string, unknown> = { updatedAt: new Date() }
    for (const k of ['slug','title','moduleId','contentMarkdown','videoAssetId','videoExternalUrl','durationMinutes'] as const) {
      if (k in patch) update[k] = (patch as Record<string, unknown>)[k]
    }
    const [row] = await db.update(courseLessons).set(update).where(eq(courseLessons.id, id)).returning()
    await AuditLogService.log({
      userId: actor.userId, userRole: actor.userRole,
      action: 'course_lesson.updated', entityType: 'course_lesson', entityId: id,
      payload: { changes: Object.keys(update).filter(k => k !== 'updatedAt') },
    })
    return row
  },

  async delete(id: string, actor: Actor): Promise<void> {
    await db.delete(courseLessons).where(eq(courseLessons.id, id))
    await AuditLogService.log({
      userId: actor.userId, userRole: actor.userRole,
      action: 'course_lesson.deleted', entityType: 'course_lesson', entityId: id, payload: {},
    })
  },

  async reorder(courseId: string,
    items: { id: string; position: number; moduleId?: string | null }[],
    actor: Actor): Promise<void> {
    await db.transaction(async (tx) => {
      for (const it of items) {
        const set: Record<string, unknown> = { position: it.position, updatedAt: new Date() }
        if ('moduleId' in it) set.moduleId = it.moduleId ?? null
        await tx.update(courseLessons).set(set)
          .where(and(eq(courseLessons.id, it.id), eq(courseLessons.courseId, courseId)))
      }
    })
    await AuditLogService.log({
      userId: actor.userId, userRole: actor.userRole,
      action: 'course_lesson.reordered', entityType: 'course', entityId: courseId,
      payload: { items },
    })
  },
}
```

- [ ] **Step 4: Test laufen lassen — pass**

Run: `npx vitest run src/__tests__/unit/services/course-lesson.service.test.ts`
Expected: 3 passing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/course-lesson.service.ts src/__tests__/unit/services/course-lesson.service.test.ts
git commit -m "feat(elearning): CourseLessonService with per-course slug + reorder"
```

---

### Task 7: `course-asset.service.ts`

**Files:**
- Create: `src/lib/services/course-asset.service.ts`
- Create: `src/__tests__/unit/services/course-asset.service.test.ts`

- [ ] **Step 1: Failing test schreiben**

Datei `src/__tests__/unit/services/course-asset.service.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'
import { TEST_USER_ID } from '../../helpers/fixtures'
import path from 'path'
import os from 'os'
import fs from 'fs/promises'

const COURSE_ID = '00000000-0000-0000-0000-0000000000c1'
const LESSON_ID = '00000000-0000-0000-0000-0000000000e1'
const ASSET_ID  = '00000000-0000-0000-0000-0000000000f1'

function assetFixture(o: Record<string, unknown> = {}) {
  return {
    id: ASSET_ID, courseId: COURSE_ID, lessonId: LESSON_ID,
    kind: 'video', filename: 'abc.mp4', originalName: 'lesson.mp4',
    mimeType: 'video/mp4', sizeBytes: 1024,
    path: `${COURSE_ID}/${ASSET_ID}.mp4`,
    label: null, position: null, uploadedBy: TEST_USER_ID,
    createdAt: new Date(), ...o,
  }
}

function fakeFile(name: string, type: string, size = 1024): File {
  const buf = new Uint8Array(size)
  return new File([buf], name, { type })
}

describe('CourseAssetService', () => {
  let dbMock: ReturnType<typeof setupDbMock>
  let tmpDir: string

  beforeEach(async () => {
    vi.resetModules()
    dbMock = setupDbMock()
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'course-assets-'))
    process.env.COURSE_ASSET_DIR = tmpDir
    vi.doMock('@/lib/services/audit-log.service', () => ({
      AuditLogService: { log: vi.fn().mockResolvedValue(undefined) },
    }))
  })

  async function getService() {
    return (await import('@/lib/services/course-asset.service')).CourseAssetService
  }

  it('rejects video with unsupported MIME', async () => {
    const svc = await getService()
    await expect(svc.uploadForLesson(LESSON_ID, COURSE_ID,
      fakeFile('x.exe', 'application/x-msdownload'), 'video', undefined,
      { userId: TEST_USER_ID, userRole: 'admin' }))
      .rejects.toMatchObject({ code: 'INVALID_MIME' })
  })

  it('rejects file too large', async () => {
    process.env.COURSE_ASSET_VIDEO_MAX_MB = '0'
    const svc = await getService()
    await expect(svc.uploadForLesson(LESSON_ID, COURSE_ID,
      fakeFile('x.mp4', 'video/mp4'), 'video', undefined,
      { userId: TEST_USER_ID, userRole: 'admin' }))
      .rejects.toMatchObject({ code: 'FILE_TOO_LARGE' })
  })

  it('writes file to disk + DB row on valid upload', async () => {
    dbMock.mockInsert.mockResolvedValue([assetFixture()])
    const svc = await getService()
    const result = await svc.uploadForLesson(LESSON_ID, COURSE_ID,
      fakeFile('lesson.mp4', 'video/mp4'), 'video', undefined,
      { userId: TEST_USER_ID, userRole: 'admin' })
    expect(result.id).toBe(ASSET_ID)
    expect(dbMock.db.insert).toHaveBeenCalled()
  })

  it('resolveAbsolutePath rejects path traversal', async () => {
    const svc = await getService()
    expect(() => svc.resolveAbsolutePath(assetFixture({ path: '../../etc/passwd' }) as never))
      .toThrow(/PATH_TRAVERSAL/)
  })

  it('delete removes DB row + file (no throw on missing file)', async () => {
    dbMock.mockSelect.mockResolvedValueOnce([assetFixture()])
    dbMock.mockDelete.mockResolvedValue(undefined)
    const svc = await getService()
    await svc.delete(ASSET_ID, { userId: TEST_USER_ID, userRole: 'admin' })
    expect(dbMock.db.delete).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Test laufen lassen — fail**

Run: `npx vitest run src/__tests__/unit/services/course-asset.service.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Service implementieren**

Datei `src/lib/services/course-asset.service.ts`:

```ts
import { db } from '@/lib/db'
import { courseAssets } from '@/lib/db/schema'
import type { CourseAsset } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { AuditLogService } from './audit-log.service'
import type { Actor } from './course.service'
import { logger } from '@/lib/utils/logger'
import path from 'path'
import { randomUUID } from 'crypto'

const VIDEO_MIMES = ['video/mp4', 'video/webm', 'video/quicktime']
const DOC_MIMES = [
  'application/pdf', 'application/zip',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]

function videoMaxBytes(): number {
  return Number(process.env.COURSE_ASSET_VIDEO_MAX_MB ?? 2048) * 1024 * 1024
}
function docMaxBytes(): number {
  return Number(process.env.COURSE_ASSET_DOC_MAX_MB ?? 50) * 1024 * 1024
}
function assetDir(): string {
  return process.env.COURSE_ASSET_DIR
    ?? path.join(process.cwd(), 'public', 'uploads', 'courses')
}

export class CourseAssetError extends Error {
  constructor(public code: string, message: string) { super(message) }
}

export type CourseAssetKind = 'video' | 'document'

export const CourseAssetService = {
  async uploadForLesson(
    lessonId: string, courseId: string, file: File, kind: CourseAssetKind,
    label: string | undefined, actor: Actor,
  ): Promise<CourseAsset> {
    const allowed = kind === 'video' ? VIDEO_MIMES : DOC_MIMES
    if (!allowed.includes(file.type)) {
      throw new CourseAssetError('INVALID_MIME', `MIME ${file.type} nicht erlaubt für ${kind}`)
    }
    const max = kind === 'video' ? videoMaxBytes() : docMaxBytes()
    if (file.size > max) {
      throw new CourseAssetError('FILE_TOO_LARGE', `Datei ${file.size} > Max ${max} bytes`)
    }

    const id = randomUUID()
    const ext = path.extname(file.name) || ''
    const relative = path.posix.join(courseId, `${id}${ext}`)
    const absolute = path.join(assetDir(), relative)

    const { mkdir, writeFile } = await import('fs/promises')
    await mkdir(path.dirname(absolute), { recursive: true })
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(absolute, buffer)

    const [row] = await db.insert(courseAssets).values({
      id, courseId, lessonId, kind,
      filename: `${id}${ext}`, originalName: file.name,
      mimeType: file.type, sizeBytes: file.size,
      path: relative, label: label ?? null,
      uploadedBy: actor.userId,
    }).returning()

    await AuditLogService.log({
      userId: actor.userId, userRole: actor.userRole,
      action: 'course_asset.uploaded', entityType: 'course_asset', entityId: row.id,
      payload: { lessonId, courseId, kind, sizeBytes: file.size, mime: file.type },
    })
    return row
  },

  async listByLesson(lessonId: string): Promise<CourseAsset[]> {
    return db.select().from(courseAssets).where(eq(courseAssets.lessonId, lessonId)).orderBy(courseAssets.position)
  },

  async listByCourse(courseId: string): Promise<CourseAsset[]> {
    return db.select().from(courseAssets).where(eq(courseAssets.courseId, courseId))
  },

  async get(id: string): Promise<CourseAsset | null> {
    const [row] = await db.select().from(courseAssets).where(eq(courseAssets.id, id)).limit(1)
    return row ?? null
  },

  async delete(id: string, actor: Actor): Promise<void> {
    const existing = await this.get(id)
    if (!existing) throw new CourseAssetError('NOT_FOUND', `Asset ${id} nicht gefunden`)
    await db.delete(courseAssets).where(eq(courseAssets.id, id))
    try {
      const { unlink } = await import('fs/promises')
      await unlink(this.resolveAbsolutePath(existing))
    } catch (err) {
      logger.warn('Asset-Datei beim Löschen nicht gefunden', { module: 'CourseAssetService', id, err })
    }
    await AuditLogService.log({
      userId: actor.userId, userRole: actor.userRole,
      action: 'course_asset.deleted', entityType: 'course_asset', entityId: id,
      payload: { path: existing.path },
    })
  },

  resolveAbsolutePath(asset: CourseAsset): string {
    const base = path.resolve(assetDir())
    const candidate = path.resolve(base, asset.path)
    if (!candidate.startsWith(base + path.sep) && candidate !== base) {
      throw new CourseAssetError('PATH_TRAVERSAL', `Pfad verlässt Asset-Verzeichnis: ${asset.path}`)
    }
    return candidate
  },
}
```

- [ ] **Step 4: Test laufen lassen — pass**

Run: `npx vitest run src/__tests__/unit/services/course-asset.service.test.ts`
Expected: 5 passing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/course-asset.service.ts src/__tests__/unit/services/course-asset.service.test.ts
git commit -m "feat(elearning): CourseAssetService — upload/serve/delete with traversal guard"
```

---

### Task 8: `course-publish.service.ts`

**Files:**
- Create: `src/lib/services/course-publish.service.ts`
- Create: `src/__tests__/unit/services/course-publish.service.test.ts`

- [ ] **Step 1: Failing test schreiben**

Datei `src/__tests__/unit/services/course-publish.service.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'
import { TEST_USER_ID } from '../../helpers/fixtures'

const COURSE_ID = '00000000-0000-0000-0000-0000000000c1'

function courseFixture(o: Record<string, unknown> = {}) {
  return {
    id: COURSE_ID, slug: 'kurs-1', title: 'Kurs 1', subtitle: null, description: 'Kurzbeschreibung',
    coverImageId: null, visibility: 'portal', status: 'draft',
    useModules: false, enforceSequential: false, estimatedMinutes: null,
    createdBy: TEST_USER_ID, publishedAt: null,
    createdAt: new Date(), updatedAt: new Date(), ...o,
  }
}

function lesson(o: Record<string, unknown> = {}) {
  return {
    id: 'l1', courseId: COURSE_ID, moduleId: null, position: 1,
    slug: 'l1', title: 'L1', contentMarkdown: 'Hi',
    videoAssetId: null, videoExternalUrl: null, durationMinutes: null,
    createdAt: new Date(), updatedAt: new Date(), ...o,
  }
}

describe('CoursePublishService', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
    vi.doMock('@/lib/services/audit-log.service', () => ({
      AuditLogService: { log: vi.fn().mockResolvedValue(undefined) },
    }))
  })

  async function svc() {
    return (await import('@/lib/services/course-publish.service')).CoursePublishService
  }

  it('rejects publish when course has no lessons', async () => {
    dbMock.mockSelect.mockResolvedValueOnce([courseFixture()])      // course
    dbMock.mockSelect.mockResolvedValueOnce([])                      // lessons
    dbMock.mockSelect.mockResolvedValueOnce([])                      // modules
    dbMock.mockSelect.mockResolvedValueOnce([])                      // assets
    const s = await svc()
    await expect(s.publish(COURSE_ID, { userId: TEST_USER_ID, userRole: 'admin' }))
      .rejects.toMatchObject({ code: 'PUBLISH_VALIDATION' })
  })

  it('rejects when public visibility but no description', async () => {
    dbMock.mockSelect.mockResolvedValueOnce([courseFixture({ visibility: 'public', description: null })])
    dbMock.mockSelect.mockResolvedValueOnce([lesson()])
    dbMock.mockSelect.mockResolvedValueOnce([])
    dbMock.mockSelect.mockResolvedValueOnce([])
    const s = await svc()
    await expect(s.publish(COURSE_ID, { userId: TEST_USER_ID, userRole: 'admin' }))
      .rejects.toMatchObject({ code: 'PUBLISH_VALIDATION' })
  })

  it('publishes valid course and sets publishedAt', async () => {
    dbMock.mockSelect.mockResolvedValueOnce([courseFixture()])
    dbMock.mockSelect.mockResolvedValueOnce([lesson()])
    dbMock.mockSelect.mockResolvedValueOnce([])
    dbMock.mockSelect.mockResolvedValueOnce([])
    dbMock.mockUpdate.mockResolvedValue([courseFixture({ status: 'published', publishedAt: new Date() })])
    const s = await svc()
    const r = await s.publish(COURSE_ID, { userId: TEST_USER_ID, userRole: 'admin' })
    expect(r.status).toBe('published')
    expect(r.publishedAt).not.toBeNull()
  })
})
```

- [ ] **Step 2: Test laufen lassen — fail**

Run: `npx vitest run src/__tests__/unit/services/course-publish.service.test.ts`
Expected: FAIL.

- [ ] **Step 3: Service implementieren**

Datei `src/lib/services/course-publish.service.ts`:

```ts
import { db } from '@/lib/db'
import { courses, courseLessons, courseModules, courseAssets } from '@/lib/db/schema'
import type { Course } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { AuditLogService } from './audit-log.service'
import type { Actor } from './course.service'

export interface PublishProblem {
  lessonId?: string
  code: string
  message: string
}

export class PublishValidationError extends Error {
  code = 'PUBLISH_VALIDATION'
  constructor(public details: PublishProblem[]) {
    super(`Kurs nicht publish-fähig (${details.length} Problem(e))`)
  }
}

export const CoursePublishService = {
  async publish(courseId: string, actor: Actor): Promise<Course> {
    const [course] = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1)
    if (!course) throw new PublishValidationError([{ code: 'NOT_FOUND', message: `Kurs ${courseId} nicht gefunden` }])

    const lessons = await db.select().from(courseLessons).where(eq(courseLessons.courseId, courseId))
    const modules = await db.select().from(courseModules).where(eq(courseModules.courseId, courseId))
    const assets  = await db.select().from(courseAssets).where(eq(courseAssets.courseId, courseId))
    const lessonAssetCount = new Map<string, number>()
    for (const a of assets) if (a.lessonId) lessonAssetCount.set(a.lessonId, (lessonAssetCount.get(a.lessonId) ?? 0) + 1)

    const problems: PublishProblem[] = []

    if (!course.slug) problems.push({ code: 'COURSE_SLUG_MISSING', message: 'Kurs hat keinen Slug' })
    if (course.visibility === 'public' && !course.description) {
      problems.push({ code: 'DESCRIPTION_REQUIRED', message: 'Public-Kurse brauchen eine Beschreibung' })
    }
    if (lessons.length === 0) {
      problems.push({ code: 'NO_LESSONS', message: 'Kurs hat keine Lektionen' })
    }
    if (course.useModules && modules.length === 0) {
      problems.push({ code: 'NO_MODULES', message: 'useModules=true aber keine Module vorhanden' })
    }

    for (const l of lessons) {
      if (!l.title) problems.push({ lessonId: l.id, code: 'LESSON_TITLE_MISSING', message: 'Lektion ohne Titel' })
      if (!l.slug) problems.push({ lessonId: l.id, code: 'LESSON_SLUG_MISSING', message: 'Lektion ohne Slug' })
      const hasContent = !!(l.contentMarkdown || l.videoAssetId || l.videoExternalUrl || (lessonAssetCount.get(l.id) ?? 0) > 0)
      if (!hasContent) {
        problems.push({ lessonId: l.id, code: 'LESSON_EMPTY', message: `Lektion '${l.title}' hat keinen Inhalt` })
      }
      if (course.useModules && !l.moduleId) {
        problems.push({ lessonId: l.id, code: 'LESSON_NO_MODULE', message: `Lektion '${l.title}' keinem Modul zugeordnet` })
      }
    }

    if (problems.length > 0) throw new PublishValidationError(problems)

    const [row] = await db.update(courses)
      .set({ status: 'published', publishedAt: new Date(), updatedAt: new Date() })
      .where(eq(courses.id, courseId)).returning()

    await AuditLogService.log({
      userId: actor.userId, userRole: actor.userRole,
      action: 'course.published', entityType: 'course', entityId: courseId,
      payload: { lessonCount: lessons.length, moduleCount: modules.length },
    })
    return row
  },
}
```

- [ ] **Step 4: Test laufen lassen — pass**

Run: `npx vitest run src/__tests__/unit/services/course-publish.service.test.ts`
Expected: 3 passing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/course-publish.service.ts src/__tests__/unit/services/course-publish.service.test.ts
git commit -m "feat(elearning): CoursePublishService with collected validation"
```

---

## Pakets-Abschluss & Übergabe

- [ ] **Final-Check: alle Service-Tests laufen**

Run: `npx vitest run src/__tests__/unit/services/course*.test.ts`
Expected: alle 18+ Tests grün.

- [ ] **Commit Plan-Datei dieses Pakets** (falls noch nicht committet)

```bash
git add docs/superpowers/plans/2026-04-26-onlinekurse-sub1-core-authoring.md
git commit -m "docs(elearning): plan 1a foundation + services"
```

**Nächstes Paket:** `docs/superpowers/plans/2026-04-26-onlinekurse-sub1b-api.md` — API-Routen.
