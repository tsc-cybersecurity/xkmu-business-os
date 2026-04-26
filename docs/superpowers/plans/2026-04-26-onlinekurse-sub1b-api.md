# Onlinekurse Sub-Projekt 1b — API-Routen — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Voraussetzung:** Plan 1a ist abgearbeitet (Schema + alle 5 Services + Permission-Modul existieren).

**Goal:** Vollständige REST-API unter `/api/v1/courses/...` mit `withPermission`-Wrapper, Zod-Validierung, Range-Request-fähigem Asset-Serve.

**Codebase-Patterns (Wiederholung aus 1a, gilt für alle Tasks hier):**
- Auth: `withPermission(request, 'courses', ACTION, async (auth) => { ... })`
- Validation: Zod-Schema in `src/lib/utils/validation.ts` ergänzen + via `validateAndParse(schema, body)` aufrufen
- Response-Helper: `apiSuccess(data, meta?, status?)`, `apiValidationError(errors)`, `apiServerError()`, `apiNotFound()`, `apiConflict(...)` aus `@/lib/utils/api-response`
- Tests: Pattern aus `src/__tests__/integration/api/companies.route.test.ts`

**Permissions:** publish/unpublish/archive/modules/lessons/assets-Mutationen nutzen `('courses', 'update')`. delete des Kurses nutzt `('courses', 'delete')`. create/list/get nutzen die jeweilige CRUD-Action.

---

## Task 9: Zod-Validation-Schemas

**Files:**
- Modify: `src/lib/utils/validation.ts` (am Ende anhängen)

- [ ] **Step 1: Schemas hinzufügen**

```ts
// Onlinekurse

export const courseVisibilityEnum = z.enum(['public', 'portal', 'both'])

export const createCourseSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(160).regex(/^[a-z0-9-]+$/).optional(),
  subtitle: z.string().max(300).nullable().optional(),
  description: z.string().nullable().optional(),
  visibility: courseVisibilityEnum.optional(),
  useModules: z.boolean().optional(),
  enforceSequential: z.boolean().optional(),
  estimatedMinutes: z.number().int().nonnegative().nullable().optional(),
  coverImageId: z.string().uuid().nullable().optional(),
})
export const updateCourseSchema = createCourseSchema.partial()

export const createCourseModuleSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().nullable().optional(),
})
export const updateCourseModuleSchema = createCourseModuleSchema.partial()

export const reorderItemsSchema = z.array(z.object({
  id: z.string().uuid(),
  position: z.number().int().nonnegative(),
}))

export const createCourseLessonSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(160).regex(/^[a-z0-9-]+$/).optional(),
  moduleId: z.string().uuid().nullable().optional(),
  contentMarkdown: z.string().nullable().optional(),
  videoExternalUrl: z.string().url().nullable().optional(),
  durationMinutes: z.number().int().nonnegative().nullable().optional(),
})
export const updateCourseLessonSchema = createCourseLessonSchema.partial()

export const reorderLessonsSchema = z.array(z.object({
  id: z.string().uuid(),
  position: z.number().int().nonnegative(),
  moduleId: z.string().uuid().nullable().optional(),
}))
```

- [ ] **Step 2: Build prüfen**

Run: `npx tsc --noEmit`
Expected: keine Fehler.

- [ ] **Step 3: Commit**

```bash
git add src/lib/utils/validation.ts
git commit -m "feat(elearning): zod schemas for courses API"
```

---

## Task 10: `/api/v1/courses` Liste + Anlegen + Detail-CRUD

**Files:**
- Create: `src/app/api/v1/courses/route.ts`
- Create: `src/app/api/v1/courses/[id]/route.ts`
- Create: `src/__tests__/integration/api/courses.route.test.ts`

- [ ] **Step 1: Failing test schreiben**

Datei `src/__tests__/integration/api/courses.route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'
import { mockAuthContext } from '../../helpers/mock-auth'
import { createTestRequest, createTestParams } from '../../helpers/mock-request'
import { authFixture, TEST_USER_ID } from '../../helpers/fixtures'

const COURSE_ID = '00000000-0000-0000-0000-0000000000c1'
const courseFixture = (o: Record<string, unknown> = {}) => ({
  id: COURSE_ID, slug: 'kurs-1', title: 'Kurs 1', subtitle: null, description: null,
  coverImageId: null, visibility: 'portal', status: 'draft',
  useModules: false, enforceSequential: false, estimatedMinutes: null,
  createdBy: TEST_USER_ID, publishedAt: null,
  createdAt: new Date(), updatedAt: new Date(), ...o,
})

describe('POST /api/v1/courses', () => {
  let dbMock: ReturnType<typeof setupDbMock>
  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
    mockAuthContext(authFixture())
    vi.doMock('@/lib/services/audit-log.service', () => ({
      AuditLogService: { log: vi.fn().mockResolvedValue(undefined) },
    }))
  })

  it('returns 201 with valid data', async () => {
    dbMock.mockSelect.mockResolvedValueOnce([])
    dbMock.mockInsert.mockResolvedValue([courseFixture()])
    const { POST } = await import('@/app/api/v1/courses/route')
    const req = createTestRequest('POST', '/api/v1/courses', { title: 'Kurs 1' })
    const res = await POST(req)
    expect(res.status).toBe(201)
  })

  it('returns 400 on missing title', async () => {
    const { POST } = await import('@/app/api/v1/courses/route')
    const req = createTestRequest('POST', '/api/v1/courses', {})
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 409 on slug conflict', async () => {
    dbMock.mockSelect.mockResolvedValueOnce([courseFixture()])
    const { POST } = await import('@/app/api/v1/courses/route')
    const req = createTestRequest('POST', '/api/v1/courses', { title: 'Kurs 1', slug: 'kurs-1' })
    const res = await POST(req)
    expect(res.status).toBe(409)
  })
})

describe('GET /api/v1/courses', () => {
  let dbMock: ReturnType<typeof setupDbMock>
  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
    mockAuthContext(authFixture())
  })

  it('returns paged list', async () => {
    dbMock.mockSelect.mockResolvedValueOnce([courseFixture()])
    dbMock.mockSelect.mockResolvedValueOnce([{ count: 1 }])
    const { GET } = await import('@/app/api/v1/courses/route')
    const res = await GET(createTestRequest('GET', '/api/v1/courses'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data).toHaveLength(1)
  })
})

describe('GET /api/v1/courses/[id]', () => {
  let dbMock: ReturnType<typeof setupDbMock>
  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
    mockAuthContext(authFixture())
  })

  it('returns 404 when not found', async () => {
    dbMock.mockSelect.mockResolvedValueOnce([])
    const { GET } = await import('@/app/api/v1/courses/[id]/route')
    const res = await GET(createTestRequest('GET', `/x`),
      { params: createTestParams({ id: COURSE_ID }) })
    expect(res.status).toBe(404)
  })

  it('returns course with modules + lessons', async () => {
    dbMock.mockSelect.mockResolvedValueOnce([courseFixture()])
    dbMock.mockSelect.mockResolvedValueOnce([])
    dbMock.mockSelect.mockResolvedValueOnce([])
    const { GET } = await import('@/app/api/v1/courses/[id]/route')
    const res = await GET(createTestRequest('GET', `/x`),
      { params: createTestParams({ id: COURSE_ID }) })
    expect(res.status).toBe(200)
  })
})
```

