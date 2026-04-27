# Onlinekurse Sub-2b — Lesson Content Blocks — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polymorphes Block-System (Markdown + CMS-Blocks) für Onlinekurs-Lektionen — Author kann freie Block-Liste pro Lesson editieren, Player rendert sie in Position-Reihenfolge.

**Architecture:** Read service `CourseLessonBlockService` über die in main bereits angelegte `course_lesson_blocks`-Tabelle (polymorph: `kind ∈ {markdown, cms_block}`). REST-Endpoints unter `/api/v1/courses/[id]/lessons/[lessonId]/blocks/...`. Geteilte Komponenten: 6 neue Course-Block-Komponenten erweitern den bestehenden `CmsBlockRenderer`-Switch; ein neuer `LessonContentRenderer` mappt Block-Liste auf Markdown-Renderer bzw. `CmsBlockRenderer`. Editor-UX: Block-Listen-Editor mit `@dnd-kit` (Pattern aus Sub-1) ersetzt die einzelne Markdown-Textarea.

**Tech Stack:** Next.js 15 (App Router), Drizzle, Vitest, react-markdown, react-syntax-highlighter (NEU), shadcn-Primitives (Alert, Card, Tabs, Accordion, Sheet), `@dnd-kit`, sonner.

**Spec:** `docs/superpowers/specs/2026-04-27-onlinekurse-sub2b-content-blocks-design.md`

**Voraussetzung:**
- Sub-1 + Sub-2 sind in main gemerged.
- DB-Migrations 017 + 018 sind in main committed (`1746fabd`, `08101c1d`) — `course_lesson_blocks`-Tabelle, `cms_block_type_definitions.available_in_lessons`, 6 neue Block-Typen + 12 System-Templates sind beim nächsten Deploy automatisch da. `schema.ts` enthält bereits `courseLessonBlocks` und das `availableInLessons`-Feld.

---

## Task 1: Validation-Schemas für Lesson-Blocks

**Files:**
- Modify: `src/lib/utils/validation.ts`
- Create: `src/__tests__/unit/validation/lesson-block.validation.test.ts`

- [ ] **Step 1: Failing tests schreiben**

Datei `src/__tests__/unit/validation/lesson-block.validation.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  createLessonBlockSchema,
  updateLessonBlockSchema,
  reorderLessonBlocksSchema,
} from '@/lib/utils/validation'

describe('createLessonBlockSchema', () => {
  it('accepts valid markdown block', () => {
    const r = createLessonBlockSchema.safeParse({ kind: 'markdown', markdownBody: '# Hi' })
    expect(r.success).toBe(true)
  })

  it('accepts valid cms_block', () => {
    const r = createLessonBlockSchema.safeParse({ kind: 'cms_block', blockType: 'course-callout' })
    expect(r.success).toBe(true)
  })

  it('rejects markdown without markdownBody', () => {
    const r = createLessonBlockSchema.safeParse({ kind: 'markdown' })
    expect(r.success).toBe(false)
  })

  it('rejects cms_block without blockType', () => {
    const r = createLessonBlockSchema.safeParse({ kind: 'cms_block' })
    expect(r.success).toBe(false)
  })

  it('rejects unknown kind', () => {
    const r = createLessonBlockSchema.safeParse({ kind: 'banana', markdownBody: 'x' })
    expect(r.success).toBe(false)
  })

  it('accepts optional position', () => {
    const r = createLessonBlockSchema.safeParse({ kind: 'markdown', markdownBody: 'x', position: 5 })
    expect(r.success).toBe(true)
  })
})

describe('updateLessonBlockSchema', () => {
  it('accepts partial update', () => {
    const r = updateLessonBlockSchema.safeParse({ markdownBody: 'new' })
    expect(r.success).toBe(true)
  })

  it('accepts isVisible toggle', () => {
    const r = updateLessonBlockSchema.safeParse({ isVisible: false })
    expect(r.success).toBe(true)
  })

  it('accepts content + settings', () => {
    const r = updateLessonBlockSchema.safeParse({
      content: { variant: 'tip', body: 'x' },
      settings: { backgroundColor: '#fff' },
    })
    expect(r.success).toBe(true)
  })
})

describe('reorderLessonBlocksSchema', () => {
  it('accepts valid array', () => {
    const r = reorderLessonBlocksSchema.safeParse([
      { id: '00000000-0000-0000-0000-000000000001', position: 1 },
      { id: '00000000-0000-0000-0000-000000000002', position: 2 },
    ])
    expect(r.success).toBe(true)
  })

  it('rejects non-uuid id', () => {
    const r = reorderLessonBlocksSchema.safeParse([{ id: 'not-a-uuid', position: 1 }])
    expect(r.success).toBe(false)
  })

  it('rejects negative position', () => {
    const r = reorderLessonBlocksSchema.safeParse([
      { id: '00000000-0000-0000-0000-000000000001', position: -1 },
    ])
    expect(r.success).toBe(false)
  })
})
```

- [ ] **Step 2: Run failing test**

Run: `npx vitest run src/__tests__/unit/validation/lesson-block.validation.test.ts`
Expected: FAIL — schemas not exported.

- [ ] **Step 3: Schemas in `src/lib/utils/validation.ts` ergänzen**

Am Ende der Datei (nach den bestehenden Onlinekurs-Schemas aus Sub-1) einfügen:

```ts
// Lesson Content Blocks (Sub-2b)

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

- [ ] **Step 4: Run tests — pass**

Run: `npx vitest run src/__tests__/unit/validation/lesson-block.validation.test.ts`
Expected: 12 passing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/validation.ts src/__tests__/unit/validation/lesson-block.validation.test.ts
git commit -m "feat(elearning): zod schemas for lesson-block CRUD + reorder"
```

---

## Task 2: `CourseLessonBlockService` (Service-Layer)

**Files:**
- Create: `src/lib/services/course-lesson-block.service.ts`
- Create: `src/__tests__/unit/services/course-lesson-block.service.test.ts`

- [ ] **Step 1: Failing test schreiben**

Datei `src/__tests__/unit/services/course-lesson-block.service.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'
import { TEST_USER_ID } from '../../helpers/fixtures'

const LESSON_ID = '00000000-0000-0000-0000-0000000000e1'
const BLOCK_ID  = '00000000-0000-0000-0000-0000000000b1'

function blockFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: BLOCK_ID, lessonId: LESSON_ID, position: 1, kind: 'markdown',
    markdownBody: '# Hi', blockType: null, content: {}, settings: {},
    isVisible: true, createdAt: new Date(), updatedAt: new Date(), ...overrides,
  }
}

describe('CourseLessonBlockService', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
    vi.doMock('@/lib/services/audit-log.service', () => ({
      AuditLogService: { log: vi.fn().mockResolvedValue(undefined) },
    }))
  })

  async function getSvc() {
    const mod = await import('@/lib/services/course-lesson-block.service')
    return mod.CourseLessonBlockService
  }

  describe('listByLesson', () => {
    it('returns sorted list', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([blockFixture()])
      const svc = await getSvc()
      const result = await svc.listByLesson(LESSON_ID)
      expect(result).toHaveLength(1)
    })
  })

  describe('create', () => {
    it('creates markdown block with auto position', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([{ max: 2 }])
      dbMock.mockInsert.mockResolvedValue([blockFixture({ position: 3 })])
      const svc = await getSvc()
      const result = await svc.create(LESSON_ID,
        { kind: 'markdown', markdownBody: '# Hi' },
        { userId: TEST_USER_ID, userRole: 'admin' })
      expect(result.kind).toBe('markdown')
    })

    it('creates cms_block with content', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([{ max: 0 }])
      dbMock.mockInsert.mockResolvedValue([blockFixture({
        kind: 'cms_block', markdownBody: null, blockType: 'course-callout',
        content: { variant: 'tip', body: 'x' },
      })])
      const svc = await getSvc()
      const result = await svc.create(LESSON_ID,
        { kind: 'cms_block', blockType: 'course-callout', content: { variant: 'tip', body: 'x' } },
        { userId: TEST_USER_ID, userRole: 'admin' })
      expect(result.blockType).toBe('course-callout')
    })

    it('respects explicit position', async () => {
      dbMock.mockInsert.mockResolvedValue([blockFixture({ position: 5 })])
      const svc = await getSvc()
      const result = await svc.create(LESSON_ID,
        { kind: 'markdown', markdownBody: 'x', position: 5 },
        { userId: TEST_USER_ID, userRole: 'admin' })
      expect(result.position).toBe(5)
    })
  })

  describe('update', () => {
    it('updates markdownBody', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([blockFixture()])
      dbMock.mockUpdate.mockResolvedValue([blockFixture({ markdownBody: '# Updated' })])
      const svc = await getSvc()
      const result = await svc.update(BLOCK_ID,
        { markdownBody: '# Updated' },
        { userId: TEST_USER_ID, userRole: 'admin' })
      expect(result.markdownBody).toBe('# Updated')
    })

    it('throws NOT_FOUND when block missing', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      const svc = await getSvc()
      await expect(svc.update(BLOCK_ID, { markdownBody: 'x' },
        { userId: TEST_USER_ID, userRole: 'admin' }))
        .rejects.toMatchObject({ code: 'NOT_FOUND' })
    })
  })

  describe('delete', () => {
    it('deletes block', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([blockFixture()])
      dbMock.mockDelete.mockResolvedValue(undefined)
      const svc = await getSvc()
      await svc.delete(BLOCK_ID, { userId: TEST_USER_ID, userRole: 'admin' })
      expect(dbMock.db.delete).toHaveBeenCalled()
    })
  })

  describe('reorder', () => {
    it('updates positions in transaction', async () => {
      dbMock.mockUpdate.mockResolvedValue(undefined)
      const svc = await getSvc()
      await svc.reorder(LESSON_ID,
        [{ id: BLOCK_ID, position: 2 }],
        { userId: TEST_USER_ID, userRole: 'admin' })
      expect(dbMock.mockTransaction).toHaveBeenCalled()
    })
  })
})
```

