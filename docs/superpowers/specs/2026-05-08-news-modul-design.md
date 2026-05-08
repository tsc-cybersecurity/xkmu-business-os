# News-Modul — Design Spec

**Datum:** 2026-05-08
**Status:** Approved (Brainstorming)
**Owner:** Tino Stenzel
**Issue:** [#3](https://github.com/tsc-cybersecurity/xkmu-business-os/issues/3)

## Overview

Neues Modul: konfigurierbare Themenbereiche, zu denen täglich (Cron) und/oder manuell
News recherchiert werden. Ergebnisse erscheinen auf einem eigenen Dashboard, gruppiert
nach Themenbereich. Pro News-Karte kann eine asynchrone Pipeline gestartet werden, die
KI-Tiefenrecherche → Blog-Entwurf → Social-Media-Entwürfe erzeugt. Entwürfe leben in
den bestehenden Tabellen `blog_posts` / `social_media_posts` (`status='draft'`) und
sind per neuer FK `source_news_item_id` mit dem auslösenden News-Item verknüpft.

**Aus Issue #3 explizit:**
- Dashboard mit mehreren Themenbereichen
- Tägliche Recherche per Button und Cron
- Anzeige der News im Dashboard
- News-getriebene Generierung von Blog-/Social-Drafts, sichtbar auch im Dashboard

**Langfristig (V2+, dokumentiert, nicht in dieser Spec):** öffentlicher News-Blog,
Volltext-Anreicherung via Firecrawl, Multi-Provider (Perplexity / Hybrid),
Relevanz-Score & Auto-Pipeline, pro-Topic Sprache/Region.

## Architecture Decision

**Adapter-Pattern + Async-Pipeline über bestehende `task_queue`.** Recherche-Quellen
werden hinter `NewsSourceAdapter`-Interface gekapselt; im MVP nur SerpAPI Google News,
V2-Quellen (Perplexity, Hybrid SerpAPI+Firecrawl) kommen ohne Schema-Änderung dazu.

Die News→Blog→Social-Pipeline läuft strikt asynchron: Klick erzeugt einen
`task_queue`-Eintrag (`type='news_pipeline'`), der bestehende `process_queue`-Cron
arbeitet ihn ab. Drei Stufen sequenziell, jede Stufe hat ihren eigenen Prompt aus
`ai_prompt_templates` und nutzt den bestehenden `AiProviderService`. Drafts werden
direkt in `blog_posts` / `social_media_posts` geschrieben — keine
News-eigene Draft-Tabelle.

Cron-Integration über bestehende `cron_jobs` mit neuem `actionType: 'news_research'`.
Sprache/Region im MVP fix `de`/`DE`.

## 1. Datenmodell

### 1.1 Neu: `news_topics`

```ts
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
```

`sourceType` ist im MVP immer `'serpapi_news'`; die Spalte ist V2-vorbereitet für
`'perplexity'` und `'hybrid_serp_firecrawl'`. `sourceConfig` enthält adapter-spezifische
Defaults; für SerpAPI sinnvoll: `{ maxResults: 10, dateRange: '7d' }`.

### 1.2 Neu: `news_items`

```ts
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
```

`pipelineStatus`: `idle | queued | researching | generating | completed | failed`.

`urlHash = sha256(url)` als deterministische Dedup-Basis pro Topic. Kombination mit
Unique-Index erlaubt `INSERT … ON CONFLICT (topic_id, url_hash) DO NOTHING` — bekannte
URLs werden nicht doppelt eingefügt; bestehender Pipeline-Zustand bleibt unangetastet.

### 1.3 Erweiterung: `blog_posts`

Eine Spalte hinzu:

```ts
sourceNewsItemId: uuid('source_news_item_id').references(() => newsItems.id, { onDelete: 'set null' })
```

Plus Relation. Bestehendes `source`-Feld bekommt zusätzlichen Wert `'news'`.

### 1.4 Erweiterung: `social_media_posts`

Analog:

```ts
sourceNewsItemId: uuid('source_news_item_id').references(() => newsItems.id, { onDelete: 'set null' })
```

### 1.5 Wiederverwendung — keine Schema-Änderung

- `cron_jobs` — neuer `actionType='news_research'`, `actionConfig={ topicIds?: string[] }`
- `task_queue` — neuer `type='news_pipeline'`, `referenceType='news_item'`, `referenceId=newsItems.id`, `payload={ stages: ['research','blog','social'] }`
- `ai_prompt_templates` — drei neue Templates mit `category='news_pipeline'` (Slugs unten in §3.2)
- `ai_providers` — bestehender `serpapi`-Provider wird mitgenutzt

## 2. Recherche-Pipeline

### 2.1 Adapter-Schicht

```
src/lib/services/news/
├── source-adapter.types.ts
├── serpapi-news.adapter.ts        // engine=google_news, hl=de, gl=de
└── index.ts                        // resolve(sourceType) → Adapter
```

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

`serpapi-news.adapter.ts` zieht den API-Key über `AiProviderService.list()` mit
`providerType='serpapi'` (analog `src/lib/services/serpapi.service.ts`), ruft SerpAPI mit
`engine=google_news`, `q=<keywords joined>`, `hl=de`, `gl=de`, `num=<maxResults>` und
mappt das Response auf `NewsSearchResult[]`.

### 2.2 Service: `news.service.ts`

```ts
export const NewsService = {
  // Topics
  listTopics(opts?: { activeOnly?: boolean }),
  getTopic(id),
  createTopic(data),
  updateTopic(id, data),
  deleteTopic(id),

  // Items
  listItemsByTopic(topicId, opts?: { hidden?: boolean; since?: Date }),
  listAllForDashboard(opts?: { hidden?: boolean; since?: Date }), // gruppiert nach Topic
  getItem(id), // inkl. verknüpfter Drafts (blog_posts + social_media_posts)
  hideItem(id, hidden: boolean),

  // Recherche-Run
  async runResearchForTopic(topicId): Promise<{ inserted: number; skipped: number }>,
  async runResearchForAllActiveTopics(): Promise<{ topicId: string; inserted: number; skipped: number; error?: string }[]>,
}
```

`runResearchForTopic` lädt Topic, resolvt Adapter via `sourceType`, ruft `search()`,
filtert items ohne URL aus, erzeugt `urlHash`, batched-insert mit
`.onConflictDoNothing()`. Returnt `{ inserted, skipped }` (skipped = Treffer minus
inserted).

`runResearchForAllActiveTopics` läuft sequenziell durch aktive Topics, fängt Fehler
pro Topic, sammelt Summary.

### 2.3 Trigger-Pfade

1. **Manuell pro Topic** — `POST /api/v1/news/topics/[id]/research` → `runResearchForTopic`. Synchron (typisch < 10 s).
2. **Manuell global** — `POST /api/v1/news/research` ohne Body → `runResearchForAllActiveTopics`. Längere Antwortzeit; UI zeigt Spinner.
3. **Cron** — Neuer Branch in `cron.service.ts`-Switch:
   ```ts
   case 'news_research': {
     const topicIds = (job.actionConfig as any)?.topicIds as string[] | undefined
     const summary = topicIds?.length
       ? await Promise.all(topicIds.map(id => NewsService.runResearchForTopic(id).then(r => ({ topicId: id, ...r }))))
       : await NewsService.runResearchForAllActiveTopics()
     // success-Log mit summary
   }
   ```
4. **UI** — Eintrag in `src/lib/constants/cron.ts` `ACTION_TYPE_OPTIONS`, damit unter `/intern/settings/cron-jobs` der Typ wählbar wird.

### 2.4 Dedup

Vor Insert wird pro Treffer `urlHash = sha256(url)` berechnet (Node `crypto.createHash`).
Batched insert via Drizzle `.values([...]).onConflictDoNothing({ target: [topicId, urlHash] })`
nutzt den Unique-Index `uq_news_items_topic_url`. Bestehende Zeilen bleiben unverändert
— vor allem ihr `pipelineStatus`.

## 3. Generierungs-Pipeline (News → Blog → Social)

### 3.1 Trigger & Enqueue

UI-Button auf der News-Karte ruft `POST /api/v1/news/items/[id]/pipeline`. Handler:

1. Item laden, Status muss `idle` oder `failed` sein, sonst 409 Conflict.
2. `taskQueue` insert: `{ type: 'news_pipeline', referenceType: 'news_item', referenceId: item.id, payload: { stages: ['research','blog','social'] } }`.
3. `news_items` update: `pipelineStatus='queued'`, `pipelineTaskId=<task.id>`, `pipelineError=null`.
4. Sofortige 202-Response mit `{ taskId, status: 'queued' }`.

### 3.2 Worker

Erweiterung in `src/lib/services/task-queue.service.ts` (`executeAllPending` →
type-Switch, analog zu `social_post_publish`, `appointment_reminder` etc.) um
einen Branch `'news_pipeline'`, der `NewsPipelineService.run(referenceId)` aufruft:

```ts
// src/lib/services/news-pipeline.service.ts
export const NewsPipelineService = {
  async run(newsItemId: string): Promise<void> {
    const item = await NewsService.getItem(newsItemId)
    if (!item) throw new Error('news item not found')

    try {
      // Stufe 1: Recherche
      await this.markStatus(newsItemId, 'researching')
      const research = await this.deepResearch(item)
      await NewsService.updateItem(newsItemId, { researchData: research })

      // Stufe 2: Blog-Draft
      await this.markStatus(newsItemId, 'generating')
      const blogDraft = await this.generateBlogPost(item, research)
      const blogPost = await BlogPostService.create({
        ...blogDraft,
        status: 'draft',
        source: 'news',
        sourceNewsItemId: newsItemId,
      })

      // Stufe 3: Social-Drafts (LinkedIn + X)
      const socialDrafts = await this.generateSocialPosts(item, research, blogPost)
      const socialErrors: string[] = []
      for (const draft of socialDrafts) {
        try {
          await SocialMediaPostService.create({
            ...draft,
            status: 'draft',
            aiGenerated: true,
            sourceNewsItemId: newsItemId,
          })
        } catch (e) {
          socialErrors.push(`${draft.platform}: ${String(e)}`)
        }
      }

      await this.markStatus(newsItemId, 'completed', socialErrors.join('; ') || null)
    } catch (err) {
      await this.markStatus(newsItemId, 'failed', String(err))
      throw err
    }
  },
}
```

### 3.3 Drei dedizierte Prompts

In `ai_prompt_templates` werden drei neue Templates mit `category='news_pipeline'`
seed-fixed angelegt:

| Slug | Input-Variablen | Erwarteter Output (JSON) |
|---|---|---|
| `news-deep-research` | `title`, `url`, `snippet`, `source` | `{ summary, keyPoints[], sources[], context }` |
| `news-blog-draft` | `title`, `research` | `{ title, excerpt, content (Markdown), seoTitle, seoDescription, tags[] }` |
| `news-social-draft` | `title`, `research`, `blogTitle`, `blogExcerpt`, `platform` | `{ platform, title, content, hashtags[] }` |

Aufruf via bestehendem `AiPromptTemplateService.render(slug, vars)` + `AiProviderService`.
Default-Plattformen im MVP: `['linkedin', 'x']` (zwei Aufrufe).

### 3.4 Idempotenz / Re-Run

Re-Run auf `failed`-Item ist erlaubt (`POST .../pipeline`). Bestehende Drafts (per
`sourceNewsItemId`) werden **nicht** gelöscht — neue Drafts werden zusätzlich
angelegt. User räumt manuell auf, falls ungewünscht.

Doppelklick-Schutz: API gibt 409 wenn `pipelineStatus ∈ {queued, researching, generating}`;
UI deaktiviert den Button im selben Zustand.

### 3.5 Watchdog gegen hängende Status

Beim Laden des Dashboards (`GET /api/v1/news/items`) wird ein leichtgewichtiger
Watchdog ausgeführt:

```ts
// items mit non-terminalem Status, deren task_queue-Eintrag bereits failed/completed ist
UPDATE news_items SET pipeline_status='failed', pipeline_error='worker terminated'
WHERE pipeline_status IN ('queued','researching','generating')
  AND pipeline_task_id IN (SELECT id FROM task_queue WHERE status='failed');
```

So werden Items, deren Worker abgestürzt ist, beim nächsten View korrigiert.

## 4. UI / Routen

### 4.1 Routen

```
/intern/news                       Dashboard (Themenbereich-Spalten)
/intern/news/topics                Topics-Übersicht (Liste)
/intern/news/topics/new            Topic anlegen
/intern/news/topics/[id]           Topic edit + Items + "Jetzt recherchieren"
/intern/news/[id]                  News-Detail mit Drafts und Pipeline-Log
```

### 4.2 API-Routen (`src/app/api/v1/news/...`)

```
GET    /api/v1/news/topics                   List
POST   /api/v1/news/topics                   Create
GET    /api/v1/news/topics/[id]              Get
PATCH  /api/v1/news/topics/[id]              Update
DELETE /api/v1/news/topics/[id]              Delete
POST   /api/v1/news/topics/[id]/research     Manueller Recherche-Run

POST   /api/v1/news/research                 Run für alle aktiven Topics

GET    /api/v1/news/items                    List (filter: topicId, status, hidden, since)
GET    /api/v1/news/items/[id]               Detail mit Drafts
POST   /api/v1/news/items/[id]/pipeline      Pipeline starten → enqueue
PATCH  /api/v1/news/items/[id]               { isHidden? }
```

Auth: bestehendes `requireAuth`-Pattern aus `/api/v1/social-media/*`,
`/api/v1/blog/*`. Audit-Log über `AuditLogService` für alle ändernden Aktionen
(Topic CRUD, Recherche-Run, Pipeline-Trigger, Hide/Unhide) — Memory-Vorgabe:
revisionssicher persistieren.

### 4.3 Dashboard-Layout (`/intern/news`)

Eine Spalte pro aktivem Topic (horizontal scrollbar). Jede Spalte hat Header mit
Topic-Name, Farbe und „↻ Recherche"-Button. Inhalt: News-Karten, sortiert nach
`publishedAt` desc.

News-Karte:
- Thumbnail (`imageUrl`, fallback Topic-Farbe)
- Title (Link auf externe URL)
- Quelle · relative Zeit
- Snippet (2 Zeilen, gekürzt)
- Aktionen: `[↗ Quelle]` `[▶ Verarbeiten]` `[× Verbergen]`
- Status-Badge: idle=grau, queued=blau, researching/generating=blau pulsierend, completed=grün, failed=rot
- Bei completed: Indikator-Zeile `📝 Blog-Entwurf · 📱 N Posts` mit Link auf Detail

Header oben: globaler Button „↻ Alle Topics recherchieren" (ruft
`POST /api/v1/news/research`).

