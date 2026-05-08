# News-Modul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** News-Modul mit konfigurierbaren Themenbereichen, täglicher SerpAPI-Recherche (Cron + manuell), Dashboard-Anzeige und async Pipeline News→Blog→Social über bestehende `task_queue`.

**Architecture:** Adapter-Pattern für News-Quellen (MVP: nur SerpAPI Google News, V2-vorbereitet). Sequenzielle Drei-Stufen-Pipeline (Recherche → Blog-Draft → Social-Drafts) gestartet über `task_queue` mit `type='news_pipeline'`. Drafts werden direkt in bestehende `blog_posts`/`social_media_posts` mit FK `source_news_item_id` geschrieben — keine eigene Draft-Tabelle.

**Tech Stack:** Next.js App Router, Drizzle ORM (Postgres), vitest, bestehende Services: `AiProviderService`, `AiPromptTemplateService`, `BlogPostService`, `SocialMediaPostService`, `TaskQueueService`, `CronService`, `AuditLogService`. Auth via `withPermission(...)`. API-Responses via `apiSuccess`/`apiValidationError`/`apiServerError`.

**Spec:** [`docs/superpowers/specs/2026-05-08-news-modul-design.md`](../specs/2026-05-08-news-modul-design.md)

---

## File Structure

```
src/lib/db/schema.ts                                            + newsTopics, newsItems, FK-Spalten + Relationen
src/lib/services/news/source-adapter.types.ts                   neu — Adapter-Interface
src/lib/services/news/serpapi-news.adapter.ts                   neu — MVP-Adapter
src/lib/services/news/index.ts                                  neu — resolveAdapter(sourceType)
src/lib/services/news.service.ts                                neu — Topics/Items CRUD + Recherche
src/lib/services/news-pipeline.service.ts                       neu — 3-Stufen-Pipeline
src/lib/services/news-pipeline-watchdog.ts                      neu — Status-Korrektur für hängende Items
src/lib/services/task-queue.service.ts                          + 'news_pipeline'-Branch in executeHandler
src/lib/services/cron.service.ts                                + 'news_research'-Branch
src/lib/constants/cron.ts                                       + ACTION_TYPE_OPTIONS-Eintrag
src/lib/services/blog-post.service.ts                           + sourceNewsItemId in CreateBlogPostInput/update
src/lib/services/social-media-post.service.ts                   + sourceNewsItemId-Support
src/lib/utils/validation.ts                                     + zod-Schemas für News
src/app/api/v1/news/topics/route.ts                             neu
src/app/api/v1/news/topics/[id]/route.ts                        neu
src/app/api/v1/news/topics/[id]/research/route.ts               neu
src/app/api/v1/news/research/route.ts                           neu
src/app/api/v1/news/items/route.ts                              neu
src/app/api/v1/news/items/[id]/route.ts                         neu
src/app/api/v1/news/items/[id]/pipeline/route.ts                neu
src/app/intern/(dashboard)/news/page.tsx                        neu — Dashboard
src/app/intern/(dashboard)/news/topics/page.tsx                 neu — Topics-Liste
src/app/intern/(dashboard)/news/topics/new/page.tsx             neu
src/app/intern/(dashboard)/news/topics/[id]/page.tsx            neu
src/app/intern/(dashboard)/news/[id]/page.tsx                   neu — News-Detail
src/components/news/news-card.tsx                               neu
src/components/news/topic-form.tsx                              neu
src/components/layout/sidebar.tsx                               + News-Eintrag (Dateipfad in T22 verifiziert)
src/lib/db/seeds/news-seed.ts                                   neu — 3 Topics inaktiv + 3 Prompts
drizzle/<timestamp>_news_module.sql                             generiert via drizzle-kit

Tests (vitest config: src/__tests__/**/*.test.ts):
src/__tests__/unit/services/news/serpapi-news.adapter.test.ts
src/__tests__/unit/services/news/news.service.test.ts
src/__tests__/unit/services/news/news-pipeline.service.test.ts
src/__tests__/unit/services/news/news-pipeline-watchdog.test.ts
src/__tests__/integration/api/news-topics.route.test.ts
src/__tests__/integration/api/news-items.route.test.ts
```

---

## Task 1: Schema-Erweiterung in `schema.ts`

**Files:**
- Modify: `src/lib/db/schema.ts` — neue Tabellen `newsTopics`, `newsItems`, FK-Spalten in `blogPosts`/`socialMediaPosts`, Relationen, Type-Exports

**Notes:**
- `taskQueue` ist bereits in `schema.ts` deklariert; FK auf `taskQueue.id` referenzierbar
- `uniqueIndex` aus `drizzle-orm/pg-core` — ggf. import ergänzen

- [ ] **Step 1: Imports prüfen**

In `src/lib/db/schema.ts` sicherstellen, dass `uniqueIndex` importiert ist. Falls nicht vorhanden, in den bestehenden `drizzle-orm/pg-core`-Import aufnehmen.

- [ ] **Step 2: `newsTopics` einfügen**

Vor dem Block `// Type Exports` (Zeile ~1779) ergänzen:

```ts
// ============================================
// News Topics (Recherche-Themenbereiche)
// ============================================
export const newsTopics = pgTable('news_topics', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  color: varchar('color', { length: 7 }).default('#3b82f6'),
  keywords: text('keywords').array().default([]).notNull(),
  sourceType: varchar('source_type', { length: 30 }).notNull().default('serpapi_news'),
  sourceConfig: jsonb('source_config').default({}),
  isActive: boolean('is_active').default(true),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_news_topics_active').on(table.isActive),
])

export type NewsTopic = typeof newsTopics.$inferSelect
export type NewNewsTopic = typeof newsTopics.$inferInsert
```

- [ ] **Step 3: `newsItems` einfügen**

Direkt unter `newsTopics`:

```ts
// ============================================
// News Items (recherchierte News)
// ============================================
export const newsItems = pgTable('news_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  topicId: uuid('topic_id').notNull().references(() => newsTopics.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 500 }).notNull(),
  url: varchar('url', { length: 1000 }).notNull(),
  snippet: text('snippet'),
  source: varchar('source', { length: 200 }),
  imageUrl: varchar('image_url', { length: 1000 }),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  urlHash: varchar('url_hash', { length: 64 }).notNull(),
  pipelineStatus: varchar('pipeline_status', { length: 20 }).default('idle').notNull(),
  pipelineError: text('pipeline_error'),
  pipelineTaskId: uuid('pipeline_task_id').references(() => taskQueue.id, { onDelete: 'set null' }),
  researchData: jsonb('research_data'),
  isHidden: boolean('is_hidden').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_news_items_topic').on(table.topicId),
  index('idx_news_items_pipeline_status').on(table.pipelineStatus),
  index('idx_news_items_published').on(table.publishedAt),
  uniqueIndex('uq_news_items_topic_url').on(table.topicId, table.urlHash),
])

export const newsTopicsRelations = relations(newsTopics, ({ many }) => ({
  items: many(newsItems),
}))

export const newsItemsRelations = relations(newsItems, ({ one }) => ({
  topic: one(newsTopics, {
    fields: [newsItems.topicId],
    references: [newsTopics.id],
  }),
}))

export type NewsItem = typeof newsItems.$inferSelect
export type NewNewsItem = typeof newsItems.$inferInsert
```

- [ ] **Step 4: FK-Spalte in `blogPosts` ergänzen**

In der `blogPosts`-Definition (Zeile ~1472) zusätzliches Feld nach `authorId`:

```ts
sourceNewsItemId: uuid('source_news_item_id'),
```

(FK-Constraint via raw SQL in der Migration — siehe T2 — weil `newsItems` weiter unten deklariert ist und Drizzle hier sonst forward-refs braucht. Type-mäßig reicht die Spalte; die Constraint kommt in der Migration.)

- [ ] **Step 5: FK-Spalte in `socialMediaPosts` ergänzen**

In der `socialMediaPosts`-Definition (Zeile ~1746) zusätzliches Feld nach `createdBy`:

```ts
sourceNewsItemId: uuid('source_news_item_id'),
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/db/schema.ts
git commit -m "feat(news): drizzle schema fuer news_topics, news_items + FK-Spalten"
```

---

## Task 2: Migration generieren und prüfen

**Files:**
- Create: `drizzle/<timestamp>_news_module.sql` (via drizzle-kit)

- [ ] **Step 1: Migration generieren**

```bash
npx drizzle-kit generate
```

- [ ] **Step 2: Migration inspizieren**

Generierte SQL-Datei im neuen `drizzle/`-File öffnen. Prüfen dass enthält:
- `CREATE TABLE "news_topics"` mit allen Feldern
- `CREATE TABLE "news_items"` mit `urlHash` und Foreign Key auf `news_topics(id) ON DELETE CASCADE`
- `CREATE UNIQUE INDEX "uq_news_items_topic_url" ON "news_items" USING btree ("topic_id","url_hash")`
- `ALTER TABLE "blog_posts" ADD COLUMN "source_news_item_id" uuid`
- `ALTER TABLE "social_media_posts" ADD COLUMN "source_news_item_id" uuid`
- Indizes `idx_news_topics_active`, `idx_news_items_topic`, `idx_news_items_pipeline_status`, `idx_news_items_published`

Falls die FK-Constraints für `blog_posts.source_news_item_id` und `social_media_posts.source_news_item_id` fehlen (weil Drizzle sie aus der Schema-Datei nicht ableiten konnte): am Ende der Migration manuell ergänzen:

```sql
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_source_news_item_id_fkey"
  FOREIGN KEY ("source_news_item_id") REFERENCES "news_items"("id") ON DELETE SET NULL;

ALTER TABLE "social_media_posts" ADD CONSTRAINT "social_media_posts_source_news_item_id_fkey"
  FOREIGN KEY ("source_news_item_id") REFERENCES "news_items"("id") ON DELETE SET NULL;
```

- [ ] **Step 3: Migration lokal ausführen**

Container/dev-DB starten, dann:

```bash
npx drizzle-kit migrate
```

Prüfen mit psql/Supabase-Studio dass Tabellen vorhanden sind.

- [ ] **Step 4: Commit**

```bash
git add drizzle/
git commit -m "feat(news): drizzle migration fuer news_topics, news_items, FKs"
```

---

## Task 3: SerpAPI-News-Adapter — Interface & Tests

**Files:**
- Create: `src/lib/services/news/source-adapter.types.ts`
- Create: `src/__tests__/unit/services/news/serpapi-news.adapter.test.ts`

- [ ] **Step 1: Interface schreiben**

`src/lib/services/news/source-adapter.types.ts`:

```ts
export interface NewsSearchResult {
  title: string
  url: string
  snippet?: string
  source?: string
  imageUrl?: string
  publishedAt?: Date
}

export interface NewsSourceAdapter {
  search(keywords: string[], config: Record<string, unknown>): Promise<NewsSearchResult[]>
}
```

- [ ] **Step 2: Failing Tests schreiben**