- [ ] **Step 2: Run failing test**

Run: `npx vitest run src/__tests__/unit/services/course-lesson-block.service.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Service implementieren**

Datei `src/lib/services/course-lesson-block.service.ts`:

```ts
import { db } from '@/lib/db'
import { courseLessonBlocks } from '@/lib/db/schema'
import type { CourseLessonBlock } from '@/lib/db/schema'
import { eq, asc, sql } from 'drizzle-orm'
import { AuditLogService } from './audit-log.service'

export interface Actor { userId: string | null; userRole: string | null }

export type CreateBlockInput =
  | { kind: 'markdown'; markdownBody: string; position?: number }
  | {
      kind: 'cms_block'
      blockType: string
      content?: Record<string, unknown>
      settings?: Record<string, unknown>
      position?: number
    }

export interface UpdateBlockInput {
  markdownBody?: string | null
  content?: Record<string, unknown>
  settings?: Record<string, unknown>
  isVisible?: boolean
}

export class CourseLessonBlockError extends Error {
  constructor(public code: string, message: string) { super(message) }
}

export const CourseLessonBlockService = {
  async listByLesson(
    lessonId: string,
    opts: { includeHidden?: boolean } = {},
  ): Promise<CourseLessonBlock[]> {
    const rows = await db
      .select()
      .from(courseLessonBlocks)
      .where(eq(courseLessonBlocks.lessonId, lessonId))
      .orderBy(asc(courseLessonBlocks.position))
    return opts.includeHidden ? rows : rows.filter((b) => b.isVisible)
  },

  async create(
    lessonId: string,
    input: CreateBlockInput,
    actor: Actor,
  ): Promise<CourseLessonBlock> {
    let position = input.position
    if (position === undefined) {
      const [maxRow] = await db
        .select({ max: sql<number>`coalesce(max(position), 0)::int` })
        .from(courseLessonBlocks)
        .where(eq(courseLessonBlocks.lessonId, lessonId))
      position = (maxRow?.max ?? 0) + 1
    }

    const values = input.kind === 'markdown'
      ? {
          lessonId,
          position,
          kind: 'markdown' as const,
          markdownBody: input.markdownBody,
          blockType: null,
          content: {},
          settings: {},
        }
      : {
          lessonId,
          position,
          kind: 'cms_block' as const,
          markdownBody: null,
          blockType: input.blockType,
          content: input.content ?? {},
          settings: input.settings ?? {},
        }

    const [row] = await db.insert(courseLessonBlocks).values(values).returning()

    await AuditLogService.log({
      userId: actor.userId, userRole: actor.userRole,
      action: 'lesson.block.created', entityType: 'course_lesson_block', entityId: row.id,
      payload: { lessonId, kind: row.kind, blockType: row.blockType ?? null },
    })
    return row
  },

  async update(
    blockId: string,
    patch: UpdateBlockInput,
    actor: Actor,
  ): Promise<CourseLessonBlock> {
    const [existing] = await db
      .select().from(courseLessonBlocks).where(eq(courseLessonBlocks.id, blockId)).limit(1)
    if (!existing) throw new CourseLessonBlockError('NOT_FOUND', `Block ${blockId} nicht gefunden`)

    const update: Record<string, unknown> = { updatedAt: new Date() }
    if ('markdownBody' in patch) update.markdownBody = patch.markdownBody
    if ('content' in patch)      update.content      = patch.content
    if ('settings' in patch)     update.settings     = patch.settings
    if ('isVisible' in patch)    update.isVisible    = patch.isVisible

    const [row] = await db.update(courseLessonBlocks).set(update)
      .where(eq(courseLessonBlocks.id, blockId)).returning()

    await AuditLogService.log({
      userId: actor.userId, userRole: actor.userRole,
      action: 'lesson.block.updated', entityType: 'course_lesson_block', entityId: blockId,
      payload: { changes: Object.keys(update).filter((k) => k !== 'updatedAt') },
    })
    return row
  },

  async delete(blockId: string, actor: Actor): Promise<void> {
    const [existing] = await db
      .select().from(courseLessonBlocks).where(eq(courseLessonBlocks.id, blockId)).limit(1)
    if (!existing) throw new CourseLessonBlockError('NOT_FOUND', `Block ${blockId} nicht gefunden`)

    await db.delete(courseLessonBlocks).where(eq(courseLessonBlocks.id, blockId))
    await AuditLogService.log({
      userId: actor.userId, userRole: actor.userRole,
      action: 'lesson.block.deleted', entityType: 'course_lesson_block', entityId: blockId,
      payload: { lessonId: existing.lessonId, kind: existing.kind },
    })
  },

  async reorder(
    lessonId: string,
    items: Array<{ id: string; position: number }>,
    actor: Actor,
  ): Promise<void> {
    await db.transaction(async (tx) => {
      for (const item of items) {
        await tx.update(courseLessonBlocks)
          .set({ position: item.position, updatedAt: new Date() })
          .where(eq(courseLessonBlocks.id, item.id))
      }
    })
    await AuditLogService.log({
      userId: actor.userId, userRole: actor.userRole,
      action: 'lesson.block.reordered', entityType: 'course_lesson', entityId: lessonId,
      payload: { count: items.length },
    })
  },
}
```

- [ ] **Step 4: Run tests — pass**

Run: `npx vitest run src/__tests__/unit/services/course-lesson-block.service.test.ts`
Expected: 8 passing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/course-lesson-block.service.ts src/__tests__/unit/services/course-lesson-block.service.test.ts
git commit -m "feat(elearning): course-lesson-block service with CRUD + reorder + audit"
```

---

## Task 3: `CoursePublicService` Erweiterung — Lesson liefert Blocks

**Files:**
- Modify: `src/lib/services/course-public.service.ts`
- Modify: `src/__tests__/unit/services/course-public.service.test.ts`

- [ ] **Step 1: Failing test ergänzen**

Im bestehenden `course-public.service.test.ts` einen neuen Test im `getPublicLesson` describe-Block ergänzen:

```ts
it('includes blocks sorted by position with visibility filter', async () => {
  dbMock.mockSelect.mockResolvedValueOnce([courseFixture()])  // course
  dbMock.mockSelect.mockResolvedValueOnce([])                 // modules
  dbMock.mockSelect.mockResolvedValueOnce([                   // lessons
    { id: lessonId1, courseId: COURSE_ID, moduleId: null, position: 1, slug: 'a',
      title: 'a', contentMarkdown: null, videoAssetId: null, videoExternalUrl: null,
      durationMinutes: null, createdAt: new Date(), updatedAt: new Date() },
  ])
  dbMock.mockSelect.mockResolvedValueOnce([])                 // assets
  dbMock.mockSelect.mockResolvedValueOnce([                   // blocks
    { id: 'b1', lessonId: lessonId1, position: 1, kind: 'markdown', markdownBody: '# Hi',
      blockType: null, content: {}, settings: {}, isVisible: true,
      createdAt: new Date(), updatedAt: new Date() },
  ])
  const svc = await getSvc()
  const ctx = await svc.getPublicLesson('kurs-1', 'a')
  expect(ctx?.blocks).toHaveLength(1)
  expect(ctx?.blocks?.[0].kind).toBe('markdown')
})
```

- [ ] **Step 2: Run failing test**

Run: `npx vitest run src/__tests__/unit/services/course-public.service.test.ts`
Expected: FAIL — `ctx.blocks` undefined.

- [ ] **Step 3: Service-Erweiterung**

In `src/lib/services/course-public.service.ts`:

a) Import ergänzen:
```ts
import { courseLessonBlocks } from '@/lib/db/schema'
import type { CourseLessonBlock } from '@/lib/db/schema'
```

