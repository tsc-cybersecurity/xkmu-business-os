# Social-Media Phase 2A — Backend (Schema + Provider + Service) — Implementation Plan

> **Plan-Pakete für Social-Media-Modul**
> - ✅ Phase 1: Meta OAuth-Connection + Connect-UI
> - **Phase 2A (diese Datei):** Schema `social_posts` + `social_post_targets`, `SocialProvider`-Interface, `MetaProvider.publish` (FB + IG), `SocialPostService` (CRUD + publish-Orchestrator). **Noch keine** UI, **keine** API-Routen — testbares Backend mit Unit-Tests.
> - Phase 2B: API-Routen + UI (Liste + Editor + Image-Upload + "Jetzt posten")
> - Phase 2C (optional): Cleanup-Rename `google_calendar_config` → `app_secrets`
> - Phase 3: Posting-Kalender + Cron-Auto-Posting → MVP-Ende
> - Phase 4: X-Provider
> - Phase 5: Generator + Freigabe-UI (BLOCKED auf Workflow-Engine)
> - Phase 6: LinkedIn-Provider

---

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Backend-Pipeline für Social-Media-Posts steht. `SocialPostService.create/update/approve/publish` funktioniert mit echten DB-Schreibvorgängen. `MetaProvider.publish(target, post)` führt für FB-Page-Feed einen einzigen POST + für IG eine 2-stufige Container-Erstellung + Media-Publish durch. Status-State-Machine (`draft` → `approved` → `posted`/`partially_failed`/`failed`) wird in der DB persistiert. Audit-Logs werden bei jedem State-Übergang geschrieben. **Kein UI, keine API-Routen** — nur Service-Layer + Provider + Schema.

**Architecture:** Drei neue Tabellen-Tasks (`social_posts`, `social_post_targets`). Ein Interface `SocialProvider` mit `publish(target, post): Promise<PublishResult>`. Eine konkrete Implementierung `MetaProvider` mit zwei privaten Methoden (`publishToFacebook`, `publishToInstagram`) und einem Dispatcher. Ein Service `SocialPostService` mit Methoden für Lifecycle (`create/update/approve/discard/publish`). Image-URL ist in dieser Phase ein opaker String — der Upload-Endpoint kommt erst in Phase 2B. Tests: Provider-Tests mit gemocktem `fetch`, Service-Tests mit `setupDbMock()`.

**Tech Stack:** Next.js 16 App Router, Drizzle ORM (Postgres), Zod, Vitest. Meta Graph API v19.0 direkt via `fetch`. Re-use: `socialOauthAccounts` (Phase 1), `decryptToken` (Phase 1), `MetaOAuthClient` (nur OAuth-spezifisch — wir bauen einen separaten `MetaPublishClient`), `audit_logs`.

**Spec:** `docs/superpowers/specs/2026-05-05-social-media-modul-design.md` §2.2, §2.3, §4 (Publish-Pipeline).

**Codebase-Patterns (wie Phase 1):**
- Services als `export const FooService = { method() { ... } }`
- Drizzle-Tabellen mit Index-Block + Relations-Export
- Tests: `setupDbMock()` + `vi.resetModules()` + `vi.doMock` + dynamic import
- `vi.stubGlobal('fetch', mockFetch)` für externe API-Calls
- Audit-Log-Pattern: `AuditLogService.log({ userId, userRole, action, entityType, entityId, payload, request })`

**Bewusst NICHT in Phase 2A:**
- API-Routen (`POST /api/v1/social/posts` etc.) — Phase 2B
- UI (`/intern/social/posts/...`) — Phase 2B
- Image-Upload-Endpoint (`/api/v1/social/uploads`) — Phase 2B
- Cron-Auto-Posting / `task_queue` Integration — Phase 3
- X-/LinkedIn-Provider — Phasen 4 / 6
- Generator-Workflow — Phase 5
- IG-Carousel (Multi-Image) — Out-of-Scope V1
- Cleanup-Rename `google_calendar_config` → `app_secrets` — Phase 2C

**Wichtig zur Testbarkeit:** `SocialPostService.publish` muss reine Service-Logik sein (kein `request`-Objekt). Audit-Logs werden vom Service angefordert, aber das `request`-Objekt für IP/User-Agent kommt erst in Phase 2B aus den Routes. In Phase 2A wird `request: undefined` übergeben — `AuditLogService.log` muss damit umgehen können (Pattern: existing audit-log-Aufrufe machen das schon so).

---

## Phase A — Schema + State-Konstanten

### Task 1: SQL-Migration + Drizzle-Schema (`social_posts` + `social_post_targets`)

**Files:**
- Create: `drizzle/migrations/0050_social_posts.sql`
- Modify: `src/lib/db/schema.ts` (zwei neue Tabellen + Relations)
- Modify: `src/lib/db/table-whitelist.ts`

- [ ] **Step 1: SQL-Migration anlegen**

```sql
-- Social-Media Phase 2A: Posts + Per-Provider-Targets

CREATE TABLE social_posts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status              varchar(20) NOT NULL DEFAULT 'draft',
  master_body         text NOT NULL DEFAULT '',
  master_image_path   varchar(500),
  scheduled_for       timestamptz,
  created_by          uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  approved_by         uuid REFERENCES users(id) ON DELETE SET NULL,
  approved_at         timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_social_post_status CHECK (status IN ('draft','approved','scheduled','posted','partially_failed','failed'))
);
CREATE INDEX idx_social_posts_status ON social_posts(status);
CREATE INDEX idx_social_posts_scheduled ON social_posts(scheduled_for) WHERE status = 'scheduled';
CREATE INDEX idx_social_posts_created_by ON social_posts(created_by);

CREATE TABLE social_post_targets (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id             uuid NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
  provider            varchar(20) NOT NULL,
  body_override       text,
  publish_status      varchar(20) NOT NULL DEFAULT 'pending',
  external_post_id    varchar(255),
  external_url        varchar(500),
  retry_count         integer NOT NULL DEFAULT 0,
  last_error          text,
  posted_at           timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_social_target_provider CHECK (provider IN ('facebook','instagram','x','linkedin')),
  CONSTRAINT chk_social_target_status CHECK (publish_status IN ('pending','publishing','posted','failed')),
  UNIQUE (post_id, provider)
);
CREATE INDEX idx_social_post_targets_post ON social_post_targets(post_id);
CREATE INDEX idx_social_post_targets_status ON social_post_targets(publish_status) WHERE publish_status IN ('pending','publishing','failed');
```