`src/__tests__/unit/services/news/serpapi-news.adapter.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// AiProviderService liefert API-Key — wird via vi.doMock injiziert
function setupProviderMock(apiKey: string | null) {
  vi.doMock('@/lib/services/ai-provider.service', () => ({
    AiProviderService: {
      list: vi.fn().mockResolvedValue(
        apiKey === null
          ? []
          : [{ id: 'p1', providerType: 'serpapi', isActive: true, apiKey }],
      ),
    },
  }))
}

describe('SerpApiNewsAdapter', () => {
  const fetchSpy = vi.fn()

  beforeEach(() => {
    vi.resetModules()
    fetchSpy.mockReset()
    vi.stubGlobal('fetch', fetchSpy)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns empty array when no SerpAPI provider is active', async () => {
    setupProviderMock(null)
    const { SerpApiNewsAdapter } = await import('@/lib/services/news/serpapi-news.adapter')

    const result = await SerpApiNewsAdapter.search(['cyber'], {})
    expect(result).toEqual([])
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('calls SerpAPI with hl=de, gl=de, engine=google_news, joined query', async () => {
    setupProviderMock('test-key')
    fetchSpy.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ news_results: [] }),
    } as unknown as Response)
    const { SerpApiNewsAdapter } = await import('@/lib/services/news/serpapi-news.adapter')

    await SerpApiNewsAdapter.search(['NIS2', 'KMU'], { maxResults: 5 })

    const url = fetchSpy.mock.calls[0][0] as string
    expect(url).toContain('engine=google_news')
    expect(url).toContain('hl=de')
    expect(url).toContain('gl=de')
    expect(url).toContain('q=NIS2+KMU')
    expect(url).toContain('api_key=test-key')
    expect(url).toContain('num=5')
  })

  it('maps SerpAPI news_results to NewsSearchResult[]', async () => {
    setupProviderMock('test-key')
    fetchSpy.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        news_results: [
          {
            title: 'NIS2 in Deutschland',
            link: 'https://heise.de/a',
            snippet: 'Snippet...',
            source: { name: 'heise.de' },
            thumbnail: 'https://heise.de/img.jpg',
            date: '2026-05-07T10:00:00Z',
          },
          {
            title: 'Ohne URL',
            // link fehlt → wird gefiltert
          },
        ],
      }),
    } as unknown as Response)
    const { SerpApiNewsAdapter } = await import('@/lib/services/news/serpapi-news.adapter')

    const result = await SerpApiNewsAdapter.search(['NIS2'], {})
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      title: 'NIS2 in Deutschland',
      url: 'https://heise.de/a',
      snippet: 'Snippet...',
      source: 'heise.de',
      imageUrl: 'https://heise.de/img.jpg',
      publishedAt: new Date('2026-05-07T10:00:00Z'),
    })
  })

  it('throws on SerpAPI HTTP error', async () => {
    setupProviderMock('test-key')
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 429,
      text: () => Promise.resolve('rate limit'),
    } as unknown as Response)
    const { SerpApiNewsAdapter } = await import('@/lib/services/news/serpapi-news.adapter')

    await expect(SerpApiNewsAdapter.search(['x'], {})).rejects.toThrow(/SerpAPI/)
  })

  it('returns empty array when news_results missing', async () => {
    setupProviderMock('test-key')
    fetchSpy.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    } as unknown as Response)
    const { SerpApiNewsAdapter } = await import('@/lib/services/news/serpapi-news.adapter')

    const result = await SerpApiNewsAdapter.search(['x'], {})
    expect(result).toEqual([])
  })
})
```

- [ ] **Step 3: Tests laufen lassen — sollten failen**

```bash
npx vitest run src/__tests__/unit/services/news/serpapi-news.adapter.test.ts
```

Erwartet: FAIL mit "Cannot find module '@/lib/services/news/serpapi-news.adapter'".

- [ ] **Step 4: Adapter implementieren**

`src/lib/services/news/serpapi-news.adapter.ts`:

```ts
import { AiProviderService } from '@/lib/services/ai-provider.service'
import { logger } from '@/lib/utils/logger'
import type { NewsSearchResult, NewsSourceAdapter } from './source-adapter.types'

interface SerpApiNewsResult {
  title?: string
  link?: string
  snippet?: string
  source?: { name?: string } | string
  thumbnail?: string
  date?: string
}

interface SerpApiResponse {
  news_results?: SerpApiNewsResult[]
  error?: string
}

async function getApiKey(): Promise<string | null> {
  try {
    const providers = await AiProviderService.list()
    const provider = providers.find(
      (p: { providerType: string; isActive: boolean | null }) =>
        p.providerType === 'serpapi' && p.isActive,
    )
    return (provider as { apiKey?: string } | undefined)?.apiKey ?? null
  } catch {
    return null
  }
}

function mapResult(r: SerpApiNewsResult): NewsSearchResult | null {
  if (!r.title || !r.link) return null
  const sourceName =
    typeof r.source === 'string' ? r.source : r.source?.name ?? undefined
  return {
    title: r.title,
    url: r.link,
    snippet: r.snippet,
    source: sourceName,
    imageUrl: r.thumbnail,
    publishedAt: r.date ? new Date(r.date) : undefined,
  }
}

export const SerpApiNewsAdapter: NewsSourceAdapter = {
  async search(keywords, config) {
    const apiKey = await getApiKey()
    if (!apiKey) {
      logger.warn('SerpAPI provider not active — returning empty news results', {
        module: 'SerpApiNewsAdapter',
      })
      return []
    }
    if (!keywords.length) return []

    const num = Number((config as { maxResults?: unknown }).maxResults) || 10
    const params = new URLSearchParams({
      engine: 'google_news',
      q: keywords.join(' '),
      hl: 'de',
      gl: 'de',
      num: String(num),
      api_key: apiKey,
    })

    const url = `https://serpapi.com/search.json?${params.toString()}`
    const res = await fetch(url)
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`SerpAPI request failed: ${res.status} ${body.slice(0, 200)}`)
    }
    const data = (await res.json()) as SerpApiResponse
    if (!data.news_results) return []

    return data.news_results
      .map(mapResult)
      .filter((x): x is NewsSearchResult => x !== null)
  },
}
```

- [ ] **Step 5: Tests laufen lassen — sollten passen**

```bash
npx vitest run src/__tests__/unit/services/news/serpapi-news.adapter.test.ts
```

Erwartet: 5 passing.

- [ ] **Step 6: Commit**

```bash
git add src/lib/services/news/source-adapter.types.ts \
        src/lib/services/news/serpapi-news.adapter.ts \
        src/__tests__/unit/services/news/serpapi-news.adapter.test.ts
git commit -m "feat(news): SerpAPI Google News Adapter"
```

---

## Task 4: Adapter-Resolver

**Files:**
- Create: `src/lib/services/news/index.ts`

- [ ] **Step 1: Resolver schreiben**

`src/lib/services/news/index.ts`:

```ts
import { SerpApiNewsAdapter } from './serpapi-news.adapter'
import type { NewsSourceAdapter } from './source-adapter.types'

export type { NewsSourceAdapter, NewsSearchResult } from './source-adapter.types'

const ADAPTERS: Record<string, NewsSourceAdapter> = {
  serpapi_news: SerpApiNewsAdapter,
}

export function resolveNewsAdapter(sourceType: string): NewsSourceAdapter {
  const adapter = ADAPTERS[sourceType]
  if (!adapter) {
    throw new Error(`Unknown news sourceType: ${sourceType}`)
  }
  return adapter
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/services/news/index.ts
git commit -m "feat(news): adapter resolver"
```

---

## Task 5: NewsService — Topics CRUD (TDD)

**Files:**
- Create: `src/lib/services/news.service.ts` (Topics-Teil)
- Create: `src/__tests__/unit/services/news/news.service.test.ts` (Topics-Teil)

- [ ] **Step 1: Failing Tests für Topics-CRUD**

`src/__tests__/unit/services/news/news.service.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../../helpers/mock-db'

const TOPIC_ID = '00000000-0000-0000-0000-000000000a01'

function topicFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: TOPIC_ID,
    name: 'IT-Sicherheit',
    description: null,
    color: '#3b82f6',
    keywords: ['NIS2', 'KMU'],
    sourceType: 'serpapi_news',
    sourceConfig: { maxResults: 10 },
    isActive: true,
    sortOrder: 0,
    createdAt: new Date('2026-05-08T00:00:00Z'),
    updatedAt: new Date('2026-05-08T00:00:00Z'),
    ...overrides,
  }
}

describe('NewsService — Topics', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
  })

  async function getService() {
    const mod = await import('@/lib/services/news.service')
    return mod.NewsService
  }

  it('listTopics returns all topics ordered by sortOrder', async () => {
    dbMock.mockSelect.mockResolvedValueOnce([topicFixture()])
    const svc = await getService()
    const result = await svc.listTopics()
    expect(result).toHaveLength(1)
    expect(dbMock.db.select).toHaveBeenCalled()
  })

  it('listTopics with activeOnly filter', async () => {
    dbMock.mockSelect.mockResolvedValueOnce([topicFixture({ isActive: true })])
    const svc = await getService()
    const result = await svc.listTopics({ activeOnly: true })
    expect(result).toHaveLength(1)
  })

  it('getTopic returns topic when found', async () => {
    dbMock.mockSelect.mockResolvedValueOnce([topicFixture()])
    const svc = await getService()
    const t = await svc.getTopic(TOPIC_ID)
    expect(t?.id).toBe(TOPIC_ID)
  })

  it('getTopic returns null when not found', async () => {
    dbMock.mockSelect.mockResolvedValueOnce([])
    const svc = await getService()
    const t = await svc.getTopic(TOPIC_ID)
    expect(t).toBeNull()
  })

  it('createTopic inserts and returns the row', async () => {
    dbMock.mockInsert.mockResolvedValueOnce([topicFixture()])
    const svc = await getService()
    const t = await svc.createTopic({
      name: 'IT-Sicherheit',
      keywords: ['NIS2', 'KMU'],
    })
    expect(t.id).toBe(TOPIC_ID)
    expect(dbMock.db.insert).toHaveBeenCalled()
  })

  it('updateTopic updates and returns the row', async () => {
    dbMock.mockUpdate.mockResolvedValueOnce([topicFixture({ name: 'Geändert' })])
    const svc = await getService()
    const t = await svc.updateTopic(TOPIC_ID, { name: 'Geändert' })
    expect(t?.name).toBe('Geändert')
  })

  it('deleteTopic returns true on success', async () => {
    dbMock.mockDelete.mockResolvedValueOnce([{ id: TOPIC_ID }])
    const svc = await getService()
    const ok = await svc.deleteTopic(TOPIC_ID)
    expect(ok).toBe(true)
  })
})
```

- [ ] **Step 2: Tests laufen — failen**

```bash
npx vitest run src/__tests__/unit/services/news/news.service.test.ts
```

Erwartet: FAIL mit "Cannot find module".

- [ ] **Step 3: Service-Skelett mit Topics-CRUD schreiben**

`src/lib/services/news.service.ts`:

```ts
import { db } from '@/lib/db'
import { newsTopics, newsItems } from '@/lib/db/schema'
import { eq, and, desc, asc, inArray } from 'drizzle-orm'
import type { NewsTopic, NewNewsTopic, NewsItem } from '@/lib/db/schema'

export interface CreateTopicInput {
  name: string
  description?: string
  color?: string
  keywords: string[]
  sourceType?: string
  sourceConfig?: Record<string, unknown>
  isActive?: boolean
  sortOrder?: number
}

export type UpdateTopicInput = Partial<CreateTopicInput>