Polling: alle 5 s, solange ≥ 1 Karte im View nicht-terminalen Status hat. Stoppt
automatisch.

### 4.4 Topic-Detail (`/intern/news/topics/[id]`)

Form-Felder: Name, Description, Color, Keywords (Tag-Input), sourceType (Select, MVP
nur SerpAPI Google News), sourceConfig (JSON-Editor mit Defaults), isActive, sortOrder.

Darunter: Liste der News-Items dieses Topics + `[↻ Jetzt recherchieren]`.

### 4.5 News-Detail (`/intern/news/[id]`)

Header: Title (Link extern), Quelle, Veröffentlicht, Topic.
Tabs:
- **Inhalt** — Snippet, gerendertes `researchData` (summary, keyPoints, sources, context)
- **Entwürfe** — Liste der per `sourceNewsItemId` verknüpften `blog_posts` und `social_media_posts`, jeweils Link in den existierenden Editor (`/intern/blog/[id]`, `/intern/social-media/[id]`)
- **Pipeline-Log** — `pipelineStatus`, `pipelineError`, Link auf `taskQueue`-Eintrag (falls View existiert)

### 4.6 Cron-UI

Keine eigene UI — Wiederverwendung von `/intern/settings/cron-jobs`. Erweiterung von
`ACTION_TYPE_OPTIONS` in `src/lib/constants/cron.ts` um:

