# Onlinekurse Sub-Projekt 2 — Public + Portal Player — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Public + Portal Player für freie Onlinekurse — visibility-aware Asset-ACL, geteilte Player-Komponenten, SSR-SEO + sitemap.

**Architecture:** Read-only Service `CoursePublicService` mit Visibility-Filter. Asset-Serve-Route bekommt einen `tryWithPermission`-Fallback auf `checkAssetAccess` (LRU-Cache, TTL 5 min). Geteilte Player-Komponenten in `src/components/elearning/` werden von dünnen Surface-Wrappern unter `/(public)/kurse/...` und `/portal/kurse/...` konsumiert. Server-Components für SEO + Initial-Render, Client-Inseln nur für interaktive Teile (Sheet-State).

**Tech Stack:** Next.js 15 (App Router), Drizzle, react-markdown, sonner, Vitest. Bestehende Shadcn-Primitives + shared `EmptyState`, `LoadingSpinner`. Keine neuen Deps.

**Spec:** `docs/superpowers/specs/2026-04-27-onlinekurse-sub2-player-design.md`

**Voraussetzung:** Sub-1 ist gemerged in main (Schema, Services, Intern-UI, Restore-Endpoint, UI-Polish).

---

## Task 1: `tryWithPermission`-Helper

**Files:**
- Modify: `src/lib/auth/require-permission.ts`
- Create: `src/__tests__/unit/auth/try-with-permission.test.ts`

- [ ] **Step 1: Failing test schreiben**

Datei `src/__tests__/unit/auth/try-with-permission.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

describe('tryWithPermission', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('returns { allowed: false } when no auth context', async () => {
    vi.doMock('@/lib/auth/auth-context', () => ({
      getAuthContext: vi.fn().mockResolvedValue(null),
    }))
    const { tryWithPermission } = await import('@/lib/auth/require-permission')
    const req = new NextRequest('http://localhost/x')
    const result = await tryWithPermission(req, 'courses', 'read')
    expect(result.allowed).toBe(false)
  })

  it('returns { allowed: true, auth } when admin user', async () => {
    vi.doMock('@/lib/auth/auth-context', () => ({
      getAuthContext: vi.fn().mockResolvedValue({
        userId: 'u1', role: 'admin', roleId: null,
      }),
    }))
    vi.doMock('@/lib/auth/permissions', () => ({
      hasPermission: vi.fn().mockResolvedValue(false),
    }))
    const { tryWithPermission } = await import('@/lib/auth/require-permission')
    const req = new NextRequest('http://localhost/x')
    const result = await tryWithPermission(req, 'courses', 'read')
    expect(result.allowed).toBe(true)
    if (result.allowed) {
      expect(result.auth.role).toBe('admin')
    }
  })

  it('returns { allowed: false } for viewer trying update', async () => {
    vi.doMock('@/lib/auth/auth-context', () => ({
      getAuthContext: vi.fn().mockResolvedValue({
        userId: 'u1', role: 'viewer', roleId: null,
      }),
    }))
    vi.doMock('@/lib/auth/permissions', () => ({
      hasPermission: vi.fn().mockResolvedValue(false),
    }))
    const { tryWithPermission } = await import('@/lib/auth/require-permission')
    const req = new NextRequest('http://localhost/x')
    const result = await tryWithPermission(req, 'courses', 'update')
    expect(result.allowed).toBe(false)
  })
})
```

- [ ] **Step 2: Test laufen lassen — fail**

Run: `npx vitest run src/__tests__/unit/auth/try-with-permission.test.ts`
Expected: FAIL — `tryWithPermission` is not exported.

- [ ] **Step 3: Auth/Permission-Logik in interne Helper-Funktion extrahieren**

In `src/lib/auth/require-permission.ts` die Logik refactoren — bestehender `withPermission` ruft den Helper, neuer `tryWithPermission` auch. Datei am Ende vollständig:

```ts
import { NextRequest } from 'next/server'
import { apiForbidden, apiUnauthorized } from '@/lib/utils/api-response'
import { getAuthContext, type AuthContext } from './auth-context'
import { hasPermission } from './permissions'
import type { Module, Action } from '@/lib/types/permissions'

type CheckResult =
  | { allowed: true; auth: AuthContext }
  | { allowed: false; reason: 'unauthenticated' | 'forbidden' }

async function checkPermission(
  request: NextRequest,
  module: Module,
  action: Action,
): Promise<CheckResult> {
  const auth = await getAuthContext(request)
  if (!auth) return { allowed: false, reason: 'unauthenticated' }

  if (auth.role === 'api') {
    const scopes: string[] = auth.apiKeyPermissions ?? ['*']
    if (!scopes.includes('*') && !scopes.includes(`${module}:${action}`)) {
      return { allowed: false, reason: 'forbidden' }
    }
    return { allowed: true, auth }
  }

  if (auth.roleId) {
    const allowed = await hasPermission(auth.roleId, module, action)
    if (allowed) return { allowed: true, auth }
  }

  if (auth.role === 'owner' || auth.role === 'admin') {
    return { allowed: true, auth }
  }

  if (auth.role === 'member') {
    if (action === 'read' || action === 'create' || action === 'update') {
      return { allowed: true, auth }
    }
    return { allowed: false, reason: 'forbidden' }
  }

  if (auth.role === 'viewer') {
    if (action === 'read') return { allowed: true, auth }
    return { allowed: false, reason: 'forbidden' }
  }

  return { allowed: false, reason: 'forbidden' }
}

export async function withPermission(
  request: NextRequest,
  module: Module,
  action: Action,
  handler: (auth: AuthContext) => Promise<Response>,
): Promise<Response> {
  const result = await checkPermission(request, module, action)
  if (!result.allowed) {
    if (result.reason === 'unauthenticated') return apiUnauthorized()
    return apiForbidden('Keine Berechtigung für diese Aktion')
  }
  return handler(result.auth)
}

export async function tryWithPermission(
  request: NextRequest,
  module: Module,
  action: Action,
): Promise<{ allowed: true; auth: AuthContext } | { allowed: false }> {
  const result = await checkPermission(request, module, action)
  if (result.allowed) return { allowed: true, auth: result.auth }
  return { allowed: false }
}
```

- [ ] **Step 4: Test laufen lassen — pass**

Run: `npx vitest run src/__tests__/unit/auth/try-with-permission.test.ts`
Expected: 3 passing.

- [ ] **Step 5: Bestehende withPermission-Tests grün halten**

Run: `npx vitest run src/__tests__/unit/auth/`
Expected: keine Regression.

- [ ] **Step 6: Commit**

```bash
git add src/lib/auth/require-permission.ts src/__tests__/unit/auth/try-with-permission.test.ts
git commit -m "feat(auth): tryWithPermission helper with shared check logic"
```

---

## Task 2: `course-asset-acl` LRU-Cache-Modul

**Files:**
- Create: `src/lib/utils/course-asset-acl.ts`
- Create: `src/__tests__/unit/utils/course-asset-acl.test.ts`

- [ ] **Step 1: Failing test schreiben**

Datei `src/__tests__/unit/utils/course-asset-acl.test.ts` — komplette Test-Datei (10 Tests: path-parse, missing row, draft, archived, public+anon, both+anon, portal+anon=403, portal+session=allow, cache-hit-zaehlt, invalidate-forces-refetch). Pattern wie bei anderen Service-Tests im Repo (`setupDbMock`, `mockSelect.mockResolvedValueOnce`).

Skelett:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'

const ASSET_ID = '00000000-0000-0000-0000-0000000000a1'
const COURSE_ID = '00000000-0000-0000-0000-0000000000c1'
const PATH = `${COURSE_ID}/${ASSET_ID}.mp4`