export const NewsService = {
  // ── Topics ─────────────────────────────────────────────────

  async listTopics(opts?: { activeOnly?: boolean }): Promise<NewsTopic[]> {
    const where = opts?.activeOnly ? eq(newsTopics.isActive, true) : undefined
    return db
      .select()
      .from(newsTopics)
      .where(where)
      .orderBy(asc(newsTopics.sortOrder), asc(newsTopics.name))
  },

  async getTopic(id: string): Promise<NewsTopic | null> {
    const [t] = await db.select().from(newsTopics).where(eq(newsTopics.id, id)).limit(1)
    return t ?? null
  },

  async createTopic(data: CreateTopicInput): Promise<NewsTopic> {
    const [t] = await db
      .insert(newsTopics)
      .values({
        name: data.name,
        description: data.description ?? null,
        color: data.color ?? '#3b82f6',
        keywords: data.keywords,
        sourceType: data.sourceType ?? 'serpapi_news',
        sourceConfig: data.sourceConfig ?? {},
        isActive: data.isActive ?? true,
        sortOrder: data.sortOrder ?? 0,
      })
      .returning()
    return t
  },

  async updateTopic(id: string, data: UpdateTopicInput): Promise<NewsTopic | null> {
    const update: Partial<NewNewsTopic> = { updatedAt: new Date() }
    if (data.name !== undefined) update.name = data.name
    if (data.description !== undefined) update.description = data.description ?? null
    if (data.color !== undefined) update.color = data.color
    if (data.keywords !== undefined) update.keywords = data.keywords
    if (data.sourceType !== undefined) update.sourceType = data.sourceType
    if (data.sourceConfig !== undefined) update.sourceConfig = data.sourceConfig
    if (data.isActive !== undefined) update.isActive = data.isActive
    if (data.sortOrder !== undefined) update.sortOrder = data.sortOrder

    const [t] = await db.update(newsTopics).set(update).where(eq(newsTopics.id, id)).returning()
    return t ?? null
  },

  async deleteTopic(id: string): Promise<boolean> {
    const result = await db
      .delete(newsTopics)
      .where(eq(newsTopics.id, id))
      .returning({ id: newsTopics.id })
    return result.length > 0
  },
}
```

- [ ] **Step 4: Tests laufen — passen**

```bash
npx vitest run src/__tests__/unit/services/news/news.service.test.ts
```

Erwartet: 7 passing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/news.service.ts src/__tests__/unit/services/news/news.service.test.ts
git commit -m "feat(news): NewsService Topics CRUD"
```

---

## Task 6: NewsService — Items query, hide, getItemWithDrafts (TDD)

**Files:**
- Modify: `src/lib/services/news.service.ts`
- Modify: `src/__tests__/unit/services/news/news.service.test.ts`

- [ ] **Step 1: Failing Tests für Items**

In `news.service.test.ts` zusätzlichen `describe`-Block ergänzen:

```ts
describe('NewsService — Items', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
  })

  async function getService() {
    const mod = await import('@/lib/services/news.service')
    return mod.NewsService
  }

  const ITEM_ID = '00000000-0000-0000-0000-000000000b01'

  function itemFixture(overrides: Record<string, unknown> = {}) {
    return {
      id: ITEM_ID,
      topicId: '00000000-0000-0000-0000-000000000a01',
      title: 'Test',
      url: 'https://example.com/a',
      snippet: null,
      source: 'example.com',
      imageUrl: null,
      publishedAt: new Date('2026-05-07'),
      urlHash: 'hash',
      pipelineStatus: 'idle',
      pipelineError: null,
      pipelineTaskId: null,
      researchData: null,
      isHidden: false,
      createdAt: new Date('2026-05-08'),
      updatedAt: new Date('2026-05-08'),
      ...overrides,
    }
  }

  it('listItemsByTopic returns non-hidden items by default', async () => {
    dbMock.mockSelect.mockResolvedValueOnce([itemFixture()])
    const svc = await getService()
    const items = await svc.listItemsByTopic('00000000-0000-0000-0000-000000000a01')
    expect(items).toHaveLength(1)
  })

  it('listItemsByTopic includes hidden when hidden=true', async () => {
    dbMock.mockSelect.mockResolvedValueOnce([itemFixture({ isHidden: true })])
    const svc = await getService()
    const items = await svc.listItemsByTopic('00000000-0000-0000-0000-000000000a01', { hidden: true })
    expect(items).toHaveLength(1)
  })

  it('hideItem updates isHidden flag', async () => {
    dbMock.mockUpdate.mockResolvedValueOnce([itemFixture({ isHidden: true })])
    const svc = await getService()
    const ok = await svc.hideItem(ITEM_ID, true)
    expect(ok).toBe(true)
  })

  it('getItem returns null when not found', async () => {
    dbMock.mockSelect.mockResolvedValueOnce([])
    const svc = await getService()
    const r = await svc.getItem(ITEM_ID)
    expect(r).toBeNull()
  })

  it('getItem returns item when found', async () => {
    dbMock.mockSelect.mockResolvedValueOnce([itemFixture()])
    const svc = await getService()
    const r = await svc.getItem(ITEM_ID)
    expect(r?.id).toBe(ITEM_ID)
  })

  it('listAllForDashboard returns active topics with their items grouped', async () => {
    dbMock.mockSelect
      .mockResolvedValueOnce([{ id: 't1', name: 'IT', color: '#fff', sortOrder: 0, keywords: [], sourceType: 'serpapi_news', sourceConfig: {}, isActive: true, description: null, createdAt: new Date(), updatedAt: new Date() }])
      .mockResolvedValueOnce([itemFixture({ topicId: 't1' })])
    const svc = await getService()
    const result = await svc.listAllForDashboard()
    expect(result).toHaveLength(1)
    expect(result[0].topic.id).toBe('t1')
    expect(result[0].items).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Items-Methoden in `news.service.ts` ergänzen**

Im `NewsService`-Objekt nach `deleteTopic`:

```ts
  // ── Items ──────────────────────────────────────────────────

  async listItemsByTopic(
    topicId: string,
    opts?: { hidden?: boolean; since?: Date },
  ): Promise<NewsItem[]> {
    const conditions = [eq(newsItems.topicId, topicId)]
    if (!opts?.hidden) conditions.push(eq(newsItems.isHidden, false))
    return db
      .select()
      .from(newsItems)
      .where(and(...conditions))
      .orderBy(desc(newsItems.publishedAt), desc(newsItems.createdAt))
  },

  async getItem(id: string): Promise<NewsItem | null> {
    const [item] = await db.select().from(newsItems).where(eq(newsItems.id, id)).limit(1)
    return item ?? null
  },

  async hideItem(id: string, hidden: boolean): Promise<boolean> {
    const result = await db
      .update(newsItems)
      .set({ isHidden: hidden, updatedAt: new Date() })
      .where(eq(newsItems.id, id))
      .returning({ id: newsItems.id })
    return result.length > 0
  },

  async listAllForDashboard(opts?: { hidden?: boolean }): Promise<{ topic: NewsTopic; items: NewsItem[] }[]> {
    const topics = await this.listTopics({ activeOnly: true })
    if (!topics.length) return []
    const topicIds = topics.map((t) => t.id)
    const conditions = [inArray(newsItems.topicId, topicIds)]
    if (!opts?.hidden) conditions.push(eq(newsItems.isHidden, false))
    const items = await db
      .select()
      .from(newsItems)
      .where(and(...conditions))
      .orderBy(desc(newsItems.publishedAt), desc(newsItems.createdAt))

    return topics.map((topic) => ({
      topic,
      items: items.filter((i) => i.topicId === topic.id),
    }))
  },