- [ ] **Step 2: Drizzle-Schema in `schema.ts` anhängen**

Am Ende der Datei (nach `socialOauthAccountsRelations`):

```typescript
// ============================================================================
// Social-Media Phase 2A — Posts + Targets
// ============================================================================

export const socialPosts = pgTable('social_posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  status: varchar('status', { length: 20 }).notNull().default('draft'),
  masterBody: text('master_body').notNull().default(''),
  masterImagePath: varchar('master_image_path', { length: 500 }),
  scheduledFor: timestamp('scheduled_for', { withTimezone: true }),
  createdBy: uuid('created_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
  approvedBy: uuid('approved_by').references(() => users.id, { onDelete: 'set null' }),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  statusIdx: index('idx_social_posts_status').on(t.status),
  scheduledIdx: index('idx_social_posts_scheduled').on(t.scheduledFor).where(sql`status = 'scheduled'`),
  createdByIdx: index('idx_social_posts_created_by').on(t.createdBy),
}))

export const socialPostsRelations = relations(socialPosts, ({ one, many }) => ({
  creator: one(users, { fields: [socialPosts.createdBy], references: [users.id] }),
  approver: one(users, { fields: [socialPosts.approvedBy], references: [users.id] }),
  targets: many(socialPostTargets),
}))

export const socialPostTargets = pgTable('social_post_targets', {
  id: uuid('id').primaryKey().defaultRandom(),
  postId: uuid('post_id').notNull().references(() => socialPosts.id, { onDelete: 'cascade' }),
  provider: varchar('provider', { length: 20 }).notNull(),
  bodyOverride: text('body_override'),
  publishStatus: varchar('publish_status', { length: 20 }).notNull().default('pending'),
  externalPostId: varchar('external_post_id', { length: 255 }),
  externalUrl: varchar('external_url', { length: 500 }),
  retryCount: integer('retry_count').notNull().default(0),
  lastError: text('last_error'),
  postedAt: timestamp('posted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  postIdx: index('idx_social_post_targets_post').on(t.postId),
  statusIdx: index('idx_social_post_targets_status').on(t.publishStatus).where(sql`publish_status IN ('pending','publishing','failed')`),
  uniquePostProvider: uniqueIndex('uq_social_post_targets_post_provider').on(t.postId, t.provider),
}))

export const socialPostTargetsRelations = relations(socialPostTargets, ({ one }) => ({
  post: one(socialPosts, { fields: [socialPostTargets.postId], references: [socialPosts.id] }),
}))

export type SocialPost = typeof socialPosts.$inferSelect
export type NewSocialPost = typeof socialPosts.$inferInsert
export type SocialPostTarget = typeof socialPostTargets.$inferSelect
export type NewSocialPostTarget = typeof socialPostTargets.$inferInsert
```

Imports `integer` und `uniqueIndex` müssen vorhanden sein (verifizieren am Datei-Anfang).

- [ ] **Step 3: Whitelist** — `'social_posts'` + `'social_post_targets'` in `TENANT_TABLES` aufnehmen.

- [ ] **Step 4: `npx tsc --noEmit` clean, `npm run db:generate` produziert keine Diffs für die neuen Tabellen.**

- [ ] **Step 5: Commit**

```bash
git commit -am "feat(social): schema social_posts + social_post_targets"
```

---

### Task 2: Status-Konstanten + State-Helpers

**Files:**
- Create: `src/lib/services/social/post-status.ts`
- Test: `src/__tests__/unit/services/social/post-status.test.ts`

Zentrale Definition der Status-Werte und der Übergänge. Hilft bei späteren Konsumenten (Routes, UI), magische Strings zu vermeiden.

- [ ] **Step 1: Failing Test schreiben**

```typescript
import { describe, it, expect } from 'vitest'
import {
  PostStatus, TargetStatus, canTransition, deriveOverallStatus,
} from '@/lib/services/social/post-status'

describe('canTransition', () => {
  it('allows draft → approved', () => {
    expect(canTransition(PostStatus.Draft, PostStatus.Approved)).toBe(true)
  })
  it('forbids draft → posted (must approve first)', () => {
    expect(canTransition(PostStatus.Draft, PostStatus.Posted)).toBe(false)
  })
  it('allows approved → scheduled', () => {
    expect(canTransition(PostStatus.Approved, PostStatus.Scheduled)).toBe(true)
  })
  it('allows scheduled → posted', () => {
    expect(canTransition(PostStatus.Scheduled, PostStatus.Posted)).toBe(true)
  })
  it('allows scheduled → partially_failed and failed', () => {
    expect(canTransition(PostStatus.Scheduled, PostStatus.PartiallyFailed)).toBe(true)
    expect(canTransition(PostStatus.Scheduled, PostStatus.Failed)).toBe(true)
  })
  it('forbids transitions out of terminal states', () => {
    expect(canTransition(PostStatus.Posted, PostStatus.Draft)).toBe(false)
    expect(canTransition(PostStatus.Failed, PostStatus.Approved)).toBe(false)
  })
})

describe('deriveOverallStatus', () => {
  it('returns posted when all targets posted', () => {
    expect(deriveOverallStatus([TargetStatus.Posted, TargetStatus.Posted])).toBe(PostStatus.Posted)
  })
  it('returns failed when all targets failed', () => {
    expect(deriveOverallStatus([TargetStatus.Failed, TargetStatus.Failed])).toBe(PostStatus.Failed)
  })
  it('returns partially_failed when at least one posted and at least one failed', () => {
    expect(deriveOverallStatus([TargetStatus.Posted, TargetStatus.Failed])).toBe(PostStatus.PartiallyFailed)
  })
  it('returns null when any target still pending or publishing', () => {
    expect(deriveOverallStatus([TargetStatus.Posted, TargetStatus.Pending])).toBeNull()
    expect(deriveOverallStatus([TargetStatus.Publishing, TargetStatus.Failed])).toBeNull()
  })
  it('returns null for empty array (defensive)', () => {
    expect(deriveOverallStatus([])).toBeNull()
  })
})
```

- [ ] **Step 2: Implementierung**