describe('checkAssetAccess', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
  })

  async function getAcl() {
    const mod = await import('@/lib/utils/course-asset-acl')
    mod.__resetCacheForTests()
    return mod
  }

  it('returns 404 when path cannot be parsed', async () => {
    const { checkAssetAccess } = await getAcl()
    const result = await checkAssetAccess('garbage', null)
    expect(result).toEqual({ allowed: false, status: 404 })
  })
  // ... weitere 9 Tests analog (siehe Task-Detail-Liste oben)
})
```

Vollständige Test-Liste:
1. `returns 404 when path cannot be parsed` (input `'garbage'`)
2. `returns 404 when asset row missing` (mockSelect → `[]`)
3. `returns 404 when course is draft` (mockSelect → `[{courseId, visibility:'public', status:'draft'}]`)
4. `returns 404 when course is archived` (status:'archived')
5. `allows anonymous access for visibility=public + published`
6. `allows anonymous access for visibility=both + published`
7. `returns 403 for visibility=portal without session` (`session=null`)
8. `allows visibility=portal with session` (`session={user:{id:'u1'}}`)
9. `caches DB lookup — second call hits cache` — nur 1× mockResolvedValueOnce queued, 2× aufrufen, erwarten `dbMock.db.select.toHaveBeenCalledTimes(1)`
10. `invalidateAssetAccess forces re-fetch on next call` — 1× call, dann `invalidateAssetAccess(ASSET_ID)`, dann andere mocked Antwort, dann erneut prüfen, erwarten `toHaveBeenCalledTimes(2)`

- [ ] **Step 2: Test laufen lassen — fail**

Run: `npx vitest run src/__tests__/unit/utils/course-asset-acl.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: ACL-Modul implementieren**

Datei `src/lib/utils/course-asset-acl.ts`:

```ts
import { db } from '@/lib/db'
import { courseAssets, courses } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export interface SessionLike {
  user?: { id: string } | null
}

export type AssetAccessResult =
  | { allowed: true }
  | { allowed: false; status: 403 | 404 }

interface CachedAccess {
  courseId: string
  visibility: 'public' | 'portal' | 'both'
  status: 'draft' | 'published' | 'archived'
  cachedAt: number
}

const TTL_MS = 5 * 60 * 1000
const MAX_ENTRIES = 500
const cache = new Map<string, CachedAccess>()

function isStale(entry: CachedAccess): boolean {
  return Date.now() - entry.cachedAt > TTL_MS
}

function evictIfFull(): void {
  while (cache.size >= MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value
    if (!oldestKey) break
    cache.delete(oldestKey)
  }
}

const ASSET_PATH_RE = /^[0-9a-f-]{36}\/([0-9a-f-]{36})\.[a-zA-Z0-9]+$/

function extractAssetId(path: string): string | null {
  const m = ASSET_PATH_RE.exec(path)
  return m ? m[1] : null
}

async function loadAssetAccessFromDb(assetId: string): Promise<Omit<CachedAccess, 'cachedAt'> | null> {
  const rows = await db
    .select({
      courseId: courseAssets.courseId,
      visibility: courses.visibility,
      status: courses.status,
    })
    .from(courseAssets)
    .leftJoin(courses, eq(courseAssets.courseId, courses.id))
    .where(eq(courseAssets.id, assetId))
    .limit(1)
  const row = rows[0]
  if (!row || !row.courseId || !row.visibility || !row.status) return null
  return {
    courseId: row.courseId,
    visibility: row.visibility as CachedAccess['visibility'],
    status: row.status as CachedAccess['status'],
  }
}

export async function checkAssetAccess(
  assetPath: string,
  session: SessionLike | null,
): Promise<AssetAccessResult> {
  const assetId = extractAssetId(assetPath)
  if (!assetId) return { allowed: false, status: 404 }

  let entry = cache.get(assetId)
  if (!entry || isStale(entry)) {
    const fresh = await loadAssetAccessFromDb(assetId)
    if (!fresh) return { allowed: false, status: 404 }
    entry = { ...fresh, cachedAt: Date.now() }
    evictIfFull()
    cache.delete(assetId)
    cache.set(assetId, entry)
  }

  if (entry.status !== 'published') return { allowed: false, status: 404 }
  if (entry.visibility === 'public' || entry.visibility === 'both') return { allowed: true }
  if (session?.user) return { allowed: true }
  return { allowed: false, status: 403 }
}

export function invalidateAssetAccess(assetId: string): void {
  cache.delete(assetId)
}

export function invalidateAssetAccessByCourse(courseId: string): void {
  for (const [key, value] of cache.entries()) {
    if (value.courseId === courseId) cache.delete(key)
  }
}

export function __resetCacheForTests(): void {
  cache.clear()
}
```

- [ ] **Step 4: Test laufen lassen — pass**

Run: `npx vitest run src/__tests__/unit/utils/course-asset-acl.test.ts`
Expected: 10 passing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/course-asset-acl.ts src/__tests__/unit/utils/course-asset-acl.test.ts
git commit -m "feat(elearning): visibility-aware asset ACL with LRU cache"
```

---

## Task 3: Asset-Serve-Route Refactor

**Files:**
- Modify: `src/app/api/v1/courses/assets/serve/[...path]/route.ts`
- Modify: `src/__tests__/integration/api/course-assets-serve.route.test.ts` (bestehender Test)
- Create: `src/__tests__/integration/api/course-assets-serve-public.route.test.ts`

- [ ] **Step 1: Bestehende Tests anpassen — ACL-Mock im Setup**

Im bestehenden `src/__tests__/integration/api/course-assets-serve.route.test.ts` im `beforeEach` Block den ACL-Mock hinzufügen, damit Intern-User-Tests grün bleiben (Permission-Pfad):

```ts
vi.doMock('@/lib/utils/course-asset-acl', () => ({
  checkAssetAccess: vi.fn().mockResolvedValue({ allowed: true }),
  invalidateAssetAccess: vi.fn(),
  invalidateAssetAccessByCourse: vi.fn(),
}))
```

(Bestehender `tmpDir`-Setup, `process.env.COURSE_ASSET_DIR`, `testFile`-Setup bleibt erhalten.)

- [ ] **Step 2: Failing public-Test schreiben**

Datei `src/__tests__/integration/api/course-assets-serve-public.route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'
import { mockAuthContext } from '../../helpers/mock-auth'
import { createTestParams } from '../../helpers/mock-request'
import path from 'path'
import os from 'os'
import fs from 'fs/promises'