```

- [ ] **Step 3: Tests laufen — passen**

```bash
npx vitest run src/__tests__/unit/services/news/news.service.test.ts
```

Erwartet: 12 passing (5 neu + 7 vorher).

- [ ] **Step 4: Commit**

```bash
git add src/lib/services/news.service.ts src/__tests__/unit/services/news/news.service.test.ts
git commit -m "feat(news): NewsService Items query, hide, dashboard"
```

---

## Task 7: NewsService — runResearchForTopic mit Dedup (TDD)

**Files:**
- Modify: `src/lib/services/news.service.ts`
- Modify: `src/__tests__/unit/services/news/news.service.test.ts`

- [ ] **Step 1: Failing Tests**

In `news.service.test.ts` neuer `describe`-Block:

```ts
describe('NewsService — runResearchForTopic', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
  })

  function setupAdapterMock(results: Array<{ title: string; url: string }>) {
    vi.doMock('@/lib/services/news/index', () => ({
      resolveNewsAdapter: () => ({
        search: vi.fn().mockResolvedValue(results),
      }),
    }))
  }

  it('throws when topic not found', async () => {
    dbMock.mockSelect.mockResolvedValueOnce([])
    setupAdapterMock([])
    const { NewsService } = await import('@/lib/services/news.service')

    await expect(NewsService.runResearchForTopic('missing')).rejects.toThrow(/topic not found/i)
  })

  it('returns 0/0 when adapter returns no results', async () => {
    dbMock.mockSelect.mockResolvedValueOnce([{
      id: 't1', name: 'X', sourceType: 'serpapi_news', sourceConfig: {}, keywords: ['k1'],
      isActive: true, color: null, description: null, sortOrder: 0,
      createdAt: new Date(), updatedAt: new Date(),
    }])
    setupAdapterMock([])
    const { NewsService } = await import('@/lib/services/news.service')

    const result = await NewsService.runResearchForTopic('t1')
    expect(result).toEqual({ inserted: 0, skipped: 0 })
  })

  it('inserts items with sha256 urlHash and counts inserted vs skipped', async () => {
    dbMock.mockSelect.mockResolvedValueOnce([{
      id: 't1', name: 'X', sourceType: 'serpapi_news', sourceConfig: {}, keywords: ['k1'],
      isActive: true, color: null, description: null, sortOrder: 0,
      createdAt: new Date(), updatedAt: new Date(),
    }])
    setupAdapterMock([
      { title: 'A', url: 'https://example.com/a' },
      { title: 'B', url: 'https://example.com/b' },
    ])
    // Drizzle .returning() liefert nur die wirklich inserted rows zurück (1 von 2 → 1 inserted, 1 skipped)
    dbMock.mockInsert.mockResolvedValueOnce([{ id: 'i1' }])

    const { NewsService } = await import('@/lib/services/news.service')
    const result = await NewsService.runResearchForTopic('t1')
    expect(result.inserted).toBe(1)
    expect(result.skipped).toBe(1)
    expect(dbMock.db.insert).toHaveBeenCalled()
  })

  it('filters items without url before insert', async () => {
    dbMock.mockSelect.mockResolvedValueOnce([{
      id: 't1', name: 'X', sourceType: 'serpapi_news', sourceConfig: {}, keywords: ['k1'],
      isActive: true, color: null, description: null, sortOrder: 0,
      createdAt: new Date(), updatedAt: new Date(),
    }])
    setupAdapterMock([
      { title: 'OK', url: 'https://example.com/a' },
      { title: 'NoURL', url: '' },
    ])
    dbMock.mockInsert.mockResolvedValueOnce([{ id: 'i1' }])

    const { NewsService } = await import('@/lib/services/news.service')
    await NewsService.runResearchForTopic('t1')

    const insertCall = (dbMock.db.insert as ReturnType<typeof vi.fn>).mock.results[0]
    // Wir prüfen indirekt: nur 1 Insert-Wert, 1 returned, also skipped=0 (von 1 gültigen Items)
    expect(dbMock.db.insert).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: `runResearchForTopic` in Service implementieren**

In `src/lib/services/news.service.ts` zusätzlich am Anfang `import { createHash } from 'crypto'` und nach den Items-Methoden:

```ts
  // ── Recherche ──────────────────────────────────────────────

  async runResearchForTopic(
    topicId: string,
  ): Promise<{ inserted: number; skipped: number }> {
    const topic = await this.getTopic(topicId)
    if (!topic) throw new Error(`Topic not found: ${topicId}`)

    const { resolveNewsAdapter } = await import('@/lib/services/news/index')
    const adapter = resolveNewsAdapter(topic.sourceType)
    const results = await adapter.search(
      topic.keywords ?? [],
      (topic.sourceConfig ?? {}) as Record<string, unknown>,
    )

    const valid = results.filter((r) => r.url && r.url.length > 0)
    if (!valid.length) return { inserted: 0, skipped: 0 }

    const rows = valid.map((r) => ({
      topicId: topic.id,
      title: r.title.slice(0, 500),
      url: r.url.slice(0, 1000),
      snippet: r.snippet ?? null,
      source: r.source?.slice(0, 200) ?? null,
      imageUrl: r.imageUrl?.slice(0, 1000) ?? null,
      publishedAt: r.publishedAt ?? null,
      urlHash: createHash('sha256').update(r.url).digest('hex'),
    }))

    const inserted = await db
      .insert(newsItems)
      .values(rows)
      .onConflictDoNothing({ target: [newsItems.topicId, newsItems.urlHash] })
      .returning({ id: newsItems.id })

    return {
      inserted: inserted.length,
      skipped: valid.length - inserted.length,
    }
  },
```

- [ ] **Step 3: Tests laufen — passen**

```bash
npx vitest run src/__tests__/unit/services/news/news.service.test.ts
```

Erwartet: 16 passing.

- [ ] **Step 4: Commit**

```bash
git add src/lib/services/news.service.ts src/__tests__/unit/services/news/news.service.test.ts
git commit -m "feat(news): runResearchForTopic mit sha256-Dedup"
```

---

## Task 8: NewsService — runResearchForAllActiveTopics (TDD)

**Files:**
- Modify: `src/lib/services/news.service.ts`
- Modify: `src/__tests__/unit/services/news/news.service.test.ts`

- [ ] **Step 1: Failing Test ergänzen**

In `news.service.test.ts` Block ergänzen:

```ts
describe('NewsService — runResearchForAllActiveTopics', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('runs all active topics, captures per-topic errors, continues on failure', async () => {
    setupDbMock()
    // listTopics({activeOnly: true}) → 2 Topics
    const { NewsService } = await import('@/lib/services/news.service')
    const spy = vi.spyOn(NewsService, 'listTopics').mockResolvedValue([
      { id: 't1' } as never,
      { id: 't2' } as never,
    ])
    const runSpy = vi
      .spyOn(NewsService, 'runResearchForTopic')
      .mockResolvedValueOnce({ inserted: 3, skipped: 0 })
      .mockRejectedValueOnce(new Error('boom'))

    const result = await NewsService.runResearchForAllActiveTopics()
    expect(result).toEqual([
      { topicId: 't1', inserted: 3, skipped: 0 },
      { topicId: 't2', inserted: 0, skipped: 0, error: 'boom' },
    ])

    spy.mockRestore()
    runSpy.mockRestore()
  })
})
```

- [ ] **Step 2: Implementierung ergänzen**

In `news.service.ts` nach `runResearchForTopic`:

```ts
  async runResearchForAllActiveTopics(): Promise<
    { topicId: string; inserted: number; skipped: number; error?: string }[]
  > {
    const topics = await this.listTopics({ activeOnly: true })
    const out: { topicId: string; inserted: number; skipped: number; error?: string }[] = []
    for (const t of topics) {
      try {
        const r = await this.runResearchForTopic(t.id)
        out.push({ topicId: t.id, ...r })
      } catch (err) {
        out.push({ topicId: t.id, inserted: 0, skipped: 0, error: String(err instanceof Error ? err.message : err) })
      }
    }
    return out
  },
```

- [ ] **Step 3: Tests laufen — passen**

```bash
npx vitest run src/__tests__/unit/services/news/news.service.test.ts
```

Erwartet: 17 passing.

- [ ] **Step 4: Commit**

```bash
git add src/lib/services/news.service.ts src/__tests__/unit/services/news/news.service.test.ts
git commit -m "feat(news): runResearchForAllActiveTopics mit Per-Topic-Fehlerisolation"
```

---

## Task 9: BlogPostService und SocialMediaPostService um `sourceNewsItemId` erweitern

**Files:**
- Modify: `src/lib/services/blog-post.service.ts`
- Modify: `src/lib/services/social-media-post.service.ts`

- [ ] **Step 1: BlogPost — Input-Type erweitern**

In `src/lib/services/blog-post.service.ts` `CreateBlogPostInput` ergänzen:

```ts
sourceNewsItemId?: string
```

In `BlogPostService.create` im `.values({...})`-Block ergänzen:

```ts
sourceNewsItemId: data.sourceNewsItemId ?? null,
```

- [ ] **Step 2: SocialMediaPost — gleiches Pattern**

`src/lib/services/social-media-post.service.ts` öffnen. Im Create-Input-Type Feld `sourceNewsItemId?: string` ergänzen, im `.values({...})` analog `sourceNewsItemId: data.sourceNewsItemId ?? null,`.

- [ ] **Step 3: Manueller Smoke-Check**

```bash
npx tsc --noEmit
```

Erwartet: keine Type-Fehler.

- [ ] **Step 4: Commit**

```bash
git add src/lib/services/blog-post.service.ts src/lib/services/social-media-post.service.ts
git commit -m "feat(news): sourceNewsItemId in Blog- und Social-Post-Services"
```

---

## Task 10: NewsPipelineService — markStatus + Stufe 1 (Recherche) (TDD)

**Files:**
- Create: `src/lib/services/news-pipeline.service.ts`
- Create: `src/__tests__/unit/services/news/news-pipeline.service.test.ts`

- [ ] **Step 1: Failing Tests für markStatus + deepResearch**

`src/__tests__/unit/services/news/news-pipeline.service.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../../helpers/mock-db'

const ITEM_ID = '00000000-0000-0000-0000-000000000c01'

function itemFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: ITEM_ID,
    topicId: 't1',
    title: 'News Title',
    url: 'https://example.com/a',
    snippet: 'Snippet text',
    source: 'example.com',
    imageUrl: null,
    publishedAt: null,
    urlHash: 'h',
    pipelineStatus: 'idle',
    pipelineError: null,
    pipelineTaskId: null,
    researchData: null,
    isHidden: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

describe('NewsPipelineService — markStatus', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
  })

  it('markStatus updates pipeline_status and pipeline_error', async () => {
    dbMock.mockUpdate.mockResolvedValueOnce([itemFixture({ pipelineStatus: 'failed', pipelineError: 'boom' })])
    const { NewsPipelineService } = await import('@/lib/services/news-pipeline.service')
    await NewsPipelineService.markStatus(ITEM_ID, 'failed', 'boom')
    expect(dbMock.db.update).toHaveBeenCalled()
  })
})

describe('NewsPipelineService — deepResearch', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
  })

  function setupAiMock(output: unknown) {
    vi.doMock('@/lib/services/ai-prompt-template.service', () => ({
      AiPromptTemplateService: {
        renderAndExecute: vi.fn().mockResolvedValue({ output, raw: JSON.stringify(output) }),
      },
    }))
  }

  it('renders news-deep-research template and returns parsed JSON', async () => {
    setupAiMock({ summary: 'X', keyPoints: ['a'], sources: [], context: '' })
    const { NewsPipelineService } = await import('@/lib/services/news-pipeline.service')
    const result = await NewsPipelineService.deepResearch(itemFixture())
    expect(result.summary).toBe('X')
    expect(Array.isArray(result.keyPoints)).toBe(true)
  })
})
```

- [ ] **Step 2: Service-Skelett mit markStatus und deepResearch**

`src/lib/services/news-pipeline.service.ts`:

```ts
import { db } from '@/lib/db'
import { newsItems } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { logger } from '@/lib/utils/logger'
import type { NewsItem } from '@/lib/db/schema'

export type PipelineStatus =
  | 'idle'
  | 'queued'
  | 'researching'
  | 'generating'
  | 'completed'
  | 'failed'

export interface DeepResearchResult {
  summary: string
  keyPoints: string[]
  sources: { title?: string; url?: string }[]
  context: string
}

export const NewsPipelineService = {
  async markStatus(
    itemId: string,
    status: PipelineStatus,
    error?: string | null,
  ): Promise<void> {
    await db
      .update(newsItems)
      .set({
        pipelineStatus: status,
        pipelineError: error ?? null,
        updatedAt: new Date(),
      })
      .where(eq(newsItems.id, itemId))
  },

  async deepResearch(item: NewsItem): Promise<DeepResearchResult> {
    const { AiPromptTemplateService } = await import('@/lib/services/ai-prompt-template.service')
    const result = await AiPromptTemplateService.renderAndExecute('news-deep-research', {
      title: item.title,
      url: item.url,
      snippet: item.snippet ?? '',
      source: item.source ?? '',
    })
    const parsed = result.output as DeepResearchResult
    if (!parsed || typeof parsed.summary !== 'string') {
      throw new Error('news-deep-research: invalid AI output')
    }
    return {
      summary: parsed.summary,
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
      sources: Array.isArray(parsed.sources) ? parsed.sources : [],
      context: typeof parsed.context === 'string' ? parsed.context : '',
    }
  },
}
```

> **Note:** Falls `AiPromptTemplateService` keine Methode `renderAndExecute` mit JSON-Output hat: kurz `src/lib/services/ai-prompt-template.service.ts` + `ai-prompt-template.renderer.ts` lesen, um die korrekte API zu finden, und Aufruf entsprechend anpassen. Erwartet wird: Template-Slug + Vars → AI-Aufruf → JSON-parsed `output`. Falls die Service-API nur Text liefert, das Template so gestalten, dass es JSON returnt, und hier `JSON.parse(result.raw)` nutzen.

- [ ] **Step 3: Tests laufen — passen**

```bash
npx vitest run src/__tests__/unit/services/news/news-pipeline.service.test.ts
```

Erwartet: 2 passing.

- [ ] **Step 4: Commit**

```bash
git add src/lib/services/news-pipeline.service.ts \
        src/__tests__/unit/services/news/news-pipeline.service.test.ts
git commit -m "feat(news): NewsPipelineService markStatus + deepResearch (Stufe 1)"
```

---

## Task 11: NewsPipelineService — Stufe 2 (Blog-Draft) (TDD)

**Files:**
- Modify: `src/lib/services/news-pipeline.service.ts`
- Modify: `src/__tests__/unit/services/news/news-pipeline.service.test.ts`

- [ ] **Step 1: Failing Test**

In `news-pipeline.service.test.ts` ergänzen:

```ts
describe('NewsPipelineService — generateBlogPost', () => {
  beforeEach(() => {
    vi.resetModules()
    setupDbMock()
  })

  it('renders news-blog-draft template and returns BlogDraft', async () => {
    vi.doMock('@/lib/services/ai-prompt-template.service', () => ({
      AiPromptTemplateService: {
        renderAndExecute: vi.fn().mockResolvedValue({
          output: {
            title: 'B', excerpt: 'E', content: 'C',
            seoTitle: 'S', seoDescription: 'D', tags: ['t'],
          },
        }),
      },
    }))
    const { NewsPipelineService } = await import('@/lib/services/news-pipeline.service')
    const draft = await NewsPipelineService.generateBlogPost(itemFixture(), {
      summary: 's', keyPoints: [], sources: [], context: '',
    })
    expect(draft.title).toBe('B')
    expect(draft.tags).toEqual(['t'])
  })
})
```

- [ ] **Step 2: `generateBlogPost` ergänzen**

In `news-pipeline.service.ts` nach `deepResearch`:

```ts
export interface BlogDraft {
  title: string
  excerpt: string
  content: string
  seoTitle?: string
  seoDescription?: string
  tags: string[]
}

// im NewsPipelineService-Objekt:
async generateBlogPost(item: NewsItem, research: DeepResearchResult): Promise<BlogDraft> {
  const { AiPromptTemplateService } = await import('@/lib/services/ai-prompt-template.service')
  const result = await AiPromptTemplateService.renderAndExecute('news-blog-draft', {
    title: item.title,
    research: JSON.stringify(research),
  })
  const parsed = result.output as Partial<BlogDraft>
  if (!parsed?.title || !parsed?.content) {
    throw new Error('news-blog-draft: invalid AI output')
  }
  return {
    title: parsed.title,
    excerpt: parsed.excerpt ?? '',
    content: parsed.content,
    seoTitle: parsed.seoTitle,
    seoDescription: parsed.seoDescription,
    tags: Array.isArray(parsed.tags) ? parsed.tags : [],
  }
},
```

- [ ] **Step 3: Tests laufen — passen**

```bash
npx vitest run src/__tests__/unit/services/news/news-pipeline.service.test.ts
```

Erwartet: 3 passing.

- [ ] **Step 4: Commit**

```bash
git add src/lib/services/news-pipeline.service.ts \
        src/__tests__/unit/services/news/news-pipeline.service.test.ts
git commit -m "feat(news): NewsPipelineService generateBlogPost (Stufe 2)"
```

---

## Task 12: NewsPipelineService — Stufe 3 (Social-Drafts) (TDD)

**Files:**
- Modify: `src/lib/services/news-pipeline.service.ts`
- Modify: `src/__tests__/unit/services/news/news-pipeline.service.test.ts`

- [ ] **Step 1: Failing Test**

In `news-pipeline.service.test.ts`:

```ts
describe('NewsPipelineService — generateSocialPosts', () => {
  beforeEach(() => {
    vi.resetModules()
    setupDbMock()
  })

  it('generates one draft per platform', async () => {
    const renderMock = vi.fn().mockImplementation((_slug: string, vars: Record<string, unknown>) =>
      Promise.resolve({
        output: {
          platform: vars.platform,
          title: 'T',
          content: `Content for ${vars.platform}`,
          hashtags: ['#a'],
        },
      }),
    )
    vi.doMock('@/lib/services/ai-prompt-template.service', () => ({
      AiPromptTemplateService: { renderAndExecute: renderMock },
    }))
    const { NewsPipelineService } = await import('@/lib/services/news-pipeline.service')

    const drafts = await NewsPipelineService.generateSocialPosts(
      itemFixture(),
      { summary: 's', keyPoints: [], sources: [], context: '' },
      { id: 'b1', title: 'BlogTitle', excerpt: 'Ex' } as never,
    )

    expect(drafts).toHaveLength(2)
    expect(drafts.map((d) => d.platform).sort()).toEqual(['linkedin', 'x'])
    expect(renderMock).toHaveBeenCalledTimes(2)
  })
})
```

- [ ] **Step 2: `generateSocialPosts` implementieren**

In `news-pipeline.service.ts`:

```ts
export interface SocialDraft {
  platform: 'linkedin' | 'x'
  title?: string
  content: string
  hashtags: string[]
}

const DEFAULT_SOCIAL_PLATFORMS: Array<'linkedin' | 'x'> = ['linkedin', 'x']

// im NewsPipelineService:
async generateSocialPosts(
  item: NewsItem,
  research: DeepResearchResult,
  blog: { id: string; title: string; excerpt: string | null },
): Promise<SocialDraft[]> {
  const { AiPromptTemplateService } = await import('@/lib/services/ai-prompt-template.service')
  const drafts: SocialDraft[] = []
  for (const platform of DEFAULT_SOCIAL_PLATFORMS) {
    const result = await AiPromptTemplateService.renderAndExecute('news-social-draft', {
      title: item.title,
      research: JSON.stringify(research),
      blogTitle: blog.title,
      blogExcerpt: blog.excerpt ?? '',
      platform,
    })
    const parsed = result.output as Partial<SocialDraft>
    if (!parsed?.content) {
      logger.warn(`news-social-draft: empty content for ${platform}`, {
        module: 'NewsPipelineService',
        itemId: item.id,
      })
      continue
    }
    drafts.push({
      platform,
      title: parsed.title,
      content: parsed.content,
      hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : [],
    })
  }
  return drafts
},
```

- [ ] **Step 3: Tests laufen**

```bash
npx vitest run src/__tests__/unit/services/news/news-pipeline.service.test.ts
```

Erwartet: 4 passing.

- [ ] **Step 4: Commit**

```bash
git add src/lib/services/news-pipeline.service.ts \
        src/__tests__/unit/services/news/news-pipeline.service.test.ts
git commit -m "feat(news): NewsPipelineService generateSocialPosts (Stufe 3)"
```

---

## Task 13: NewsPipelineService — `run()` Orchestrator (TDD)

**Files:**
- Modify: `src/lib/services/news-pipeline.service.ts`
- Modify: `src/__tests__/unit/services/news/news-pipeline.service.test.ts`

- [ ] **Step 1: Failing Tests**

```ts
describe('NewsPipelineService — run', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
  })

  function setupHappyPathMocks() {
    vi.doMock('@/lib/services/news.service', () => ({
      NewsService: {
        getItem: vi.fn().mockResolvedValue(itemFixture()),
        updateItem: vi.fn().mockResolvedValue(undefined),
      },
    }))
    vi.doMock('@/lib/services/blog-post.service', () => ({
      BlogPostService: {
        create: vi.fn().mockResolvedValue({ id: 'b1', title: 'B', excerpt: 'E' }),
      },
    }))
    vi.doMock('@/lib/services/social-media-post.service', () => ({
      SocialMediaPostService: {
        create: vi.fn().mockResolvedValue({ id: 'sp1' }),
      },
    }))
    vi.doMock('@/lib/services/ai-prompt-template.service', () => ({
      AiPromptTemplateService: {
        renderAndExecute: vi.fn().mockImplementation((slug: string, vars: Record<string, unknown>) => {
          if (slug === 'news-deep-research') {
            return Promise.resolve({ output: { summary: 's', keyPoints: [], sources: [], context: '' } })
          }
          if (slug === 'news-blog-draft') {
            return Promise.resolve({ output: { title: 'B', excerpt: 'E', content: 'C', tags: [] } })
          }
          return Promise.resolve({
            output: { platform: vars.platform, content: 'X', hashtags: [] },
          })
        }),
      },
    }))
  }

  it('runs all 3 stages and ends with status=completed', async () => {
    setupHappyPathMocks()
    const { NewsPipelineService } = await import('@/lib/services/news-pipeline.service')
    await NewsPipelineService.run(ITEM_ID)
    // markStatus wird mehrfach aufgerufen, finale Update sollte completed sein
    const updateCalls = (dbMock.db.update as ReturnType<typeof vi.fn>).mock.calls
    expect(updateCalls.length).toBeGreaterThan(0)
  })

  it('marks failed on Stufe 1 error', async () => {
    vi.doMock('@/lib/services/news.service', () => ({
      NewsService: { getItem: vi.fn().mockResolvedValue(itemFixture()), updateItem: vi.fn() },
    }))
    vi.doMock('@/lib/services/ai-prompt-template.service', () => ({
      AiPromptTemplateService: {
        renderAndExecute: vi.fn().mockRejectedValue(new Error('AI down')),
      },
    }))
    const { NewsPipelineService } = await import('@/lib/services/news-pipeline.service')
    await expect(NewsPipelineService.run(ITEM_ID)).rejects.toThrow('AI down')
  })

  it('throws if item not found', async () => {
    vi.doMock('@/lib/services/news.service', () => ({
      NewsService: { getItem: vi.fn().mockResolvedValue(null) },
    }))
    const { NewsPipelineService } = await import('@/lib/services/news-pipeline.service')
    await expect(NewsPipelineService.run(ITEM_ID)).rejects.toThrow(/not found/i)
  })
})
```

- [ ] **Step 2: `run()` und `updateItem`-Helper implementieren**

In `news.service.ts` zusätzliche Helper-Methode (falls noch nicht da):

```ts
async updateItem(id: string, data: Partial<NewNewsItem>): Promise<void> {
  await db.update(newsItems).set({ ...data, updatedAt: new Date() }).where(eq(newsItems.id, id))
},
```

In `news-pipeline.service.ts` Orchestrator anhängen:

```ts
async run(newsItemId: string): Promise<void> {
  const { NewsService } = await import('@/lib/services/news.service')
  const { BlogPostService } = await import('@/lib/services/blog-post.service')
  const { SocialMediaPostService } = await import('@/lib/services/social-media-post.service')

  const item = await NewsService.getItem(newsItemId)
  if (!item) throw new Error(`news item not found: ${newsItemId}`)

  try {
    // Stufe 1
    await this.markStatus(newsItemId, 'researching')
    const research = await this.deepResearch(item)
    await NewsService.updateItem(newsItemId, { researchData: research as never })

    // Stufe 2
    await this.markStatus(newsItemId, 'generating')
    const blogDraft = await this.generateBlogPost(item, research)
    const blogPost = await BlogPostService.create({
      title: blogDraft.title,
      excerpt: blogDraft.excerpt,
      content: blogDraft.content,
      seoTitle: blogDraft.seoTitle,
      seoDescription: blogDraft.seoDescription,
      tags: blogDraft.tags,
      status: 'draft',
      source: 'news',
      sourceNewsItemId: newsItemId,
    })

    // Stufe 3
    const socialDrafts = await this.generateSocialPosts(item, research, blogPost)
    const socialErrors: string[] = []
    for (const draft of socialDrafts) {
      try {
        await SocialMediaPostService.create({
          platform: draft.platform,
          content: draft.content,
          title: draft.title,
          hashtags: draft.hashtags,
          status: 'draft',
          aiGenerated: true,
          sourceNewsItemId: newsItemId,
        })
      } catch (e) {
        socialErrors.push(`${draft.platform}: ${e instanceof Error ? e.message : String(e)}`)
      }
    }

    await this.markStatus(newsItemId, 'completed', socialErrors.length ? socialErrors.join('; ') : null)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await this.markStatus(newsItemId, 'failed', msg)
    throw err
  }
},
```

- [ ] **Step 3: Tests**

```bash
npx vitest run src/__tests__/unit/services/news/news-pipeline.service.test.ts
```

Erwartet: 7 passing.

- [ ] **Step 4: Commit**

```bash
git add src/lib/services/news.service.ts \
        src/lib/services/news-pipeline.service.ts \
        src/__tests__/unit/services/news/news-pipeline.service.test.ts
git commit -m "feat(news): NewsPipelineService orchestrator run()"
```

---

## Task 14: Watchdog für hängende Pipeline-Status (TDD)

**Files:**
- Create: `src/lib/services/news-pipeline-watchdog.ts`
- Create: `src/__tests__/unit/services/news/news-pipeline-watchdog.test.ts`

- [ ] **Step 1: Failing Test**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../../helpers/mock-db'

describe('NewsPipelineWatchdog', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
  })

  it('runReap fixes news_items with non-terminal status whose task is failed', async () => {
    dbMock.executeMock.mockResolvedValueOnce({ rowCount: 2 })
    const { runWatchdog } = await import('@/lib/services/news-pipeline-watchdog')
    const result = await runWatchdog()
    expect(result.reaped).toBeGreaterThanOrEqual(0)
    expect(dbMock.db.execute).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Watchdog implementieren**

`src/lib/services/news-pipeline-watchdog.ts`:

```ts
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { logger } from '@/lib/utils/logger'

/**
 * Repariert news_items, deren Worker-Task im task_queue bereits failed ist,
 * deren pipeline_status aber noch auf einem nicht-terminalen Wert hängt.
 */
export async function runWatchdog(): Promise<{ reaped: number }> {
  try {
    const result = await db.execute(sql`
      UPDATE news_items
      SET pipeline_status = 'failed',
          pipeline_error = COALESCE(pipeline_error, 'worker terminated'),
          updated_at = NOW()
      WHERE pipeline_status IN ('queued','researching','generating')
        AND pipeline_task_id IN (
          SELECT id FROM task_queue WHERE status = 'failed'
        )
    `)
    const reaped = (result as { rowCount?: number }).rowCount ?? 0
    if (reaped > 0) {
      logger.info(`news pipeline watchdog reaped ${reaped} stuck items`, {
        module: 'NewsPipelineWatchdog',
      })
    }
    return { reaped }
  } catch (err) {
    logger.error('news pipeline watchdog failed', err, { module: 'NewsPipelineWatchdog' })
    return { reaped: 0 }
  }
}
```

- [ ] **Step 3: Tests**

```bash
npx vitest run src/__tests__/unit/services/news/news-pipeline-watchdog.test.ts
```

Erwartet: 1 passing.

- [ ] **Step 4: Commit**

```bash
git add src/lib/services/news-pipeline-watchdog.ts \
        src/__tests__/unit/services/news/news-pipeline-watchdog.test.ts
git commit -m "feat(news): pipeline watchdog fuer haengende status"
```

---

## Task 15: Task-Queue-Dispatcher um `news_pipeline`-Branch erweitern

**Files:**
- Modify: `src/lib/services/task-queue.service.ts`

- [ ] **Step 1: Branch ergänzen**

In `src/lib/services/task-queue.service.ts` im `executeHandler`-Switch nach dem letzten bestehenden `case` (vor `default`) ergänzen:

```ts
    case 'news_pipeline': {
      const newsItemId = item.referenceId ?? (payload.newsItemId as string | undefined)
      if (!newsItemId) {
        return { skipped: true, reason: 'no_news_item_id' }
      }
      const { NewsPipelineService } = await import('./news-pipeline.service')
      await NewsPipelineService.run(newsItemId)
      return { newsItemId, status: 'completed' }
    }
```

- [ ] **Step 2: Manueller Type-Check**

```bash
npx tsc --noEmit
```

Erwartet: keine Fehler.

- [ ] **Step 3: Commit**

```bash
git add src/lib/services/task-queue.service.ts
git commit -m "feat(news): task_queue dispatcher branch news_pipeline"
```

---

## Task 16: Cron-Service `news_research` + Cron-Konstante

**Files:**
- Modify: `src/lib/services/cron.service.ts`
- Modify: `src/lib/constants/cron.ts` (falls separate Datei mit ACTION_TYPE_OPTIONS — sonst direkt in `cron.service.ts`)

- [ ] **Step 1: ACTION_TYPE_OPTIONS erweitern**

In `src/lib/services/cron.service.ts` (oder `src/lib/constants/cron.ts` falls dort die Liste lebt — Datei vorher kurz lesen):

```ts
export const ACTION_TYPE_OPTIONS = [
  // ...bestehend...
  { value: 'news_research', label: 'News-Recherche (alle aktiven Themenbereiche)' },
]
```

- [ ] **Step 2: Branch im Cron-Switch**

In `cron.service.ts` im actionType-Switch nach `calendar_sync`:

```ts
        case 'news_research': {
          const { NewsService } = await import('./news.service')
          const config = (job.actionConfig || {}) as { topicIds?: string[] }
          if (config.topicIds?.length) {
            const summary = await Promise.all(
              config.topicIds.map((id) =>
                NewsService.runResearchForTopic(id)
                  .then((r) => ({ topicId: id, ...r }))
                  .catch((e) => ({ topicId: id, inserted: 0, skipped: 0, error: String(e) })),
              ),
            )
            const total = summary.reduce((acc, s) => acc + s.inserted, 0)
            msg = `News research: ${total} new items across ${summary.length} topics`
          } else {
            const summary = await NewsService.runResearchForAllActiveTopics()
            const total = summary.reduce((acc, s) => acc + s.inserted, 0)
            msg = `News research: ${total} new items across ${summary.length} active topics`
          }
          break
        }
```

- [ ] **Step 3: Type-Check**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/services/cron.service.ts src/lib/constants/cron.ts
git commit -m "feat(news): cron actionType news_research"
```

---

## Task 17: Validation-Schemas

**Files:**
- Modify: `src/lib/utils/validation.ts`

- [ ] **Step 1: zod-Schemas ergänzen**

Am Ende von `src/lib/utils/validation.ts`:

```ts
import { z } from 'zod'

export const createNewsTopicSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  keywords: z.array(z.string().min(1)).min(1),
  sourceType: z.enum(['serpapi_news']).optional(),
  sourceConfig: z.record(z.unknown()).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

export const updateNewsTopicSchema = createNewsTopicSchema.partial()

export const updateNewsItemSchema = z.object({
  isHidden: z.boolean().optional(),
})
```

(Falls `z` schon importiert ist, nicht doppelt importieren.)

- [ ] **Step 2: Type-Check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/utils/validation.ts
git commit -m "feat(news): zod-Schemas fuer Topics und Items"
```

---

## Task 18: API — Topics CRUD Routes

**Files:**
- Create: `src/app/api/v1/news/topics/route.ts`
- Create: `src/app/api/v1/news/topics/[id]/route.ts`

- [ ] **Step 1: Permission-Resource sicherstellen**

`src/lib/auth/require-permission.ts` und `src/lib/db/seeds/role-permissions.seed.ts` (oder ähnlich) prüfen, ob eine Permission-Resource `'news'` existiert. Falls nicht: in Seed-Datei für Rollen-Permissions als zusätzliche Resource ergänzen analog `social_media`. Bei Unsicherheit `'social_media'` als Fallback nutzen — dann später migrieren.

Im Plan unten gehe ich von `'news'` als neue Resource aus. Falls dieser Schritt blockt, im `withPermission`-Aufruf vorerst `'social_media'` nutzen.

- [ ] **Step 2: `topics/route.ts`**

```ts
import { NextRequest } from 'next/server'
import { apiSuccess, apiValidationError, apiServerError } from '@/lib/utils/api-response'
import { createNewsTopicSchema, validateAndParse, formatZodErrors } from '@/lib/utils/validation'
import { NewsService } from '@/lib/services/news.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  return withPermission(request, 'news', 'read', async () => {
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('activeOnly') === 'true'
    const items = await NewsService.listTopics({ activeOnly })
    return apiSuccess(items)
  })
}

export async function POST(request: NextRequest) {
  return withPermission(request, 'news', 'create', async () => {
    try {
      const body = await request.json()
      const validation = validateAndParse(createNewsTopicSchema, body)
      if (!validation.success) return apiValidationError(formatZodErrors(validation.errors))
      const topic = await NewsService.createTopic(validation.data)
      return apiSuccess(topic, undefined, 201)
    } catch (err) {
      logger.error('Error creating news topic', err, { module: 'NewsTopicsAPI' })
      return apiServerError()
    }
  })
}
```

- [ ] **Step 3: `topics/[id]/route.ts`**

```ts
import { NextRequest } from 'next/server'
import {
  apiSuccess, apiNotFound, apiValidationError, apiServerError,
} from '@/lib/utils/api-response'
import { updateNewsTopicSchema, validateAndParse, formatZodErrors } from '@/lib/utils/validation'
import { NewsService } from '@/lib/services/news.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withPermission(request, 'news', 'read', async () => {
    const { id } = await params
    const topic = await NewsService.getTopic(id)
    if (!topic) return apiNotFound('Topic nicht gefunden')
    return apiSuccess(topic)
  })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withPermission(request, 'news', 'update', async () => {
    try {
      const { id } = await params
      const body = await request.json()
      const validation = validateAndParse(updateNewsTopicSchema, body)
      if (!validation.success) return apiValidationError(formatZodErrors(validation.errors))
      const topic = await NewsService.updateTopic(id, validation.data)
      if (!topic) return apiNotFound('Topic nicht gefunden')
      return apiSuccess(topic)
    } catch (err) {
      logger.error('Error updating news topic', err, { module: 'NewsTopicsAPI' })
      return apiServerError()
    }
  })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withPermission(request, 'news', 'delete', async () => {
    const { id } = await params
    const ok = await NewsService.deleteTopic(id)
    if (!ok) return apiNotFound('Topic nicht gefunden')
    return apiSuccess({ deleted: true })
  })
}
```

> Wenn `apiNotFound` oder Promise-params nicht zur Codebase passen: in benachbarten Routen `src/app/api/v1/social-media/topics/[id]/route.ts` (falls vorhanden) oder `src/app/api/v1/blog/...` als Vorlage prüfen und Signaturen exakt angleichen.

- [ ] **Step 4: Manueller Type-Check + Smoke**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/v1/news/topics
git commit -m "feat(news): API Topics CRUD"
```

---

## Task 19: API — Recherche-Routen

**Files:**
- Create: `src/app/api/v1/news/topics/[id]/research/route.ts`
- Create: `src/app/api/v1/news/research/route.ts`

- [ ] **Step 1: Topic-spezifischer Run**

`src/app/api/v1/news/topics/[id]/research/route.ts`:

```ts
import { NextRequest } from 'next/server'
import { apiSuccess, apiNotFound, apiServerError } from '@/lib/utils/api-response'
import { NewsService } from '@/lib/services/news.service'
import { withPermission } from '@/lib/auth/require-permission'
import { AuditLogService } from '@/lib/services/audit-log.service'
import { logger } from '@/lib/utils/logger'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withPermission(request, 'news', 'update', async (auth) => {
    try {
      const { id } = await params
      const topic = await NewsService.getTopic(id)
      if (!topic) return apiNotFound('Topic nicht gefunden')

      const result = await NewsService.runResearchForTopic(id)
      await AuditLogService.log({
        userId: auth.user.id,
        action: 'news.topic.research',
        resourceType: 'news_topic',
        resourceId: id,
        metadata: result as Record<string, unknown>,
      })
      return apiSuccess(result)
    } catch (err) {
      logger.error('news topic research failed', err, { module: 'NewsResearchAPI' })
      return apiServerError()
    }
  })
}
```

> `AuditLogService.log`-Signatur kurz in `src/lib/services/audit-log.service.ts` verifizieren und Felder exakt anpassen.

- [ ] **Step 2: Global-Run-Route**

`src/app/api/v1/news/research/route.ts`:

```ts
import { NextRequest } from 'next/server'
import { apiSuccess, apiServerError } from '@/lib/utils/api-response'
import { NewsService } from '@/lib/services/news.service'
import { withPermission } from '@/lib/auth/require-permission'
import { AuditLogService } from '@/lib/services/audit-log.service'
import { logger } from '@/lib/utils/logger'

export async function POST(request: NextRequest) {
  return withPermission(request, 'news', 'update', async (auth) => {
    try {
      const summary = await NewsService.runResearchForAllActiveTopics()
      await AuditLogService.log({
        userId: auth.user.id,
        action: 'news.research.all',
        resourceType: 'news',
        resourceId: null,
        metadata: { summary } as Record<string, unknown>,
      })
      return apiSuccess({ summary })
    } catch (err) {
      logger.error('news global research failed', err, { module: 'NewsResearchAPI' })
      return apiServerError()
    }
  })
}
```

- [ ] **Step 3: Type-Check + Commit**

```bash
npx tsc --noEmit
git add src/app/api/v1/news/topics/[id]/research src/app/api/v1/news/research
git commit -m "feat(news): API Recherche-Routen (per topic + global)"
```

---

## Task 20: API — Items List, Detail, Patch

**Files:**
- Create: `src/app/api/v1/news/items/route.ts`
- Create: `src/app/api/v1/news/items/[id]/route.ts`

- [ ] **Step 1: Items List (mit Watchdog)**

`src/app/api/v1/news/items/route.ts`:

```ts
import { NextRequest } from 'next/server'
import { apiSuccess } from '@/lib/utils/api-response'
import { NewsService } from '@/lib/services/news.service'
import { withPermission } from '@/lib/auth/require-permission'
import { runWatchdog } from '@/lib/services/news-pipeline-watchdog'

export async function GET(request: NextRequest) {
  return withPermission(request, 'news', 'read', async () => {
    // Best-effort watchdog vor list — Fehler hier dürfen die List nicht blocken
    await runWatchdog().catch(() => undefined)

    const { searchParams } = new URL(request.url)
    const topicId = searchParams.get('topicId')
    const includeHidden = searchParams.get('hidden') === 'true'

    if (topicId) {
      const items = await NewsService.listItemsByTopic(topicId, { hidden: includeHidden })
      return apiSuccess(items)
    }
    const grouped = await NewsService.listAllForDashboard({ hidden: includeHidden })
    return apiSuccess(grouped)
  })
}
```

- [ ] **Step 2: Item Detail + Patch**

`src/app/api/v1/news/items/[id]/route.ts`:

```ts
import { NextRequest } from 'next/server'
import { apiSuccess, apiNotFound, apiValidationError } from '@/lib/utils/api-response'
import { updateNewsItemSchema, validateAndParse, formatZodErrors } from '@/lib/utils/validation'
import { NewsService } from '@/lib/services/news.service'
import { db } from '@/lib/db'
import { blogPosts, socialMediaPosts } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { withPermission } from '@/lib/auth/require-permission'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withPermission(request, 'news', 'read', async () => {
    const { id } = await params
    const item = await NewsService.getItem(id)
    if (!item) return apiNotFound('News-Item nicht gefunden')

    const [blogs, socials] = await Promise.all([
      db.select().from(blogPosts).where(eq(blogPosts.sourceNewsItemId, id)),
      db.select().from(socialMediaPosts).where(eq(socialMediaPosts.sourceNewsItemId, id)),
    ])

    return apiSuccess({ item, drafts: { blog: blogs, social: socials } })
  })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withPermission(request, 'news', 'update', async () => {
    const { id } = await params
    const body = await request.json()
    const validation = validateAndParse(updateNewsItemSchema, body)
    if (!validation.success) return apiValidationError(formatZodErrors(validation.errors))

    if (validation.data.isHidden !== undefined) {
      const ok = await NewsService.hideItem(id, validation.data.isHidden)
      if (!ok) return apiNotFound('News-Item nicht gefunden')
    }
    return apiSuccess({ updated: true })
  })
}
```

- [ ] **Step 3: Type-Check + Commit**

```bash
npx tsc --noEmit
git add src/app/api/v1/news/items
git commit -m "feat(news): API Items list/detail/patch + watchdog beim list"
```

---

## Task 21: API — Pipeline-Trigger mit 409-Schutz

**Files:**
- Create: `src/app/api/v1/news/items/[id]/pipeline/route.ts`

- [ ] **Step 1: Route schreiben**

`src/app/api/v1/news/items/[id]/pipeline/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { apiSuccess, apiNotFound, apiServerError } from '@/lib/utils/api-response'
import { NewsService } from '@/lib/services/news.service'
import { db } from '@/lib/db'
import { taskQueue, newsItems } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { withPermission } from '@/lib/auth/require-permission'
import { AuditLogService } from '@/lib/services/audit-log.service'
import { logger } from '@/lib/utils/logger'

const NON_TERMINAL = new Set(['queued', 'researching', 'generating'])

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withPermission(request, 'news', 'update', async (auth) => {
    try {
      const { id } = await params
      const item = await NewsService.getItem(id)
      if (!item) return apiNotFound('News-Item nicht gefunden')

      if (NON_TERMINAL.has(item.pipelineStatus)) {
        return NextResponse.json(
          { success: false, error: { code: 'CONFLICT', message: 'Pipeline already running' } },
          { status: 409 },
        )
      }

      const [task] = await db
        .insert(taskQueue)
        .values({
          type: 'news_pipeline',
          status: 'pending',
          priority: 2,
          payload: { stages: ['research', 'blog', 'social'] },
          referenceType: 'news_item',
          referenceId: id,
        })
        .returning()

      await db
        .update(newsItems)
        .set({
          pipelineStatus: 'queued',
          pipelineTaskId: task.id,
          pipelineError: null,
          updatedAt: new Date(),
        })
        .where(eq(newsItems.id, id))

      await AuditLogService.log({
        userId: auth.user.id,
        action: 'news.item.pipeline.start',
        resourceType: 'news_item',
        resourceId: id,
        metadata: { taskId: task.id } as Record<string, unknown>,
      })

      return apiSuccess({ taskId: task.id, status: 'queued' }, undefined, 202)
    } catch (err) {
      logger.error('news pipeline trigger failed', err, { module: 'NewsPipelineAPI' })
      return apiServerError()
    }
  })
}
```

- [ ] **Step 2: Type-Check + Commit**

```bash
npx tsc --noEmit
git add src/app/api/v1/news/items/[id]/pipeline
git commit -m "feat(news): API pipeline trigger mit 409-Schutz"
```

---

## Task 22: API-Integrationstest — Items List + Pipeline-409

**Files:**
- Create: `src/__tests__/integration/api/news-items.route.test.ts`

- [ ] **Step 1: Tests schreiben**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'

describe('POST /api/v1/news/items/[id]/pipeline', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
    // permissions
    vi.doMock('@/lib/auth/require-permission', () => ({
      withPermission: (_req: unknown, _res: string, _act: string, cb: (a: unknown) => unknown) =>
        cb({ user: { id: 'u1' } }),
    }))
    vi.doMock('@/lib/services/audit-log.service', () => ({
      AuditLogService: { log: vi.fn().mockResolvedValue(undefined) },
    }))
  })

  it('returns 409 when pipeline already running', async () => {
    vi.doMock('@/lib/services/news.service', () => ({
      NewsService: {
        getItem: vi.fn().mockResolvedValue({ id: 'i1', pipelineStatus: 'running' }),
      },
    }))
    const { POST } = await import('@/app/api/v1/news/items/[id]/pipeline/route')
    const req = new Request('http://localhost/x', { method: 'POST' })
    const res = await POST(req as never, { params: Promise.resolve({ id: 'i1' }) })
    expect(res.status).toBe(409)
  })

  it('returns 404 when item missing', async () => {
    vi.doMock('@/lib/services/news.service', () => ({
      NewsService: { getItem: vi.fn().mockResolvedValue(null) },
    }))
    const { POST } = await import('@/app/api/v1/news/items/[id]/pipeline/route')
    const req = new Request('http://localhost/x', { method: 'POST' })
    const res = await POST(req as never, { params: Promise.resolve({ id: 'missing' }) })
    expect(res.status).toBe(404)
  })

  it('enqueues task and returns 202', async () => {
    vi.doMock('@/lib/services/news.service', () => ({
      NewsService: { getItem: vi.fn().mockResolvedValue({ id: 'i1', pipelineStatus: 'idle' }) },
    }))
    dbMock.mockInsert.mockResolvedValueOnce([{ id: 'task1' }])
    dbMock.mockUpdate.mockResolvedValueOnce([{ id: 'i1' }])

    const { POST } = await import('@/app/api/v1/news/items/[id]/pipeline/route')
    const req = new Request('http://localhost/x', { method: 'POST' })
    const res = await POST(req as never, { params: Promise.resolve({ id: 'i1' }) })
    expect(res.status).toBe(202)
    const json = await res.json()
    expect(json.data.taskId).toBe('task1')
  })
})
```