```ts
{ value: 'news_research', label: 'News-Recherche (alle aktiven Themenbereiche)' },
```

`actionConfig` wird im MVP als JSON eingegeben. Empfehlung im Issue/Doku: täglich um
07:00.

### 4.7 Sidebar

Neuer Top-Level-Eintrag „News" zwischen Marketing und Blog. Konkrete Positionierung
beim Implementieren basierend auf existierendem Sidebar-Layout.

## 5. Fehlerbehandlung

| Stelle | Fehler | Verhalten | Sichtbarkeit |
|---|---|---|---|
| SerpAPI-Adapter | API-Key fehlt / Quota / 5xx | Service throws → Caller fängt | Toast (manuell), `cron_jobs.last_run_error` (cron) |
| Adapter | einzelner Treffer invalid (z. B. URL fehlt) | Skip + warn-log | Logs |
| `runResearchForAllActiveTopics` | ein Topic schlägt fehl | andere laufen weiter; Summary mit `error?` pro Topic | Cron-Log |
| Pipeline Stufe 1 (Recherche) | AI-Fehler | Status `failed`; keine Drafts erstellt | rote Karte, Detail zeigt Error |
| Pipeline Stufe 2 (Blog) | AI-Fehler / Validation | Status `failed`; `researchData` bleibt; kein Blog/Social | rote Karte |
| Pipeline Stufe 3 (Social) | eine Plattform schlägt fehl | warn-log; andere Plattformen werden gespeichert; Status `completed` mit `pipelineError`-Hinweis | grüne Karte mit Warn-Indikator |
| Worker-Crash | Status hängt | Watchdog beim Dashboard-Load setzt auf `failed` | rote Karte |
| Doppelter Pipeline-Klick | — | API 409, UI hat Button bereits disabled | — |
| Concurrent `runResearchForTopic` | — | Service-Lock per `SELECT … FOR UPDATE NOWAIT` auf Topic-Zeile, sonst 409 | Toast |