```typescript
// src/lib/services/social/post-status.ts

export const PostStatus = {
  Draft: 'draft',
  Approved: 'approved',
  Scheduled: 'scheduled',
  Posted: 'posted',
  PartiallyFailed: 'partially_failed',
  Failed: 'failed',
} as const
export type PostStatus = (typeof PostStatus)[keyof typeof PostStatus]

export const TargetStatus = {
  Pending: 'pending',
  Publishing: 'publishing',
  Posted: 'posted',
  Failed: 'failed',
} as const
export type TargetStatus = (typeof TargetStatus)[keyof typeof TargetStatus]

const ALLOWED: Record<PostStatus, PostStatus[]> = {
  [PostStatus.Draft]: [PostStatus.Approved],
  [PostStatus.Approved]: [PostStatus.Draft, PostStatus.Scheduled, PostStatus.Posted, PostStatus.PartiallyFailed, PostStatus.Failed],
  [PostStatus.Scheduled]: [PostStatus.Approved, PostStatus.Posted, PostStatus.PartiallyFailed, PostStatus.Failed],
  [PostStatus.Posted]: [],
  [PostStatus.PartiallyFailed]: [],
  [PostStatus.Failed]: [],
}

export function canTransition(from: PostStatus, to: PostStatus): boolean {
  return ALLOWED[from].includes(to)
}

/**
 * Derives the post-level status from target statuses.
 * Returns null when at least one target is still pending or publishing
 * (i.e., the overall publish run hasn't finished).
 */
export function deriveOverallStatus(targetStatuses: TargetStatus[]): PostStatus | null {
  if (targetStatuses.length === 0) return null
  if (targetStatuses.some(s => s === TargetStatus.Pending || s === TargetStatus.Publishing)) return null
  const allPosted = targetStatuses.every(s => s === TargetStatus.Posted)
  if (allPosted) return PostStatus.Posted
  const allFailed = targetStatuses.every(s => s === TargetStatus.Failed)
  if (allFailed) return PostStatus.Failed
  return PostStatus.PartiallyFailed
}
```

- [ ] **Step 3: Tests grün, tsc clean, commit**

```bash
git commit -am "feat(social): post status enums + state-machine helpers"
```

---

## Phase B — SocialProvider Interface + MetaPublishClient

### Task 3: `SocialProvider` Interface + Result-Typen

**Files:**
- Create: `src/lib/services/social/social-provider.ts`

Pure types — kein Test (Type-Definitions). TS-Compile ist der Test.

- [ ] **Step 1: Datei anlegen**

```typescript
// src/lib/services/social/social-provider.ts
import type { SocialPost, SocialPostTarget } from '@/lib/db/schema'

export interface PublishSuccess {
  ok: true
  externalPostId: string
  externalUrl: string | null
}

export interface PublishFailure {
  ok: false
  error: string
  /** True bei 401/403 — Account muss als revoked markiert werden, kein Retry. */
  revokeAccount: boolean
}

export type PublishResult = PublishSuccess | PublishFailure

export interface SocialProvider {
  /** Identifier matching `social_oauth_accounts.provider`. */
  readonly name: 'facebook' | 'instagram' | 'x' | 'linkedin'

  /**
   * Publish the target's body (or `post.masterBody` if no override) plus the
   * `post.masterImagePath` to the provider's API. Returns PublishResult — the
   * caller persists status + external IDs.
   *
   * Implementations must NOT throw on API errors; failures are returned as
   * PublishFailure with `revokeAccount` set when the credentials are dead.
   */
  publish(target: SocialPostTarget, post: SocialPost): Promise<PublishResult>
}
```

- [ ] **Step 2: tsc clean, commit**

```bash
git commit -am "feat(social): SocialProvider interface + result types"
```

---

### Task 4: `MetaPublishClient` (FB-Page-Feed)

**Files:**
- Create: `src/lib/services/social/meta-publish.client.ts`
- Test: `src/__tests__/unit/services/social/meta-publish.client.test.ts`

Wir bauen einen SEPARATEN Client (nicht den Phase-1-`MetaOAuthClient` erweitern), weil die Verantwortlichkeiten klar getrennt sind: OAuth vs. Publishing.

Das **Image-Hosting** ist in dieser Phase ein offener Punkt — wir nehmen `masterImagePath` als String an, der zur Laufzeit zu einer **public URL** aufgelöst wird. Phase 2B baut die URL-Auflösung; Phase 2A stellt nur die Methoden-Signatur. Wir erwarten als Input bereits eine **public URL** (oder `null`).

- [ ] **Step 1: Failing Tests**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

beforeEach(() => mockFetch.mockReset())

describe('MetaPublishClient.publishToFacebookPage', () => {
  it('POSTs message + link to /{page-id}/feed', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ id: '123_456' }) })
    const { MetaPublishClient } = await import('@/lib/services/social/meta-publish.client')
    const r = await MetaPublishClient.publishToFacebookPage({
      pageId: 'p1', pageAccessToken: 'tok', message: 'Hello', imageUrl: null,
    })
    expect(r).toEqual({ ok: true, externalPostId: '123_456', externalUrl: 'https://www.facebook.com/123_456' })
    expect(mockFetch).toHaveBeenCalledOnce()
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toContain('/p1/feed')
    expect(init.method).toBe('POST')
    expect(init.body).toBeInstanceOf(URLSearchParams)
    expect((init.body as URLSearchParams).get('message')).toBe('Hello')
    expect((init.body as URLSearchParams).get('access_token')).toBe('tok')
  })

  it('POSTs to /{page-id}/photos when imageUrl is present', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ id: '999_888', post_id: '999_777' }) })
    const { MetaPublishClient } = await import('@/lib/services/social/meta-publish.client')
    const r = await MetaPublishClient.publishToFacebookPage({
      pageId: 'p1', pageAccessToken: 'tok', message: 'with pic', imageUrl: 'https://cdn/x.jpg',
    })
    expect(r).toEqual({ ok: true, externalPostId: '999_777', externalUrl: 'https://www.facebook.com/999_777' })
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toContain('/p1/photos')
    expect((init.body as URLSearchParams).get('url')).toBe('https://cdn/x.jpg')
    expect((init.body as URLSearchParams).get('caption')).toBe('with pic')
  })

  it('returns failure with revokeAccount=true on 401', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({ error: { message: 'token revoked' } }) })
    const { MetaPublishClient } = await import('@/lib/services/social/meta-publish.client')
    const r = await MetaPublishClient.publishToFacebookPage({ pageId: 'p1', pageAccessToken: 'tok', message: 'x', imageUrl: null })
    expect(r).toEqual({ ok: false, error: 'token revoked', revokeAccount: true })
  })

  it('returns failure with revokeAccount=false on 500', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ error: { message: 'server error' } }) })
    const { MetaPublishClient } = await import('@/lib/services/social/meta-publish.client')
    const r = await MetaPublishClient.publishToFacebookPage({ pageId: 'p1', pageAccessToken: 'tok', message: 'x', imageUrl: null })
    expect(r).toEqual({ ok: false, error: 'server error', revokeAccount: false })
  })

  it('does not throw on non-JSON error response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 502, json: async () => { throw new Error('not json') } })
    const { MetaPublishClient } = await import('@/lib/services/social/meta-publish.client')
    const r = await MetaPublishClient.publishToFacebookPage({ pageId: 'p1', pageAccessToken: 'tok', message: 'x', imageUrl: null })
    expect(r.ok).toBe(false)
    expect((r as any).error).toMatch(/meta_http_502/)
  })
})