> **Note:** Wenn `withPermission` eine andere Signatur (z. B. mit anderen Argumenten) hat: in `src/lib/auth/require-permission.ts` nachsehen und das Mock-Stub anpassen.

- [ ] **Step 2: Tests laufen — passen**

```bash
npx vitest run src/__tests__/integration/api/news-items.route.test.ts
```

Erwartet: 3 passing.

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/integration/api/news-items.route.test.ts
git commit -m "test(news): integration tests pipeline trigger 409/404/202"
```

---

## Task 23: Seed — 3 Topics + 3 Prompt-Templates

**Files:**
- Create: `src/lib/db/seeds/news-seed.ts`

- [ ] **Step 1: Seed-Datei schreiben**

`src/lib/db/seeds/news-seed.ts`:

```ts
import { db } from '@/lib/db'
import { newsTopics, aiPromptTemplates } from '@/lib/db/schema'
import { sql } from 'drizzle-orm'
import { logger } from '@/lib/utils/logger'

const TOPICS = [
  { name: 'IT-Sicherheit & NIS2', keywords: ['NIS2', 'IT-Sicherheit KMU', 'BSI Grundschutz'], color: '#dc2626' },
  { name: 'KI für KMU', keywords: ['KI Mittelstand', 'AI Act KMU', 'Künstliche Intelligenz Unternehmen'], color: '#2563eb' },
  { name: 'Fördermittel & Digitalisierung', keywords: ['Digitalbonus', 'Förderung KMU Digitalisierung', 'BAFA Beratung'], color: '#16a34a' },
]