- [ ] **Step 2: Test laufen lassen — fail**

Run: `npx vitest run src/__tests__/integration/api/courses.route.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Route `route.ts` implementieren**

Datei `src/app/api/v1/courses/route.ts`:

```ts
import { NextRequest } from 'next/server'
import { apiSuccess, apiValidationError, apiServerError, apiError, parsePaginationParams } from '@/lib/utils/api-response'
import { createCourseSchema, validateAndParse, formatZodErrors } from '@/lib/utils/validation'
import { CourseService, CourseError } from '@/lib/services/course.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  return withPermission(request, 'courses', 'read', async () => {
    const { searchParams } = new URL(request.url)
    const pagination = parsePaginationParams(searchParams)
    const result = await CourseService.list({
      page: pagination.page, limit: pagination.limit,
      status: searchParams.get('status') || undefined,
      visibility: searchParams.get('visibility') || undefined,
      q: searchParams.get('q') || undefined,
    })
    return apiSuccess(result.items, { total: result.total, page: pagination.page, limit: pagination.limit })
  })
}

export async function POST(request: NextRequest) {
  return withPermission(request, 'courses', 'create', async (auth) => {
    try {
      const body = await request.json()
      const v = validateAndParse(createCourseSchema, body)
      if (!v.success) return apiValidationError(formatZodErrors(v.errors))
      const course = await CourseService.create(v.data, { userId: auth.userId, userRole: auth.role ?? null })
      return apiSuccess(course, undefined, 201)
    } catch (err) {
      if (err instanceof CourseError && err.code === 'SLUG_CONFLICT') return apiError('SLUG_CONFLICT', err.message, 409)
      logger.error('Course create failed', err, { module: 'CoursesAPI' })
      return apiServerError()
    }
  })
}
```

- [ ] **Step 4: Route `[id]/route.ts` implementieren**

Datei `src/app/api/v1/courses/[id]/route.ts`:

```ts
import { NextRequest } from 'next/server'
import { apiSuccess, apiValidationError, apiServerError, apiNotFound, apiError } from '@/lib/utils/api-response'
import { updateCourseSchema, validateAndParse, formatZodErrors } from '@/lib/utils/validation'
import { CourseService, CourseError } from '@/lib/services/course.service'
import { CourseModuleService } from '@/lib/services/course-module.service'
import { CourseLessonService } from '@/lib/services/course-lesson.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

interface Ctx { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, ctx: Ctx) {
  return withPermission(request, 'courses', 'read', async () => {
    const { id } = await ctx.params
    const course = await CourseService.get(id)
    if (!course) return apiNotFound(`Kurs ${id} nicht gefunden`)
    const [modules, lessons] = await Promise.all([
      CourseModuleService.listByCourse(id),
      CourseLessonService.listByCourse(id),
    ])
    return apiSuccess({ ...course, modules, lessons })
  })
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  return withPermission(request, 'courses', 'update', async (auth) => {
    try {
      const { id } = await ctx.params
      const body = await request.json()
      const v = validateAndParse(updateCourseSchema, body)
      if (!v.success) return apiValidationError(formatZodErrors(v.errors))
      const updated = await CourseService.update(id, v.data, { userId: auth.userId, userRole: auth.role ?? null })
      return apiSuccess(updated)
    } catch (err) {
      if (err instanceof CourseError) {
        if (err.code === 'NOT_FOUND') return apiNotFound(err.message)
        if (err.code === 'SLUG_CONFLICT') return apiError('SLUG_CONFLICT', err.message, 409)
      }
      logger.error('Course update failed', err, { module: 'CoursesAPI' })
      return apiServerError()
    }
  })
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  return withPermission(request, 'courses', 'delete', async (auth) => {
    try {
      const { id } = await ctx.params
      await CourseService.delete(id, { userId: auth.userId, userRole: auth.role ?? null })
      return apiSuccess({ deleted: true })
    } catch (err) {
      if (err instanceof CourseError && err.code === 'NOT_FOUND') return apiNotFound(err.message)
      logger.error('Course delete failed', err, { module: 'CoursesAPI' })
      return apiServerError()
    }
  })
}
```

- [ ] **Step 5: Test laufen lassen — pass**

Run: `npx vitest run src/__tests__/integration/api/courses.route.test.ts`
Expected: 5 passing.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/v1/courses/route.ts src/app/api/v1/courses/[id]/route.ts src/__tests__/integration/api/courses.route.test.ts
git commit -m "feat(elearning): /api/v1/courses CRUD"
```