describe('GET /api/v1/courses/assets/serve/[...path] (public/portal)', () => {
  let tmpDir: string
  let testFile: string
  const courseId = '00000000-0000-0000-0000-0000000000c1'
  const assetId  = '00000000-0000-0000-0000-0000000000a1'

  beforeEach(async () => {
    vi.resetModules()
    setupDbMock()
    mockAuthContext(null)
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'serve-pub-'))
    process.env.COURSE_ASSET_DIR = tmpDir
    testFile = path.join(tmpDir, courseId, `${assetId}.mp4`)
    await fs.mkdir(path.dirname(testFile), { recursive: true })
    await fs.writeFile(testFile, Buffer.alloc(100, 1))
  })

  it('returns 200 for anonymous user on public asset', async () => {
    vi.doMock('@/lib/utils/course-asset-acl', () => ({
      checkAssetAccess: vi.fn().mockResolvedValue({ allowed: true }),
      invalidateAssetAccess: vi.fn(),
      invalidateAssetAccessByCourse: vi.fn(),
    }))
    const { GET } = await import('@/app/api/v1/courses/assets/serve/[...path]/route')
    const req = new Request('http://x/')
    const res = await GET(req as never, { params: createTestParams({ path: [courseId, `${assetId}.mp4`] }) })
    expect(res.status).toBe(200)
  })

  it('returns 403 for anonymous user on portal-only asset', async () => {
    vi.doMock('@/lib/utils/course-asset-acl', () => ({
      checkAssetAccess: vi.fn().mockResolvedValue({ allowed: false, status: 403 }),
      invalidateAssetAccess: vi.fn(),
      invalidateAssetAccessByCourse: vi.fn(),
    }))
    const { GET } = await import('@/app/api/v1/courses/assets/serve/[...path]/route')
    const req = new Request('http://x/')
    const res = await GET(req as never, { params: createTestParams({ path: [courseId, `${assetId}.mp4`] }) })
    expect(res.status).toBe(403)
  })

  it('returns 404 for anonymous user on draft asset', async () => {
    vi.doMock('@/lib/utils/course-asset-acl', () => ({
      checkAssetAccess: vi.fn().mockResolvedValue({ allowed: false, status: 404 }),
      invalidateAssetAccess: vi.fn(),
      invalidateAssetAccessByCourse: vi.fn(),
    }))
    const { GET } = await import('@/app/api/v1/courses/assets/serve/[...path]/route')
    const req = new Request('http://x/')
    const res = await GET(req as never, { params: createTestParams({ path: [courseId, `${assetId}.mp4`] }) })
    expect(res.status).toBe(404)
  })

  it('serves Range request for anonymous public asset', async () => {
    vi.doMock('@/lib/utils/course-asset-acl', () => ({
      checkAssetAccess: vi.fn().mockResolvedValue({ allowed: true }),
      invalidateAssetAccess: vi.fn(),
      invalidateAssetAccessByCourse: vi.fn(),
    }))
    const { GET } = await import('@/app/api/v1/courses/assets/serve/[...path]/route')
    const req = new Request('http://x/', { headers: { range: 'bytes=0-49' } })
    const res = await GET(req as never, { params: createTestParams({ path: [courseId, `${assetId}.mp4`] }) })
    expect(res.status).toBe(206)
    expect(res.headers.get('content-range')).toBe('bytes 0-49/100')
  })
})
```

- [ ] **Step 3: Test laufen lassen — fail**

Run: `npx vitest run src/__tests__/integration/api/course-assets-serve-public.route.test.ts`
Expected: FAIL — Route nutzt noch `withPermission` und liefert 401.

- [ ] **Step 4: Route refactoren**

Datei `src/app/api/v1/courses/assets/serve/[...path]/route.ts` komplett:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { tryWithPermission } from '@/lib/auth/require-permission'
import { checkAssetAccess, type SessionLike } from '@/lib/utils/course-asset-acl'
import { getAuthContext } from '@/lib/auth/auth-context'
import path from 'path'
import { stat, open } from 'fs/promises'

interface Ctx { params: Promise<{ path: string[] }> }

function assetDir(): string {
  return path.resolve(
    process.env.COURSE_ASSET_DIR ?? path.join(process.cwd(), 'public', 'uploads', 'courses'),
  )
}

function mimeFor(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  return {
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
    '.pdf': 'application/pdf',
    '.zip': 'application/zip',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  }[ext] ?? 'application/octet-stream'
}

async function streamAsset(candidate: string, request: NextRequest): Promise<NextResponse> {
  const st = await stat(candidate)
  if (!st.isFile()) {
    return NextResponse.json({ success: false, error: { code: 'NOT_A_FILE' } }, { status: 404 })
  }
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
}

export async function GET(request: NextRequest, ctx: Ctx) {
  const { path: parts } = await ctx.params
  const base = assetDir()
  const candidate = path.resolve(base, ...parts)
  if (!candidate.startsWith(base + path.sep) && candidate !== base) {
    return NextResponse.json(
      { success: false, error: { code: 'BAD_PATH', message: 'Path traversal detected' } },
      { status: 400 },
    )
  }

  const rawPath = parts.join('/')

  // 1) Intern-Pfad: User mit courses:read darf alles (auch draft/archived) — Editor-Vorschau
  const perm = await tryWithPermission(request, 'courses', 'read')
  if (perm.allowed) {
    try {
      return await streamAsset(candidate, request)
    } catch {
      return NextResponse.json({ success: false, error: { code: 'NOT_FOUND' } }, { status: 404 })
    }
  }

  // 2) Public/Portal-Pfad: visibility-basierte ACL
  const session = await getAuthContext(request) as SessionLike | null
  const acl = await checkAssetAccess(rawPath, session)
  if (!acl.allowed) {
    const code = acl.status === 403 ? 'FORBIDDEN' : 'NOT_FOUND'
    return NextResponse.json({ success: false, error: { code } }, { status: acl.status })
  }
  try {
    return await streamAsset(candidate, request)
  } catch {
    return NextResponse.json({ success: false, error: { code: 'NOT_FOUND' } }, { status: 404 })
  }
}
```

- [ ] **Step 5: Tests laufen lassen — pass**

Run: `npx vitest run src/__tests__/integration/api/course-assets-serve.route.test.ts src/__tests__/integration/api/course-assets-serve-public.route.test.ts`
Expected: alle grün (3 alt + 4 neu).

- [ ] **Step 6: Commit**

```bash
git add src/app/api/v1/courses/assets/serve src/__tests__/integration/api/course-assets-serve.route.test.ts src/__tests__/integration/api/course-assets-serve-public.route.test.ts
git commit -m "feat(elearning): asset-serve with visibility-aware fallback ACL"
```

---

## Task 4: Cache-Invalidation in bestehenden Services

**Files:**
- Modify: `src/lib/services/course.service.ts`
- Modify: `src/lib/services/course-publish.service.ts`
- Modify: `src/lib/services/course-asset.service.ts`

Bestehende Service-Tests werden durch reine Cache-Invalidation-Aufrufe nicht gebrochen (kein Mock erwartet, kein Assert).

- [ ] **Step 1: `course.service.ts` ergänzen**

Import oben:

```ts
import { invalidateAssetAccessByCourse } from '@/lib/utils/course-asset-acl'
```

In `update`-Methode nach `db.update(...).returning()` und vor dem Audit-Log:

```ts
if (Object.prototype.hasOwnProperty.call(update, 'visibility')) {
  invalidateAssetAccessByCourse(id)
}
```

In `archive`, `unpublish`, `restore` jeweils nach dem Update:

```ts
invalidateAssetAccessByCourse(id)
```

In `delete` vor dem `db.delete`:

```ts
invalidateAssetAccessByCourse(id)
```

- [ ] **Step 2: `course-publish.service.ts` ergänzen**

Import:

```ts
import { invalidateAssetAccessByCourse } from '@/lib/utils/course-asset-acl'
```

In `publish` nach erfolgreichem Update:

```ts
invalidateAssetAccessByCourse(id)
```

- [ ] **Step 3: `course-asset.service.ts` `delete` ergänzen**

Import:

```ts
import { invalidateAssetAccess } from '@/lib/utils/course-asset-acl'
```

In `delete`-Methode nach erfolgreichem `db.delete`:

```ts
invalidateAssetAccess(id)
```

- [ ] **Step 4: Tests laufen lassen**

Run: `npx vitest run src/__tests__/unit/services/course.service.test.ts src/__tests__/unit/services/course-asset.service.test.ts src/__tests__/unit/services/course-publish.service.test.ts`
Expected: alle grün — kein Mock für ACL nötig (no-op auf leerem Cache).

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/course.service.ts src/lib/services/course-publish.service.ts src/lib/services/course-asset.service.ts
git commit -m "feat(elearning): invalidate asset-acl cache on course/asset mutations"
```

---

## Task 5: `CoursePublicService` — Listen + Get

**Files:**
- Create: `src/lib/services/course-public.service.ts`
- Create: `src/__tests__/unit/services/course-public.service.test.ts`

- [ ] **Step 1: Failing test schreiben**

Datei `src/__tests__/unit/services/course-public.service.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'

const COURSE_ID = '00000000-0000-0000-0000-0000000000c1'

function courseFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: COURSE_ID,
    slug: 'kurs-1',
    title: 'Kurs 1',
    subtitle: null,
    description: null,
    coverImageId: null,
    visibility: 'public',
    status: 'published',
    useModules: false,
    enforceSequential: false,
    estimatedMinutes: null,
    createdBy: null,
    publishedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

describe('CoursePublicService', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
  })

  async function getSvc() {
    const mod = await import('@/lib/services/course-public.service')
    return mod.CoursePublicService
  }

  describe('listPublic', () => {
    it('returns paged list', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([courseFixture()])
      dbMock.mockSelect.mockResolvedValueOnce([{ count: 1 }])
      const svc = await getSvc()
      const result = await svc.listPublic({ page: 1, limit: 10 })
      expect(result.items).toHaveLength(1)
      expect(result.total).toBe(1)
    })
  })

  describe('listPortal', () => {
    it('returns paged list', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([courseFixture({ visibility: 'portal' })])
      dbMock.mockSelect.mockResolvedValueOnce([{ count: 1 }])
      const svc = await getSvc()
      const result = await svc.listPortal({ page: 1, limit: 10 })
      expect(result.items).toHaveLength(1)
    })
  })

  describe('getPublicBySlug', () => {
    it('returns course with modules + lessons', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([courseFixture()])
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockSelect.mockResolvedValueOnce([])
      const svc = await getSvc()
      const result = await svc.getPublicBySlug('kurs-1')
      expect(result?.course.id).toBe(COURSE_ID)
    })

    it('returns null when course not public', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      const svc = await getSvc()
      const result = await svc.getPublicBySlug('private')
      expect(result).toBeNull()
    })
  })

  describe('getPortalBySlug', () => {
    it('returns course when visibility=portal', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([courseFixture({ visibility: 'portal' })])
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockSelect.mockResolvedValueOnce([])
      const svc = await getSvc()
      const result = await svc.getPortalBySlug('kurs-1')
      expect(result?.course.visibility).toBe('portal')
    })
  })
})
```

- [ ] **Step 2: Test laufen lassen — fail**

Run: `npx vitest run src/__tests__/unit/services/course-public.service.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Service implementieren**