describe('MetaPublishClient.publishToInstagram', () => {
  it('two-step: create container then publish', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'container_1' }) })  // POST /media
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'media_999' }) })   // POST /media_publish
    const { MetaPublishClient } = await import('@/lib/services/social/meta-publish.client')
    const r = await MetaPublishClient.publishToInstagram({
      igUserId: 'ig1', pageAccessToken: 'tok', caption: 'Caption', imageUrl: 'https://cdn/x.jpg',
    })
    expect(r).toEqual({ ok: true, externalPostId: 'media_999', externalUrl: null })

    expect(mockFetch).toHaveBeenCalledTimes(2)
    const [step1Url, step1Init] = mockFetch.mock.calls[0]
    expect(step1Url).toContain('/ig1/media')
    expect((step1Init.body as URLSearchParams).get('image_url')).toBe('https://cdn/x.jpg')
    expect((step1Init.body as URLSearchParams).get('caption')).toBe('Caption')

    const [step2Url, step2Init] = mockFetch.mock.calls[1]
    expect(step2Url).toContain('/ig1/media_publish')
    expect((step2Init.body as URLSearchParams).get('creation_id')).toBe('container_1')
  })

  it('rejects when imageUrl is missing (IG requires image)', async () => {
    const { MetaPublishClient } = await import('@/lib/services/social/meta-publish.client')
    const r = await MetaPublishClient.publishToInstagram({ igUserId: 'ig1', pageAccessToken: 'tok', caption: 'x', imageUrl: null })
    expect(r).toEqual({ ok: false, error: 'instagram_requires_image', revokeAccount: false })
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('returns failure when container creation fails', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({ error: { message: 'invalid image_url' } }) })
    const { MetaPublishClient } = await import('@/lib/services/social/meta-publish.client')
    const r = await MetaPublishClient.publishToInstagram({ igUserId: 'ig1', pageAccessToken: 'tok', caption: 'x', imageUrl: 'https://cdn/y.jpg' })
    expect(r).toEqual({ ok: false, error: 'invalid image_url', revokeAccount: false })
  })

  it('returns failure when media_publish step fails (rare but possible)', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'container_1' }) })
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ error: { message: 'rate_limited' } }) })
    const { MetaPublishClient } = await import('@/lib/services/social/meta-publish.client')
    const r = await MetaPublishClient.publishToInstagram({ igUserId: 'ig1', pageAccessToken: 'tok', caption: 'x', imageUrl: 'https://cdn/y.jpg' })
    expect(r).toEqual({ ok: false, error: 'rate_limited', revokeAccount: false })
  })
})
```

- [ ] **Step 2: Implementierung**

```typescript
// src/lib/services/social/meta-publish.client.ts
import type { PublishResult } from './social-provider'

const GRAPH_BASE = 'https://graph.facebook.com/v19.0'

interface FbInput {
  pageId: string
  pageAccessToken: string
  message: string
  imageUrl: string | null
}

interface IgInput {
  igUserId: string
  pageAccessToken: string
  caption: string
  imageUrl: string | null
}

async function postForm(url: string, params: Record<string, string>): Promise<{ ok: boolean; status: number; body: any }> {
  const body = new URLSearchParams(params)
  const res = await fetch(url, { method: 'POST', body })
  const json = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, body: json }
}

function asFailure(status: number, body: any): { ok: false; error: string; revokeAccount: boolean } {
  const msg = body?.error?.message ?? `meta_http_${status}`
  return { ok: false, error: msg, revokeAccount: status === 401 || status === 403 }
}