---

## Task 11: Publish / Unpublish / Archive Endpoints

**Files:**
- Create: `src/app/api/v1/courses/[id]/publish/route.ts`
- Create: `src/app/api/v1/courses/[id]/unpublish/route.ts`
- Create: `src/app/api/v1/courses/[id]/archive/route.ts`
- Create: `src/__tests__/integration/api/courses-publish.route.test.ts`

- [ ] **Step 1: Failing test schreiben**

Datei `src/__tests__/integration/api/courses-publish.route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'
import { mockAuthContext } from '../../helpers/mock-auth'
import { createTestRequest, createTestParams } from '../../helpers/mock-request'
import { authFixture } from '../../helpers/fixtures'

const COURSE_ID = '00000000-0000-0000-0000-0000000000c1'

describe('POST /api/v1/courses/[id]/publish', () => {
  beforeEach(() => {
    vi.resetModules()
    setupDbMock()
    mockAuthContext(authFixture())
    vi.doMock('@/lib/services/course-publish.service', () => ({
      CoursePublishService: {
        publish: vi.fn().mockResolvedValue({ id: COURSE_ID, status: 'published', publishedAt: new Date() }),
      },
      PublishValidationError: class extends Error { code = 'PUBLISH_VALIDATION'; details: unknown[] = [] },
    }))
  })

  it('returns 200 on successful publish', async () => {
    const { POST } = await import('@/app/api/v1/courses/[id]/publish/route')
    const res = await POST(createTestRequest('POST', `/x`, {}),
      { params: createTestParams({ id: COURSE_ID }) })
    expect(res.status).toBe(200)
  })

  it('returns 422 with details on validation error', async () => {
    vi.resetModules()
    setupDbMock()
    mockAuthContext(authFixture())
    class VErr extends Error { code = 'PUBLISH_VALIDATION'; constructor(public details: unknown[]) { super('x') } }
    vi.doMock('@/lib/services/course-publish.service', () => ({
      CoursePublishService: { publish: vi.fn().mockRejectedValue(new VErr([{ code: 'NO_LESSONS', message: 'x' }])) },
      PublishValidationError: VErr,
    }))
    const { POST } = await import('@/app/api/v1/courses/[id]/publish/route')
    const res = await POST(createTestRequest('POST', `/x`, {}),
      { params: createTestParams({ id: COURSE_ID }) })
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.error.details).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Test laufen lassen — fail**

Run: `npx vitest run src/__tests__/integration/api/courses-publish.route.test.ts`
Expected: FAIL.

- [ ] **Step 3: Routen implementieren**

Datei `src/app/api/v1/courses/[id]/publish/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { apiSuccess, apiServerError } from '@/lib/utils/api-response'
import { CoursePublishService, PublishValidationError } from '@/lib/services/course-publish.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

interface Ctx { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, ctx: Ctx) {
  return withPermission(request, 'courses', 'update', async (auth) => {
    try {
      const { id } = await ctx.params
      const updated = await CoursePublishService.publish(id, { userId: auth.userId, userRole: auth.role ?? null })
      return apiSuccess(updated)
    } catch (err) {
      if (err instanceof PublishValidationError) {
        return NextResponse.json(
          { success: false, error: { code: 'PUBLISH_VALIDATION', message: err.message, details: err.details } },
          { status: 422 },
        )
      }
      logger.error('Course publish failed', err, { module: 'CoursesPublishAPI' })
      return apiServerError()
    }
  })
}
```

Datei `src/app/api/v1/courses/[id]/unpublish/route.ts`:

```ts
import { NextRequest } from 'next/server'
import { apiSuccess, apiServerError, apiNotFound, apiValidationError } from '@/lib/utils/api-response'
import { CourseService, CourseError } from '@/lib/services/course.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

interface Ctx { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, ctx: Ctx) {
  return withPermission(request, 'courses', 'update', async (auth) => {
    try {
      const { id } = await ctx.params
      const updated = await CourseService.unpublish(id, { userId: auth.userId, userRole: auth.role ?? null })
      return apiSuccess(updated)
    } catch (err) {
      if (err instanceof CourseError) {
        if (err.code === 'NOT_FOUND') return apiNotFound(err.message)
        if (err.code === 'INVALID_STATE') return apiValidationError([{ field: 'status', message: err.message }])
      }
      logger.error('Course unpublish failed', err, { module: 'CoursesAPI' })
      return apiServerError()
    }
  })
}
```

Datei `src/app/api/v1/courses/[id]/archive/route.ts`:

```ts
import { NextRequest } from 'next/server'
import { apiSuccess, apiServerError, apiNotFound } from '@/lib/utils/api-response'
import { CourseService, CourseError } from '@/lib/services/course.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