Datei `src/lib/services/course-public.service.ts`:

```ts
import { db } from '@/lib/db'
import { courses, courseModules, courseLessons, courseAssets } from '@/lib/db/schema'
import type { Course, CourseModule, CourseLesson, CourseAsset } from '@/lib/db/schema'
import { eq, and, ilike, desc, sql, inArray } from 'drizzle-orm'

export interface PublicListFilter {
  q?: string
  page?: number
  limit?: number
}

export interface PublicCourseDetail {
  course: Course
  modules: CourseModule[]
  lessons: CourseLesson[]
}

export interface PublicLessonContext {
  course: Course
  modules: CourseModule[]
  lessons: CourseLesson[]
  lesson: CourseLesson
  assets: CourseAsset[]
  prev: { courseSlug: string; lessonSlug: string } | null
  next: { courseSlug: string; lessonSlug: string } | null
}

type Visibility = 'public' | 'portal' | 'both'

function visibilitySet(surface: 'public' | 'portal'): Visibility[] {
  return surface === 'public' ? ['public', 'both'] : ['portal', 'both']
}

async function listBySurface(
  surface: 'public' | 'portal',
  filter: PublicListFilter,
): Promise<{ items: Course[]; total: number }> {
  const page = filter.page ?? 1
  const limit = filter.limit ?? 20
  const offset = (page - 1) * limit

  const conds = [
    eq(courses.status, 'published'),
    inArray(courses.visibility, visibilitySet(surface)),
  ]
  if (filter.q) conds.push(ilike(courses.title, `%${filter.q}%`))
  const where = and(...conds)

  const [items, totalRows] = await Promise.all([
    db.select().from(courses).where(where).orderBy(desc(courses.publishedAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(courses).where(where),
  ])
  return { items, total: totalRows[0]?.count ?? 0 }
}

async function getBySurfaceAndSlug(
  surface: 'public' | 'portal',
  slug: string,
): Promise<PublicCourseDetail | null> {
  const conds = [
    eq(courses.slug, slug),
    eq(courses.status, 'published'),
    inArray(courses.visibility, visibilitySet(surface)),
  ]
  const [course] = await db.select().from(courses).where(and(...conds)).limit(1)
  if (!course) return null

  const [modules, lessons] = await Promise.all([
    db.select().from(courseModules).where(eq(courseModules.courseId, course.id)),
    db.select().from(courseLessons).where(eq(courseLessons.courseId, course.id)),
  ])
  return { course, modules, lessons }
}

async function getLessonBySurface(
  surface: 'public' | 'portal',
  courseSlug: string,
  lessonSlug: string,
): Promise<PublicLessonContext | null> {
  const detail = await getBySurfaceAndSlug(surface, courseSlug)
  if (!detail) return null

  const lesson = detail.lessons.find((l) => l.slug === lessonSlug)
  if (!lesson) return null

  const assets = await db
    .select()
    .from(courseAssets)
    .where(eq(courseAssets.lessonId, lesson.id))

  const modulePositions = new Map(detail.modules.map((m) => [m.id, m.position]))
  const sortedLessons = [...detail.lessons].sort((a, b) => {
    const aPos = a.moduleId ? (modulePositions.get(a.moduleId) ?? Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER
    const bPos = b.moduleId ? (modulePositions.get(b.moduleId) ?? Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER
    if (aPos !== bPos) return aPos - bPos
    return a.position - b.position
  })

  const idx = sortedLessons.findIndex((l) => l.id === lesson.id)
  const prevL = idx > 0 ? sortedLessons[idx - 1] : null
  const nextL = idx < sortedLessons.length - 1 ? sortedLessons[idx + 1] : null

  return {
    course: detail.course,
    modules: detail.modules,
    lessons: sortedLessons,
    lesson,
    assets,
    prev: prevL ? { courseSlug: detail.course.slug, lessonSlug: prevL.slug } : null,
    next: nextL ? { courseSlug: detail.course.slug, lessonSlug: nextL.slug } : null,
  }
}

export const CoursePublicService = {
  listPublic: (filter: PublicListFilter = {}) => listBySurface('public', filter),
  listPortal: (filter: PublicListFilter = {}) => listBySurface('portal', filter),
  getPublicBySlug: (slug: string) => getBySurfaceAndSlug('public', slug),
  getPortalBySlug: (slug: string) => getBySurfaceAndSlug('portal', slug),
  getPublicLesson: (courseSlug: string, lessonSlug: string) => getLessonBySurface('public', courseSlug, lessonSlug),
  getPortalLesson: (courseSlug: string, lessonSlug: string) => getLessonBySurface('portal', courseSlug, lessonSlug),
}
```

- [ ] **Step 4: Test laufen lassen — pass**

Run: `npx vitest run src/__tests__/unit/services/course-public.service.test.ts`
Expected: 5 passing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/course-public.service.ts src/__tests__/unit/services/course-public.service.test.ts
git commit -m "feat(elearning): course-public service with visibility filter + list/get"
```

---

## Task 6: `getPublicLesson` Prev/Next-Tests

**Files:**
- Modify: `src/__tests__/unit/services/course-public.service.test.ts`

- [ ] **Step 1: Test-Block für Lesson-Context ergänzen**

Im bestehenden `course-public.service.test.ts` neuen `describe`-Block ans Ende anhängen:

```ts
describe('getPublicLesson', () => {
  const lessonId1 = '00000000-0000-0000-0000-0000000000e1'
  const lessonId2 = '00000000-0000-0000-0000-0000000000e2'
  const lessonId3 = '00000000-0000-0000-0000-0000000000e3'

  function lesson(id: string, slug: string, position: number, moduleId: string | null = null) {
    return {
      id, courseId: COURSE_ID, moduleId, position, slug,
      title: slug, contentMarkdown: null, videoAssetId: null,
      videoExternalUrl: null, durationMinutes: null,
      createdAt: new Date(), updatedAt: new Date(),
    }
  }

  it('returns prev=null and next set for first lesson', async () => {
    dbMock.mockSelect.mockResolvedValueOnce([courseFixture()])
    dbMock.mockSelect.mockResolvedValueOnce([])
    dbMock.mockSelect.mockResolvedValueOnce([
      lesson(lessonId1, 'a', 1),
      lesson(lessonId2, 'b', 2),
    ])
    dbMock.mockSelect.mockResolvedValueOnce([])
    const svc = await getSvc()
    const ctx = await svc.getPublicLesson('kurs-1', 'a')
    expect(ctx?.prev).toBeNull()
    expect(ctx?.next).toEqual({ courseSlug: 'kurs-1', lessonSlug: 'b' })
  })

  it('returns prev set and next=null for last lesson', async () => {
    dbMock.mockSelect.mockResolvedValueOnce([courseFixture()])
    dbMock.mockSelect.mockResolvedValueOnce([])
    dbMock.mockSelect.mockResolvedValueOnce([
      lesson(lessonId1, 'a', 1),
      lesson(lessonId2, 'b', 2),
    ])
    dbMock.mockSelect.mockResolvedValueOnce([])
    const svc = await getSvc()
    const ctx = await svc.getPublicLesson('kurs-1', 'b')
    expect(ctx?.prev).toEqual({ courseSlug: 'kurs-1', lessonSlug: 'a' })
    expect(ctx?.next).toBeNull()
  })

  it('returns null when lesson slug missing', async () => {
    dbMock.mockSelect.mockResolvedValueOnce([courseFixture()])
    dbMock.mockSelect.mockResolvedValueOnce([])
    dbMock.mockSelect.mockResolvedValueOnce([lesson(lessonId1, 'a', 1)])
    const svc = await getSvc()
    const ctx = await svc.getPublicLesson('kurs-1', 'nope')
    expect(ctx).toBeNull()
  })

  it('sorts across modules then within module', async () => {
    const modA = '00000000-0000-0000-0000-0000000000d1'
    const modB = '00000000-0000-0000-0000-0000000000d2'
    dbMock.mockSelect.mockResolvedValueOnce([courseFixture({ useModules: true })])
    dbMock.mockSelect.mockResolvedValueOnce([
      { id: modA, courseId: COURSE_ID, position: 1, title: 'A', description: null, createdAt: new Date(), updatedAt: new Date() },
      { id: modB, courseId: COURSE_ID, position: 2, title: 'B', description: null, createdAt: new Date(), updatedAt: new Date() },
    ])
    dbMock.mockSelect.mockResolvedValueOnce([
      lesson(lessonId2, 'b1', 1, modB),
      lesson(lessonId1, 'a1', 1, modA),
      lesson(lessonId3, 'a2', 2, modA),
    ])
    dbMock.mockSelect.mockResolvedValueOnce([])
    const svc = await getSvc()
    const ctx = await svc.getPublicLesson('kurs-1', 'a2')
    expect(ctx?.prev?.lessonSlug).toBe('a1')
    expect(ctx?.next?.lessonSlug).toBe('b1')
  })
})
```

- [ ] **Step 2: Tests laufen lassen — pass**

Run: `npx vitest run src/__tests__/unit/services/course-public.service.test.ts`
Expected: 9 passing total (5 alt + 4 neu).

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/unit/services/course-public.service.test.ts
git commit -m "test(elearning): prev/next + cross-module sort coverage for getPublicLesson"
```