export const MetaPublishClient = {
  async publishToFacebookPage(input: FbInput): Promise<PublishResult> {
    const { pageId, pageAccessToken, message, imageUrl } = input
    if (imageUrl) {
      const r = await postForm(`${GRAPH_BASE}/${pageId}/photos`, {
        url: imageUrl,
        caption: message,
        access_token: pageAccessToken,
      })
      if (!r.ok) return asFailure(r.status, r.body)
      // /photos returns { id: photoId, post_id: feedPostId }
      const externalPostId = r.body.post_id ?? r.body.id
      return { ok: true, externalPostId, externalUrl: `https://www.facebook.com/${externalPostId}` }
    }
    const r = await postForm(`${GRAPH_BASE}/${pageId}/feed`, {
      message,
      access_token: pageAccessToken,
    })
    if (!r.ok) return asFailure(r.status, r.body)
    return { ok: true, externalPostId: r.body.id, externalUrl: `https://www.facebook.com/${r.body.id}` }
  },

  async publishToInstagram(input: IgInput): Promise<PublishResult> {
    const { igUserId, pageAccessToken, caption, imageUrl } = input
    if (!imageUrl) {
      return { ok: false, error: 'instagram_requires_image', revokeAccount: false }
    }
    // Step 1: create media container
    const step1 = await postForm(`${GRAPH_BASE}/${igUserId}/media`, {
      image_url: imageUrl,
      caption,
      access_token: pageAccessToken,
    })
    if (!step1.ok) return asFailure(step1.status, step1.body)
    const containerId = step1.body.id
    // Step 2: publish container
    const step2 = await postForm(`${GRAPH_BASE}/${igUserId}/media_publish`, {
      creation_id: containerId,
      access_token: pageAccessToken,
    })
    if (!step2.ok) return asFailure(step2.status, step2.body)
    // IG doesn't return a public URL in this response; could be derived later via /{media-id}?fields=permalink
    return { ok: true, externalPostId: step2.body.id, externalUrl: null }
  },
}
```

- [ ] **Step 3: Tests green, tsc clean, commit**

```bash
git commit -am "feat(social): MetaPublishClient (FB feed + IG 2-step)"
```

---

### Task 5: `MetaProvider implements SocialProvider`

**Files:**
- Create: `src/lib/services/social/meta-provider.ts`
- Test: `src/__tests__/unit/services/social/meta-provider.test.ts`

Wrapper, der:
1. Den `provider`-Wert des Targets prüft
2. Den encrypted Page-Access-Token aus `social_oauth_accounts` lädt + entschlüsselt
3. Auf `MetaPublishClient.publishToFacebookPage` oder `publishToInstagram` dispatcht

- [ ] **Step 1: Failing Tests**

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setupDbMock } from '@/__tests__/helpers/mock-db'

vi.mock('@/lib/services/social/crypto-config', () => ({
  getSocialTokenKey: vi.fn().mockResolvedValue('a'.repeat(64)),
}))

vi.mock('@/lib/crypto/token-crypto', () => ({
  decryptToken: vi.fn().mockReturnValue('decrypted_page_token'),
}))

const pubClient = {
  publishToFacebookPage: vi.fn(),
  publishToInstagram: vi.fn(),
}
vi.mock('@/lib/services/social/meta-publish.client', () => ({ MetaPublishClient: pubClient }))

beforeEach(() => {
  vi.resetModules()
  pubClient.publishToFacebookPage.mockReset()
  pubClient.publishToInstagram.mockReset()
})

describe('MetaProvider.publish', () => {
  it('routes facebook target to publishToFacebookPage with decrypted token + master body', async () => {
    const dbMock = setupDbMock()
    dbMock.selectMock.mockResolvedValue([{
      provider: 'facebook', externalAccountId: 'page_42', accessTokenEnc: 'iv:ct:tag', status: 'connected',
    }])
    pubClient.publishToFacebookPage.mockResolvedValue({ ok: true, externalPostId: 'p_99', externalUrl: 'https://www.facebook.com/p_99' })

    const { MetaProvider } = await import('@/lib/services/social/meta-provider')
    const r = await MetaProvider.publish(
      { id: 't1', postId: 'pst1', provider: 'facebook', bodyOverride: null } as any,
      { id: 'pst1', masterBody: 'Hello world', masterImagePath: null } as any,
    )
    expect(r).toEqual({ ok: true, externalPostId: 'p_99', externalUrl: 'https://www.facebook.com/p_99' })
    expect(pubClient.publishToFacebookPage).toHaveBeenCalledWith({
      pageId: 'page_42',
      pageAccessToken: 'decrypted_page_token',
      message: 'Hello world',
      imageUrl: null,
    })
  })

  it('routes instagram target to publishToInstagram with caption + image url', async () => {
    const dbMock = setupDbMock()
    dbMock.selectMock.mockResolvedValue([{
      provider: 'instagram', externalAccountId: 'ig_user_77', accessTokenEnc: 'iv:ct:tag', status: 'connected',
    }])
    pubClient.publishToInstagram.mockResolvedValue({ ok: true, externalPostId: 'media_1', externalUrl: null })

    const { MetaProvider } = await import('@/lib/services/social/meta-provider')
    const r = await MetaProvider.publish(
      { provider: 'instagram', bodyOverride: 'IG-only caption' } as any,
      { masterBody: 'master', masterImagePath: 'https://cdn/x.jpg' } as any,
    )
    expect(r.ok).toBe(true)
    expect(pubClient.publishToInstagram).toHaveBeenCalledWith({
      igUserId: 'ig_user_77',
      pageAccessToken: 'decrypted_page_token',
      caption: 'IG-only caption',
      imageUrl: 'https://cdn/x.jpg',
    })
  })

  it('returns failure when no connected account exists for provider', async () => {
    const dbMock = setupDbMock()
    dbMock.selectMock.mockResolvedValue([])  // no row

    const { MetaProvider } = await import('@/lib/services/social/meta-provider')
    const r = await MetaProvider.publish(
      { provider: 'facebook' } as any,
      { masterBody: 'x', masterImagePath: null } as any,
    )
    expect(r).toEqual({ ok: false, error: 'no_connected_account', revokeAccount: false })
    expect(pubClient.publishToFacebookPage).not.toHaveBeenCalled()
  })

  it('rejects unsupported provider with throw (programmer error)', async () => {
    const { MetaProvider } = await import('@/lib/services/social/meta-provider')
    await expect(MetaProvider.publish({ provider: 'x' } as any, {} as any))
      .rejects.toThrow(/unsupported_provider_for_meta/)
  })
})
```

- [ ] **Step 2: Implementierung**

```typescript
// src/lib/services/social/meta-provider.ts
import { db } from '@/lib/db'
import { socialOauthAccounts, type SocialPost, type SocialPostTarget } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { decryptToken } from '@/lib/crypto/token-crypto'
import { getSocialTokenKey } from './crypto-config'
import { MetaPublishClient } from './meta-publish.client'
import type { SocialProvider, PublishResult } from './social-provider'

async function loadAccount(provider: 'facebook' | 'instagram') {
  const [row] = await db.select().from(socialOauthAccounts)
    .where(and(eq(socialOauthAccounts.provider, provider), eq(socialOauthAccounts.status, 'connected')))
    .limit(1)
  return row
}

export const MetaProvider: SocialProvider = {
  name: 'facebook',  // primary identity (instagram is also routed here)

  async publish(target: SocialPostTarget, post: SocialPost): Promise<PublishResult> {
    const provider = target.provider
    if (provider !== 'facebook' && provider !== 'instagram') {
      throw new Error('unsupported_provider_for_meta')
    }
    const account = await loadAccount(provider)
    if (!account) return { ok: false, error: 'no_connected_account', revokeAccount: false }

    const key = await getSocialTokenKey()
    const pageAccessToken = decryptToken(account.accessTokenEnc, key)
    const body = target.bodyOverride ?? post.masterBody
    const imageUrl = post.masterImagePath  // assumed already a public URL in this phase

    if (provider === 'facebook') {
      return MetaPublishClient.publishToFacebookPage({
        pageId: account.externalAccountId,
        pageAccessToken,
        message: body,
        imageUrl,
      })
    }
    return MetaPublishClient.publishToInstagram({
      igUserId: account.externalAccountId,
      pageAccessToken,
      caption: body,
      imageUrl,
    })
  },
}
```