interface Ctx { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, ctx: Ctx) {
  return withPermission(request, 'courses', 'update', async (auth) => {
    try {
      const { id } = await ctx.params
      const updated = await CourseService.archive(id, { userId: auth.userId, userRole: auth.role ?? null })
      return apiSuccess(updated)
    } catch (err) {
      if (err instanceof CourseError && err.code === 'NOT_FOUND') return apiNotFound(err.message)
      logger.error('Course archive failed', err, { module: 'CoursesAPI' })
      return apiServerError()
    }
  })
}
```

- [ ] **Step 4: Test laufen lassen — pass**

Run: `npx vitest run src/__tests__/integration/api/courses-publish.route.test.ts`
Expected: 2 passing.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/v1/courses/[id]/publish src/app/api/v1/courses/[id]/unpublish src/app/api/v1/courses/[id]/archive src/__tests__/integration/api/courses-publish.route.test.ts
git commit -m "feat(elearning): publish/unpublish/archive endpoints"
```

---

## Task 12: Module-CRUD + Reorder

**Files:**
- Create: `src/app/api/v1/courses/[id]/modules/route.ts`
- Create: `src/app/api/v1/courses/[id]/modules/[moduleId]/route.ts`
- Create: `src/app/api/v1/courses/[id]/modules/reorder/route.ts`
- Create: `src/__tests__/integration/api/course-modules.route.test.ts`

- [ ] **Step 1: Failing test schreiben**

Datei `src/__tests__/integration/api/course-modules.route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'
import { mockAuthContext } from '../../helpers/mock-auth'
import { createTestRequest, createTestParams } from '../../helpers/mock-request'
import { authFixture } from '../../helpers/fixtures'

const COURSE_ID = '00000000-0000-0000-0000-0000000000c1'
const MOD_ID    = '00000000-0000-0000-0000-0000000000d1'

describe('Course modules API', () => {
  beforeEach(() => {
    vi.resetModules()
    setupDbMock()
    mockAuthContext(authFixture())
    vi.doMock('@/lib/services/course-module.service', () => ({
      CourseModuleService: {
        create: vi.fn().mockResolvedValue({ id: MOD_ID, courseId: COURSE_ID, position: 1, title: 'M1' }),
        update: vi.fn().mockResolvedValue({ id: MOD_ID, courseId: COURSE_ID, position: 1, title: 'M1neu' }),
        delete: vi.fn().mockResolvedValue(undefined),
        reorder: vi.fn().mockResolvedValue(undefined),
      },
      CourseModuleError: class extends Error { code = 'NOT_FOUND' },
    }))
  })

  it('POST creates module and returns 201', async () => {
    const { POST } = await import('@/app/api/v1/courses/[id]/modules/route')
    const res = await POST(createTestRequest('POST', `/x`, { title: 'M1' }),
      { params: createTestParams({ id: COURSE_ID }) })
    expect(res.status).toBe(201)
  })

  it('PATCH updates module', async () => {
    const { PATCH } = await import('@/app/api/v1/courses/[id]/modules/[moduleId]/route')
    const res = await PATCH(createTestRequest('PATCH', `/x`, { title: 'M1neu' }),
      { params: createTestParams({ id: COURSE_ID, moduleId: MOD_ID }) })
    expect(res.status).toBe(200)
  })

  it('POST reorder returns 200', async () => {
    const { POST } = await import('@/app/api/v1/courses/[id]/modules/reorder/route')
    const res = await POST(createTestRequest('POST', '/x', [{ id: MOD_ID, position: 1 }]),
      { params: createTestParams({ id: COURSE_ID }) })
    expect(res.status).toBe(200)
  })
})
```

- [ ] **Step 2: Test laufen lassen — fail**

Run: `npx vitest run src/__tests__/integration/api/course-modules.route.test.ts`
Expected: FAIL.

- [ ] **Step 3: Routen implementieren**

Datei `src/app/api/v1/courses/[id]/modules/route.ts`:

```ts
import { NextRequest } from 'next/server'
import { apiSuccess, apiValidationError, apiServerError } from '@/lib/utils/api-response'
import { createCourseModuleSchema, validateAndParse, formatZodErrors } from '@/lib/utils/validation'
import { CourseModuleService } from '@/lib/services/course-module.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

interface Ctx { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, ctx: Ctx) {
  return withPermission(request, 'courses', 'update', async (auth) => {
    try {
      const { id } = await ctx.params
      const body = await request.json()
      const v = validateAndParse(createCourseModuleSchema, body)
      if (!v.success) return apiValidationError(formatZodErrors(v.errors))
      const mod = await CourseModuleService.create(id, v.data, { userId: auth.userId, userRole: auth.role ?? null })
      return apiSuccess(mod, undefined, 201)
    } catch (err) {
      logger.error('Module create failed', err, { module: 'CourseModulesAPI' })
      return apiServerError()
    }
  })
}
```

Datei `src/app/api/v1/courses/[id]/modules/[moduleId]/route.ts`:

```ts
import { NextRequest } from 'next/server'
import { apiSuccess, apiValidationError, apiServerError, apiNotFound } from '@/lib/utils/api-response'
import { updateCourseModuleSchema, validateAndParse, formatZodErrors } from '@/lib/utils/validation'
import { CourseModuleService, CourseModuleError } from '@/lib/services/course-module.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

interface Ctx { params: Promise<{ id: string; moduleId: string }> }

export async function PATCH(request: NextRequest, ctx: Ctx) {
  return withPermission(request, 'courses', 'update', async (auth) => {
    try {
      const { moduleId } = await ctx.params
      const body = await request.json()
      const v = validateAndParse(updateCourseModuleSchema, body)
      if (!v.success) return apiValidationError(formatZodErrors(v.errors))
      const mod = await CourseModuleService.update(moduleId, v.data, { userId: auth.userId, userRole: auth.role ?? null })
      return apiSuccess(mod)
    } catch (err) {
      if (err instanceof CourseModuleError && err.code === 'NOT_FOUND') return apiNotFound(err.message)
      logger.error('Module update failed', err, { module: 'CourseModulesAPI' })
      return apiServerError()
    }
  })
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  return withPermission(request, 'courses', 'update', async (auth) => {
    try {
      const { moduleId } = await ctx.params
      await CourseModuleService.delete(moduleId, { userId: auth.userId, userRole: auth.role ?? null })
      return apiSuccess({ deleted: true })
    } catch (err) {
      logger.error('Module delete failed', err, { module: 'CourseModulesAPI' })
      return apiServerError()
    }
  })
}
```