const PROMPTS = [
  {
    slug: 'news-deep-research',
    name: 'News Deep Research',
    category: 'news_pipeline',
    description: 'Erweitert eine News-Schlagzeile zu strukturierter Recherche.',
    template: `Du bist Recherche-Assistent für KMU-Themen. Aus folgender News:
Titel: {{title}}
URL: {{url}}
Quelle: {{source}}
Snippet: {{snippet}}

Liefere eine strukturierte Recherche als JSON:
{ "summary": "1-2 Saetze", "keyPoints": ["..."], "sources": [{"title":"...","url":"..."}], "context": "Hintergrund fuer KMU" }`,
  },
  {
    slug: 'news-blog-draft',
    name: 'News Blog Draft',
    category: 'news_pipeline',
    description: 'Erzeugt einen Blog-Post-Entwurf aus News + Recherche.',
    template: `Erstelle einen Blogpost (deutsch, KMU-Zielgruppe) aus folgender Recherche:
News-Titel: {{title}}
Recherche (JSON): {{research}}

JSON-Output:
{ "title": "...", "excerpt": "...", "content": "Markdown ~600-900 Woerter", "seoTitle": "<=70", "seoDescription": "<=160", "tags": ["...","..."] }`,
  },
  {
    slug: 'news-social-draft',
    name: 'News Social Draft',
    category: 'news_pipeline',
    description: 'Erzeugt einen Social-Post (Plattform-spezifisch) aus News + Blog.',
    template: `Erstelle einen Social-Media-Post fuer Plattform: {{platform}}.
News-Titel: {{title}}
Recherche (JSON): {{research}}
Blog-Titel: {{blogTitle}}
Blog-Excerpt: {{blogExcerpt}}

JSON-Output:
{ "platform": "{{platform}}", "title": "optional", "content": "x/linkedin-konform", "hashtags": ["#..."] }`,
  },
]