b) `PublicLessonContext`-Interface erweitern:
```ts
export interface PublicLessonContext {
  course: Course
  modules: CourseModule[]
  lessons: CourseLesson[]
  lesson: CourseLesson
  assets: CourseAsset[]
  blocks: CourseLessonBlock[]                   // NEU
  prev: { courseSlug: string; lessonSlug: string } | null
  next: { courseSlug: string; lessonSlug: string } | null
}
```

c) In `getLessonBySurface` nach dem Asset-Load ergänzen:
```ts
const blocks = await db
  .select()
  .from(courseLessonBlocks)
  .where(and(
    eq(courseLessonBlocks.lessonId, lesson.id),
    eq(courseLessonBlocks.isVisible, true),
  ))
  .orderBy(asc(courseLessonBlocks.position))
```

d) `asc` aus `drizzle-orm` importieren falls noch nicht (sonst sortBy `courseLessonBlocks.position` wie bisher mit `desc()`-Pattern).

e) Im Return-Object `blocks` ergänzen.

- [ ] **Step 4: Run tests — pass**

Run: `npx vitest run src/__tests__/unit/services/course-public.service.test.ts`
Expected: alle bestehenden + neuer = 10 passing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/course-public.service.ts src/__tests__/unit/services/course-public.service.test.ts
git commit -m "feat(elearning): getPublicLesson/getPortalLesson include sorted blocks"
```

---

## Task 4: API-Routen — `/blocks` GET + POST

**Files:**
- Create: `src/app/api/v1/courses/[id]/lessons/[lessonId]/blocks/route.ts`
- Create: `src/__tests__/integration/api/course-lesson-blocks.route.test.ts`

- [ ] **Step 1: Failing test schreiben**

Datei `src/__tests__/integration/api/course-lesson-blocks.route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'
import { mockAuthContext } from '../../helpers/mock-auth'
import { createTestRequest, createTestParams } from '../../helpers/mock-request'
import { authFixture } from '../../helpers/fixtures'

const COURSE_ID = '00000000-0000-0000-0000-0000000000c1'
const LESSON_ID = '00000000-0000-0000-0000-0000000000e1'
const BLOCK_ID  = '00000000-0000-0000-0000-0000000000b1'