Datei `src/app/api/v1/courses/[id]/modules/reorder/route.ts`:

```ts
import { NextRequest } from 'next/server'
import { apiSuccess, apiValidationError, apiServerError } from '@/lib/utils/api-response'
import { reorderItemsSchema, validateAndParse, formatZodErrors } from '@/lib/utils/validation'
import { CourseModuleService } from '@/lib/services/course-module.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

interface Ctx { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, ctx: Ctx) {
  return withPermission(request, 'courses', 'update', async (auth) => {
    try {
      const { id } = await ctx.params
      const body = await request.json()
      const v = validateAndParse(reorderItemsSchema, body)
      if (!v.success) return apiValidationError(formatZodErrors(v.errors))
      await CourseModuleService.reorder(id, v.data, { userId: auth.userId, userRole: auth.role ?? null })
      return apiSuccess({ reordered: v.data.length })
    } catch (err) {
      logger.error('Module reorder failed', err, { module: 'CourseModulesAPI' })
      return apiServerError()
    }
  })
}
```

- [ ] **Step 4: Test laufen lassen — pass**

Run: `npx vitest run src/__tests__/integration/api/course-modules.route.test.ts`
Expected: 3 passing.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/v1/courses/[id]/modules src/__tests__/integration/api/course-modules.route.test.ts
git commit -m "feat(elearning): module CRUD + reorder API"
```

---

## Task 13: Lesson-CRUD + Reorder

**Files:**
- Create: `src/app/api/v1/courses/[id]/lessons/route.ts`
- Create: `src/app/api/v1/courses/[id]/lessons/[lessonId]/route.ts`
- Create: `src/app/api/v1/courses/[id]/lessons/reorder/route.ts`
- Create: `src/__tests__/integration/api/course-lessons.route.test.ts`

- [ ] **Step 1: Failing test schreiben**

Analog Task 12, ersetze in den Tests `module` durch `lesson`, `MOD_ID` durch `LESSON_ID = '00000000-0000-0000-0000-0000000000e1'`, mocke `CourseLessonService` mit `create/update/delete/reorder/get`. Plus zusätzlicher Test:

```ts
it('GET lesson returns 200 with assets', async () => {
  vi.doMock('@/lib/services/course-lesson.service', () => ({
    CourseLessonService: { get: vi.fn().mockResolvedValue({ id: LESSON_ID, title: 'L', courseId: COURSE_ID, slug: 'l', position: 1 }) },
    CourseLessonError: class extends Error { code = '' },
  }))
  vi.doMock('@/lib/services/course-asset.service', () => ({
    CourseAssetService: { listByLesson: vi.fn().mockResolvedValue([]) },
  }))
  const { GET } = await import('@/app/api/v1/courses/[id]/lessons/[lessonId]/route')
  const res = await GET(createTestRequest('GET', '/x'),
    { params: createTestParams({ id: COURSE_ID, lessonId: LESSON_ID }) })
  expect(res.status).toBe(200)
})
```

- [ ] **Step 2: Test laufen lassen — fail**

Run: `npx vitest run src/__tests__/integration/api/course-lessons.route.test.ts`
Expected: FAIL.

- [ ] **Step 3: Routen implementieren**

Datei `src/app/api/v1/courses/[id]/lessons/route.ts`:

```ts
import { NextRequest } from 'next/server'
import { apiSuccess, apiValidationError, apiServerError, apiConflict } from '@/lib/utils/api-response'
import { createCourseLessonSchema, validateAndParse, formatZodErrors } from '@/lib/utils/validation'
import { CourseLessonService, CourseLessonError } from '@/lib/services/course-lesson.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

interface Ctx { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, ctx: Ctx) {
  return withPermission(request, 'courses', 'update', async (auth) => {
    try {
      const { id } = await ctx.params
      const body = await request.json()
      const v = validateAndParse(createCourseLessonSchema, body)
      if (!v.success) return apiValidationError(formatZodErrors(v.errors))
      const lesson = await CourseLessonService.create(id, v.data, { userId: auth.userId, userRole: auth.role ?? null })
      return apiSuccess(lesson, undefined, 201)
    } catch (err) {
      if (err instanceof CourseLessonError && err.code === 'SLUG_CONFLICT') return apiError('SLUG_CONFLICT', err.message, 409)
      logger.error('Lesson create failed', err, { module: 'CourseLessonsAPI' })
      return apiServerError()
    }
  })
}
```

Datei `src/app/api/v1/courses/[id]/lessons/[lessonId]/route.ts`:

```ts
import { NextRequest } from 'next/server'
import { apiSuccess, apiValidationError, apiServerError, apiNotFound, apiError } from '@/lib/utils/api-response'
import { updateCourseLessonSchema, validateAndParse, formatZodErrors } from '@/lib/utils/validation'
import { CourseLessonService, CourseLessonError } from '@/lib/services/course-lesson.service'
import { CourseAssetService } from '@/lib/services/course-asset.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