## 6. Tests

```
src/lib/services/news/__tests__/
├── serpapi-news.adapter.test.ts       Mock fetch → SerpAPI; Mapping; Fehler-Pfade
└── news.service.test.ts                CRUD; Dedup-Insert; runResearchForTopic mit Mock-Adapter

src/lib/services/__tests__/
└── news-pipeline.service.test.ts       3-Stufen-Flow mit Mock-AI; Stufenfehler; Re-Run

src/app/api/v1/news/__tests__/
└── routes.test.ts                       Auth; Validation; 409 auf Doppel-Trigger; Audit-Log-Aufruf
```

**Pflicht-Cases im MVP:**

1. Dedup: zweiter Recherche-Run mit identischer URL → `ON CONFLICT DO NOTHING`, bestehender Pipeline-Status bleibt
2. Pipeline-Stufenfehler: Blog-Generierung wirft → Status `failed`, `pipeline_error` gesetzt, bereits geschriebener `researchData` bleibt erhalten
3. Cron-Action: `actionType='news_research'` mit/ohne `topicIds` ruft den richtigen Service-Pfad
4. API-Auth: nicht authentifizierter Request auf `/api/v1/news/*` → 401
5. Pipeline-Idempotenz-Schutz: zweiter Pipeline-Trigger auf running-Item → 409
6. Watchdog: Item mit `pipeline_status='researching'` und Task `status='failed'` wird beim nächsten Dashboard-Load auf `failed` korrigiert
7. Adapter: SerpAPI-Response ohne `news_results` → leere Liste, kein Error