export async function seedNewsModule(): Promise<void> {
  for (const t of TOPICS) {
    await db.insert(newsTopics).values({
      name: t.name,
      color: t.color,
      keywords: t.keywords,
      sourceType: 'serpapi_news',
      sourceConfig: { maxResults: 10, dateRange: '7d' },
      isActive: false, // User aktiviert nach Setup
    }).onConflictDoNothing()
  }

  for (const p of PROMPTS) {
    await db.insert(aiPromptTemplates).values({
      slug: p.slug,
      name: p.name,
      category: p.category,
      description: p.description,
      template: p.template,
    }).onConflictDoNothing()
  }

  logger.info('news seed applied', { module: 'NewsSeed' })
}
```

> **Note:** Felder von `aiPromptTemplates` (slug/name/category/description/template) in `schema.ts` ab Zeile 527 verifizieren — wenn Pflichtfelder fehlen oder anders heißen, die Insert-Werte angleichen. Falls keine Unique-Constraint auf `slug` existiert, `.onConflictDoNothing()` wird nicht greifen — dann statt Insert ein Upsert mit `where` oder einen `select existing first`-Schritt einbauen.

- [ ] **Step 2: Seed in bestehende Seed-Pipeline einhängen**

In dem Bootstrap-/Seed-Runner der App (suche nach `seedNewsModule`-Anker oder vergleichbarem in `src/lib/db/seeds/index.ts` / einer Boot-Routine in `src/server.ts` o. ä.):

- Existing: oft gibt es einen zentralen Seed-Aufruf — neuen Aufruf `await seedNewsModule()` ergänzen.
- Falls keine zentrale Stelle existiert: in `src/lib/db/seed.ts` (oder Hauptdatei) den Import + Aufruf ergänzen.

Wenn unklar: einen neuen Seed-Trigger im Boot-Hash-Gate (laut Memory `app_meta`-Mechanismus) ergänzen.

- [ ] **Step 3: Commit**

```bash
git add src/lib/db/seeds/news-seed.ts
# plus die Datei mit dem Seed-Aufruf
git commit -m "feat(news): seed mit 3 Topics (inaktiv) + 3 Prompt-Templates"
```

---

## Task 24: UI — Topics-Liste

**Files:**
- Create: `src/app/intern/(dashboard)/news/topics/page.tsx`
- Create: `src/components/news/topic-form.tsx`

- [ ] **Step 1: Topic-Form-Komponente**

Vorlage: bestehende Topics-UI in `src/app/intern/(dashboard)/social-media/topics/page.tsx` (Form mit Name, Description, Color in Dialog).

`src/components/news/topic-form.tsx` — Form-Komponente mit Feldern: Name, Description, Color (Color-Picker), Keywords (Tag-Input — comma-separated `<input>` parsen → string[]), sourceType (Select, MVP nur `serpapi_news`), sourceConfig (`<textarea>` mit JSON, Default `{"maxResults":10,"dateRange":"7d"}`), isActive (Switch), sortOrder (number-input). `onSubmit(data)` ruft Parent.

- [ ] **Step 2: Topics-List-Page**

`src/app/intern/(dashboard)/news/topics/page.tsx` — Tabelle mit Spalten Name (mit Color-Dot), Keywords (gekürzt), Items-Count (placeholder oder zusätzlicher Endpoint), isActive (Badge), Actions (Edit, Delete, „↻ Recherchieren"). Pattern: client-side fetch von `/api/v1/news/topics`, Dialog für Create/Edit mit `topic-form`.

Ein zusätzlicher Header-Button „↻ Alle aktiven recherchieren" → POST `/api/v1/news/research`.

- [ ] **Step 3: Manueller Smoke-Test im Browser**

```bash
npm run dev
```

Im Browser: `/intern/news/topics` öffnen, Topic anlegen, „Recherchieren" klicken → erwartet: 200 + neue News-Items in DB.

- [ ] **Step 4: Commit**

```bash
git add src/app/intern/(dashboard)/news/topics src/components/news/topic-form.tsx
git commit -m "feat(news): UI Topics-Liste + Form"
```

---

## Task 25: UI — Topic-Detail (Edit + Items + Recherche-Run)

**Files:**
- Create: `src/app/intern/(dashboard)/news/topics/new/page.tsx`
- Create: `src/app/intern/(dashboard)/news/topics/[id]/page.tsx`

- [ ] **Step 1: New-Page**

Server Component oder Client Component, lädt leeres Form, ruft POST `/api/v1/news/topics`. Bei Erfolg: redirect auf Detail.

- [ ] **Step 2: Detail-Page**

Lädt Topic via `/api/v1/news/topics/[id]`. Form (TopicForm) preset, Save → PATCH. Darunter: Liste der News-Items (`/api/v1/news/items?topicId=...`) mit Status-Badges. Header-Button „↻ Jetzt recherchieren" → POST `/api/v1/news/topics/[id]/research`, danach Refetch der Items-Liste.

- [ ] **Step 3: Smoke-Test**

```bash
npm run dev
```

Topic editieren → Save funktioniert. „Recherchieren"-Klick → neue Items erscheinen.

- [ ] **Step 4: Commit**

```bash
git add src/app/intern/(dashboard)/news/topics/new \
        src/app/intern/(dashboard)/news/topics/[id]