interface Ctx { params: Promise<{ id: string; lessonId: string }> }

export async function GET(request: NextRequest, ctx: Ctx) {
  return withPermission(request, 'courses', 'read', async () => {
    const { lessonId } = await ctx.params
    const lesson = await CourseLessonService.get(lessonId)
    if (!lesson) return apiNotFound(`Lektion ${lessonId} nicht gefunden`)
    const assets = await CourseAssetService.listByLesson(lessonId)
    return apiSuccess({ ...lesson, assets })
  })
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  return withPermission(request, 'courses', 'update', async (auth) => {
    try {
      const { lessonId } = await ctx.params
      const body = await request.json()
      const v = validateAndParse(updateCourseLessonSchema, body)
      if (!v.success) return apiValidationError(formatZodErrors(v.errors))
      const lesson = await CourseLessonService.update(lessonId, v.data, { userId: auth.userId, userRole: auth.role ?? null })
      return apiSuccess(lesson)
    } catch (err) {
      if (err instanceof CourseLessonError) {
        if (err.code === 'NOT_FOUND') return apiNotFound(err.message)
        if (err.code === 'SLUG_CONFLICT') return apiError('SLUG_CONFLICT', err.message, 409)
      }
      logger.error('Lesson update failed', err, { module: 'CourseLessonsAPI' })
      return apiServerError()
    }
  })
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  return withPermission(request, 'courses', 'update', async (auth) => {
    try {
      const { lessonId } = await ctx.params
      await CourseLessonService.delete(lessonId, { userId: auth.userId, userRole: auth.role ?? null })
      return apiSuccess({ deleted: true })
    } catch (err) {
      logger.error('Lesson delete failed', err, { module: 'CourseLessonsAPI' })
      return apiServerError()
    }
  })
}
```

Datei `src/app/api/v1/courses/[id]/lessons/reorder/route.ts`:

```ts
import { NextRequest } from 'next/server'
import { apiSuccess, apiValidationError, apiServerError } from '@/lib/utils/api-response'
import { reorderLessonsSchema, validateAndParse, formatZodErrors } from '@/lib/utils/validation'
import { CourseLessonService } from '@/lib/services/course-lesson.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

interface Ctx { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, ctx: Ctx) {
  return withPermission(request, 'courses', 'update', async (auth) => {
    try {
      const { id } = await ctx.params
      const body = await request.json()
      const v = validateAndParse(reorderLessonsSchema, body)
      if (!v.success) return apiValidationError(formatZodErrors(v.errors))
      await CourseLessonService.reorder(id, v.data, { userId: auth.userId, userRole: auth.role ?? null })
      return apiSuccess({ reordered: v.data.length })
    } catch (err) {
      logger.error('Lesson reorder failed', err, { module: 'CourseLessonsAPI' })
      return apiServerError()
    }
  })
}
```

- [ ] **Step 4: Test laufen lassen — pass**

Run: `npx vitest run src/__tests__/integration/api/course-lessons.route.test.ts`
Expected: alle Tests grün.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/v1/courses/[id]/lessons src/__tests__/integration/api/course-lessons.route.test.ts
git commit -m "feat(elearning): lesson CRUD + reorder API"
```

---

## Task 14: Asset-Upload + Delete

**Files:**
- Create: `src/app/api/v1/courses/[id]/assets/route.ts`
- Create: `src/app/api/v1/courses/[id]/assets/[assetId]/route.ts`
- Create: `src/__tests__/integration/api/course-assets.route.test.ts`
- Modify: `next.config.ts`

- [ ] **Step 1: Failing test schreiben**

Datei `src/__tests__/integration/api/course-assets.route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'
import { mockAuthContext } from '../../helpers/mock-auth'
import { createTestParams } from '../../helpers/mock-request'
import { authFixture, TEST_USER_ID } from '../../helpers/fixtures'

const COURSE_ID = '00000000-0000-0000-0000-0000000000c1'
const LESSON_ID = '00000000-0000-0000-0000-0000000000e1'
const ASSET_ID  = '00000000-0000-0000-0000-0000000000f1'

describe('POST /api/v1/courses/[id]/assets', () => {
  beforeEach(() => {
    vi.resetModules()
    setupDbMock()
    mockAuthContext(authFixture())
  })

  it('returns 201 on valid video upload', async () => {
    vi.doMock('@/lib/services/course-asset.service', () => ({
      CourseAssetService: {
        uploadForLesson: vi.fn().mockResolvedValue({
          id: ASSET_ID, courseId: COURSE_ID, lessonId: LESSON_ID,
          kind: 'video', filename: 'x.mp4', originalName: 'x.mp4',
          mimeType: 'video/mp4', sizeBytes: 1024, path: `${COURSE_ID}/${ASSET_ID}.mp4`,
          uploadedBy: TEST_USER_ID, createdAt: new Date(),
        }),
      },
      CourseAssetError: class extends Error { code = '' },
    }))
    const fd = new FormData()
    fd.append('file', new File([new Uint8Array(10)], 'x.mp4', { type: 'video/mp4' }))
    fd.append('kind', 'video')
    fd.append('lessonId', LESSON_ID)
    const req = new Request(`http://x/`, { method: 'POST', body: fd })
    const { POST } = await import('@/app/api/v1/courses/[id]/assets/route')
    const res = await POST(req as never, { params: createTestParams({ id: COURSE_ID }) })
    expect(res.status).toBe(201)
  })

  it('returns 413 when file exceeds limit', async () => {
    class AssetErr extends Error { constructor(public code: string, m: string) { super(m) } }
    vi.doMock('@/lib/services/course-asset.service', () => ({
      CourseAssetService: { uploadForLesson: vi.fn().mockRejectedValue(new AssetErr('FILE_TOO_LARGE', 'too big')) },
      CourseAssetError: AssetErr,
    }))
    const fd = new FormData()
    fd.append('file', new File([new Uint8Array(10)], 'x.mp4', { type: 'video/mp4' }))
    fd.append('kind', 'video')
    fd.append('lessonId', LESSON_ID)
    const req = new Request(`http://x/`, { method: 'POST', body: fd })
    const { POST } = await import('@/app/api/v1/courses/[id]/assets/route')
    const res = await POST(req as never, { params: createTestParams({ id: COURSE_ID }) })
    expect(res.status).toBe(413)
  })
})
```

- [ ] **Step 2: Test laufen lassen — fail**

Run: `npx vitest run src/__tests__/integration/api/course-assets.route.test.ts`
Expected: FAIL.

- [ ] **Step 3: Upload-Route implementieren**

Datei `src/app/api/v1/courses/[id]/assets/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { apiSuccess, apiServerError, apiValidationError } from '@/lib/utils/api-response'
import { CourseAssetService, CourseAssetError } from '@/lib/services/course-asset.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