---

## Task 7: Geteilte Listen-/Landing-Komponenten

**Files:**
- Create: `src/components/elearning/CourseListGrid.tsx`
- Create: `src/components/elearning/CourseLandingHeader.tsx`
- Create: `src/components/elearning/CourseLandingOutline.tsx`

- [ ] **Step 1: `CourseListGrid` — Card-Grid für Index-Pages**

Datei `src/components/elearning/CourseListGrid.tsx`:

```tsx
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { GraduationCap } from 'lucide-react'
import type { Course } from '@/lib/db/schema'

interface Props {
  courses: Course[]
  basePath: '/kurse' | '/portal/kurse'
}

export function CourseListGrid({ courses, basePath }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {courses.map((c) => (
        <Link key={c.id} href={`${basePath}/${c.slug}`} className="group">
          <Card className="h-full transition-colors group-hover:border-primary/40">
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-lg leading-tight">{c.title}</CardTitle>
                <GraduationCap className="h-5 w-5 text-muted-foreground" />
              </div>
              {c.subtitle && (
                <p className="text-sm text-muted-foreground line-clamp-2">{c.subtitle}</p>
              )}
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {c.estimatedMinutes != null && (
                  <Badge variant="outline">{c.estimatedMinutes} Min</Badge>
                )}
                {c.useModules && <Badge variant="outline">Module</Badge>}
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: `CourseLandingHeader` — Cover/Titel/Beschreibung/„Kurs starten"**

Datei `src/components/elearning/CourseLandingHeader.tsx`:

```tsx
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Play } from 'lucide-react'
import type { Course, CourseLesson, CourseModule } from '@/lib/db/schema'

interface Props {
  course: Course
  modules: CourseModule[]
  lessons: CourseLesson[]
  basePath: '/kurse' | '/portal/kurse'
}

function findFirstLessonSlug(lessons: CourseLesson[], modules: CourseModule[]): string | null {
  if (lessons.length === 0) return null
  if (modules.length === 0) {
    const sorted = [...lessons].sort((a, b) => a.position - b.position)
    return sorted[0].slug
  }
  const sortedModules = [...modules].sort((a, b) => a.position - b.position)
  for (const m of sortedModules) {
    const inMod = lessons.filter((l) => l.moduleId === m.id).sort((a, b) => a.position - b.position)
    if (inMod.length > 0) return inMod[0].slug
  }
  const orphan = lessons.filter((l) => !l.moduleId).sort((a, b) => a.position - b.position)
  return orphan[0]?.slug ?? null
}

export function CourseLandingHeader({ course, modules, lessons, basePath }: Props) {
  const firstSlug = findFirstLessonSlug(lessons, modules)
  return (
    <header className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {course.estimatedMinutes != null && (
          <Badge variant="outline">{course.estimatedMinutes} Min</Badge>
        )}
        <Badge variant="outline">{lessons.length} Lektion{lessons.length === 1 ? '' : 'en'}</Badge>
        {course.useModules && <Badge variant="outline">{modules.length} Module</Badge>}
      </div>
      <h1 className="text-3xl font-bold sm:text-4xl">{course.title}</h1>
      {course.subtitle && <p className="text-lg text-muted-foreground">{course.subtitle}</p>}
      {course.description && (
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{course.description}</ReactMarkdown>
        </div>
      )}
      {firstSlug && (
        <Button asChild size="lg">
          <Link href={`${basePath}/${course.slug}/${firstSlug}`}>
            <Play className="mr-2 h-4 w-4" />
            Kurs starten
          </Link>
        </Button>
      )}
    </header>
  )
}
```

- [ ] **Step 3: `CourseLandingOutline` — Lektion-Liste**

Datei `src/components/elearning/CourseLandingOutline.tsx`:

```tsx
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, FolderOpen } from 'lucide-react'
import type { CourseLesson, CourseModule } from '@/lib/db/schema'

interface Props {
  courseSlug: string
  modules: CourseModule[]
  lessons: CourseLesson[]
  basePath: '/kurse' | '/portal/kurse'
}