## 7. Migration

Generiert via `drizzle-kit generate`. Eine Migration:

1. `CREATE TABLE news_topics`
2. `CREATE TABLE news_items` (inkl. Unique `(topic_id, url_hash)`)
3. `ALTER TABLE blog_posts ADD COLUMN source_news_item_id UUID REFERENCES news_items(id) ON DELETE SET NULL`
4. `ALTER TABLE social_media_posts ADD COLUMN source_news_item_id UUID REFERENCES news_items(id) ON DELETE SET NULL`
5. Indizes: `idx_news_topics_active`, `idx_news_items_topic`, `idx_news_items_pipeline_status`, `idx_news_items_published`

Keine Daten-Migration. Schema-Sync läuft via bestehendem Boot-Hash-Gate
(`app_meta`, siehe Memory-Eintrag „Schema/Seed Hash-Gates").

## 8. Seed

Seed via bestehendem Mechanismus (Schritte werden in der späteren Plan-Phase präzisiert):

- Drei `news_topics` (inaktiv per default): „IT-Sicherheit & NIS2", „KI für KMU", „Fördermittel & Digitalisierung"
- Drei `ai_prompt_templates`: `news-deep-research`, `news-blog-draft`, `news-social-draft`

## 9. Telemetrie

- `logger.info` mit Feldern bei jedem Recherche-Run (`topic_id`, `inserted`, `skipped`, `duration_ms`)
- `logger.info` bei jeder Pipeline-Stufe (Start/Ende, `duration_ms`, `tokens_used`)
- Fehler durchgehend mit Stack-Trace via `logger.error`

## 10. Out of MVP / V2-Roadmap

Klar abgegrenzt — kommt später, ohne Schema-Bruch:

| Feature | Datenmodell-Auswirkung |
|---|---|
| Volltext-Anreicherung via Firecrawl | nutzt bestehendes `firecrawl_researches` mit neuer optionaler Topic/Item-Verknüpfung |
| Multi-Provider (Perplexity, Hybrid) | nur neuer Wert in `news_topics.sourceType` + neue Adapter-Klassen |
| Relevanz-Score / Auto-Pipeline | optionales Feld `news_items.relevance_score numeric(3,2)` + Schwelle in Topic-Config |
| Pro-Topic Sprache/Region | Felder `language`, `region` in `news_topics` |
| Öffentlicher News-Blog | eigene Phase mit eigener Spec; nutzt `blog_posts` + neue Public-Routen |

## 11. Datei-Plan (Implementation Map)

```
src/lib/db/schema.ts                                 + newsTopics, newsItems, FKs
src/lib/services/news/source-adapter.types.ts        neu
src/lib/services/news/serpapi-news.adapter.ts        neu
src/lib/services/news/index.ts                       neu (resolve)
src/lib/services/news.service.ts                     neu
src/lib/services/news-pipeline.service.ts            neu
src/lib/services/cron.service.ts                     + 'news_research'-Branch
src/lib/constants/cron.ts                            + ACTION_TYPE_OPTIONS-Eintrag
src/lib/services/task-queue.service.ts               + 'news_pipeline'-Branch in executeAllPending
src/app/api/v1/news/topics/route.ts                  neu
src/app/api/v1/news/topics/[id]/route.ts             neu
src/app/api/v1/news/topics/[id]/research/route.ts    neu
src/app/api/v1/news/research/route.ts                neu
src/app/api/v1/news/items/route.ts                   neu
src/app/api/v1/news/items/[id]/route.ts              neu
src/app/api/v1/news/items/[id]/pipeline/route.ts     neu
src/app/intern/(dashboard)/news/page.tsx             neu
src/app/intern/(dashboard)/news/topics/page.tsx      neu
src/app/intern/(dashboard)/news/topics/new/page.tsx  neu
src/app/intern/(dashboard)/news/topics/[id]/page.tsx neu
src/app/intern/(dashboard)/news/[id]/page.tsx        neu
drizzle/<timestamp>_news_module.sql                  generiert
src/lib/db/seeds/[seed-news-topics].ts               neu (oder in bestehendem Seed)
src/lib/db/seeds/[seed-news-prompts].ts              neu (oder in bestehendem Seed)
+ Tests siehe §6
```