interface Ctx { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, ctx: Ctx) {
  return withPermission(request, 'courses', 'update', async (auth) => {
    try {
      const { id: courseId } = await ctx.params
      const form = await request.formData()
      const file = form.get('file')
      const kind = String(form.get('kind') ?? '')
      const lessonId = String(form.get('lessonId') ?? '')
      const label = form.get('label') ? String(form.get('label')) : undefined

      if (!(file instanceof File)) return apiValidationError([{ field: 'file', message: 'Datei fehlt' }])
      if (kind !== 'video' && kind !== 'document') {
        return apiValidationError([{ field: 'kind', message: 'kind muss video oder document sein' }])
      }
      if (!lessonId) return apiValidationError([{ field: 'lessonId', message: 'lessonId fehlt' }])

      const asset = await CourseAssetService.uploadForLesson(
        lessonId, courseId, file, kind, label,
        { userId: auth.userId, userRole: auth.role ?? null },
      )
      return apiSuccess(asset, undefined, 201)
    } catch (err) {
      if (err instanceof CourseAssetError) {
        if (err.code === 'FILE_TOO_LARGE') {
          return NextResponse.json(
            { success: false, error: { code: 'FILE_TOO_LARGE', message: err.message } },
            { status: 413 },
          )
        }
        if (err.code === 'INVALID_MIME') return apiValidationError([{ field: 'file', message: err.message }])
      }
      logger.error('Asset upload failed', err, { module: 'CourseAssetsAPI' })
      return apiServerError()
    }
  })
}
```

Datei `src/app/api/v1/courses/[id]/assets/[assetId]/route.ts`:

```ts
import { NextRequest } from 'next/server'
import { apiSuccess, apiServerError, apiNotFound } from '@/lib/utils/api-response'
import { CourseAssetService, CourseAssetError } from '@/lib/services/course-asset.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

interface Ctx { params: Promise<{ id: string; assetId: string }> }

export async function DELETE(request: NextRequest, ctx: Ctx) {
  return withPermission(request, 'courses', 'update', async (auth) => {
    try {
      const { assetId } = await ctx.params
      await CourseAssetService.delete(assetId, { userId: auth.userId, userRole: auth.role ?? null })
      return apiSuccess({ deleted: true })
    } catch (err) {
      if (err instanceof CourseAssetError && err.code === 'NOT_FOUND') return apiNotFound(err.message)
      logger.error('Asset delete failed', err, { module: 'CourseAssetsAPI' })
      return apiServerError()
    }
  })
}
```

- [ ] **Step 4: Body-Limit anheben in `next.config.ts`**

Im bestehenden `next.config.ts` ergänzen (oder bestehenden `experimental`-Block erweitern):

```ts
// next.config.ts
const nextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: '2200mb' },
  },
  // ... bestehend
}
```

Falls Coolify NGINX-Reverse-Proxy verwendet wird, in der Coolify-Konfiguration `client_max_body_size 2200m;` für das Service-Setup dokumentieren (in `README.md` unter "Deployment" einen kurzen Block ergänzen).

- [ ] **Step 5: Test laufen lassen — pass**

Run: `npx vitest run src/__tests__/integration/api/course-assets.route.test.ts`
Expected: 2 passing.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/v1/courses/[id]/assets src/__tests__/integration/api/course-assets.route.test.ts next.config.ts
git commit -m "feat(elearning): asset upload/delete API + body-limit"
```

---

## Task 15: Asset-Serve mit Range-Request

**Files:**
- Create: `src/app/api/v1/courses/assets/serve/[...path]/route.ts`
- Create: `src/__tests__/integration/api/course-assets-serve.route.test.ts`

Range-Requests sind die einzige Möglichkeit, Videos im `<video>`-Tag zu seeken. Bei Sub-Projekt 1 ist Zugriff nur für eingeloggte User mit `('courses', 'read')` erlaubt.

- [ ] **Step 1: Failing test schreiben**