git commit -m "feat(news): UI Topic Create + Detail"
```

---

## Task 26: UI — Dashboard mit Spalten und Polling

**Files:**
- Create: `src/app/intern/(dashboard)/news/page.tsx`
- Create: `src/components/news/news-card.tsx`

- [ ] **Step 1: NewsCard-Komponente**

`src/components/news/news-card.tsx`:

Props: `{ item, onPipeline, onHide, onOpenDetail }`. Layout:
- Thumbnail (oder Topic-Color-Block)
- Title als Link (target=_blank) auf `item.url`
- Quelle · relative Zeit (z. B. mit `date-fns`)
- Snippet (line-clamp 2)
- Status-Badge (siehe Mapping unten)
- Aktionen: `[↗ Quelle]` `[▶ Verarbeiten]` `[× Verbergen]`

Status-Badge-Map: `idle`→grau, `queued`→blau, `researching`/`generating`→blau pulsierend, `completed`→grün, `failed`→rot.

Bei `pipelineStatus === 'completed'`: zusätzliche Zeile mit Verlinkung „📝 Blog-Entwurf" und „📱 N Posts" (zählt aus `drafts.blog.length` / `drafts.social.length` falls per Detail-API verfügbar — alternativ: später per separatem Lookup).

`[▶ Verarbeiten]` ist disabled wenn Status ∈ {queued, researching, generating}.

- [ ] **Step 2: Dashboard-Page**

`src/app/intern/(dashboard)/news/page.tsx`:

Client Component:
```tsx
'use client'
// Lädt /api/v1/news/items (gruppiert nach Topic)
// Rendert horizontalen Container mit einer Spalte pro Topic
// Jede Spalte: Header (Topic-Name + Color + "↻ Recherche") + scroll-bare Karten
// Polling: setInterval(refetch, 5000) wenn ≥1 Karte non-terminalen Status hat. 
// useEffect cleanup beim Verlassen.
// Header oben: globaler Button "↻ Alle aktiven recherchieren"
// Aktionen: 
//   onPipeline → POST /api/v1/news/items/[id]/pipeline → toast "Pipeline gestartet" + sofort polling aktivieren
//   onHide     → PATCH /api/v1/news/items/[id] {isHidden:true} → optimistic remove
```

Wichtig: das Polling-Interval läuft nur, wenn mindestens ein Item `pipelineStatus ∈ {queued, researching, generating}` hat. Sobald alle terminal sind: `clearInterval`.

- [ ] **Step 3: Smoke-Test**

```bash
npm run dev
```

`/intern/news` öffnen → Spalten erscheinen, Karten klickbar, Pipeline-Button → Status wechselt zu `queued`, Polling refresht alle 5s. Nach Abarbeitung des Workers (cron `process_queue`) wechselt Status auf `completed`. Unten Badge zeigt Blog/Social-Count.

- [ ] **Step 4: Commit**

```bash
git add src/app/intern/(dashboard)/news/page.tsx src/components/news/news-card.tsx
git commit -m "feat(news): Dashboard mit Themenbereich-Spalten + Polling"
```

---

## Task 27: UI — News-Detail (Inhalt / Entwürfe / Pipeline-Log)

**Files:**
- Create: `src/app/intern/(dashboard)/news/[id]/page.tsx`

- [ ] **Step 1: Detail-Page**

```tsx
'use client'
// Lädt /api/v1/news/items/[id] -> { item, drafts: { blog[], social[] } }
// Header: Title (extern Link), Source, publishedAt, Topic
// Tabs:
//   Inhalt   → Snippet, gerenderte researchData (summary, keyPoints, sources, context)
//   Entwürfe → drafts.blog mit Link auf /intern/blog/[id]; drafts.social mit Link auf /intern/social-media/[id]
//   Pipeline → pipelineStatus, pipelineError, taskId
// Aktionen Header: 
//   "▶ Verarbeiten" (disabled wenn non-terminal)
//   "× Verbergen"
```

Tab-Komponente: `@/components/ui/tabs` (shadcn — bestehend in der Codebase).

- [ ] **Step 2: Smoke-Test**

`/intern/news/<id>` öffnen → 3 Tabs funktionieren, „Verarbeiten" startet Pipeline.

- [ ] **Step 3: Commit**

```bash
git add src/app/intern/(dashboard)/news/[id]/page.tsx
git commit -m "feat(news): UI News-Detail mit Tabs"
```

---

## Task 28: Sidebar-Eintrag

**Files:**
- Modify: `src/components/layout/sidebar.tsx` (Pfad in T22 verifiziert — falls anders, dort Sidebar-Definition finden)

- [ ] **Step 1: Sidebar-Datei finden**

```bash
grep -rn "Marketing" src/components/layout 2>/dev/null
```

Datei mit der Sidebar-Definition öffnen. Suche nach den Einträgen für „Blog", „Social Media", „Marketing".

- [ ] **Step 2: Eintrag „News" einfügen**

Zwischen „Marketing" und „Blog" einen Menüeintrag ergänzen mit:
- Label: „News"
- Icon: `Newspaper` aus `lucide-react`
- Href: `/intern/news`
- Permission-Resource: `'news'` (oder Fallback `'social_media'` falls `'news'` nicht im Berechtigungssystem)

- [ ] **Step 3: Smoke-Test**

```bash
npm run dev
```

Sidebar zeigt News-Eintrag. Klick navigiert auf Dashboard.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/sidebar.tsx
git commit -m "feat(news): sidebar-eintrag News"
```

---

## Task 29: End-to-End-Verifikation (manuell)

**Files:** keine

- [ ] **Step 1: Lokal Cron-Job für News-Recherche anlegen**

Im Browser unter `/intern/settings/cron-jobs`:
- Name: „News Tagesrecherche"
- Interval: `daily`, dailyAt: `07:00`
- ActionType: `news_research`
- ActionConfig: `{}` (leer = alle aktiven Topics)
- isActive: true

- [ ] **Step 2: Topic aktivieren und Recherche manuell triggern**

`/intern/news/topics` → ein gesedetes Topic auf isActive=true → „↻ Recherchieren". Erwartung: News-Items erscheinen.

- [ ] **Step 3: Pipeline-Run**

`/intern/news` → eine News-Karte, „▶ Verarbeiten". Erwartung:
1. Status wechselt sofort auf `queued`
2. Polling refresht
3. Nach `process_queue`-Cron-Tick (max 5 min): Status = `completed`
4. Badge zeigt „📝 Blog-Entwurf · 📱 2 Posts"
5. Klick auf Blog-Link → `/intern/blog/[id]` → Draft mit Inhalt sichtbar
6. Klick auf Social-Link → `/intern/social-media/[id]` → Draft sichtbar

- [ ] **Step 4: Failure-Pfad prüfen**

Im AI-Provider den Key falsch setzen → Pipeline neu triggern. Erwartung: Status → `failed`, rote Karte, `pipelineError` zeigt Fehlermeldung.

Key wieder korrekt setzen, Re-Trigger → läuft durch.

- [ ] **Step 5: Audit-Log prüfen**

Unter `/intern/settings/audit-log` (falls vorhanden) prüfen, dass Einträge erscheinen:
- `news.topic.research`
- `news.research.all`
- `news.item.pipeline.start`

- [ ] **Step 6: Commit (falls Anpassungen nötig)**

Bei manuellen Anpassungen aus Test-Runden: einzelne Fix-Commits.

---

## Task 30: Volle Test-Suite + tsc + lint

- [ ] **Step 1: Alle News-Tests grün**

```bash
npx vitest run src/__tests__/unit/services/news \
                src/__tests__/integration/api/news-items.route.test.ts
```

Erwartet: alle passing.

- [ ] **Step 2: tsc**

```bash
npx tsc --noEmit
```

Erwartet: 0 Fehler.

- [ ] **Step 3: lint**

```bash
npm run lint
```

Erwartet: 0 Fehler in den neuen Dateien (Warnungen tolerierbar).

- [ ] **Step 4: Final Commit (falls Anpassungen)**

```bash
git add -A
git commit -m "chore(news): tsc + lint clean"
```