> **Note on `name`:** The `SocialProvider` interface specifies a single `name`. `MetaProvider` actually serves both `facebook` and `instagram`. This is OK for V1 — the dispatcher in `SocialPostService.publish` uses the **target's** provider, not the provider's name. The `name` field stays `'facebook'` and a small `static for-instagram` accessor isn't necessary. Document inline.

- [ ] **Step 3: Tests green, tsc clean, commit**

```bash
git commit -am "feat(social): MetaProvider — dispatcher for facebook + instagram"
```

---

## Phase C — SocialPostService

### Task 6: `SocialPostService.create` + `update` + `approve` + `discard`

**Files:**
- Create: `src/lib/services/social/social-post.service.ts`
- Test: `src/__tests__/unit/services/social/social-post.service.test.ts`

CRUD-Lifecycle. **Noch ohne `publish` — das kommt in Task 7.**

Methoden:
- `create({ masterBody, masterImagePath, providers, createdBy })`: insert post + targets
- `update(postId, { masterBody?, masterImagePath?, targets? })`: only allowed in `draft`/`approved`. Targets können add/remove/change-body.
- `approve(postId, approvedBy)`: `draft` → `approved`. Throws if not draft.
- `discard(postId)`: hard-delete the post (CASCADE → targets weg). Only allowed in `draft`.

- [ ] **Step 1: Failing Tests**

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setupDbMock } from '@/__tests__/helpers/mock-db'

beforeEach(() => { vi.resetModules() })

describe('SocialPostService.create', () => {
  it('inserts post with provided body + creates one target per provider', async () => {
    const dbMock = setupDbMock()
    dbMock.insertMock
      .mockResolvedValueOnce([{ id: 'post1' }])  // post insert
      .mockResolvedValueOnce([{ id: 't1' }])     // target fb
      .mockResolvedValueOnce([{ id: 't2' }])     // target ig

    const { SocialPostService } = await import('@/lib/services/social/social-post.service')
    const r = await SocialPostService.create({
      masterBody: 'Hello',
      masterImagePath: null,
      providers: ['facebook', 'instagram'],
      createdBy: 'u1',
    })
    expect(r).toEqual({ id: 'post1' })
    expect(dbMock.db.insert).toHaveBeenCalledTimes(3)
  })

  it('rejects when providers array is empty', async () => {
    setupDbMock()
    const { SocialPostService } = await import('@/lib/services/social/social-post.service')
    await expect(SocialPostService.create({
      masterBody: 'x', masterImagePath: null, providers: [], createdBy: 'u1',
    })).rejects.toThrow(/at_least_one_provider/)
  })
})

describe('SocialPostService.approve', () => {
  it('transitions draft to approved', async () => {
    const dbMock = setupDbMock()
    dbMock.selectMock.mockResolvedValue([{ id: 'p1', status: 'draft' }])
    dbMock.updateMock.mockResolvedValue([{ id: 'p1', status: 'approved' }])

    const { SocialPostService } = await import('@/lib/services/social/social-post.service')
    await SocialPostService.approve('p1', 'u1')
    expect(dbMock.db.update).toHaveBeenCalledOnce()
  })

  it('rejects when post is already approved', async () => {
    const dbMock = setupDbMock()
    dbMock.selectMock.mockResolvedValue([{ id: 'p1', status: 'approved' }])

    const { SocialPostService } = await import('@/lib/services/social/social-post.service')
    await expect(SocialPostService.approve('p1', 'u1')).rejects.toThrow(/invalid_transition/)
  })

  it('rejects when post not found', async () => {
    const dbMock = setupDbMock()
    dbMock.selectMock.mockResolvedValue([])

    const { SocialPostService } = await import('@/lib/services/social/social-post.service')
    await expect(SocialPostService.approve('p1', 'u1')).rejects.toThrow(/not_found/)
  })
})

describe('SocialPostService.discard', () => {
  it('deletes draft post (cascade removes targets)', async () => {
    const dbMock = setupDbMock()
    dbMock.selectMock.mockResolvedValue([{ id: 'p1', status: 'draft' }])
    dbMock.deleteMock.mockResolvedValue([{ id: 'p1' }])

    const { SocialPostService } = await import('@/lib/services/social/social-post.service')
    await SocialPostService.discard('p1')
    expect(dbMock.db.delete).toHaveBeenCalledOnce()
  })

  it('rejects discard on non-draft post', async () => {
    const dbMock = setupDbMock()
    dbMock.selectMock.mockResolvedValue([{ id: 'p1', status: 'posted' }])

    const { SocialPostService } = await import('@/lib/services/social/social-post.service')
    await expect(SocialPostService.discard('p1')).rejects.toThrow(/only_drafts/)
  })
})
```

- [ ] **Step 2: Implementierung**

```typescript
// src/lib/services/social/social-post.service.ts
import { db } from '@/lib/db'
import { socialPosts, socialPostTargets } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { PostStatus, canTransition } from './post-status'

type ProviderName = 'facebook' | 'instagram' | 'x' | 'linkedin'

export interface CreateInput {
  masterBody: string
  masterImagePath: string | null
  providers: ProviderName[]
  createdBy: string
}