Datei `src/__tests__/integration/api/course-assets-serve.route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'
import { mockAuthContext } from '../../helpers/mock-auth'
import { createTestParams } from '../../helpers/mock-request'
import { authFixture } from '../../helpers/fixtures'
import path from 'path'
import os from 'os'
import fs from 'fs/promises'

describe('GET /api/v1/courses/assets/serve/[...path]', () => {
  let tmpDir: string
  let testFile: string

  beforeEach(async () => {
    vi.resetModules()
    setupDbMock()
    mockAuthContext(authFixture())
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'serve-'))
    process.env.COURSE_ASSET_DIR = tmpDir
    testFile = path.join(tmpDir, 'a', 'b.bin')
    await fs.mkdir(path.dirname(testFile), { recursive: true })
    await fs.writeFile(testFile, Buffer.alloc(1000, 1))
  })

  it('returns 200 + full body without Range header', async () => {
    const req = new Request('http://x/')
    const { GET } = await import('@/app/api/v1/courses/assets/serve/[...path]/route')
    const res = await GET(req as never, { params: createTestParams({ path: ['a', 'b.bin'] }) })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-length')).toBe('1000')
    expect(res.headers.get('accept-ranges')).toBe('bytes')
  })

  it('returns 206 + correct Content-Range with Range header', async () => {
    const req = new Request('http://x/', { headers: { range: 'bytes=0-99' } })
    const { GET } = await import('@/app/api/v1/courses/assets/serve/[...path]/route')
    const res = await GET(req as never, { params: createTestParams({ path: ['a', 'b.bin'] }) })
    expect(res.status).toBe(206)
    expect(res.headers.get('content-range')).toBe('bytes 0-99/1000')
    expect(res.headers.get('content-length')).toBe('100')
  })

  it('rejects path traversal with 400', async () => {
    const req = new Request('http://x/')
    const { GET } = await import('@/app/api/v1/courses/assets/serve/[...path]/route')
    const res = await GET(req as never, { params: createTestParams({ path: ['..', '..', 'etc', 'passwd'] }) })
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 2: Test laufen lassen — fail**

Run: `npx vitest run src/__tests__/integration/api/course-assets-serve.route.test.ts`
Expected: FAIL.

- [ ] **Step 3: Route implementieren**

Datei `src/app/api/v1/courses/assets/serve/[...path]/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { withPermission } from '@/lib/auth/require-permission'
import path from 'path'
import { stat, open } from 'fs/promises'

interface Ctx { params: Promise<{ path: string[] }> }

function assetDir(): string {
  return path.resolve(process.env.COURSE_ASSET_DIR
    ?? path.join(process.cwd(), 'public', 'uploads', 'courses'))
}

function mimeFor(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  return {
    '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
    '.pdf': 'application/pdf', '.zip': 'application/zip',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  }[ext] ?? 'application/octet-stream'
}

export async function GET(request: NextRequest, ctx: Ctx) {
  return withPermission(request, 'courses', 'read', async () => {
    const { path: parts } = await ctx.params
    const base = assetDir()
    const candidate = path.resolve(base, ...parts)
    if (!candidate.startsWith(base + path.sep) && candidate !== base) {
      return NextResponse.json({ success: false, error: { code: 'BAD_PATH', message: 'Path traversal detected' } }, { status: 400 })
    }

    let st
    try { st = await stat(candidate) } catch { return NextResponse.json({ success: false, error: { code: 'NOT_FOUND' } }, { status: 404 }) }
    if (!st.isFile()) return NextResponse.json({ success: false, error: { code: 'NOT_A_FILE' } }, { status: 404 })

    const total = st.size
    const range = request.headers.get('range')
    const fh = await open(candidate, 'r')

    if (range) {
      const m = /^bytes=(\d+)-(\d*)$/.exec(range)
      if (!m) {
        await fh.close()
        return new NextResponse(null, { status: 416, headers: { 'Content-Range': `bytes */${total}` } })
      }
      const start = Number(m[1])
      const end = m[2] ? Math.min(Number(m[2]), total - 1) : total - 1
      if (start > end || start >= total) {
        await fh.close()
        return new NextResponse(null, { status: 416, headers: { 'Content-Range': `bytes */${total}` } })
      }
      const stream = fh.createReadStream({ start, end })
      return new NextResponse(stream as unknown as ReadableStream, {
        status: 206,
        headers: {
          'Content-Type': mimeFor(candidate),
          'Content-Length': String(end - start + 1),
          'Content-Range': `bytes ${start}-${end}/${total}`,
          'Accept-Ranges': 'bytes',
        },
      })
    }

    const stream = fh.createReadStream()
    return new NextResponse(stream as unknown as ReadableStream, {
      status: 200,
      headers: {
        'Content-Type': mimeFor(candidate),
        'Content-Length': String(total),
        'Accept-Ranges': 'bytes',
      },
    })
  })
}
```

- [ ] **Step 4: Test laufen lassen — pass**

Run: `npx vitest run src/__tests__/integration/api/course-assets-serve.route.test.ts`
Expected: 3 passing.

- [ ] **Step 5: Final-Check — alle API-Tests grün**

Run: `npx vitest run src/__tests__/integration/api/courses.route.test.ts src/__tests__/integration/api/course-modules.route.test.ts src/__tests__/integration/api/course-lessons.route.test.ts src/__tests__/integration/api/course-assets.route.test.ts src/__tests__/integration/api/course-assets-serve.route.test.ts src/__tests__/integration/api/courses-publish.route.test.ts`
Expected: alle Tests grün.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/v1/courses/assets/serve src/__tests__/integration/api/course-assets-serve.route.test.ts
git commit -m "feat(elearning): asset serve with range-request support"
```

---

## Pakets-Abschluss

- [ ] **Plan-Datei committen**

```bash
git add docs/superpowers/plans/2026-04-26-onlinekurse-sub1b-api.md
git commit -m "docs(elearning): plan 1b api"
```

**Nächstes Paket:** `docs/superpowers/plans/2026-04-26-onlinekurse-sub1c-ui.md` — Intern-UI.