describe('GET /api/v1/courses/[id]/lessons/[lessonId]/blocks', () => {
  beforeEach(() => {
    vi.resetModules()
    setupDbMock()
    mockAuthContext(authFixture())
    vi.doMock('@/lib/services/course-lesson-block.service', () => ({
      CourseLessonBlockService: {
        listByLesson: vi.fn().mockResolvedValue([
          { id: BLOCK_ID, lessonId: LESSON_ID, position: 1, kind: 'markdown',
            markdownBody: '# Hi', isVisible: true },
        ]),
      },
      CourseLessonBlockError: class extends Error { code = '' },
    }))
  })

  it('returns block list', async () => {
    const { GET } = await import('@/app/api/v1/courses/[id]/lessons/[lessonId]/blocks/route')
    const res = await GET(createTestRequest('GET', '/x'),
      { params: createTestParams({ id: COURSE_ID, lessonId: LESSON_ID }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
  })
})

describe('POST /api/v1/courses/[id]/lessons/[lessonId]/blocks', () => {
  beforeEach(() => {
    vi.resetModules()
    setupDbMock()
    mockAuthContext(authFixture())
    vi.doMock('@/lib/services/course-lesson-block.service', () => ({
      CourseLessonBlockService: {
        create: vi.fn().mockResolvedValue({
          id: BLOCK_ID, lessonId: LESSON_ID, position: 1, kind: 'markdown',
          markdownBody: '# Hi',
        }),
      },
      CourseLessonBlockError: class extends Error { code = '' },
    }))
  })

  it('returns 201 on valid markdown block', async () => {
    const { POST } = await import('@/app/api/v1/courses/[id]/lessons/[lessonId]/blocks/route')
    const res = await POST(
      createTestRequest('POST', '/x', { kind: 'markdown', markdownBody: '# Hi' }),
      { params: createTestParams({ id: COURSE_ID, lessonId: LESSON_ID }) })
    expect(res.status).toBe(201)
  })

  it('returns 400 on invalid kind', async () => {
    const { POST } = await import('@/app/api/v1/courses/[id]/lessons/[lessonId]/blocks/route')
    const res = await POST(
      createTestRequest('POST', '/x', { kind: 'banana' }),
      { params: createTestParams({ id: COURSE_ID, lessonId: LESSON_ID }) })
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 2: Run failing test**

Run: `npx vitest run src/__tests__/integration/api/course-lesson-blocks.route.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Route implementieren**

Datei `src/app/api/v1/courses/[id]/lessons/[lessonId]/blocks/route.ts`:

```ts
import { NextRequest } from 'next/server'
import { apiSuccess, apiValidationError, apiServerError } from '@/lib/utils/api-response'
import { createLessonBlockSchema, validateAndParse, formatZodErrors } from '@/lib/utils/validation'
import { CourseLessonBlockService } from '@/lib/services/course-lesson-block.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

interface Ctx { params: Promise<{ id: string; lessonId: string }> }

export async function GET(request: NextRequest, ctx: Ctx) {
  return withPermission(request, 'courses', 'read', async () => {
    try {
      const { lessonId } = await ctx.params
      const blocks = await CourseLessonBlockService.listByLesson(lessonId, { includeHidden: true })
      return apiSuccess(blocks)
    } catch (err) {
      logger.error('Block list failed', err, { module: 'CourseLessonBlocksAPI' })
      return apiServerError()
    }
  })
}

export async function POST(request: NextRequest, ctx: Ctx) {
  return withPermission(request, 'courses', 'update', async (auth) => {
    try {
      const { lessonId } = await ctx.params
      const body = await request.json()
      const v = validateAndParse(createLessonBlockSchema, body)
      if (!v.success) return apiValidationError(formatZodErrors(v.errors))
      const block = await CourseLessonBlockService.create(lessonId, v.data,
        { userId: auth.userId, userRole: auth.role ?? null })
      return apiSuccess(block, undefined, 201)
    } catch (err) {
      logger.error('Block create failed', err, { module: 'CourseLessonBlocksAPI' })
      return apiServerError()
    }
  })
}
```

- [ ] **Step 4: Run tests — pass**

Run: `npx vitest run src/__tests__/integration/api/course-lesson-blocks.route.test.ts`
Expected: 3 passing.

- [ ] **Step 5: Commit**

```bash
git add "src/app/api/v1/courses/[id]/lessons/[lessonId]/blocks" src/__tests__/integration/api/course-lesson-blocks.route.test.ts
git commit -m "feat(elearning): /blocks GET + POST routes"
```

---

## Task 5: API-Routen — `/blocks/[blockId]` PATCH + DELETE und `/blocks/reorder` POST

**Files:**
- Create: `src/app/api/v1/courses/[id]/lessons/[lessonId]/blocks/[blockId]/route.ts`
- Create: `src/app/api/v1/courses/[id]/lessons/[lessonId]/blocks/reorder/route.ts`
- Modify: `src/__tests__/integration/api/course-lesson-blocks.route.test.ts` (anhängen)

- [ ] **Step 1: Tests anhängen**

Im bestehenden Test ergänzen:

```ts
describe('PATCH /api/v1/courses/[id]/lessons/[lessonId]/blocks/[blockId]', () => {
  beforeEach(() => {
    vi.resetModules()
    setupDbMock()
    mockAuthContext(authFixture())
    vi.doMock('@/lib/services/course-lesson-block.service', () => ({
      CourseLessonBlockService: {
        update: vi.fn().mockResolvedValue({
          id: BLOCK_ID, lessonId: LESSON_ID, position: 1, kind: 'markdown',
          markdownBody: '# Updated',
        }),
      },
      CourseLessonBlockError: class extends Error { code = '' },
    }))
  })

  it('returns updated block', async () => {
    const { PATCH } = await import(
      '@/app/api/v1/courses/[id]/lessons/[lessonId]/blocks/[blockId]/route')
    const res = await PATCH(
      createTestRequest('PATCH', '/x', { markdownBody: '# Updated' }),
      { params: createTestParams({ id: COURSE_ID, lessonId: LESSON_ID, blockId: BLOCK_ID }) })
    expect(res.status).toBe(200)
  })

  it('returns 404 when block not found', async () => {
    class CErr extends Error { constructor(public code: string, m: string) { super(m) } }
    vi.doMock('@/lib/services/course-lesson-block.service', () => ({
      CourseLessonBlockService: {
        update: vi.fn().mockRejectedValue(new CErr('NOT_FOUND', 'nicht gefunden')),
      },
      CourseLessonBlockError: CErr,
    }))
    const { PATCH } = await import(
      '@/app/api/v1/courses/[id]/lessons/[lessonId]/blocks/[blockId]/route')
    const res = await PATCH(
      createTestRequest('PATCH', '/x', { markdownBody: 'x' }),
      { params: createTestParams({ id: COURSE_ID, lessonId: LESSON_ID, blockId: BLOCK_ID }) })
    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/v1/courses/[id]/lessons/[lessonId]/blocks/[blockId]', () => {
  beforeEach(() => {
    vi.resetModules()
    setupDbMock()
    mockAuthContext(authFixture())
    vi.doMock('@/lib/services/course-lesson-block.service', () => ({
      CourseLessonBlockService: {
        delete: vi.fn().mockResolvedValue(undefined),
      },
      CourseLessonBlockError: class extends Error { code = '' },
    }))
  })

  it('returns deleted=true', async () => {
    const { DELETE } = await import(
      '@/app/api/v1/courses/[id]/lessons/[lessonId]/blocks/[blockId]/route')
    const res = await DELETE(createTestRequest('DELETE', '/x'),
      { params: createTestParams({ id: COURSE_ID, lessonId: LESSON_ID, blockId: BLOCK_ID }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.deleted).toBe(true)
  })
})

describe('POST /api/v1/courses/[id]/lessons/[lessonId]/blocks/reorder', () => {
  beforeEach(() => {
    vi.resetModules()
    setupDbMock()
    mockAuthContext(authFixture())
    vi.doMock('@/lib/services/course-lesson-block.service', () => ({
      CourseLessonBlockService: {
        reorder: vi.fn().mockResolvedValue(undefined),
      },
      CourseLessonBlockError: class extends Error { code = '' },
    }))
  })

  it('returns reordered count', async () => {
    const { POST } = await import(
      '@/app/api/v1/courses/[id]/lessons/[lessonId]/blocks/reorder/route')
    const res = await POST(
      createTestRequest('POST', '/x', [{ id: BLOCK_ID, position: 2 }]),
      { params: createTestParams({ id: COURSE_ID, lessonId: LESSON_ID }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.reordered).toBe(1)
  })
})
```

- [ ] **Step 2: Run failing tests**

Run: `npx vitest run src/__tests__/integration/api/course-lesson-blocks.route.test.ts`
Expected: FAIL on the new tests — modules not found.

- [ ] **Step 3: PATCH/DELETE-Route implementieren**

Datei `src/app/api/v1/courses/[id]/lessons/[lessonId]/blocks/[blockId]/route.ts`:

```ts
import { NextRequest } from 'next/server'
import {
  apiSuccess, apiValidationError, apiServerError, apiNotFound,
} from '@/lib/utils/api-response'
import { updateLessonBlockSchema, validateAndParse, formatZodErrors } from '@/lib/utils/validation'
import { CourseLessonBlockService, CourseLessonBlockError } from '@/lib/services/course-lesson-block.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

interface Ctx { params: Promise<{ id: string; lessonId: string; blockId: string }> }

export async function PATCH(request: NextRequest, ctx: Ctx) {
  return withPermission(request, 'courses', 'update', async (auth) => {
    try {
      const { blockId } = await ctx.params
      const body = await request.json()
      const v = validateAndParse(updateLessonBlockSchema, body)
      if (!v.success) return apiValidationError(formatZodErrors(v.errors))
      const block = await CourseLessonBlockService.update(blockId, v.data,
        { userId: auth.userId, userRole: auth.role ?? null })
      return apiSuccess(block)
    } catch (err) {
      if (err instanceof CourseLessonBlockError && err.code === 'NOT_FOUND') {
        return apiNotFound(err.message)
      }
      logger.error('Block update failed', err, { module: 'CourseLessonBlocksAPI' })
      return apiServerError()
    }
  })
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  return withPermission(request, 'courses', 'update', async (auth) => {
    try {
      const { blockId } = await ctx.params
      await CourseLessonBlockService.delete(blockId,
        { userId: auth.userId, userRole: auth.role ?? null })
      return apiSuccess({ deleted: true })
    } catch (err) {
      if (err instanceof CourseLessonBlockError && err.code === 'NOT_FOUND') {
        return apiNotFound(err.message)
      }
      logger.error('Block delete failed', err, { module: 'CourseLessonBlocksAPI' })
      return apiServerError()
    }
  })
}
```

- [ ] **Step 4: Reorder-Route implementieren**

Datei `src/app/api/v1/courses/[id]/lessons/[lessonId]/blocks/reorder/route.ts`:

```ts
import { NextRequest } from 'next/server'
import { apiSuccess, apiValidationError, apiServerError } from '@/lib/utils/api-response'
import { reorderLessonBlocksSchema, validateAndParse, formatZodErrors } from '@/lib/utils/validation'
import { CourseLessonBlockService } from '@/lib/services/course-lesson-block.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

interface Ctx { params: Promise<{ id: string; lessonId: string }> }

export async function POST(request: NextRequest, ctx: Ctx) {
  return withPermission(request, 'courses', 'update', async (auth) => {
    try {
      const { lessonId } = await ctx.params
      const body = await request.json()
      const v = validateAndParse(reorderLessonBlocksSchema, body)
      if (!v.success) return apiValidationError(formatZodErrors(v.errors))
      await CourseLessonBlockService.reorder(lessonId, v.data,
        { userId: auth.userId, userRole: auth.role ?? null })
      return apiSuccess({ reordered: v.data.length })
    } catch (err) {
      logger.error('Block reorder failed', err, { module: 'CourseLessonBlocksAPI' })
      return apiServerError()
    }
  })
}
```

- [ ] **Step 5: Run tests — pass**

Run: `npx vitest run src/__tests__/integration/api/course-lesson-blocks.route.test.ts`
Expected: 7 passing total (3 alt + 4 neu).

- [ ] **Step 6: Commit**

```bash
git add "src/app/api/v1/courses/[id]/lessons/[lessonId]/blocks" src/__tests__/integration/api/course-lesson-blocks.route.test.ts
git commit -m "feat(elearning): /blocks PATCH/DELETE/reorder routes"
```

---

## Task 6: API-Route — Block-Type-Catalog (read-only)

**Files:**
- Create: `src/app/api/v1/cms/block-types/route.ts`
- Create: `src/__tests__/integration/api/cms-block-types.route.test.ts`

- [ ] **Step 1: Bestehenden Block-Type-Service prüfen**

Run: `cat src/lib/services/cms-block-type.service.ts | head -30`
Erwartet: ein bestehender Service mit `list()`-Methode für `cms_block_type_definitions`. Wir erweitern ggf. um einen Filter-Parameter, oder filtern client-seitig in der Route.

- [ ] **Step 2: Failing test schreiben**

Datei `src/__tests__/integration/api/cms-block-types.route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'
import { mockAuthContext } from '../../helpers/mock-auth'
import { createTestRequest } from '../../helpers/mock-request'
import { authFixture } from '../../helpers/fixtures'

describe('GET /api/v1/cms/block-types', () => {
  beforeEach(() => {
    vi.resetModules()
    setupDbMock()
    mockAuthContext(authFixture())
  })

  it('returns block types filtered by available_in_lessons=true', async () => {
    const dbMock = setupDbMock()
    dbMock.mockSelect.mockResolvedValueOnce([
      { id: 't1', slug: 'course-callout', name: 'Hinweis', category: 'course',
        availableInLessons: true, isActive: true },
    ])
    const { GET } = await import('@/app/api/v1/cms/block-types/route')
    const res = await GET(createTestRequest('GET', '/api/v1/cms/block-types?available_in_lessons=true'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
  })
})
```

- [ ] **Step 3: Route implementieren**

Datei `src/app/api/v1/cms/block-types/route.ts`:

```ts
import { NextRequest } from 'next/server'
import { apiSuccess, apiServerError } from '@/lib/utils/api-response'
import { db } from '@/lib/db'
import { cmsBlockTypeDefinitions } from '@/lib/db/schema'
import { withPermission } from '@/lib/auth/require-permission'
import { eq, and } from 'drizzle-orm'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  return withPermission(request, 'courses', 'read', async () => {
    try {
      const { searchParams } = new URL(request.url)
      const onlyForLessons = searchParams.get('available_in_lessons') === 'true'

      const conds = [eq(cmsBlockTypeDefinitions.isActive, true)]
      if (onlyForLessons) {
        conds.push(eq(cmsBlockTypeDefinitions.availableInLessons, true))
      }

      const rows = await db.select().from(cmsBlockTypeDefinitions).where(and(...conds))
      return apiSuccess(rows)
    } catch (err) {
      logger.error('Block types list failed', err, { module: 'BlockTypesAPI' })
      return apiServerError()
    }
  })
}
```

- [ ] **Step 4: Run tests — pass**

Run: `npx vitest run src/__tests__/integration/api/cms-block-types.route.test.ts`
Expected: 1 passing.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/v1/cms/block-types/route.ts src/__tests__/integration/api/cms-block-types.route.test.ts
git commit -m "feat(elearning): /api/v1/cms/block-types catalog endpoint"
```

---

## Task 7: `react-syntax-highlighter` installieren + `course-code` Block

**Files:**
- Modify: `package.json` (via npm install)
- Create: `src/app/_components/blocks/course-code-block.tsx`

- [ ] **Step 1: Dependency installieren**

Run: `npm install react-syntax-highlighter && npm install --save-dev @types/react-syntax-highlighter`
Expected: clean install, no peer-dep warnings.

- [ ] **Step 2: `course-code` Komponente implementieren**

Datei `src/app/_components/blocks/course-code-block.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Copy, Check } from 'lucide-react'

export interface CourseCodeBlockContent {
  language?: string
  code?: string
  filename?: string
  showLineNumbers?: boolean
}

interface Props {
  content: CourseCodeBlockContent
}

export function CourseCodeBlock({ content }: Props) {
  const [copied, setCopied] = useState(false)
  const code = content.code ?? ''
  const language = content.language ?? 'text'

  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // ignore
    }
  }

  return (
    <Card className="overflow-hidden">
      {(content.filename || true) && (
        <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-1.5 text-xs">
          <span className="font-mono text-muted-foreground">
            {content.filename ?? language}
          </span>
          <Button variant="ghost" size="sm" className="h-6 px-2" onClick={copy}>
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            <span className="ml-1">{copied ? 'Kopiert' : 'Kopieren'}</span>
          </Button>
        </div>
      )}
      <CardContent className="p-0 text-sm">
        <SyntaxHighlighter
          language={language}
          style={oneLight}
          showLineNumbers={!!content.showLineNumbers}
          customStyle={{ margin: 0, padding: '12px 16px', background: 'transparent' }}
        >
          {code}
        </SyntaxHighlighter>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 3: TypeScript-Check**

Run: `npx tsc --noEmit`
Expected: keine Fehler.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/app/_components/blocks/course-code-block.tsx
git commit -m "feat(elearning): course-code block + react-syntax-highlighter dep"
```

---

## Task 8: 5 weitere Course-Block-Komponenten

**Files:**
- Create: `src/app/_components/blocks/course-callout-block.tsx`
- Create: `src/app/_components/blocks/course-learning-objectives-block.tsx`
- Create: `src/app/_components/blocks/course-key-takeaways-block.tsx`
- Create: `src/app/_components/blocks/course-step-by-step-block.tsx`
- Create: `src/app/_components/blocks/course-accordion-block.tsx`

- [ ] **Step 1: `course-callout-block.tsx`**

```tsx
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Info, Lightbulb, AlertTriangle, OctagonAlert, CircleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface CourseCalloutBlockContent {
  variant?: 'note' | 'tip' | 'warning' | 'danger' | 'info'
  title?: string
  body?: string
}

interface Props {
  content: CourseCalloutBlockContent
}

const variantConfig = {
  note:    { icon: Info,           classes: 'border-slate-300 bg-slate-50 text-slate-900 dark:bg-slate-900/40 dark:text-slate-100' },
  tip:     { icon: Lightbulb,      classes: 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100' },
  info:    { icon: CircleAlert,    classes: 'border-blue-300 bg-blue-50 text-blue-900 dark:bg-blue-950/40 dark:text-blue-100' },
  warning: { icon: AlertTriangle,  classes: 'border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100' },
  danger:  { icon: OctagonAlert,   classes: 'border-red-300 bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-100' },
}

export function CourseCalloutBlock({ content }: Props) {
  const variant = content.variant ?? 'tip'
  const config = variantConfig[variant] ?? variantConfig.tip
  const Icon = config.icon
  return (
    <Alert className={cn('border', config.classes)}>
      <Icon className="h-4 w-4" />
      {content.title && <AlertTitle>{content.title}</AlertTitle>}
      {content.body && <AlertDescription>{content.body}</AlertDescription>}
    </Alert>
  )
}
```

- [ ] **Step 2: `course-learning-objectives-block.tsx`**

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, Target } from 'lucide-react'

export interface CourseLearningObjectivesBlockContent {
  title?: string
  items?: string[]
}

interface Props {
  content: CourseLearningObjectivesBlockContent
}

export function CourseLearningObjectivesBlock({ content }: Props) {
  const items = content.items ?? []
  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Target className="h-5 w-5" />
          {content.title || 'Was du lernst'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 3: `course-key-takeaways-block.tsx`**

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Sparkles } from 'lucide-react'

export interface CourseKeyTakeawaysBlockContent {
  title?: string
  items?: string[]
}

interface Props {
  content: CourseKeyTakeawaysBlockContent
}

export function CourseKeyTakeawaysBlock({ content }: Props) {
  const items = content.items ?? []
  return (
    <Card className="bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          {content.title || 'Wichtigste Punkte'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 list-disc list-inside">
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 4: `course-step-by-step-block.tsx`**

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export interface CourseStepByStepBlockStep {
  title: string
  description?: string
}

export interface CourseStepByStepBlockContent {
  title?: string
  steps?: CourseStepByStepBlockStep[]
}

interface Props {
  content: CourseStepByStepBlockContent
}

export function CourseStepByStepBlock({ content }: Props) {
  const steps = content.steps ?? []
  return (
    <Card>
      {content.title && (
        <CardHeader>
          <CardTitle className="text-lg">{content.title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <ol className="space-y-4">
          {steps.map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                {i + 1}
              </span>
              <div className="flex-1 pt-0.5">
                <div className="font-medium">{step.title}</div>
                {step.description && (
                  <p className="text-sm text-muted-foreground mt-0.5">{step.description}</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 5: `course-accordion-block.tsx`**

```tsx
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion'

export interface CourseAccordionBlockItem {
  question: string
  answer: string
}

export interface CourseAccordionBlockContent {
  items?: CourseAccordionBlockItem[]
}

interface Props {
  content: CourseAccordionBlockContent
}

export function CourseAccordionBlock({ content }: Props) {
  const items = content.items ?? []
  return (
    <Accordion type="multiple" className="rounded-md border">
      {items.map((item, i) => (
        <AccordionItem key={i} value={`item-${i}`} className="px-4">
          <AccordionTrigger>{item.question}</AccordionTrigger>
          <AccordionContent>
            <article className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.answer}</ReactMarkdown>
            </article>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}
```

- [ ] **Step 6: TypeScript-Check**

Run: `npx tsc --noEmit`
Expected: keine Fehler.

- [ ] **Step 7: Commit**

```bash
git add src/app/_components/blocks/course-callout-block.tsx src/app/_components/blocks/course-learning-objectives-block.tsx src/app/_components/blocks/course-key-takeaways-block.tsx src/app/_components/blocks/course-step-by-step-block.tsx src/app/_components/blocks/course-accordion-block.tsx
git commit -m "feat(elearning): 5 course block components (callout, objectives, takeaways, steps, accordion)"
```

---

## Task 9: 6 Course-Blocks in `CmsBlockRenderer` einhängen

**Files:**
- Modify: `src/app/_components/cms-block-renderer.tsx`

- [ ] **Step 1: Inspect existing renderer**

Run: `grep -n "case '" src/app/_components/cms-block-renderer.tsx | head -10`
Erwartet: viele `case 'hero':` etc. — switch-Pattern bestätigt.

- [ ] **Step 2: Imports + cases ergänzen**

In `src/app/_components/cms-block-renderer.tsx`:

a) Imports oben ergänzen (in der bestehenden Import-Reihe):

```tsx
import { CourseCalloutBlock } from './blocks/course-callout-block'
import { CourseCodeBlock } from './blocks/course-code-block'
import { CourseLearningObjectivesBlock } from './blocks/course-learning-objectives-block'
import { CourseKeyTakeawaysBlock } from './blocks/course-key-takeaways-block'
import { CourseStepByStepBlock } from './blocks/course-step-by-step-block'
import { CourseAccordionBlock } from './blocks/course-accordion-block'
import type { CourseCalloutBlockContent } from './blocks/course-callout-block'
import type { CourseCodeBlockContent } from './blocks/course-code-block'
import type { CourseLearningObjectivesBlockContent } from './blocks/course-learning-objectives-block'
import type { CourseKeyTakeawaysBlockContent } from './blocks/course-key-takeaways-block'
import type { CourseStepByStepBlockContent } from './blocks/course-step-by-step-block'
import type { CourseAccordionBlockContent } from './blocks/course-accordion-block'
```

b) Im switch-statement neue cases ergänzen (unter den bestehenden, vor dem default):

```tsx
case 'course-callout':
  return wrapWithBackground(<CourseCalloutBlock content={content as CourseCalloutBlockContent} />)
case 'course-code':
  return wrapWithBackground(<CourseCodeBlock content={content as CourseCodeBlockContent} />)
case 'course-learning-objectives':
  return wrapWithBackground(<CourseLearningObjectivesBlock content={content as CourseLearningObjectivesBlockContent} />)
case 'course-key-takeaways':
  return wrapWithBackground(<CourseKeyTakeawaysBlock content={content as CourseKeyTakeawaysBlockContent} />)
case 'course-step-by-step':
  return wrapWithBackground(<CourseStepByStepBlock content={content as CourseStepByStepBlockContent} />)
case 'course-accordion':
  return wrapWithBackground(<CourseAccordionBlock content={content as CourseAccordionBlockContent} />)
```

- [ ] **Step 3: TypeScript-Check**

Run: `npx tsc --noEmit`
Expected: keine Fehler.

- [ ] **Step 4: Commit**

```bash
git add src/app/_components/cms-block-renderer.tsx
git commit -m "feat(elearning): wire 6 course blocks into CmsBlockRenderer"
```

---

## Task 10: `LessonContentRenderer` (Player + Vorschau-Integration)

**Files:**
- Create: `src/components/elearning/LessonContentRenderer.tsx`
- Modify: `src/components/elearning/LessonContent.tsx`

- [ ] **Step 1: `LessonContentRenderer` erstellen**

Datei `src/components/elearning/LessonContentRenderer.tsx`:

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
            <article
              key={b.id}
              className="prose prose-sm max-w-none dark:prose-invert sm:prose-base"
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {b.markdownBody ?? ''}
              </ReactMarkdown>
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

- [ ] **Step 2: `LessonContent.tsx` aktualisieren**

In `src/components/elearning/LessonContent.tsx`:

a) Type-Import ergänzen:
```tsx
import type { CourseLessonBlock } from '@/lib/db/schema'
import { LessonContentRenderer } from './LessonContentRenderer'
```

b) Props-Interface erweitern:
```tsx
interface Props {
  lesson: CourseLesson & { blocks?: CourseLessonBlock[] }
  assets: CourseAsset[]
}
```

c) Im Render-Block den `<article>...</article>`-Markdown-Renderer durch `<LessonContentRenderer blocks={lesson.blocks ?? []} />` ersetzen. Die Anhänge-Card bleibt.

(Das Original-`LessonContent.tsx` aus Sub-2 ist klein — die Diff ist überschaubar. Anhänge-Card-Code unverändert lassen.)

- [ ] **Step 3: TypeScript-Check**

Run: `npx tsc --noEmit`
Expected: keine Fehler.

- [ ] **Step 4: Commit**

```bash
git add src/components/elearning/LessonContentRenderer.tsx src/components/elearning/LessonContent.tsx
git commit -m "feat(elearning): LessonContentRenderer for mixed markdown + cms blocks"
```

---

## Task 11: Vorschau-Tab im Kurs-Editor anpassen

**Files:**
- Modify: `src/app/intern/(dashboard)/elearning/[id]/_components/CoursePreview.tsx`
- Modify: `src/app/intern/(dashboard)/elearning/[id]/_components/CourseEditView.tsx`

- [ ] **Step 1: Inspect bestehender Vorschau-Code**

Run: `grep -n "contentMarkdown\|ReactMarkdown" src/app/intern/(dashboard)/elearning/[id]/_components/CoursePreview.tsx`
Erwartet: Vorschau rendert aktuell `lesson.contentMarkdown`. Wir ersetzen das durch `LessonContentRenderer`.

- [ ] **Step 2: `CoursePreview.tsx` anpassen**

In `src/app/intern/(dashboard)/elearning/[id]/_components/CoursePreview.tsx`:

a) Import ergänzen:
```tsx
import { LessonContentRenderer } from '@/components/elearning/LessonContentRenderer'
import type { CourseLessonBlock } from '@/lib/db/schema'
```

b) `PreviewLesson`-Interface (oder wie auch immer es heißt) erweitern um `blocks?: CourseLessonBlock[]`.

c) Im Render-Code die Markdown-Render-Stelle durch `<LessonContentRenderer blocks={lesson.blocks ?? []} />` ersetzen.

- [ ] **Step 3: `CourseEditView.tsx` anpassen — Vorschau-Loader holt Blocks**

In `loadPreview` (oder die analoge Funktion): zusätzlich zu lesson-Detail auch die Blocks laden via `fetch('/api/v1/courses/[id]/lessons/[lessonId]/blocks')`. Result ans `previewLessons`-State anhängen.

```tsx
const detailed = await Promise.all(
  course.lessons.map(async (l) => {
    const [lessonRes, blocksRes] = await Promise.all([
      fetch(`/api/v1/courses/${courseId}/lessons/${l.id}`).then((r) => r.json()),
      fetch(`/api/v1/courses/${courseId}/lessons/${l.id}/blocks`).then((r) => r.json()),
    ])
    return {
      ...lessonRes.data,
      blocks: blocksRes.success ? blocksRes.data : [],
    }
  }),
)
setPreviewLessons(detailed)
```

- [ ] **Step 4: TypeScript-Check**

Run: `npx tsc --noEmit`
Expected: keine Fehler.

- [ ] **Step 5: Commit**

```bash
git add "src/app/intern/(dashboard)/elearning/[id]/_components/CoursePreview.tsx" "src/app/intern/(dashboard)/elearning/[id]/_components/CourseEditView.tsx"
git commit -m "feat(elearning): preview-tab renders mixed blocks via LessonContentRenderer"
```

---

## Task 12: Player-Routes (Public + Portal) — Blocks ans `LessonContent` durchreichen

**Files:**
- Modify: `src/app/(public)/kurse/[course-slug]/[lesson-slug]/page.tsx`
- Modify: `src/app/portal/kurse/[course-slug]/[lesson-slug]/page.tsx`

- [ ] **Step 1: Public-Player anpassen**

In `src/app/(public)/kurse/[course-slug]/[lesson-slug]/page.tsx`: das Service-Result `ctx` enthält durch Task 3 jetzt `ctx.blocks`. An `<LessonContent>` als Prop weitergeben:

```tsx
<LessonContent lesson={{ ...ctx.lesson, blocks: ctx.blocks }} assets={ctx.assets} />
```

(Die exakte Stelle finden: aktuell ruft die Page wahrscheinlich `<LessonContent lesson={ctx.lesson} assets={ctx.assets} />`.)

- [ ] **Step 2: Portal-Player analog**

In `src/app/portal/kurse/[course-slug]/[lesson-slug]/page.tsx`: gleiche Änderung.

- [ ] **Step 3: TypeScript-Check**

Run: `npx tsc --noEmit`
Expected: keine Fehler.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(public)/kurse/[course-slug]/[lesson-slug]/page.tsx" "src/app/portal/kurse/[course-slug]/[lesson-slug]/page.tsx"
git commit -m "feat(elearning): pass blocks from service to LessonContent in player pages"
```

---

## Task 13: Editor-UI — Block-Picker, Edit-Dialog, Block-Row

**Files:**
- Create: `src/app/intern/(dashboard)/elearning/[id]/lektionen/[lessonId]/_components/LessonBlockTypePicker.tsx`
- Create: `src/app/intern/(dashboard)/elearning/[id]/lektionen/[lessonId]/_components/LessonBlockEditDialog.tsx`
- Create: `src/app/intern/(dashboard)/elearning/[id]/lektionen/[lessonId]/_components/LessonBlockRow.tsx`

- [ ] **Step 1: `LessonBlockTypePicker.tsx`**

```tsx
'use client'

import { useEffect, useState } from 'react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

interface BlockType {
  id: string
  slug: string
  name: string
  description?: string | null
  icon?: string | null
  category?: string | null
}

interface Template {
  id: string
  name: string
  blockType: string
  content: Record<string, unknown>
  settings: Record<string, unknown>
}

interface Props {
  onSelect: (input:
    | { kind: 'markdown' }
    | { kind: 'cms_block'; blockType: string; content?: Record<string, unknown>; settings?: Record<string, unknown> }
  ) => void
}

export function LessonBlockTypePicker({ onSelect }: Props) {
  const [types, setTypes] = useState<BlockType[]>([])
  const [templates, setTemplates] = useState<Template[]>([])

  useEffect(() => {
    void Promise.all([
      fetch('/api/v1/cms/block-types?available_in_lessons=true').then((r) => r.json()),
      fetch('/api/v1/cms/block-templates?is_system=true').then((r) => r.json()).catch(() => ({ success: false })),
    ]).then(([typesRes, templatesRes]) => {
      if (typesRes.success) setTypes(typesRes.data)
      if (templatesRes?.success) setTemplates(templatesRes.data)
    })
  }, [])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Block hinzufügen
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72 max-h-96 overflow-y-auto">
        <DropdownMenuLabel>Text</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => onSelect({ kind: 'markdown' })}>
          Markdown
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {types.map((t) => {
          const matchingTemplates = templates.filter((tpl) => tpl.blockType === t.slug)
          return (
            <div key={t.id}>
              <DropdownMenuItem
                onClick={() => onSelect({ kind: 'cms_block', blockType: t.slug })}
              >
                <div>
                  <div className="font-medium">{t.name}</div>
                  {t.description && (
                    <div className="text-xs text-muted-foreground">{t.description}</div>
                  )}
                </div>
              </DropdownMenuItem>
              {matchingTemplates.map((tpl) => (
                <DropdownMenuItem
                  key={tpl.id}
                  className="pl-8 text-sm"
                  onClick={() => onSelect({
                    kind: 'cms_block',
                    blockType: t.slug,
                    content: tpl.content,
                    settings: tpl.settings,
                  })}
                >
                  ↪ {tpl.name}
                </DropdownMenuItem>
              ))}
            </div>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

(Note: Endpoint `/api/v1/cms/block-templates?is_system=true` — falls existiert; sonst gracefully fail via `.catch()`. Templates sind optional.)

- [ ] **Step 2: `LessonBlockEditDialog.tsx`**

```tsx
'use client'

import { useState, useEffect } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Trash2, Plus } from 'lucide-react'
import type { CourseLessonBlock } from '@/lib/db/schema'

interface FieldDef {
  name: string
  label: string
  type: 'text' | 'textarea' | 'select' | 'boolean' | 'list-text' | 'list-object'
  options?: string[]
  default?: unknown
  schema?: FieldDef[]
}

interface Props {
  block: CourseLessonBlock | null
  fields: FieldDef[]                              // empty for markdown
  onClose: () => void
  onSave: (patch: { markdownBody?: string; content?: Record<string, unknown> }) => Promise<void>
}

export function LessonBlockEditDialog({ block, fields, onClose, onSave }: Props) {
  const [markdownBody, setMarkdownBody] = useState('')
  const [content, setContent] = useState<Record<string, unknown>>({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!block) return
    setMarkdownBody(block.markdownBody ?? '')
    setContent((block.content as Record<string, unknown>) ?? {})
  }, [block])

  async function save() {
    setBusy(true)
    try {
      if (block?.kind === 'markdown') {
        await onSave({ markdownBody })
      } else {
        await onSave({ content })
      }
      onClose()
    } finally {
      setBusy(false)
    }
  }

  if (!block) return null

  return (
    <Dialog open={!!block} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {block.kind === 'markdown' ? 'Markdown' : block.blockType} bearbeiten
          </DialogTitle>
        </DialogHeader>

        {block.kind === 'markdown' ? (
          <Textarea
            value={markdownBody}
            onChange={(e) => setMarkdownBody(e.target.value)}
            rows={15}
            className="font-mono text-sm"
          />
        ) : (
          <div className="space-y-4">
            {fields.map((f) => (
              <FieldEditor
                key={f.name}
                field={f}
                value={content[f.name]}
                onChange={(v) => setContent({ ...content, [f.name]: v })}
              />
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Abbrechen</Button>
          <Button onClick={save} disabled={busy}>Speichern</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function FieldEditor({ field, value, onChange }: {
  field: FieldDef
  value: unknown
  onChange: (v: unknown) => void
}) {
  if (field.type === 'text') {
    return (
      <div className="space-y-2">
        <Label>{field.label}</Label>
        <Input value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} />
      </div>
    )
  }
  if (field.type === 'textarea') {
    return (
      <div className="space-y-2">
        <Label>{field.label}</Label>
        <Textarea value={(value as string) ?? ''} rows={5} onChange={(e) => onChange(e.target.value)} />
      </div>
    )
  }
  if (field.type === 'select') {
    return (
      <div className="space-y-2">
        <Label>{field.label}</Label>
        <Select value={(value as string) ?? ''} onValueChange={onChange}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    )
  }
  if (field.type === 'boolean') {
    return (
      <div className="flex items-center justify-between">
        <Label>{field.label}</Label>
        <Switch checked={!!value} onCheckedChange={onChange} />
      </div>
    )
  }
  if (field.type === 'list-text') {
    const items = (value as string[]) ?? []
    return (
      <div className="space-y-2">
        <Label>{field.label}</Label>
        {items.map((item, i) => (
          <div key={i} className="flex gap-2">
            <Input value={item} onChange={(e) => {
              const next = [...items]; next[i] = e.target.value; onChange(next)
            }} />
            <Button variant="ghost" size="icon" onClick={() => onChange(items.filter((_, j) => j !== i))}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => onChange([...items, ''])}>
          <Plus className="mr-1 h-4 w-4" />Eintrag
        </Button>
      </div>
    )
  }
  if (field.type === 'list-object') {
    const items = (value as Record<string, unknown>[]) ?? []
    return (
      <div className="space-y-3">
        <Label>{field.label}</Label>
        {items.map((item, i) => (
          <div key={i} className="border rounded-md p-3 space-y-2">
            {(field.schema ?? []).map((sub) => (
              <FieldEditor
                key={sub.name}
                field={sub}
                value={item[sub.name]}
                onChange={(v) => {
                  const next = [...items]; next[i] = { ...item, [sub.name]: v }; onChange(next)
                }}
              />
            ))}
            <Button variant="ghost" size="sm" onClick={() => onChange(items.filter((_, j) => j !== i))}>
              <Trash2 className="mr-1 h-4 w-4" />Eintrag entfernen
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => onChange([...items, {}])}>
          <Plus className="mr-1 h-4 w-4" />Eintrag
        </Button>
      </div>
    )
  }
  return null
}
```

- [ ] **Step 3: `LessonBlockRow.tsx`**

```tsx
'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { GripVertical, Pencil, Trash2 } from 'lucide-react'
import type { CourseLessonBlock } from '@/lib/db/schema'

interface Props {
  block: CourseLessonBlock
  onEdit: () => void
  onDelete: () => void
}

export function LessonBlockRow({ block, onEdit, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: block.id })

  const preview = block.kind === 'markdown'
    ? (block.markdownBody ?? '').slice(0, 80) + ((block.markdownBody?.length ?? 0) > 80 ? '…' : '')
    : `[${block.blockType}]`

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="flex items-center gap-2 rounded-md border p-2 bg-background"
    >
      <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground" aria-label="Verschieben">
        <GripVertical className="h-4 w-4" />
      </button>
      <Badge variant="outline" className="font-mono text-xs">
        {block.kind === 'markdown' ? 'MD' : (block.blockType ?? '')}
      </Badge>
      <span className="flex-1 text-sm text-muted-foreground truncate">{preview}</span>
      <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Bearbeiten">
        <Pencil className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={onDelete} aria-label="Löschen">
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  )
}
```

- [ ] **Step 4: TypeScript-Check**

Run: `npx tsc --noEmit`
Expected: keine Fehler.

- [ ] **Step 5: Commit**

```bash
git add "src/app/intern/(dashboard)/elearning/[id]/lektionen/[lessonId]/_components/LessonBlockTypePicker.tsx" "src/app/intern/(dashboard)/elearning/[id]/lektionen/[lessonId]/_components/LessonBlockEditDialog.tsx" "src/app/intern/(dashboard)/elearning/[id]/lektionen/[lessonId]/_components/LessonBlockRow.tsx"
git commit -m "feat(elearning): block-picker + edit-dialog + block-row components"
```

---

## Task 14: `LessonBlockListEditor` + Integration in Lesson-Edit-Page

**Files:**
- Create: `src/app/intern/(dashboard)/elearning/[id]/lektionen/[lessonId]/_components/LessonBlockListEditor.tsx`
- Modify: `src/app/intern/(dashboard)/elearning/[id]/lektionen/[lessonId]/_components/LessonEditView.tsx`

- [ ] **Step 1: `LessonBlockListEditor.tsx` implementieren**

```tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/loading-states'
import { EmptyState } from '@/components/shared/empty-state'
import { FileText } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import type { CourseLessonBlock } from '@/lib/db/schema'
import { LessonBlockRow } from './LessonBlockRow'
import { LessonBlockTypePicker } from './LessonBlockTypePicker'
import { LessonBlockEditDialog } from './LessonBlockEditDialog'

interface BlockTypeDef {
  slug: string
  fields: Array<{ name: string; label: string; type: string; options?: string[]; schema?: unknown }>
}

interface Props {
  courseId: string
  lessonId: string
}

export function LessonBlockListEditor({ courseId, lessonId }: Props) {
  const [blocks, setBlocks] = useState<CourseLessonBlock[]>([])
  const [typeDefs, setTypeDefs] = useState<Record<string, BlockTypeDef>>({})
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<CourseLessonBlock | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [blocksRes, typesRes] = await Promise.all([
        fetch(`/api/v1/courses/${courseId}/lessons/${lessonId}/blocks`).then((r) => r.json()),
        fetch('/api/v1/cms/block-types?available_in_lessons=true').then((r) => r.json()),
      ])
      if (blocksRes.success) setBlocks(blocksRes.data)
      if (typesRes.success) {
        const map: Record<string, BlockTypeDef> = {}
        for (const t of typesRes.data) map[t.slug] = t
        setTypeDefs(map)
      }
    } catch (e) {
      logger.error('Block list load failed', e, { module: 'LessonBlockListEditor' })
    } finally {
      setLoading(false)
    }
  }, [courseId, lessonId])

  useEffect(() => { void load() }, [load])

  async function addBlock(input:
    | { kind: 'markdown' }
    | { kind: 'cms_block'; blockType: string; content?: Record<string, unknown>; settings?: Record<string, unknown> }
  ) {
    const body = input.kind === 'markdown'
      ? { kind: 'markdown', markdownBody: '' }
      : input
    const res = await fetch(`/api/v1/courses/${courseId}/lessons/${lessonId}/blocks`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    const json = await res.json()
    if (json.success) {
      toast.success('Block hinzugefügt')
      await load()
      setEditing(json.data)
    } else {
      toast.error(json.error?.message ?? 'Hinzufügen fehlgeschlagen')
    }
  }

  async function saveBlock(patch: { markdownBody?: string; content?: Record<string, unknown> }) {
    if (!editing) return
    const res = await fetch(`/api/v1/courses/${courseId}/lessons/${lessonId}/blocks/${editing.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
    })
    const json = await res.json()
    if (json.success) {
      toast.success('Block gespeichert')
      await load()
    } else {
      toast.error(json.error?.message ?? 'Speichern fehlgeschlagen')
    }
  }

  async function deleteBlock(id: string) {
    if (!confirm('Block löschen?')) return
    await fetch(`/api/v1/courses/${courseId}/lessons/${lessonId}/blocks/${id}`, { method: 'DELETE' })
    toast.success('Block gelöscht')
    await load()
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = blocks.findIndex((b) => b.id === active.id)
    const newIdx = blocks.findIndex((b) => b.id === over.id)
    if (oldIdx === -1 || newIdx === -1) return
    const reordered = arrayMove(blocks, oldIdx, newIdx)
    setBlocks(reordered)  // optimistic
    await fetch(`/api/v1/courses/${courseId}/lessons/${lessonId}/blocks/reorder`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reordered.map((b, i) => ({ id: b.id, position: i + 1 }))),
    })
  }

  if (loading) return <LoadingSpinner />

  const editingFields = editing?.kind === 'cms_block'
    ? (typeDefs[editing.blockType ?? '']?.fields ?? [])
    : []

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Inhalt</CardTitle>
        </CardHeader>
        <CardContent>
          {blocks.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Noch keine Blocks"
              description="Füge unten den ersten Block hinzu — Markdown für Fließtext, oder einen strukturierten Block."
            />
          ) : (
            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {blocks.map((b) => (
                    <LessonBlockRow
                      key={b.id}
                      block={b}
                      onEdit={() => setEditing(b)}
                      onDelete={() => void deleteBlock(b.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

      <LessonBlockTypePicker onSelect={(input) => void addBlock(input)} />

      <LessonBlockEditDialog
        block={editing}
        fields={editingFields as never}
        onClose={() => setEditing(null)}
        onSave={saveBlock}
      />
    </div>
  )
}
```

- [ ] **Step 2: `LessonEditView.tsx` Inhalt-Tab anpassen**

In `src/app/intern/(dashboard)/elearning/[id]/lektionen/[lessonId]/_components/LessonEditView.tsx`:

a) Import ergänzen:
```tsx
import { LessonBlockListEditor } from './LessonBlockListEditor'
```

b) Im Tab `inhalt` die existierende `<LessonContentForm>` durch `<LessonBlockListEditor courseId={courseId} lessonId={lessonId} />` ersetzen. Der Stammdaten-Form (Titel/Slug/Dauer) bleibt im Stammdaten-Tab — falls aktuell mit dem Inhalt-Tab kombiniert, in einen separaten Tab oder ans Top der Page ziehen.

c) Falls es keinen separaten Stammdaten-Tab gibt: einen anlegen. Pattern matcht den `CourseEditView` (Tabs-Komponente).

(Option: wenn `LessonContentForm` neben dem Markdown noch Lesson-Stammdaten editiert, Stammdaten in eine neue Komponente ziehen, sodass `LessonBlockListEditor` nur die Block-Liste hat.)

- [ ] **Step 3: Manuell prüfen**

Run: `npm run dev`
Öffne eine Lesson: Inhalt-Tab zeigt Block-Liste. „+ Block hinzufügen" → Picker mit Markdown + 12 Block-Typen. Block einfügen, edit, drag-drop, delete.

- [ ] **Step 4: TypeScript-Check**

Run: `npx tsc --noEmit`
Expected: keine Fehler.

- [ ] **Step 5: Commit**

```bash
git add "src/app/intern/(dashboard)/elearning/[id]/lektionen/[lessonId]/_components/LessonBlockListEditor.tsx" "src/app/intern/(dashboard)/elearning/[id]/lektionen/[lessonId]/_components/LessonEditView.tsx"
git commit -m "feat(elearning): block-list editor replaces markdown-only lesson form"
```

---

## Task 15: Final-Verification + UAT

**Files:** keine — nur Testlauf + Plan-Commit + UAT-Checkliste durchlaufen.

- [ ] **Step 1: Vollständiger Test-Run**

Run:
```
npx tsc --noEmit
npx vitest run src/__tests__/integration/api/course-lesson-blocks.route.test.ts src/__tests__/integration/api/cms-block-types.route.test.ts src/__tests__/unit/services/course-lesson-block.service.test.ts src/__tests__/unit/services/course-public.service.test.ts src/__tests__/unit/validation/lesson-block.validation.test.ts
```
Expected: alles grün.

- [ ] **Step 2: Sub-1/Sub-2-Regression-Check**

Run:
```
npx vitest run src/__tests__/integration/api/courses src/__tests__/integration/api/courses-publish.route.test.ts src/__tests__/integration/api/courses-restore.route.test.ts src/__tests__/integration/api/course-assets-serve.route.test.ts src/__tests__/integration/api/course-assets-serve-public.route.test.ts src/__tests__/unit/services/course.service.test.ts src/__tests__/unit/services/course-asset.service.test.ts src/__tests__/unit/utils/course-asset-acl.test.ts src/__tests__/unit/auth/try-with-permission.test.ts
```
Expected: alle bestehenden Tests grün.

- [ ] **Step 3: Manuelles UAT-Skript**

Run: `npm run dev`

Voraussetzung: Mindestens 1 Lesson mit existierendem `contentMarkdown` (aus Sub-1/2-Daten) — die Migration 017 hat sie automatisch in einen Markdown-Block migriert.

UAT-Skript:
1. Lesson öffnen → Inhalt-Tab zeigt einen Markdown-Block mit dem alten Inhalt
2. „+ Block hinzufügen" → Picker erscheint mit Markdown + alle Block-Typen, gruppiert
3. „Hinweis / Callout" wählen → leerer Callout-Block in Liste, Edit-Dialog öffnet sofort
4. Variant=tip, Title=„Tipp", Body=„Test" → Speichern → Block aktualisiert
5. „Code-Block" wählen → Edit-Dialog → language=typescript, code=`const x = 1` → Speichern
6. Drag-Drop: Callout vor Markdown ziehen → Reihenfolge persistiert nach Reload
7. Vorschau-Tab im Kurs-Editor zeigt mixed Content korrekt
8. Public-Player (`/kurse/[slug]/[lesson-slug]`) zeigt Callout + Markdown + Code mit Syntax-Highlighting + Copy-Button
9. Portal-Player (`/portal/kurse/[slug]/[lesson-slug]`) analog
10. Block-Sichtbarkeit togglen via PATCH (manuell mit curl/devtools, falls UI noch keinen Toggle hat) → Player versteckt den Block
11. Block löschen → Liste aktualisiert
12. Templates-Test: „Hinweis / Callout" → Sub-Eintrag „Wichtig" wählen → Block bekommt vorbefüllte content (variant=warning, title=„Wichtig")

- [ ] **Step 4: Plan-Datei committen**

```bash
git add docs/superpowers/plans/2026-04-27-onlinekurse-sub2b-content-blocks.md
git commit -m "docs(elearning): plan sub-2b content blocks"
```

---

## Pakets-Abschluss

- Sub-2b ist damit fachlich komplett.
- `course_lessons.content_markdown`-Spalte bleibt deprecated im Schema; Drop in Folge-PR nach Stabilisierung.
- Folge-Sub-Projekt: **Sub-3 Progress + PDF-Zertifikate**, baut auf Player + Blocks auf.