export function CourseLandingOutline({ courseSlug, modules, lessons, basePath }: Props) {
  const useModules = modules.length > 0
  if (!useModules) {
    const sorted = [...lessons].sort((a, b) => a.position - b.position)
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lektionen</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-1">
            {sorted.map((l, idx) => (
              <li key={l.id}>
                <Link
                  href={`${basePath}/${courseSlug}/${l.slug}`}
                  className="flex items-center gap-3 rounded-md p-2 hover:bg-muted"
                >
                  <span className="text-sm text-muted-foreground tabular-nums w-6">{idx + 1}.</span>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>{l.title}</span>
                </Link>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    )
  }

  const sortedModules = [...modules].sort((a, b) => a.position - b.position)
  return (
    <div className="space-y-4">
      {sortedModules.map((m) => {
        const inMod = lessons.filter((l) => l.moduleId === m.id).sort((a, b) => a.position - b.position)
        return (
          <Card key={m.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FolderOpen className="h-4 w-4" />
                {m.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-1">
                {inMod.map((l, idx) => (
                  <li key={l.id}>
                    <Link
                      href={`${basePath}/${courseSlug}/${l.slug}`}
                      className="flex items-center gap-3 rounded-md p-2 hover:bg-muted"
                    >
                      <span className="text-sm text-muted-foreground tabular-nums w-6">{idx + 1}.</span>
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span>{l.title}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: TypeScript-Check**

Run: `npx tsc --noEmit`
Expected: keine Fehler.

- [ ] **Step 5: Commit**

```bash
git add src/components/elearning/CourseListGrid.tsx src/components/elearning/CourseLandingHeader.tsx src/components/elearning/CourseLandingOutline.tsx
git commit -m "feat(elearning): shared list grid + landing header + outline components"
```

---

## Task 8: Player-Layout + TOC-Komponenten

**Files:**
- Create: `src/components/elearning/CoursePlayerLayout.tsx`
- Create: `src/components/elearning/LessonTocSidebar.tsx`
- Create: `src/components/elearning/LessonTocSheet.tsx`

- [ ] **Step 1: `LessonTocSidebar` (RSC)**

Datei `src/components/elearning/LessonTocSidebar.tsx`:

```tsx
import Link from 'next/link'
import { FileText, FolderOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CourseLesson, CourseModule, Course } from '@/lib/db/schema'

interface Props {
  course: Course
  modules: CourseModule[]
  lessons: CourseLesson[]
  currentLessonId: string
  basePath: '/kurse' | '/portal/kurse'
}

export function LessonTocSidebar({ course, modules, lessons, currentLessonId, basePath }: Props) {
  const useModules = modules.length > 0
  return (
    <nav aria-label="Lektionen" className="space-y-3 text-sm">
      <div className="border-b pb-2">
        <Link href={`${basePath}/${course.slug}`} className="font-semibold hover:underline">
          {course.title}
        </Link>
      </div>
      {useModules ? (
        [...modules].sort((a, b) => a.position - b.position).map((m) => {
          const inMod = lessons.filter((l) => l.moduleId === m.id)
          return (
            <div key={m.id} className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
                <FolderOpen className="h-3 w-3" />
                {m.title}
              </div>
              <ul className="space-y-0.5">
                {inMod.map((l) => (
                  <LessonLink
                    key={l.id}
                    lesson={l}
                    courseSlug={course.slug}
                    basePath={basePath}
                    active={l.id === currentLessonId}
                  />
                ))}
              </ul>
            </div>
          )
        })
      ) : (
        <ul className="space-y-0.5">
          {lessons.map((l) => (
            <LessonLink
              key={l.id}
              lesson={l}
              courseSlug={course.slug}
              basePath={basePath}
              active={l.id === currentLessonId}
            />
          ))}
        </ul>
      )}
    </nav>
  )
}

function LessonLink({
  lesson, courseSlug, basePath, active,
}: {
  lesson: CourseLesson
  courseSlug: string
  basePath: '/kurse' | '/portal/kurse'
  active: boolean
}) {
  return (
    <li>
      <Link
        href={`${basePath}/${courseSlug}/${lesson.slug}`}
        className={cn(
          'flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors',
          active
            ? 'bg-muted font-medium text-foreground'
            : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
        )}
        aria-current={active ? 'page' : undefined}
      >
        <FileText className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{lesson.title}</span>
      </Link>
    </li>
  )
}
```

- [ ] **Step 2: `LessonTocSheet` ('use client')**

Datei `src/components/elearning/LessonTocSheet.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Menu } from 'lucide-react'
import type { Course, CourseLesson, CourseModule } from '@/lib/db/schema'
import { LessonTocSidebar } from './LessonTocSidebar'

interface Props {
  course: Course
  modules: CourseModule[]
  lessons: CourseLesson[]
  currentLessonId: string
  basePath: '/kurse' | '/portal/kurse'
}

export function LessonTocSheet(props: Props) {
  const [open, setOpen] = useState(false)
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="md:hidden">
          <Menu className="mr-2 h-4 w-4" />
          Lektionen
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 overflow-y-auto p-4">
        <SheetHeader className="mb-4">
          <SheetTitle>Lektionen</SheetTitle>
        </SheetHeader>
        <div onClick={() => setOpen(false)}>
          <LessonTocSidebar {...props} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 3: `CoursePlayerLayout` (RSC, komponiert Sidebar + Sheet)**

Datei `src/components/elearning/CoursePlayerLayout.tsx`:

```tsx
import type { Course, CourseLesson, CourseModule } from '@/lib/db/schema'
import { LessonTocSidebar } from './LessonTocSidebar'
import { LessonTocSheet } from './LessonTocSheet'

interface Props {
  course: Course
  modules: CourseModule[]
  lessons: CourseLesson[]
  currentLessonId: string
  basePath: '/kurse' | '/portal/kurse'
  children: React.ReactNode
}

export function CoursePlayerLayout({ course, modules, lessons, currentLessonId, basePath, children }: Props) {
  return (
    <div className="grid gap-6 md:grid-cols-[260px_1fr]">
      <aside className="hidden md:block sticky top-[120px] self-start max-h-[calc(100vh-140px)] overflow-y-auto">
        <LessonTocSidebar
          course={course}
          modules={modules}
          lessons={lessons}
          currentLessonId={currentLessonId}
          basePath={basePath}
        />
      </aside>
      <div className="space-y-4">
        <div className="md:hidden">
          <LessonTocSheet
            course={course}
            modules={modules}
            lessons={lessons}
            currentLessonId={currentLessonId}
            basePath={basePath}
          />
        </div>
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: TypeScript-Check**

Run: `npx tsc --noEmit`
Expected: keine Fehler.

- [ ] **Step 5: Commit**

```bash
git add src/components/elearning/CoursePlayerLayout.tsx src/components/elearning/LessonTocSidebar.tsx src/components/elearning/LessonTocSheet.tsx
git commit -m "feat(elearning): hybrid player layout — sidebar TOC desktop, sheet mobile"
```

---

## Task 9: Lektion-Content-/Video-/Nav-Komponenten

**Files:**
- Create: `src/components/elearning/LessonContent.tsx`
- Create: `src/components/elearning/LessonVideoPlayer.tsx`
- Create: `src/components/elearning/LessonPrevNextNav.tsx`

- [ ] **Step 1: `LessonVideoPlayer` (RSC — `<video>` ist kein State)**

Datei `src/components/elearning/LessonVideoPlayer.tsx`:

```tsx
import type { CourseAsset } from '@/lib/db/schema'

interface Props {
  videoAsset: CourseAsset | null
  videoExternalUrl: string | null
}

function extractYouTubeId(url: string): string | null {
  const m = /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/.exec(url)
  return m ? m[1] : null
}

export function LessonVideoPlayer({ videoAsset, videoExternalUrl }: Props) {
  if (videoAsset) {
    return (
      <video
        controls
        preload="metadata"
        className="w-full rounded-md border bg-black"
        src={`/api/v1/courses/assets/serve/${videoAsset.path}`}
      />
    )
  }
  if (videoExternalUrl) {
    const ytId = extractYouTubeId(videoExternalUrl)
    if (ytId) {
      return (
        <div className="aspect-video w-full overflow-hidden rounded-md border">
          <iframe
            src={`https://www.youtube.com/embed/${ytId}`}
            title="Video"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      )
    }
    return (
      <a href={videoExternalUrl} target="_blank" rel="noopener noreferrer" className="text-sm underline">
        Video öffnen
      </a>
    )
  }
  return null
}
```

- [ ] **Step 2: `LessonContent` (RSC — Markdown + Anhänge)**

Datei `src/components/elearning/LessonContent.tsx`:

```tsx
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Download, Paperclip } from 'lucide-react'
import type { CourseAsset, CourseLesson } from '@/lib/db/schema'

interface Props {
  lesson: CourseLesson
  assets: CourseAsset[]
}

export function LessonContent({ lesson, assets }: Props) {
  const docs = assets.filter((a) => a.kind === 'document')
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{lesson.title}</h1>
      {lesson.contentMarkdown && (
        <article className="prose prose-sm max-w-none dark:prose-invert sm:prose-base">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{lesson.contentMarkdown}</ReactMarkdown>
        </article>
      )}
      {docs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Paperclip className="h-4 w-4" />
              Anhänge
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {docs.map((a) => (
                <li key={a.id}>
                  <a
                    href={`/api/v1/courses/assets/serve/${a.path}`}
                    download={a.originalName}
                    className="flex items-center gap-2 rounded-md border p-2 hover:bg-muted"
                  >
                    <Download className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1">{a.label ?? a.originalName}</span>
                    <span className="text-xs text-muted-foreground">{(a.sizeBytes / 1024).toFixed(0)} KB</span>
                  </a>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

- [ ] **Step 3: `LessonPrevNextNav` (RSC)**

Datei `src/components/elearning/LessonPrevNextNav.tsx`:

```tsx
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  prev: { courseSlug: string; lessonSlug: string } | null
  next: { courseSlug: string; lessonSlug: string } | null
  basePath: '/kurse' | '/portal/kurse'
}

export function LessonPrevNextNav({ prev, next, basePath }: Props) {
  return (
    <div className="flex items-center justify-between border-t pt-4">
      {prev ? (
        <Button asChild variant="outline">
          <Link href={`${basePath}/${prev.courseSlug}/${prev.lessonSlug}`}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            Vorige Lektion
          </Link>
        </Button>
      ) : (
        <span />
      )}
      {next ? (
        <Button asChild>
          <Link href={`${basePath}/${next.courseSlug}/${next.lessonSlug}`}>
            Nächste Lektion
            <ChevronRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      ) : (
        <span />
      )}
    </div>
  )
}
```

- [ ] **Step 4: TypeScript-Check**

Run: `npx tsc --noEmit`
Expected: keine Fehler.

- [ ] **Step 5: Commit**

```bash
git add src/components/elearning/LessonContent.tsx src/components/elearning/LessonVideoPlayer.tsx src/components/elearning/LessonPrevNextNav.tsx
git commit -m "feat(elearning): lesson content + video player + prev/next nav"
```

---

## Task 10: Public-Routen + `generateMetadata`

**Files:**
- Create: `src/app/(public)/kurse/page.tsx`
- Create: `src/app/(public)/kurse/[course-slug]/page.tsx`
- Create: `src/app/(public)/kurse/[course-slug]/[lesson-slug]/page.tsx`

- [ ] **Step 1: Public-Index**

Datei `src/app/(public)/kurse/page.tsx`:

```tsx
import type { Metadata } from 'next'
import { CoursePublicService } from '@/lib/services/course-public.service'
import { CourseListGrid } from '@/components/elearning/CourseListGrid'
import { EmptyState } from '@/components/shared/empty-state'
import { GraduationCap } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Onlinekurse – xKMU',
  description: 'Freie Onlinekurse — Marketing-, IT- und Sicherheitsthemen für KMU.',
}

export default async function PublicCoursesIndexPage() {
  const { items } = await CoursePublicService.listPublic({ limit: 60 })
  return (
    <div className="container mx-auto px-4 py-12">
      <header className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <GraduationCap className="h-8 w-8" />
          Onlinekurse
        </h1>
        <p className="text-muted-foreground">
          Freie Lerneinheiten zu IT, Sicherheit und Compliance.
        </p>
      </header>
      {items.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="Noch keine Kurse veröffentlicht"
          description="Demnächst gibt es hier freie Lerninhalte."
        />
      ) : (
        <CourseListGrid courses={items} basePath="/kurse" />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Public-Landing**

Datei `src/app/(public)/kurse/[course-slug]/page.tsx`:

```tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CoursePublicService } from '@/lib/services/course-public.service'
import { CourseLandingHeader } from '@/components/elearning/CourseLandingHeader'
import { CourseLandingOutline } from '@/components/elearning/CourseLandingOutline'

interface Props { params: Promise<{ 'course-slug': string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { 'course-slug': slug } = await params
  const detail = await CoursePublicService.getPublicBySlug(slug)
  if (!detail) return { title: 'Kurs nicht gefunden' }
  const desc = detail.course.subtitle ?? detail.course.description?.slice(0, 160) ?? undefined
  return {
    title: `${detail.course.title} – xKMU`,
    description: desc,
    openGraph: {
      title: detail.course.title,
      description: desc,
      type: 'website',
      images: detail.course.coverImageId
        ? [`/api/v1/media/${detail.course.coverImageId}`]
        : undefined,
    },
  }
}

export default async function PublicCourseLandingPage({ params }: Props) {
  const { 'course-slug': slug } = await params
  const detail = await CoursePublicService.getPublicBySlug(slug)
  if (!detail) notFound()

  return (
    <div className="container mx-auto px-4 py-12 space-y-10">
      <CourseLandingHeader
        course={detail.course}
        modules={detail.modules}
        lessons={detail.lessons}
        basePath="/kurse"
      />
      <CourseLandingOutline
        courseSlug={detail.course.slug}
        modules={detail.modules}
        lessons={detail.lessons}
        basePath="/kurse"
      />
    </div>
  )
}
```

- [ ] **Step 3: Public-Player**

Datei `src/app/(public)/kurse/[course-slug]/[lesson-slug]/page.tsx`:

```tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CoursePublicService } from '@/lib/services/course-public.service'
import { CoursePlayerLayout } from '@/components/elearning/CoursePlayerLayout'
import { LessonContent } from '@/components/elearning/LessonContent'
import { LessonVideoPlayer } from '@/components/elearning/LessonVideoPlayer'
import { LessonPrevNextNav } from '@/components/elearning/LessonPrevNextNav'

interface Props { params: Promise<{ 'course-slug': string; 'lesson-slug': string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await params
  const ctx = await CoursePublicService.getPublicLesson(p['course-slug'], p['lesson-slug'])
  if (!ctx) return { title: 'Lektion nicht gefunden' }
  const desc = ctx.course.subtitle ?? undefined
  return {
    title: `${ctx.lesson.title} – ${ctx.course.title} – xKMU`,
    description: desc,
    openGraph: {
      title: `${ctx.lesson.title} – ${ctx.course.title}`,
      description: desc,
      type: 'article',
      images: ctx.course.coverImageId ? [`/api/v1/media/${ctx.course.coverImageId}`] : undefined,
    },
  }
}

export default async function PublicLessonPage({ params }: Props) {
  const p = await params
  const ctx = await CoursePublicService.getPublicLesson(p['course-slug'], p['lesson-slug'])
  if (!ctx) notFound()

  const videoAsset = ctx.assets.find((a) => a.id === ctx.lesson.videoAssetId) ?? null

  return (
    <div className="container mx-auto px-4 py-8">
      <CoursePlayerLayout
        course={ctx.course}
        modules={ctx.modules}
        lessons={ctx.lessons}
        currentLessonId={ctx.lesson.id}
        basePath="/kurse"
      >
        <LessonVideoPlayer
          videoAsset={videoAsset}
          videoExternalUrl={ctx.lesson.videoExternalUrl}
        />
        <LessonContent lesson={ctx.lesson} assets={ctx.assets} />
        <LessonPrevNextNav prev={ctx.prev} next={ctx.next} basePath="/kurse" />
      </CoursePlayerLayout>
    </div>
  )
}
```

- [ ] **Step 4: TypeScript-Check**

Run: `npx tsc --noEmit`
Expected: keine Fehler.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(public)/kurse"
git commit -m "feat(elearning): public routes — index, landing, player + SEO metadata"
```

---

## Task 11: Portal-Routen + Portal-Nav

**Files:**
- Create: `src/app/portal/kurse/page.tsx`
- Create: `src/app/portal/kurse/[course-slug]/page.tsx`
- Create: `src/app/portal/kurse/[course-slug]/[lesson-slug]/page.tsx`
- Modify: `src/app/portal/_components/portal-nav.tsx`

- [ ] **Step 1: Portal-Index**

Datei `src/app/portal/kurse/page.tsx`:

```tsx
import type { Metadata } from 'next'
import { CoursePublicService } from '@/lib/services/course-public.service'
import { CourseListGrid } from '@/components/elearning/CourseListGrid'
import { EmptyState } from '@/components/shared/empty-state'
import { GraduationCap } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Onlinekurse — Kundenportal',
  robots: { index: false, follow: false },
}

export default async function PortalCoursesIndexPage() {
  const { items } = await CoursePublicService.listPortal({ limit: 60 })
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <GraduationCap className="h-6 w-6" />
          Onlinekurse
        </h1>
        <p className="text-muted-foreground mt-1">Lerninhalte für Sie als Kunde.</p>
      </header>
      {items.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="Noch keine Kurse"
          description="Sobald für Sie Inhalte freigeschaltet werden, erscheinen sie hier."
        />
      ) : (
        <CourseListGrid courses={items} basePath="/portal/kurse" />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Portal-Landing**

Datei `src/app/portal/kurse/[course-slug]/page.tsx`:

```tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CoursePublicService } from '@/lib/services/course-public.service'
import { CourseLandingHeader } from '@/components/elearning/CourseLandingHeader'
import { CourseLandingOutline } from '@/components/elearning/CourseLandingOutline'

interface Props { params: Promise<{ 'course-slug': string }> }

export const metadata: Metadata = { robots: { index: false, follow: false } }

export default async function PortalCourseLandingPage({ params }: Props) {
  const { 'course-slug': slug } = await params
  const detail = await CoursePublicService.getPortalBySlug(slug)
  if (!detail) notFound()

  return (
    <div className="space-y-10">
      <CourseLandingHeader
        course={detail.course}
        modules={detail.modules}
        lessons={detail.lessons}
        basePath="/portal/kurse"
      />
      <CourseLandingOutline
        courseSlug={detail.course.slug}
        modules={detail.modules}
        lessons={detail.lessons}
        basePath="/portal/kurse"
      />
    </div>
  )
}
```

- [ ] **Step 3: Portal-Player**

Datei `src/app/portal/kurse/[course-slug]/[lesson-slug]/page.tsx`:

```tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CoursePublicService } from '@/lib/services/course-public.service'
import { CoursePlayerLayout } from '@/components/elearning/CoursePlayerLayout'
import { LessonContent } from '@/components/elearning/LessonContent'
import { LessonVideoPlayer } from '@/components/elearning/LessonVideoPlayer'
import { LessonPrevNextNav } from '@/components/elearning/LessonPrevNextNav'

interface Props { params: Promise<{ 'course-slug': string; 'lesson-slug': string }> }

export const metadata: Metadata = { robots: { index: false, follow: false } }

export default async function PortalLessonPage({ params }: Props) {
  const p = await params
  const ctx = await CoursePublicService.getPortalLesson(p['course-slug'], p['lesson-slug'])
  if (!ctx) notFound()
  const videoAsset = ctx.assets.find((a) => a.id === ctx.lesson.videoAssetId) ?? null
  return (
    <CoursePlayerLayout
      course={ctx.course}
      modules={ctx.modules}
      lessons={ctx.lessons}
      currentLessonId={ctx.lesson.id}
      basePath="/portal/kurse"
    >
      <LessonVideoPlayer
        videoAsset={videoAsset}
        videoExternalUrl={ctx.lesson.videoExternalUrl}
      />
      <LessonContent lesson={ctx.lesson} assets={ctx.assets} />
      <LessonPrevNextNav prev={ctx.prev} next={ctx.next} basePath="/portal/kurse" />
    </CoursePlayerLayout>
  )
}
```

- [ ] **Step 4: PortalNav um „Onlinekurse" erweitern**

In `src/app/portal/_components/portal-nav.tsx` im `NAV_ITEMS`-Array einen neuen Eintrag vor `/portal/chat` einfügen. Endgültige Liste:

```ts
const NAV_ITEMS = [
  { href: '/portal/company', label: 'Firmendaten' },
  { href: '/portal/contracts', label: 'Verträge' },
  { href: '/portal/projects', label: 'Projekte' },
  { href: '/portal/orders', label: 'Aufträge' },
  { href: '/portal/documents', label: 'Dokumente' },
  { href: '/portal/kurse', label: 'Onlinekurse' },
  { href: '/portal/chat', label: 'Chat' },
  { href: '/portal/company/requests', label: 'Anträge' },
]
```

- [ ] **Step 5: TypeScript-Check**

Run: `npx tsc --noEmit`
Expected: keine Fehler.

- [ ] **Step 6: Commit**

```bash
git add src/app/portal/kurse src/app/portal/_components/portal-nav.tsx
git commit -m "feat(elearning): portal routes + portal-nav onlinekurse entry"
```

---

## Task 12: Landing-Navbar „Kurse"-Eintrag

**Files:**
- Modify: `src/app/_components/landing-navbar.tsx`

- [ ] **Step 1: Datei inspizieren**

Run: `Grep` in `src/app/_components/landing-navbar.tsx` nach `href=` — schauen, ob Nav-Items als Array oder als JSX-`<Link>`-Liste vorliegen.

- [ ] **Step 2: Eintrag „Kurse" einfügen**

In `src/app/_components/landing-navbar.tsx` an der Stelle, wo die anderen Nav-Items definiert sind (zwischen „IT-News" und „Kontakt", oder am bestehenden Standardplatz):

```tsx
{ href: '/kurse', label: 'Kurse' }
```

(Falls die Datei JSX-`<Link>`s direkt rendert statt eines Arrays, analog einen `<Link href="/kurse">Kurse</Link>` einfügen.)

Mobile/Drawer-Variante in derselben Datei spiegelbildlich ergänzen.

- [ ] **Step 3: Manuell prüfen**

Run: `npm run dev`
Öffne `/` — Nav zeigt „Kurse"; Klick navigiert zu `/kurse`.

- [ ] **Step 4: Commit**

```bash
git add src/app/_components/landing-navbar.tsx
git commit -m "feat(elearning): landing-navbar kurse entry"
```

---

## Task 13: `sitemap.ts` für Public-Kurse

**Files:**
- Create: `src/app/sitemap.ts`

- [ ] **Step 1: Sitemap-Route implementieren**

Datei `src/app/sitemap.ts`:

```ts
import type { MetadataRoute } from 'next'
import { CoursePublicService } from '@/lib/services/course-public.service'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://xkmu.de'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/`,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/kurse`,
      changeFrequency: 'daily',
      priority: 0.9,
    },
  ]

  const { items } = await CoursePublicService.listPublic({ limit: 1000 })

  for (const c of items) {
    entries.push({
      url: `${BASE_URL}/kurse/${c.slug}`,
      lastModified: c.updatedAt,
      changeFrequency: 'weekly',
      priority: 0.7,
    })
    const detail = await CoursePublicService.getPublicBySlug(c.slug)
    for (const l of detail?.lessons ?? []) {
      entries.push({
        url: `${BASE_URL}/kurse/${c.slug}/${l.slug}`,
        lastModified: c.updatedAt,
        changeFrequency: 'weekly',
        priority: 0.5,
      })
    }
  }

  return entries
}
```

- [ ] **Step 2: TypeScript-Check**

Run: `npx tsc --noEmit`
Expected: keine Fehler.

- [ ] **Step 3: Manuell prüfen**

Run: `npm run dev`
Öffne `http://localhost:3000/sitemap.xml` — XML enthält `/kurse`-Eintrag und je published public Kurs einen Eintrag plus je Lektion einen.

- [ ] **Step 4: Commit**

```bash
git add src/app/sitemap.ts
git commit -m "feat(elearning): sitemap.xml with public courses + lessons"
```

---

## Task 14: Manuelles UAT + Final-Verification

**Files:** keine — nur manuelle Prüfung + Plan-Commit.

- [ ] **Step 1: Vollständiger Test-Run**

Run:
```
npx tsc --noEmit
npx vitest run src/__tests__/integration/api/courses src/__tests__/integration/api/courses-publish.route.test.ts src/__tests__/integration/api/courses-restore.route.test.ts src/__tests__/integration/api/course-assets-serve.route.test.ts src/__tests__/integration/api/course-assets-serve-public.route.test.ts src/__tests__/unit/services/course.service.test.ts src/__tests__/unit/services/course-public.service.test.ts src/__tests__/unit/services/course-asset.service.test.ts src/__tests__/unit/utils/course-asset-acl.test.ts src/__tests__/unit/auth/try-with-permission.test.ts
```
Expected: alles grün, keine Regression aus Sub-1.

- [ ] **Step 2: UAT-Setup**

Run: `npm run dev`

Voraussetzung: Mindestens 2 Kurse vorhanden — einen mit `visibility=public` (z. B. „Grundlagen IT") und einen mit `visibility=portal`. Beide published, beide haben mindestens 2 Lektionen, eine mit Video, eine mit PDF-Anhang. Anlegen über Intern-UI falls noch nicht vorhanden.

- [ ] **Step 3: UAT-Skript Public**

1. Öffne im **Inkognito-Fenster** (kein Login) `http://localhost:3000/kurse`
   - Erwartet: Karte für „Grundlagen IT", **keine** Karte für portal-only-Kurs
2. Klick auf „Grundlagen IT" → Landing zeigt Titel, Beschreibung, Lektion-Liste, „Kurs starten"-Button
3. Klick „Kurs starten" → Player öffnet erste Lektion — TOC links (Desktop), Video lädt + spielt + Seek funktioniert
4. Verkleinere Browser auf < md (~700px Breite) — TOC verschwindet, „Lektionen"-Button erscheint, Klick öffnet Sheet mit TOC
5. Im Sheet auf andere Lektion klicken → Sheet schließt, Player wechselt
6. „Nächste Lektion" / „Vorige Lektion" navigieren — auch über Modul-Grenzen
7. PDF-Anhang öffnen / herunterladen
8. Browser DevTools → Network → View-Source einer Player-Page: `<title>`, `<meta description>`, `<meta property="og:title">` befüllt
9. `http://localhost:3000/sitemap.xml` zeigt public Kurse + Lektionen
10. **Negativ-Test:** `http://localhost:3000/kurse/portal-only-kurs` → 404
11. **Negativ-Test:** Direkt auf `http://localhost:3000/api/v1/courses/assets/serve/{portalCourseId}/{assetId}.mp4` zugreifen (URL aus DB ablesen) → 403

- [ ] **Step 4: UAT-Skript Portal**

1. Logge ein als Portal-User unter `/portal/login`
2. PortalNav zeigt jetzt „Onlinekurse"
3. Klick → `/portal/kurse` zeigt portal- und both-Kurse
4. Wiederhole Schritte 2–7 aus dem Public-Skript unter `/portal/kurse/...`
5. **Positiv-Test:** Asset-Serve auf portal-Kurs-Video funktioniert für eingeloggten User (Video spielt)
6. View-Source einer Portal-Page: `<meta name="robots" content="noindex, nofollow">` vorhanden

- [ ] **Step 5: Cache-Check**

Falls Logging aktiv: nach mehreren Range-Requests auf dasselbe Video sollte der DB-Lookup für `course-asset-acl` nur 1× passieren (Cache-Hits). Notfalls in `loadAssetAccessFromDb` temporär ein `logger.debug` einbauen, prüfen, wieder entfernen.

- [ ] **Step 6: Plan-Datei committen**

```bash
git add docs/superpowers/plans/2026-04-27-onlinekurse-sub2-player.md
git commit -m "docs(elearning): plan sub-2 player"
```

---

## Pakets-Abschluss

- Sub-Projekt 2 ist damit fachlich komplett.
- Cache-Invalidation-Hooks wurden in Sub-1-Services nachgerüstet (Task 4) — Audit-Log-Action-Liste in Sub-1-Spec sollte später ggf. um `course.restored` ergänzt werden (kein Blocker für Sub-2).
- Folge-Sub-Projekt: **Sub-3 Progress + PDF-Zertifikate**, baut auf den Player-Routen auf.