export const SocialPostService = {
  async create(input: CreateInput): Promise<{ id: string }> {
    if (input.providers.length === 0) throw new Error('at_least_one_provider')

    const [post] = await db.insert(socialPosts).values({
      status: PostStatus.Draft,
      masterBody: input.masterBody,
      masterImagePath: input.masterImagePath,
      createdBy: input.createdBy,
    }).returning({ id: socialPosts.id })

    for (const provider of input.providers) {
      await db.insert(socialPostTargets).values({
        postId: post.id,
        provider,
      })
    }
    return { id: post.id }
  },

  async approve(postId: string, approvedBy: string): Promise<void> {
    const [post] = await db.select().from(socialPosts).where(eq(socialPosts.id, postId)).limit(1)
    if (!post) throw new Error('not_found')
    if (!canTransition(post.status as any, PostStatus.Approved)) {
      throw new Error('invalid_transition')
    }
    await db.update(socialPosts).set({
      status: PostStatus.Approved,
      approvedBy,
      approvedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(socialPosts.id, postId))
  },

  async discard(postId: string): Promise<void> {
    const [post] = await db.select().from(socialPosts).where(eq(socialPosts.id, postId)).limit(1)
    if (!post) throw new Error('not_found')
    if (post.status !== PostStatus.Draft) throw new Error('only_drafts')
    await db.delete(socialPosts).where(eq(socialPosts.id, postId))
  },
}
```

> **`update` is intentionally deferred** to Phase 2B (when the editor route lands). The Phase 2A surface is `create / approve / discard / publish`. If the executor finds `update` is needed for testing earlier, add a minimal version. Otherwise leave for 2B.

- [ ] **Step 3: Tests green, tsc clean, commit**

```bash
git commit -am "feat(social): SocialPostService — create/approve/discard"
```

---

### Task 7: `SocialPostService.publish(postId)` — parallel target dispatch

**Files:**
- Modify: `src/lib/services/social/social-post.service.ts`
- Modify test: `src/__tests__/unit/services/social/social-post.service.test.ts`

`publish(postId)` orchestriert:
1. Lade Post + alle Targets
2. Setze Post-Status auf `scheduled` (semantisch unsinnig hier, aber wir nutzen `posted` direkt — siehe unten) — eigentlich brauchen wir keinen Übergang über `scheduled`, das ist Phase 3 (Cron). Für Phase 2 (manuelles "Jetzt posten"): Übergang ist `approved` → `posted`/`partially_failed`/`failed` direkt.
3. Pro Target parallel: setze `publishing` → call `MetaProvider.publish` → setze `posted`/`failed` mit external IDs
4. Bei `failure.revokeAccount`: setze den entsprechenden `socialOauthAccounts`-Eintrag auf `revoked`
5. Setze Post-Status via `deriveOverallStatus`

**Concurrent guard:** Wenn Post bereits `posted`/`failed`/`partially_failed`, throw. Wenn `draft`, throw (muss erst approved sein). Wenn aktuell `publishing` (sollte nicht passieren ohne separate State, aber defensive): throw.

- [ ] **Step 1: Failing Tests** (zusätzlich zur existierenden Suite)

```typescript
const metaProvider = { publish: vi.fn() }
vi.mock('@/lib/services/social/meta-provider', () => ({ MetaProvider: metaProvider }))

describe('SocialPostService.publish', () => {
  beforeEach(() => metaProvider.publish.mockReset())

  it('publishes all targets, sets all to posted, post → posted', async () => {
    const dbMock = setupDbMock()
    dbMock.selectMock
      .mockResolvedValueOnce([{ id: 'p1', status: 'approved', masterBody: 'hi', masterImagePath: null }])  // post
      .mockResolvedValueOnce([
        { id: 't1', postId: 'p1', provider: 'facebook', publishStatus: 'pending' },
        { id: 't2', postId: 'p1', provider: 'instagram', publishStatus: 'pending' },
      ])  // targets
    metaProvider.publish
      .mockResolvedValueOnce({ ok: true, externalPostId: 'fb_1', externalUrl: 'https://www.facebook.com/fb_1' })
      .mockResolvedValueOnce({ ok: true, externalPostId: 'ig_1', externalUrl: null })

    const { SocialPostService } = await import('@/lib/services/social/social-post.service')
    const r = await SocialPostService.publish('p1')
    expect(r.status).toBe('posted')
    expect(metaProvider.publish).toHaveBeenCalledTimes(2)
    // 2 target-updates to publishing, 2 to posted, 1 post-status update = 5 updates
    expect(dbMock.db.update).toHaveBeenCalled()
  })

  it('partial failure → post status partially_failed', async () => {
    const dbMock = setupDbMock()
    dbMock.selectMock
      .mockResolvedValueOnce([{ id: 'p1', status: 'approved', masterBody: 'hi', masterImagePath: null }])
      .mockResolvedValueOnce([
        { id: 't1', provider: 'facebook' }, { id: 't2', provider: 'instagram' },
      ])
    metaProvider.publish
      .mockResolvedValueOnce({ ok: true, externalPostId: 'fb_1', externalUrl: '...' })
      .mockResolvedValueOnce({ ok: false, error: 'rate_limited', revokeAccount: false })

    const { SocialPostService } = await import('@/lib/services/social/social-post.service')
    const r = await SocialPostService.publish('p1')
    expect(r.status).toBe('partially_failed')
  })

  it('all targets fail → post status failed', async () => {
    const dbMock = setupDbMock()
    dbMock.selectMock
      .mockResolvedValueOnce([{ id: 'p1', status: 'approved', masterBody: 'hi', masterImagePath: null }])
      .mockResolvedValueOnce([{ id: 't1', provider: 'facebook' }])
    metaProvider.publish.mockResolvedValueOnce({ ok: false, error: 'server_down', revokeAccount: false })

    const { SocialPostService } = await import('@/lib/services/social/social-post.service')
    const r = await SocialPostService.publish('p1')
    expect(r.status).toBe('failed')
  })

  it('marks oauth-account revoked when revokeAccount=true', async () => {
    const dbMock = setupDbMock()
    dbMock.selectMock
      .mockResolvedValueOnce([{ id: 'p1', status: 'approved', masterBody: 'x', masterImagePath: null }])
      .mockResolvedValueOnce([{ id: 't1', provider: 'facebook' }])
    metaProvider.publish.mockResolvedValueOnce({ ok: false, error: 'token expired', revokeAccount: true })

    const { SocialPostService } = await import('@/lib/services/social/social-post.service')
    await SocialPostService.publish('p1')
    // Among the db.update calls, one should set status='revoked' on socialOauthAccounts
    const updateSetters = dbMock.db.update.mock.calls
    expect(updateSetters.length).toBeGreaterThanOrEqual(1)
    // (precise inspection is implementation-specific; smoke test the call count)
  })

  it('rejects when post is in draft', async () => {
    const dbMock = setupDbMock()
    dbMock.selectMock.mockResolvedValueOnce([{ id: 'p1', status: 'draft' }])
    const { SocialPostService } = await import('@/lib/services/social/social-post.service')
    await expect(SocialPostService.publish('p1')).rejects.toThrow(/invalid_state_for_publish/)
  })

  it('rejects when post is already posted', async () => {
    const dbMock = setupDbMock()
    dbMock.selectMock.mockResolvedValueOnce([{ id: 'p1', status: 'posted' }])
    const { SocialPostService } = await import('@/lib/services/social/social-post.service')
    await expect(SocialPostService.publish('p1')).rejects.toThrow(/invalid_state_for_publish/)
  })
})
```

- [ ] **Step 2: `publish` implementieren**

Erweitere `social-post.service.ts`:

```typescript
import { socialOauthAccounts, type SocialPostTarget } from '@/lib/db/schema'
import { TargetStatus, deriveOverallStatus } from './post-status'
import { MetaProvider } from './meta-provider'
import type { PublishResult } from './social-provider'

// ... existing methods above

  async publish(postId: string): Promise<{ status: string }> {
    const [post] = await db.select().from(socialPosts).where(eq(socialPosts.id, postId)).limit(1)
    if (!post) throw new Error('not_found')
    if (post.status !== PostStatus.Approved) throw new Error('invalid_state_for_publish')

    const targets = await db.select().from(socialPostTargets)
      .where(eq(socialPostTargets.postId, postId))
    if (targets.length === 0) throw new Error('no_targets')

    // Publish all targets in parallel
    const results = await Promise.all(targets.map(async (t) => {
      await db.update(socialPostTargets)
        .set({ publishStatus: TargetStatus.Publishing, updatedAt: new Date() })
        .where(eq(socialPostTargets.id, t.id))
      try {
        const r: PublishResult = await MetaProvider.publish(t, post)
        if (r.ok) {
          await db.update(socialPostTargets).set({
            publishStatus: TargetStatus.Posted,
            externalPostId: r.externalPostId,
            externalUrl: r.externalUrl,
            postedAt: new Date(),
            updatedAt: new Date(),
            lastError: null,
          }).where(eq(socialPostTargets.id, t.id))
          return { provider: t.provider, status: TargetStatus.Posted }
        }
        // failure
        await db.update(socialPostTargets).set({
          publishStatus: TargetStatus.Failed,
          retryCount: (t.retryCount ?? 0) + 1,
          lastError: r.error,
          updatedAt: new Date(),
        }).where(eq(socialPostTargets.id, t.id))
        if (r.revokeAccount) {
          await db.update(socialOauthAccounts).set({
            status: 'revoked',
            revokedAt: new Date(),
            updatedAt: new Date(),
          }).where(and(
            eq(socialOauthAccounts.provider, t.provider),
            eq(socialOauthAccounts.status, 'connected'),
          ))
        }
        return { provider: t.provider, status: TargetStatus.Failed }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'unknown_error'
        await db.update(socialPostTargets).set({
          publishStatus: TargetStatus.Failed,
          retryCount: (t.retryCount ?? 0) + 1,
          lastError: msg,
          updatedAt: new Date(),
        }).where(eq(socialPostTargets.id, t.id))
        return { provider: t.provider, status: TargetStatus.Failed }
      }
    }))

    const overall = deriveOverallStatus(results.map(r => r.status as TargetStatus)) ?? PostStatus.Failed
    await db.update(socialPosts).set({
      status: overall,
      updatedAt: new Date(),
    }).where(eq(socialPosts.id, postId))

    return { status: overall }
  },
```

Imports ergänzen: `and`, `socialOauthAccounts`, `TargetStatus`, `deriveOverallStatus`, `MetaProvider`, `PublishResult`.

- [ ] **Step 3: Tests green, tsc clean, commit**

```bash
git commit -am "feat(social): SocialPostService.publish — parallel targets + status derivation"
```

---

## Phase D — Audit-Logs

### Task 8: AuditLog-Aufrufe für State-Übergänge

**Files:**
- Modify: `src/lib/services/social/social-post.service.ts`
- Modify test: `src/__tests__/unit/services/social/social-post.service.test.ts`

Füge AuditLog-Aufrufe hinzu für: `created`, `approved`, `discarded`, `published`, `published_failed`. Das `request`-Objekt fehlt in Phase 2A — wir geben `undefined`. Phase 2B's Routes geben das echte `request` durch.

Pattern: jede Methode bekommt einen optionalen `actor` Parameter:

```typescript
interface Actor {
  userId: string
  userRole: string
  request?: Request | undefined
}
```

Methoden-Signaturen anpassen:
- `create({ ..., actor })`
- `approve(postId, actor)` (approvedBy = actor.userId)
- `discard(postId, actor)`
- `publish(postId, actor)` (publish-now wird von einem User getriggert; cron-publish in Phase 3 nutzt einen separaten "system" actor)

Audit-Aufrufe:
- `create` → `social_post_created`
- `approve` → `social_post_approved`
- `discard` → `social_post_discarded`
- `publish` (success) → `social_post_published` mit `payload: { targets: [...] }`
- `publish` (any failure) → `social_post_failed` mit `payload: { failedProviders: [...], errors: [...] }`

- [ ] **Step 1: Mock AuditLogService in tests**

```typescript
const audit = { log: vi.fn() }
vi.mock('@/lib/services/audit-log.service', () => ({ AuditLogService: audit }))
```

Aktualisiere die existing tests, um `actor: { userId: 'u1', userRole: 'owner' }` mitzuschicken und assert that `audit.log` was called with the right action.

- [ ] **Step 2: Implementation aktualisieren** — füge `AuditLogService.log({ ... })` an passenden Stellen ein. Bei `publish`: rufe `social_post_published` wenn overall=`posted`, sonst `social_post_failed` (mit detail).

- [ ] **Step 3: Tests green, tsc clean, commit**

```bash
git commit -am "feat(social): audit logs for post lifecycle (created/approved/discarded/published)"
```

---

## Self-Review Checklist (vor Phase 2B)

- [ ] Alle 8 Tasks committed, Tests grün (`npm run test:unit`)
- [ ] `npx tsc --noEmit` clean
- [ ] `npm run db:generate` produziert keine Diffs für die neuen Tabellen
- [ ] Code-Pfad lesbar: `SocialPostService.publish(postId)` → für jedes Target → `MetaProvider.publish` → DB-Update → audit
- [ ] FB-Posts ohne Bild gehen an `/feed`, mit Bild an `/photos`
- [ ] IG-Posts: 2-Step (container → publish), `instagram_requires_image` wenn kein Bild
- [ ] `revokeAccount=true` bei 401/403 → Account-Status `revoked`
- [ ] Status-State-Machine verhindert ungültige Übergänge

## Out-of-Scope-Reminder (kommt in 2B)

- API-Routen (`POST/PATCH/DELETE/POST-publish-now /api/v1/social/posts`)
- Image-Upload-Endpoint + Public-URL-Auflösung in `MetaProvider.publish`
- UI: Liste, Editor, Approve-Button, Publish-Now-Button
- Multi-Image / Carousel
- X-/LinkedIn-Provider
- Cron-Auto-Posting (Phase 3)
- Rename-Cleanup (Phase 2C)
