# Agent-System Phase 2 — Memory-Layer

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Memory-Service voll implementieren — PARA-Markdown-Files auf Disk + DB-Index mit Hybrid-Suche (BM25 + Vector), File-Watcher fuer externe Edits, Embedding-Pipeline (Gemini text-embedding-004), Read-only UI fuer Tree/Search/Detail-View.

**Architecture:** Disk ist Source-of-Truth (`data/agent-memory/{projects,areas,resources,archives}/<scope>/`), DB-Tabelle `agent_memory_entries` ist Index fuer Suche und Provenance. Drei Sync-Pfade laufen alle durch `MemoryService.write` bzw. den Re-Index-Pfad: Agent-Calls, UI-Edits (spaeter), File-Watcher-Events. Helper-Module bleiben klein und einzeln testbar; `MemoryService` orchestriert sie.

**Tech Stack:** Drizzle ORM 0.45 (pgvector + pg_trgm aus Phase 1), gray-matter (Frontmatter-Parser), js-yaml (items.yaml), chokidar (File-Watcher), Gemini text-embedding-004 (768d), Next.js 16 App Router fuer UI.

**Spec-Referenz:** `docs/superpowers/specs/2026-05-08-agent-system-design.md` §4

**Vorbedingungen:** Phase 1 ist gemerged und Schema-Push gegen Dev-DB durch (Phase-1 Bundle C). Branch dieser Phase: `feat/agents-memory`.

---

## File Structure

**Neue Module unter `src/lib/services/agents/memory/`:**
- `paths.ts` — Pfad-Konstanten + Helpers
- `frontmatter.ts` — gray-matter Wrapper + Zod-Schema
- `items.ts` — js-yaml Wrapper fuer items.yaml
- `hash.ts` — SHA-256 ContentHash
- `embedding.ts` — Gemini text-embedding-004 (768d)
- `watcher.ts` — chokidar File-Watcher
- `index-fixtures.ts` — 20 Test-Fixtures fuer Recall-Tests

**Modifiziert:**
- `src/lib/services/agents/memory.service.ts` — Skelett wird zu echter Implementation
- `src/instrumentation.ts` — Watcher-Boot-Hook
- `src/__tests__/unit/services/agents/skeleton-imports.test.ts` — `MemoryService.search`-Throw-Test entfernen
- `package.json` — neue Deps
- `.env.example` — `AGENT_MEMORY_DIR` Hinweis
- `.gitignore` — `data/agent-memory/_runs/` ausschliessen

**Neue API-Routes unter `src/app/api/agents/memory/`:**
- `route.ts` — `GET /api/agents/memory?para=...` (List)
- `search/route.ts` — `GET /api/agents/memory/search?q=...&scope=...` (Hybrid)
- `[id]/route.ts` — `GET /api/agents/memory/<id-or-scope>` (Read)

**Neue UI unter `src/app/intern/(dashboard)/agents/memory/`:**
- `page.tsx` — Memory-Hub: Tree + Search + Liste
- `[scope]/page.tsx` — Detail-View

**Neue Components unter `src/components/agents/memory/`:**
- `memory-tree.tsx`
- `memory-search-bar.tsx`
- `memory-entry-card.tsx`

**Tests:**
- `src/__tests__/unit/services/agents/memory/{paths,hash,frontmatter,items,embedding}.test.ts`
- `src/__tests__/integration/services/agents/memory.service.test.ts`
- `src/__tests__/integration/services/agents/memory-recall.test.ts`

---

### Task 1: Dependencies installieren

**Files:** `package.json`, `package-lock.json`

- [ ] **Step 1: Install runtime + types**

```bash
npm install gray-matter chokidar js-yaml
npm install --save-dev @types/js-yaml
```

- [ ] **Step 2: Versionen pruefen**

In `package.json` sichten — etwa `gray-matter` ^4.x, `chokidar` ^3.6 oder ^4.x, `js-yaml` ^4.x, `@types/js-yaml` ^4.x.

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(agents): gray-matter, chokidar, js-yaml fuer Memory-Layer"
```

---

### Task 2: PARA-Verzeichnis-Struktur + ENV-Var

**Files:** `data/agent-memory/{projects,areas,resources,archives}/.gitkeep`, `.gitignore`, `.env.example`

- [ ] **Step 1: Struktur anlegen**

```bash
mkdir -p data/agent-memory/projects data/agent-memory/areas/people data/agent-memory/areas/companies data/agent-memory/areas/topics data/agent-memory/resources data/agent-memory/archives
touch data/agent-memory/projects/.gitkeep data/agent-memory/areas/.gitkeep data/agent-memory/resources/.gitkeep data/agent-memory/archives/.gitkeep
```

- [ ] **Step 2: `.gitignore` ergaenzen**

Am Ende anhaengen:

```
# Agent-Memory transient run-logs (Phase 2+, auto-purge nach 30 Tagen)
/data/agent-memory/_runs/
```

- [ ] **Step 3: `.env.example` Hinweis**

Am Ende anhaengen:

```
# Agent-Memory-Verzeichnis (Phase 2+). Default: ./data/agent-memory
# In Coolify als Volume mounten, damit Memory persistent ist.
# AGENT_MEMORY_DIR=/data/agent-memory
```

- [ ] **Step 4: Commit**

```bash
git add data/agent-memory/projects/.gitkeep data/agent-memory/areas/.gitkeep data/agent-memory/resources/.gitkeep data/agent-memory/archives/.gitkeep .gitignore .env.example
git commit -m "chore(agents): PARA-Verzeichnis + AGENT_MEMORY_DIR ENV-Hinweis"
```

---

### Task 3: `memory/paths.ts` (TDD)

**Files:**
- Create: `src/lib/services/agents/memory/paths.ts`
- Test: `src/__tests__/unit/services/agents/memory/paths.test.ts`

- [ ] **Step 1: Failing Test**

`src/__tests__/unit/services/agents/memory/paths.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('Memory Paths', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
  })

  it('getMemoryRoot nutzt AGENT_MEMORY_DIR wenn gesetzt', async () => {
    vi.stubEnv('AGENT_MEMORY_DIR', '/custom/memory')
    const { getMemoryRoot } = await import('@/lib/services/agents/memory/paths')
    expect(getMemoryRoot()).toBe('/custom/memory')
  })

  it('getMemoryRoot faellt zurueck auf data/agent-memory', async () => {
    vi.stubEnv('AGENT_MEMORY_DIR', '')
    const { getMemoryRoot } = await import('@/lib/services/agents/memory/paths')
    expect(getMemoryRoot()).toMatch(/data[\/\\]agent-memory$/)
  })

  it('scopeToFilePath baut korrekten Pfad', async () => {
    vi.stubEnv('AGENT_MEMORY_DIR', '/m')
    const { scopeToFilePath } = await import('@/lib/services/agents/memory/paths')
    expect(scopeToFilePath('projects/acme', 'summary.md')).toBe('/m/projects/acme/summary.md')
    expect(scopeToFilePath('areas/people/john', 'items.yaml')).toBe('/m/areas/people/john/items.yaml')
  })

  it('parseScope erkennt para aus scope', async () => {
    const { parseScope } = await import('@/lib/services/agents/memory/paths')
    expect(parseScope('projects/acme')).toEqual({ para: 'projects', remainder: 'acme' })
    expect(parseScope('areas/people/john')).toEqual({ para: 'areas', remainder: 'people/john' })
  })

  it('parseScope wirft bei unbekanntem PARA-Prefix', async () => {
    const { parseScope } = await import('@/lib/services/agents/memory/paths')
    expect(() => parseScope('unknown/foo')).toThrow(/Unbekannte PARA-Kategorie/)
  })

  it('isPathInsideMemoryRoot blockt path-traversal', async () => {
    vi.stubEnv('AGENT_MEMORY_DIR', '/m')
    const { isPathInsideMemoryRoot } = await import('@/lib/services/agents/memory/paths')
    expect(isPathInsideMemoryRoot('/m/projects/acme/summary.md')).toBe(true)
    expect(isPathInsideMemoryRoot('/etc/passwd')).toBe(false)
  })
})
```

- [ ] **Step 2: Test failt**

```bash
npm run test:unit -- src/__tests__/unit/services/agents/memory/paths.test.ts
```

- [ ] **Step 3: Implementation**

`src/lib/services/agents/memory/paths.ts`:

```ts
/**
 * Memory-Paths — Pfad-Konstanten und Helpers fuer das PARA-Markdown-Layout.
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §4.1
 */

import path from 'node:path'

const PARA_FOLDERS = ['projects', 'areas', 'resources', 'archives'] as const
export type ParaFolder = typeof PARA_FOLDERS[number]

export function getMemoryRoot(): string {
  const env = process.env.AGENT_MEMORY_DIR
  if (env && env.trim().length > 0) return env
  return path.resolve(process.cwd(), 'data', 'agent-memory')
}

export function scopeToDir(scope: string): string {
  return path.join(getMemoryRoot(), scope)
}

export function scopeToFilePath(scope: string, filename: 'summary.md' | 'items.yaml'): string {
  return path.join(scopeToDir(scope), filename)
}

export function parseScope(scope: string): { para: ParaFolder; remainder: string } {
  const normalized = scope.replace(/\\/g, '/')
  const slash = normalized.indexOf('/')
  if (slash < 0) {
    if ((PARA_FOLDERS as readonly string[]).includes(normalized)) {
      return { para: normalized as ParaFolder, remainder: '' }
    }
    throw new Error(`Unbekannte PARA-Kategorie in scope='${scope}'`)
  }
  const para = normalized.slice(0, slash)
  if (!(PARA_FOLDERS as readonly string[]).includes(para)) {
    throw new Error(`Unbekannte PARA-Kategorie in scope='${scope}'`)
  }
  return { para: para as ParaFolder, remainder: normalized.slice(slash + 1) }
}

export function isPathInsideMemoryRoot(absolutePath: string): boolean {
  const root = path.resolve(getMemoryRoot())
  const target = path.resolve(absolutePath)
  const rel = path.relative(root, target)
  return !rel.startsWith('..') && !path.isAbsolute(rel)
}

export const PARA_FOLDER_LIST = PARA_FOLDERS
```

- [ ] **Step 4: Tests gruen**

```bash
npm run test:unit -- src/__tests__/unit/services/agents/memory/paths.test.ts
```

Erwartet: 6/6 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/agents/memory/paths.ts src/__tests__/unit/services/agents/memory/paths.test.ts
git commit -m "feat(agents): memory/paths.ts mit PARA-Helper und Path-Traversal-Guard"
```

---

### Task 4: `memory/hash.ts` (TDD)

**Files:**
- Create: `src/lib/services/agents/memory/hash.ts`
- Test: `src/__tests__/unit/services/agents/memory/hash.test.ts`

- [ ] **Step 1: Failing Test**

`src/__tests__/unit/services/agents/memory/hash.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { computeContentHash } from '@/lib/services/agents/memory/hash'

describe('Memory Hash', () => {
  it('liefert deterministischen SHA-256 hex-string laenge 64', () => {
    const h = computeContentHash('hello')
    expect(h).toHaveLength(64)
    expect(h).toMatch(/^[0-9a-f]+$/)
  })
  it('gleicher Input -> gleicher Hash', () => {
    expect(computeContentHash('foo')).toBe(computeContentHash('foo'))
  })
  it('unterschiedlicher Input -> unterschiedliche Hashes', () => {
    expect(computeContentHash('foo')).not.toBe(computeContentHash('bar'))
  })
  it('normalisiert Line-Endings (CRLF == LF)', () => {
    expect(computeContentHash('a\r\nb')).toBe(computeContentHash('a\nb'))
  })
})
```

- [ ] **Step 2: Test failt**

```bash
npm run test:unit -- src/__tests__/unit/services/agents/memory/hash.test.ts
```

- [ ] **Step 3: Implementation**

`src/lib/services/agents/memory/hash.ts`:

```ts
/**
 * Memory Content-Hash — SHA-256 mit normalisierten Line-Endings.
 * Wird fuer Change-Detection im Re-Index-Pfad genutzt.
 */

import { createHash } from 'node:crypto'

export function computeContentHash(content: string): string {
  const normalized = content.replace(/\r\n/g, '\n')
  return createHash('sha256').update(normalized, 'utf8').digest('hex')
}
```

- [ ] **Step 4: Tests gruen**

```bash
npm run test:unit -- src/__tests__/unit/services/agents/memory/hash.test.ts
```

Erwartet: 4/4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/agents/memory/hash.ts src/__tests__/unit/services/agents/memory/hash.test.ts
git commit -m "feat(agents): memory/hash.ts mit normalisiertem SHA-256"
```

---

### Task 5: `memory/frontmatter.ts` (TDD)

**Files:**
- Create: `src/lib/services/agents/memory/frontmatter.ts`
- Test: `src/__tests__/unit/services/agents/memory/frontmatter.test.ts`

- [ ] **Step 1: Failing Test**

`src/__tests__/unit/services/agents/memory/frontmatter.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { parseFrontmatter, stringifyFrontmatter } from '@/lib/services/agents/memory/frontmatter'

const SAMPLE = `---
id: 11111111-1111-1111-1111-111111111111
title: "Test"
para: projects
scope: projects/test
tags: [foo, bar]
status: active
---
# Test
Body hier.`

describe('Memory Frontmatter', () => {
  it('parst gueltige Frontmatter und Body', () => {
    const r = parseFrontmatter(SAMPLE)
    expect(r.frontmatter.id).toBe('11111111-1111-1111-1111-111111111111')
    expect(r.frontmatter.title).toBe('Test')
    expect(r.frontmatter.para).toBe('projects')
    expect(r.frontmatter.tags).toEqual(['foo', 'bar'])
    expect(r.frontmatter.status).toBe('active')
    expect(r.body.trim()).toBe('# Test\nBody hier.')
  })
  it('wirft bei fehlender id', () => {
    const broken = SAMPLE.replace(/^id: .*\n/m, '')
    expect(() => parseFrontmatter(broken)).toThrow(/id/)
  })
  it('wirft bei unbekanntem PARA', () => {
    const broken = SAMPLE.replace('para: projects', 'para: invalid')
    expect(() => parseFrontmatter(broken)).toThrow(/para/)
  })
  it('wirft bei unbekanntem status', () => {
    const broken = SAMPLE.replace('status: active', 'status: weird')
    expect(() => parseFrontmatter(broken)).toThrow(/status/)
  })
  it('stringifyFrontmatter Round-Trip', () => {
    const r = parseFrontmatter(SAMPLE)
    const out = stringifyFrontmatter(r.frontmatter, r.body)
    const round = parseFrontmatter(out)
    expect(round.frontmatter).toEqual(r.frontmatter)
  })
  it('default tags wenn Feld fehlt', () => {
    const noTags = SAMPLE.replace('tags: [foo, bar]\n', '')
    const r = parseFrontmatter(noTags)
    expect(r.frontmatter.tags).toEqual([])
  })
})
```

- [ ] **Step 2: Test failt**

```bash
npm run test:unit -- src/__tests__/unit/services/agents/memory/frontmatter.test.ts
```

- [ ] **Step 3: Implementation**

`src/lib/services/agents/memory/frontmatter.ts`:

```ts
/**
 * Memory Frontmatter — gray-matter Wrapper mit Zod-Validation.
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §4.2
 */

import matter from 'gray-matter'
import { z } from 'zod'
import type { ParaFolder } from './paths'

const PARA_VALUES = ['projects', 'areas', 'resources', 'archives'] as const
const STATUS_VALUES = ['active', 'superseded', 'archived'] as const

export const FrontmatterSchema = z.object({
  id: z.string().uuid(),
  title: z.string().optional(),
  para: z.enum(PARA_VALUES),
  scope: z.string().min(1),
  tags: z.array(z.string()).default([]),
  created: z.string().optional(),
  updated: z.string().optional(),
  status: z.enum(STATUS_VALUES).default('active'),
  sourceRunId: z.string().uuid().optional(),
  sourceStepId: z.string().uuid().optional(),
})

export type Frontmatter = z.infer<typeof FrontmatterSchema>

export function parseFrontmatter(raw: string): { frontmatter: Frontmatter; body: string } {
  const parsed = matter(raw)
  const result = FrontmatterSchema.safeParse(parsed.data)
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    throw new Error(`Frontmatter ungueltig: ${issues}`)
  }
  return { frontmatter: result.data, body: parsed.content }
}

export function stringifyFrontmatter(fm: Frontmatter, body: string): string {
  return matter.stringify(body, fm as Record<string, unknown>)
}

export function buildFrontmatter(input: {
  id: string
  title?: string
  para: ParaFolder
  scope: string
  tags?: string[]
  sourceRunId?: string
  sourceStepId?: string
  status?: typeof STATUS_VALUES[number]
}): Frontmatter {
  const now = new Date().toISOString().slice(0, 10)
  return FrontmatterSchema.parse({
    id: input.id,
    title: input.title,
    para: input.para,
    scope: input.scope,
    tags: input.tags ?? [],
    created: now,
    updated: now,
    status: input.status ?? 'active',
    sourceRunId: input.sourceRunId,
    sourceStepId: input.sourceStepId,
  })
}
```

- [ ] **Step 4: Tests gruen**

```bash
npm run test:unit -- src/__tests__/unit/services/agents/memory/frontmatter.test.ts
```

Erwartet: 6/6 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/agents/memory/frontmatter.ts src/__tests__/unit/services/agents/memory/frontmatter.test.ts
git commit -m "feat(agents): memory/frontmatter.ts mit Zod-Schema"
```

---

### Task 6: `memory/items.ts` (TDD)

**Files:**
- Create: `src/lib/services/agents/memory/items.ts`
- Test: `src/__tests__/unit/services/agents/memory/items.test.ts`

- [ ] **Step 1: Failing Test**

`src/__tests__/unit/services/agents/memory/items.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  parseItems, stringifyItems, supersedeItem, appendItem,
} from '@/lib/services/agents/memory/items'

const SAMPLE = `- id: f-001
  fact: "Lisa Weber ist CMO"
  source: "agent_run_abc step research"
  status: active
  recordedAt: 2026-05-08
  confidence: 0.9
- id: f-002
  fact: "Tom Schmidt ist CEO"
  source: "user_input"
  status: superseded
  supersededBy: f-003
  supersededAt: 2026-05-09
- id: f-003
  fact: "Max Mueller ist CEO"
  source: "agent_run_def"
  status: active
  recordedAt: 2026-05-09
`

describe('Memory Items', () => {
  it('parseItems liest 3 Eintraege', () => {
    const items = parseItems(SAMPLE)
    expect(items).toHaveLength(3)
    expect(items[1].status).toBe('superseded')
    expect(items[1].supersededBy).toBe('f-003')
  })
  it('stringifyItems Round-Trip', () => {
    const items = parseItems(SAMPLE)
    const round = parseItems(stringifyItems(items))
    expect(round).toEqual(items)
  })
  it('appendItem fuegt mit auto-id hinzu', () => {
    const items = parseItems(SAMPLE)
    const next = appendItem(items, { fact: 'Neuer Fakt', source: 'agent_run_xyz' })
    expect(next).toHaveLength(4)
    expect(next[3].id).toMatch(/^f-\d{3}$/)
    expect(next[3].status).toBe('active')
  })
  it('supersedeItem markiert alt + erstellt neu', () => {
    const items = parseItems(SAMPLE)
    const next = supersedeItem(items, 'f-001', { fact: 'Lisa Weber wurde COO', source: 'manual' })
    const oldOne = next.find((i) => i.id === 'f-001')!
    expect(oldOne.status).toBe('superseded')
    const newOne = next.find((i) => i.id === oldOne.supersededBy)!
    expect(newOne.status).toBe('active')
    expect(newOne.fact).toBe('Lisa Weber wurde COO')
  })
  it('supersedeItem wirft bei unbekannter id', () => {
    const items = parseItems(SAMPLE)
    expect(() => supersedeItem(items, 'f-999', { fact: 'x', source: 'y' })).toThrow(/nicht gefunden/)
  })
  it('parseItems liefert leeres Array bei leerem Input', () => {
    expect(parseItems('')).toEqual([])
    expect(parseItems('\n')).toEqual([])
  })
})
```

- [ ] **Step 2: Test failt**

```bash
npm run test:unit -- src/__tests__/unit/services/agents/memory/items.test.ts
```

- [ ] **Step 3: Implementation**

`src/lib/services/agents/memory/items.ts`:

```ts
/**
 * Memory Items — items.yaml Manipulation. Never-delete + supersede-Pattern.
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §4.3
 */

import yaml from 'js-yaml'
import { z } from 'zod'

const STATUS_VALUES = ['active', 'superseded', 'archived'] as const

const ItemSchema = z.object({
  id: z.string().regex(/^f-\d{3,}$/, 'item id muss Format f-NNN haben'),
  fact: z.string().min(1),
  source: z.string().min(1),
  status: z.enum(STATUS_VALUES).default('active'),
  recordedAt: z.string().optional(),
  confidence: z.number().optional(),
  supersededBy: z.string().regex(/^f-\d{3,}$/).optional(),
  supersededAt: z.string().optional(),
})

export type MemoryItem = z.infer<typeof ItemSchema>

export interface AppendItemInput {
  fact: string
  source: string
  confidence?: number
}

export function parseItems(yamlText: string): MemoryItem[] {
  const trimmed = yamlText.trim()
  if (!trimmed) return []
  const data = yaml.load(trimmed)
  if (!Array.isArray(data)) {
    throw new Error('items.yaml: erwartet ein Array von Items')
  }
  return data.map((row, idx) => {
    const r = ItemSchema.safeParse(row)
    if (!r.success) {
      const issues = r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
      throw new Error(`items.yaml[${idx}] ungueltig: ${issues}`)
    }
    return r.data
  })
}

export function stringifyItems(items: MemoryItem[]): string {
  return yaml.dump(items, { lineWidth: 200, noRefs: true })
}

function nextItemId(items: MemoryItem[]): string {
  const max = items.reduce((acc, it) => {
    const m = /^f-(\d+)$/.exec(it.id)
    if (!m) return acc
    return Math.max(acc, Number(m[1]))
  }, 0)
  return `f-${String(max + 1).padStart(3, '0')}`
}

export function appendItem(items: MemoryItem[], input: AppendItemInput): MemoryItem[] {
  const today = new Date().toISOString().slice(0, 10)
  return [...items, {
    id: nextItemId(items),
    fact: input.fact,
    source: input.source,
    status: 'active',
    recordedAt: today,
    confidence: input.confidence,
  }]
}

export function supersedeItem(
  items: MemoryItem[],
  itemId: string,
  replacement: AppendItemInput,
): MemoryItem[] {
  const idx = items.findIndex((i) => i.id === itemId)
  if (idx < 0) throw new Error(`Item ${itemId} nicht gefunden`)
  const today = new Date().toISOString().slice(0, 10)
  const newId = nextItemId(items)
  const updatedOld: MemoryItem = {
    ...items[idx],
    status: 'superseded',
    supersededBy: newId,
    supersededAt: today,
  }
  const newItem: MemoryItem = {
    id: newId,
    fact: replacement.fact,
    source: replacement.source,
    status: 'active',
    recordedAt: today,
    confidence: replacement.confidence,
  }
  return [...items.slice(0, idx), updatedOld, ...items.slice(idx + 1), newItem]
}
```

- [ ] **Step 4: Tests gruen**

```bash
npm run test:unit -- src/__tests__/unit/services/agents/memory/items.test.ts
```

Erwartet: 6/6 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/agents/memory/items.ts src/__tests__/unit/services/agents/memory/items.test.ts
git commit -m "feat(agents): memory/items.ts mit append/supersede-Pattern"
```

---

### Task 7: `memory/embedding.ts` (TDD mit fetch-Mock)

**Files:**
- Create: `src/lib/services/agents/memory/embedding.ts`
- Test: `src/__tests__/unit/services/agents/memory/embedding.test.ts`

- [ ] **Step 1: Failing Test**

`src/__tests__/unit/services/agents/memory/embedding.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('Memory Embedding', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    vi.stubEnv('GOOGLE_AI_API_KEY', 'test-key')
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.unstubAllEnvs()
  })

  it('embedText liefert 768d Vector', async () => {
    const mockVector = Array.from({ length: 768 }, (_, i) => i / 768)
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ embedding: { values: mockVector } }),
    }) as unknown as typeof fetch

    const { embedText } = await import('@/lib/services/agents/memory/embedding')
    const r = await embedText('hello world')
    expect(r).toHaveLength(768)
    expect(global.fetch).toHaveBeenCalledTimes(1)
    const callArgs = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(String(callArgs[0])).toContain('text-embedding-004')
  })

  it('embedText wirft bei nicht-OK-Response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false, status: 500, text: async () => 'Internal Error',
    }) as unknown as typeof fetch
    const { embedText } = await import('@/lib/services/agents/memory/embedding')
    await expect(embedText('x')).rejects.toThrow(/Embedding-Request fehlgeschlagen/)
  })

  it('embedText wirft bei fehlender API-Key', async () => {
    vi.stubEnv('GOOGLE_AI_API_KEY', '')
    const { embedText } = await import('@/lib/services/agents/memory/embedding')
    await expect(embedText('x')).rejects.toThrow(/GOOGLE_AI_API_KEY/)
  })

  it('embedText wirft bei Vector-Dimension != 768', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ embedding: { values: [1, 2, 3] } }),
    }) as unknown as typeof fetch
    const { embedText } = await import('@/lib/services/agents/memory/embedding')
    await expect(embedText('x')).rejects.toThrow(/Dimension/)
  })
})
```

- [ ] **Step 2: Test failt**

```bash
npm run test:unit -- src/__tests__/unit/services/agents/memory/embedding.test.ts
```

- [ ] **Step 3: Implementation**

`src/lib/services/agents/memory/embedding.ts`:

```ts
/**
 * Memory Embedding — Gemini text-embedding-004 (768 Dimensionen).
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §4.4
 */

const GEMINI_EMBED_URL = 'https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent'
const EXPECTED_DIM = 768

export async function embedText(text: string): Promise<number[]> {
  const apiKey = process.env.GOOGLE_AI_API_KEY
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error('GOOGLE_AI_API_KEY nicht konfiguriert')
  }
  const url = `${GEMINI_EMBED_URL}?key=${apiKey}`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'models/text-embedding-004',
      content: { parts: [{ text }] },
    }),
  })
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`Embedding-Request fehlgeschlagen: ${response.status} ${detail}`)
  }
  const json = (await response.json()) as { embedding?: { values?: number[] } }
  const values = json.embedding?.values
  if (!values || !Array.isArray(values)) {
    throw new Error('Embedding-Response: values fehlen')
  }
  if (values.length !== EXPECTED_DIM) {
    throw new Error(`Embedding-Dimension ${values.length} != erwartete ${EXPECTED_DIM}`)
  }
  return values
}

export const EMBEDDING_DIMENSION = EXPECTED_DIM
```

- [ ] **Step 4: Tests gruen**

```bash
npm run test:unit -- src/__tests__/unit/services/agents/memory/embedding.test.ts
```

Erwartet: 4/4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/agents/memory/embedding.ts src/__tests__/unit/services/agents/memory/embedding.test.ts
git commit -m "feat(agents): memory/embedding.ts mit Gemini text-embedding-004"
```

---

### Task 8: `MemoryService.list`

**Files:** `src/lib/services/agents/memory.service.ts`

- [ ] **Step 1: list-Methode echte Implementation**

Ersetze die `list`-Methode (vorher Throw):

```ts
  async list(
    para: 'projects' | 'areas' | 'resources' | 'archives',
    limit = 20,
  ): Promise<Array<Pick<AgentMemoryEntry, 'id' | 'scope' | 'title' | 'summary'>>> {
    const { db } = await import('@/lib/db')
    const { agentMemoryEntries } = await import('@/lib/db/schema')
    const { and, eq, desc } = await import('drizzle-orm')
    return db
      .select({
        id: agentMemoryEntries.id,
        scope: agentMemoryEntries.scope,
        title: agentMemoryEntries.title,
        summary: agentMemoryEntries.summary,
      })
      .from(agentMemoryEntries)
      .where(and(
        eq(agentMemoryEntries.para, para),
        eq(agentMemoryEntries.status, 'active'),
      ))
      .orderBy(desc(agentMemoryEntries.updatedAt))
      .limit(limit)
  },
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/services/agents/memory.service.ts
git commit -m "feat(agents): MemoryService.list (PARA-Tree-Query)"
```

---

### Task 9: `MemoryService.read`

**Files:** `src/lib/services/agents/memory.service.ts`

- [ ] **Step 1: read-Methode**

Ersetze die `read`-Methode:

```ts
  async read(idOrPath: string): Promise<MemoryReadResult> {
    const fs = await import('node:fs/promises')
    const { db } = await import('@/lib/db')
    const { agentMemoryEntries } = await import('@/lib/db/schema')
    const { eq } = await import('drizzle-orm')
    const { scopeToFilePath, isPathInsideMemoryRoot } = await import('./memory/paths')
    const { parseFrontmatter } = await import('./memory/frontmatter')
    const { parseItems } = await import('./memory/items')

    let scope: string
    let id: string | null = null
    let title: string | null = null

    if (idOrPath.startsWith('memory://')) {
      scope = idOrPath.slice('memory://'.length).split('#')[0]
    } else if (/^[0-9a-f-]{36}$/i.test(idOrPath)) {
      const [row] = await db
        .select({
          id: agentMemoryEntries.id,
          scope: agentMemoryEntries.scope,
          title: agentMemoryEntries.title,
        })
        .from(agentMemoryEntries)
        .where(eq(agentMemoryEntries.id, idOrPath))
        .limit(1)
      if (!row) throw new Error(`Memory-Entry ${idOrPath} nicht gefunden`)
      scope = row.scope
      id = row.id
      title = row.title
    } else {
      scope = idOrPath
    }

    const summaryPath = scopeToFilePath(scope, 'summary.md')
    if (!isPathInsideMemoryRoot(summaryPath)) {
      throw new Error('Pfad ausserhalb Memory-Root verboten')
    }
    const itemsPath = scopeToFilePath(scope, 'items.yaml')

    let summaryRaw: string
    try {
      summaryRaw = await fs.readFile(summaryPath, 'utf8')
    } catch {
      throw new Error(`summary.md fuer scope='${scope}' nicht gefunden`)
    }
    const { frontmatter, body } = parseFrontmatter(summaryRaw)
    if (!id) id = frontmatter.id
    if (!title) title = frontmatter.title ?? null

    let items: Array<{ id: string; fact: string; status: string; source: string }> = []
    try {
      const itemsRaw = await fs.readFile(itemsPath, 'utf8')
      items = parseItems(itemsRaw).map((it) => ({
        id: it.id, fact: it.fact, status: it.status, source: it.source,
      }))
    } catch {
      // items.yaml ist optional
    }

    return { id, title, body, items }
  },
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/services/agents/memory.service.ts
git commit -m "feat(agents): MemoryService.read (Disk + Frontmatter + items.yaml)"
```

---

### Task 10: `MemoryService.write`

**Files:** `src/lib/services/agents/memory.service.ts`

- [ ] **Step 1: write-Methode**

Ersetze die `write`-Methode:

```ts
  async write(
    scope: string,
    body: string,
    items?: MemoryFact[],
  ): Promise<{ id: string; path: string }> {
    const fs = await import('node:fs/promises')
    const { randomUUID } = await import('node:crypto')
    const { db } = await import('@/lib/db')
    const { agentMemoryEntries } = await import('@/lib/db/schema')
    const { sql } = await import('drizzle-orm')
    const { scopeToDir, scopeToFilePath, parseScope, isPathInsideMemoryRoot } = await import('./memory/paths')
    const { buildFrontmatter, parseFrontmatter, stringifyFrontmatter } = await import('./memory/frontmatter')
    const { computeContentHash } = await import('./memory/hash')
    const { parseItems, stringifyItems, appendItem } = await import('./memory/items')
    const { embedText, EMBEDDING_DIMENSION } = await import('./memory/embedding')

    const { para } = parseScope(scope)
    const dir = scopeToDir(scope)
    const summaryPath = scopeToFilePath(scope, 'summary.md')
    if (!isPathInsideMemoryRoot(summaryPath)) {
      throw new Error('Pfad ausserhalb Memory-Root verboten')
    }
    await fs.mkdir(dir, { recursive: true })

    let id: string
    let frontmatter: ReturnType<typeof buildFrontmatter>
    try {
      const existing = await fs.readFile(summaryPath, 'utf8')
      const parsed = parseFrontmatter(existing)
      id = parsed.frontmatter.id
      frontmatter = {
        ...parsed.frontmatter,
        updated: new Date().toISOString().slice(0, 10),
      }
    } catch {
      id = randomUUID()
      frontmatter = buildFrontmatter({ id, para, scope })
    }
    const newSummary = stringifyFrontmatter(frontmatter, body)
    const tmpPath = `${summaryPath}.tmp`
    await fs.writeFile(tmpPath, newSummary, 'utf8')
    await fs.rename(tmpPath, summaryPath)

    if (items && items.length > 0) {
      const itemsPath = scopeToFilePath(scope, 'items.yaml')
      let existingItems: ReturnType<typeof parseItems> = []
      try {
        existingItems = parseItems(await fs.readFile(itemsPath, 'utf8'))
      } catch {
        // file existiert noch nicht
      }
      let next = existingItems
      for (const f of items) {
        next = appendItem(next, { fact: f.fact, source: f.source, confidence: f.confidence })
      }
      const tmpItems = `${itemsPath}.tmp`
      await fs.writeFile(tmpItems, stringifyItems(next), 'utf8')
      await fs.rename(tmpItems, itemsPath)
    }

    const contentHash = computeContentHash(newSummary)
    let embedding: number[] | null = null
    try {
      embedding = await embedText(`${frontmatter.title ?? ''}\n\n${body}`.slice(0, 4000))
    } catch {
      // Embedding-Failure non-fatal
    }
    const summary = body.split('\n').slice(0, 6).join(' ').trim().slice(0, 500)

    await db
      .insert(agentMemoryEntries)
      .values({
        id,
        para,
        scope,
        filePath: summaryPath,
        title: frontmatter.title ?? null,
        summary,
        tags: frontmatter.tags ?? [],
        contentHash,
        contentTrgm: `${frontmatter.title ?? ''} ${body}`.slice(0, 8000),
        embedding: embedding && embedding.length === EMBEDDING_DIMENSION ? embedding : null,
        status: 'active',
      })
      .onConflictDoUpdate({
        target: agentMemoryEntries.id,
        set: {
          scope,
          filePath: summaryPath,
          title: frontmatter.title ?? null,
          summary,
          tags: frontmatter.tags ?? [],
          contentHash,
          contentTrgm: `${frontmatter.title ?? ''} ${body}`.slice(0, 8000),
          embedding: embedding && embedding.length === EMBEDDING_DIMENSION ? embedding : null,
          updatedAt: sql`now()`,
        },
      })

    return { id, path: summaryPath }
  },
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/services/agents/memory.service.ts
git commit -m "feat(agents): MemoryService.write (atomic File + Embedding + DB-Upsert)"
```

---

### Task 11: `MemoryService.search` (Hybrid via Drizzle-DSL)

**Files:** `src/lib/services/agents/memory.service.ts`, `src/__tests__/unit/services/agents/skeleton-imports.test.ts`

- [ ] **Step 1: search-Methode**

Ersetze die `search`-Methode mit folgender Drizzle-DSL-Implementation (raw SQL nur in `sql` template literals, ueber den normalen `.select()`-Builder):

```ts
  async search(query: string, scope?: string, limit = 5): Promise<MemorySearchHit[]> {
    const { db } = await import('@/lib/db')
    const { agentMemoryEntries } = await import('@/lib/db/schema')
    const { and, eq, like, sql, desc } = await import('drizzle-orm')
    const { embedText } = await import('./memory/embedding')

    let queryEmbedding: number[] | null = null
    try {
      queryEmbedding = await embedText(query)
    } catch {
      // Falls Embedding nicht verfuegbar -> reine BM25-Suche
    }

    const baseFilter = and(
      eq(agentMemoryEntries.status, 'active'),
      ...(scope ? [like(agentMemoryEntries.scope, `${scope}%`)] : []),
    )

    if (queryEmbedding) {
      const vectorLiteral = `[${queryEmbedding.join(',')}]`
      const vecScoreExpr = sql<number>`(1 - (${agentMemoryEntries.embedding} <=> ${vectorLiteral}::vector))`
      const bm25ScoreExpr = sql<number>`GREATEST(
        similarity(coalesce(${agentMemoryEntries.title}, ''), ${query}),
        similarity(coalesce(${agentMemoryEntries.contentTrgm}, ''), ${query})
      )`
      const combinedExpr = sql`0.5 * (1 - (${agentMemoryEntries.embedding} <=> ${vectorLiteral}::vector)) + 0.5 * GREATEST(
        similarity(coalesce(${agentMemoryEntries.title}, ''), ${query}),
        similarity(coalesce(${agentMemoryEntries.contentTrgm}, ''), ${query})
      )`
      const rows = await db
        .select({
          id: agentMemoryEntries.id,
          scope: agentMemoryEntries.scope,
          title: agentMemoryEntries.title,
          summary: agentMemoryEntries.summary,
          vecScore: vecScoreExpr,
          bm25Score: bm25ScoreExpr,
          snippet: sql<string>`left(coalesce(${agentMemoryEntries.contentTrgm}, ''), 240)`,
        })
        .from(agentMemoryEntries)
        .where(and(baseFilter, sql`${agentMemoryEntries.embedding} IS NOT NULL`))
        .orderBy(desc(combinedExpr))
        .limit(limit)

      return rows.map((r) => ({
        id: r.id,
        scope: r.scope,
        title: r.title,
        summary: r.summary,
        snippet: r.snippet,
        score: 0.5 * Number(r.vecScore) + 0.5 * Number(r.bm25Score),
      }))
    }

    const bm25Expr = sql<number>`similarity(coalesce(${agentMemoryEntries.contentTrgm}, ''), ${query})`
    const fallback = await db
      .select({
        id: agentMemoryEntries.id,
        scope: agentMemoryEntries.scope,
        title: agentMemoryEntries.title,
        summary: agentMemoryEntries.summary,
        bm25Score: bm25Expr,
        snippet: sql<string>`left(coalesce(${agentMemoryEntries.contentTrgm}, ''), 240)`,
      })
      .from(agentMemoryEntries)
      .where(baseFilter)
      .orderBy(desc(bm25Expr))
      .limit(limit)

    return fallback.map((r) => ({
      id: r.id,
      scope: r.scope,
      title: r.title,
      summary: r.summary,
      snippet: r.snippet,
      score: Number(r.bm25Score),
    }))
  },
```

- [ ] **Step 2: Skeleton-Test fuer `search` entfernen**

In `src/__tests__/unit/services/agents/skeleton-imports.test.ts` den Test entfernen:

```ts
  it('MemoryService.search wirft "nicht implementiert"', async () => {
    await expect(MemoryService.search('foo')).rejects.toThrow(/nicht implementiert/)
  })
```

- [ ] **Step 3: Typecheck + Smoke-Test re-run**

```bash
npm run typecheck
npm run test:unit -- src/__tests__/unit/services/agents/skeleton-imports.test.ts
```

Erwartet: 9/9 passed (10 - 1 entfernter Test).

- [ ] **Step 4: Commit**

```bash
git add src/lib/services/agents/memory.service.ts src/__tests__/unit/services/agents/skeleton-imports.test.ts
git commit -m "feat(agents): MemoryService.search (Hybrid BM25 + Vector via Drizzle-DSL)"
```

---

### Task 12: `MemoryService.supersede`

**Files:** `src/lib/services/agents/memory.service.ts`

- [ ] **Step 1: supersede-Methode**

Ersetze die `supersede`-Methode:

```ts
  async supersede(itemId: string, newFact: string, source: string): Promise<void> {
    const fs = await import('node:fs/promises')
    const { db } = await import('@/lib/db')
    const { agentMemoryEntries } = await import('@/lib/db/schema')
    const { eq } = await import('drizzle-orm')
    const { scopeToFilePath } = await import('./memory/paths')
    const { parseItems, stringifyItems, supersedeItem: supersedeItemPure } = await import('./memory/items')

    // Brute-Force-Suche ueber alle aktiven Entries (bei <10k Eintraegen akzeptabel).
    const rows = await db
      .select({ scope: agentMemoryEntries.scope })
      .from(agentMemoryEntries)
      .where(eq(agentMemoryEntries.status, 'active'))

    for (const { scope } of rows) {
      const itemsPath = scopeToFilePath(scope, 'items.yaml')
      try {
        const raw = await fs.readFile(itemsPath, 'utf8')
        const items = parseItems(raw)
        if (items.some((i) => i.id === itemId)) {
          const next = supersedeItemPure(items, itemId, { fact: newFact, source })
          const tmp = `${itemsPath}.tmp`
          await fs.writeFile(tmp, stringifyItems(next), 'utf8')
          await fs.rename(tmp, itemsPath)
          return
        }
      } catch {
        continue
      }
    }
    throw new Error(`Item ${itemId} in keinem aktiven Memory-Entry gefunden`)
  },
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/services/agents/memory.service.ts
git commit -m "feat(agents): MemoryService.supersede (items.yaml-Update)"
```

---

### Task 13: `MemoryService.expandRefs` + `compactRunHistory`

**Files:** `src/lib/services/agents/memory.service.ts`

- [ ] **Step 1: Implementation**

Ersetze beide Methoden:

```ts
  async expandRefs(refs: MemoryRef[]): Promise<Array<{ ref: MemoryRef; title: string | null; body: string }>> {
    const out: Array<{ ref: MemoryRef; title: string | null; body: string }> = []
    for (const ref of refs) {
      try {
        const r = await this.read(ref)
        out.push({ ref, title: r.title, body: r.body })
      } catch {
        out.push({ ref, title: null, body: '' })
      }
    }
    return out
  },

  async compactRunHistory(runId: string, keepLast = 5): Promise<string> {
    const { db } = await import('@/lib/db')
    const { agentSteps } = await import('@/lib/db/schema')
    const { eq, desc } = await import('drizzle-orm')
    const rows = await db
      .select({
        stepKey: agentSteps.stepKey,
        workerType: agentSteps.workerType,
        status: agentSteps.status,
        resultSummary: agentSteps.resultSummary,
      })
      .from(agentSteps)
      .where(eq(agentSteps.runId, runId))
      .orderBy(desc(agentSteps.createdAt))
    if (rows.length === 0) return ''
    const recent = rows.slice(0, keepLast)
    const older = rows.slice(keepLast)
    const recentBlock = recent
      .map((r) => `- ${r.stepKey} [${r.workerType}] ${r.status}: ${r.resultSummary ?? ''}`)
      .join('\n')
    if (older.length === 0) return recentBlock
    const succeeded = older.filter((o) => o.status === 'succeeded').length
    const failed = older.filter((o) => o.status === 'failed').length
    return `... ${older.length} aeltere Steps zuvor (${succeeded} succeeded, ${failed} failed)\n${recentBlock}`
  },
```

- [ ] **Step 2: Typecheck + Smoke-Tests**

```bash
npm run typecheck
npm run test:unit -- src/__tests__/unit/services/agents/skeleton-imports.test.ts
```

Erwartet: 9/9.

- [ ] **Step 3: Commit**

```bash
git add src/lib/services/agents/memory.service.ts
git commit -m "feat(agents): MemoryService.expandRefs + compactRunHistory"
```

---

### Task 14: `memory/watcher.ts` (chokidar)

**Files:** `src/lib/services/agents/memory/watcher.ts`

- [ ] **Step 1: Implementation**

`src/lib/services/agents/memory/watcher.ts`:

```ts
/**
 * Memory File-Watcher — chokidar-basiert.
 * Erkennt externe Edits unter dem Memory-Root und triggert Re-Index via
 * MemoryService.write. Im Re-Index-Pfad sorgt der ContentHash-Check dafuer,
 * dass unveraenderte Files keinen Embedding-Call ausloesen.
 *
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §4.4
 */

import { logger } from '@/lib/utils/logger'
import { getMemoryRoot, isPathInsideMemoryRoot, parseScope } from './paths'
import { parseFrontmatter } from './frontmatter'
import { MemoryService } from '../memory.service'
import path from 'node:path'
import fs from 'node:fs/promises'

let activeWatcher: { close: () => Promise<void> } | null = null

export async function startMemoryWatcher(): Promise<void> {
  if (activeWatcher) return
  if (process.env.AGENT_MEMORY_WATCHER_DISABLED === '1') {
    logger.info('Memory-Watcher deaktiviert (AGENT_MEMORY_WATCHER_DISABLED=1)', { module: 'MemoryWatcher' })
    return
  }
  const root = getMemoryRoot()
  try {
    await fs.mkdir(root, { recursive: true })
  } catch {
    // ignore
  }
  const chokidar = await import('chokidar')
  const watcher = chokidar.watch(`${root}/**/summary.md`, {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 250, pollInterval: 100 },
    ignored: ['**/_runs/**', '**/.git/**', '**/*.tmp'],
  })

  const reindex = async (filePath: string) => {
    try {
      if (!isPathInsideMemoryRoot(filePath)) return
      const raw = await fs.readFile(filePath, 'utf8')
      const { frontmatter, body } = parseFrontmatter(raw)
      parseScope(frontmatter.scope) // validates
      await MemoryService.write(frontmatter.scope, body)
      logger.info(`Re-indexed: ${path.relative(root, filePath)}`, { module: 'MemoryWatcher' })
    } catch (e) {
      logger.warn(`Re-index Fehler fuer ${filePath}: ${(e as Error).message}`, { module: 'MemoryWatcher' })
    }
  }

  watcher.on('add', reindex)
  watcher.on('change', reindex)
  watcher.on('error', (err) => {
    logger.error('MemoryWatcher Error', err as Error, { module: 'MemoryWatcher' })
  })

  activeWatcher = { close: () => watcher.close() }
  logger.info(`MemoryWatcher gestartet auf ${root}`, { module: 'MemoryWatcher' })
}

export async function stopMemoryWatcher(): Promise<void> {
  if (!activeWatcher) return
  await activeWatcher.close()
  activeWatcher = null
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/services/agents/memory/watcher.ts
git commit -m "feat(agents): memory/watcher.ts mit chokidar Re-Index"
```

---

### Task 15: Boot-Hook in `instrumentation.ts`

**Files:** `src/instrumentation.ts`

- [ ] **Step 1: Aktuelle Datei lesen**

```bash
cat src/instrumentation.ts
```

- [ ] **Step 2: Watcher-Start ergaenzen**

In der `register`-Funktion, nach dem bestehenden DB-Migrations-Bootstrap (Ende der `if (process.env.NEXT_RUNTIME === 'nodejs')`-Branch):

```ts
    // Agent-Memory-Watcher (Phase 2): startet chokidar fuer externe Edits.
    if (process.env.NODE_ENV !== 'test') {
      try {
        const { startMemoryWatcher } = await import('@/lib/services/agents/memory/watcher')
        await startMemoryWatcher()
      } catch (e) {
        // Non-fatal — Memory-Suche funktioniert auch ohne Watcher
        // eslint-disable-next-line no-console
        console.warn('[instrumentation] MemoryWatcher konnte nicht gestartet werden:', (e as Error).message)
      }
    }
```

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 4: Commit**

```bash
git add src/instrumentation.ts
git commit -m "feat(agents): MemoryWatcher in Boot-Hook (instrumentation.ts)"
```

---

### Task 16: API-Routes

**Files:** `src/app/api/agents/memory/route.ts`, `search/route.ts`, `[id]/route.ts`

- [ ] **Step 1: List-Route**

`src/app/api/agents/memory/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { MemoryService } from '@/lib/services/agents'

export const dynamic = 'force-dynamic'

const PARA_VALUES = ['projects', 'areas', 'resources', 'archives'] as const
type Para = typeof PARA_VALUES[number]

export async function GET(request: NextRequest) {
  const para = request.nextUrl.searchParams.get('para') as Para | null
  const limitRaw = request.nextUrl.searchParams.get('limit')
  const limit = limitRaw ? Math.max(1, Math.min(200, Number(limitRaw))) : 50
  if (!para || !(PARA_VALUES as readonly string[]).includes(para)) {
    return NextResponse.json({ error: "para muss eines von 'projects'|'areas'|'resources'|'archives' sein" }, { status: 400 })
  }
  const items = await MemoryService.list(para, limit)
  return NextResponse.json({ items })
}
```

- [ ] **Step 2: Search-Route**

`src/app/api/agents/memory/search/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { MemoryService } from '@/lib/services/agents'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')
  const scope = request.nextUrl.searchParams.get('scope') ?? undefined
  const limitRaw = request.nextUrl.searchParams.get('limit')
  const limit = limitRaw ? Math.max(1, Math.min(50, Number(limitRaw))) : 10
  if (!q || q.trim().length < 2) {
    return NextResponse.json({ error: 'q (mind. 2 Zeichen) erforderlich' }, { status: 400 })
  }
  const hits = await MemoryService.search(q, scope, limit)
  return NextResponse.json({ hits })
}
```

- [ ] **Step 3: Detail-Route**

`src/app/api/agents/memory/[id]/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { MemoryService } from '@/lib/services/agents'

export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const result = await MemoryService.read(id)
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 404 })
  }
}
```

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/agents/memory/route.ts src/app/api/agents/memory/search/route.ts src/app/api/agents/memory/[id]/route.ts
git commit -m "feat(agents): API-Routes /api/agents/memory (list/search/read)"
```

---

### Task 17: UI Components

**Files:** `src/components/agents/memory/memory-tree.tsx`, `memory-search-bar.tsx`, `memory-entry-card.tsx`

- [ ] **Step 1: MemoryTree**

`src/components/agents/memory/memory-tree.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Folder, FolderOpen, FileText } from 'lucide-react'

const PARA: Array<{ key: 'projects' | 'areas' | 'resources' | 'archives'; label: string }> = [
  { key: 'projects', label: 'Projects' },
  { key: 'areas', label: 'Areas' },
  { key: 'resources', label: 'Resources' },
  { key: 'archives', label: 'Archives' },
]

interface Entry { id: string; scope: string; title: string | null; summary: string | null }

export function MemoryTree() {
  const [open, setOpen] = useState<Record<string, boolean>>({ projects: true })
  const [data, setData] = useState<Record<string, Entry[]>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})

  async function loadPara(para: string) {
    if (data[para]) return
    setLoading((p) => ({ ...p, [para]: true }))
    try {
      const res = await fetch(`/api/agents/memory?para=${para}&limit=200`)
      const json = await res.json() as { items: Entry[] }
      setData((p) => ({ ...p, [para]: json.items ?? [] }))
    } finally {
      setLoading((p) => ({ ...p, [para]: false }))
    }
  }

  useEffect(() => { void loadPara('projects') }, [])

  return (
    <div className="text-sm">
      {PARA.map((p) => (
        <div key={p.key} className="mb-2">
          <button
            type="button"
            onClick={() => { setOpen((s) => ({ ...s, [p.key]: !s[p.key] })); void loadPara(p.key) }}
            className="flex items-center gap-1 font-medium hover:underline"
          >
            {open[p.key] ? <FolderOpen className="size-4" /> : <Folder className="size-4" />}
            {p.label}
          </button>
          {open[p.key] && (
            <ul className="pl-5 mt-1 space-y-1">
              {loading[p.key] && <li className="text-muted-foreground">lade ...</li>}
              {(data[p.key] ?? []).map((e) => (
                <li key={e.id}>
                  <Link
                    href={`/intern/agents/memory/${encodeURIComponent(e.scope)}`}
                    className="flex items-center gap-1 hover:underline text-foreground"
                  >
                    <FileText className="size-4" />
                    {e.title ?? e.scope}
                  </Link>
                </li>
              ))}
              {open[p.key] && !loading[p.key] && (data[p.key]?.length ?? 0) === 0 && (
                <li className="text-muted-foreground italic">leer</li>
              )}
            </ul>
          )}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: MemorySearchBar**

`src/components/agents/memory/memory-search-bar.tsx`:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search } from 'lucide-react'
import Link from 'next/link'

interface Hit { id: string; scope: string; title: string | null; summary: string | null; snippet: string; score: number }

export function MemorySearchBar() {
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<Hit[]>([])
  const [isPending, startTransition] = useTransition()

  async function run() {
    if (q.trim().length < 2) return
    const res = await fetch(`/api/agents/memory/search?q=${encodeURIComponent(q)}&limit=10`)
    const json = await res.json() as { hits: Hit[] }
    setHits(json.hits ?? [])
  }

  return (
    <div className="space-y-3">
      <form
        onSubmit={(e) => { e.preventDefault(); startTransition(() => { void run() }) }}
        className="flex gap-2"
      >
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Memory durchsuchen ..." />
        <Button type="submit" disabled={isPending || q.trim().length < 2}>
          <Search className="size-4 mr-1" /> Suchen
        </Button>
      </form>
      {hits.length > 0 && (
        <ul className="divide-y rounded border">
          {hits.map((h) => (
            <li key={h.id} className="p-2 text-sm">
              <Link href={`/intern/agents/memory/${encodeURIComponent(h.scope)}`} className="font-medium hover:underline">
                {h.title ?? h.scope}
              </Link>
              <div className="text-xs text-muted-foreground">{h.scope} — score {h.score.toFixed(3)}</div>
              <div className="line-clamp-2 mt-1 text-muted-foreground">{h.snippet}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 3: MemoryEntryCard**

`src/components/agents/memory/memory-entry-card.tsx`:

```tsx
import ReactMarkdown from 'react-markdown'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Item { id: string; fact: string; status: string; source: string }

export function MemoryEntryCard(props: { title: string | null; body: string; items: Item[] }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{props.title ?? 'Memory-Entry'}</CardTitle>
        </CardHeader>
        <CardContent>
          <article className="prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown>{props.body}</ReactMarkdown>
          </article>
        </CardContent>
      </Card>
      {props.items.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Fakten</CardTitle></CardHeader>
          <CardContent>
            <ul className="text-sm divide-y">
              {props.items.map((i) => (
                <li key={i.id} className="py-2 flex items-start gap-2">
                  <Badge variant={i.status === 'active' ? 'default' : 'secondary'}>{i.status}</Badge>
                  <div>
                    <div>{i.fact}</div>
                    <div className="text-xs text-muted-foreground">{i.source}</div>
                  </div>
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

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add src/components/agents/memory/memory-tree.tsx src/components/agents/memory/memory-search-bar.tsx src/components/agents/memory/memory-entry-card.tsx
git commit -m "feat(agents): UI-Components Tree, SearchBar, EntryCard"
```

---

### Task 18: UI Pages

**Files:** `src/app/intern/(dashboard)/agents/memory/page.tsx`, `[scope]/page.tsx`

- [ ] **Step 1: Memory-Hub**

`src/app/intern/(dashboard)/agents/memory/page.tsx`:

```tsx
import { MemoryTree } from '@/components/agents/memory/memory-tree'
import { MemorySearchBar } from '@/components/agents/memory/memory-search-bar'

export const dynamic = 'force-dynamic'

export default function MemoryHubPage() {
  return (
    <div className="container py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Memory</h1>
        <p className="text-sm text-muted-foreground">
          PARA-strukturiertes Wissen — Projects, Areas, Resources, Archives.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-[260px_1fr]">
        <aside className="border rounded p-3 bg-card">
          <MemoryTree />
        </aside>
        <main>
          <MemorySearchBar />
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Detail-Page**

`src/app/intern/(dashboard)/agents/memory/[scope]/page.tsx`:

```tsx
import { MemoryService } from '@/lib/services/agents'
import { MemoryEntryCard } from '@/components/agents/memory/memory-entry-card'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function MemoryDetailPage({ params }: { params: Promise<{ scope: string }> }) {
  const { scope: encScope } = await params
  const scope = decodeURIComponent(encScope)
  try {
    const r = await MemoryService.read(scope)
    return (
      <div className="container py-6 space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">{r.title ?? scope}</h1>
          <p className="text-xs text-muted-foreground">{scope}</p>
        </div>
        <MemoryEntryCard title={r.title} body={r.body} items={r.items} />
      </div>
    )
  } catch {
    notFound()
  }
}
```

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 4: Commit**

```bash
git add 'src/app/intern/(dashboard)/agents/memory/page.tsx' 'src/app/intern/(dashboard)/agents/memory/[scope]/page.tsx'
git commit -m "feat(agents): UI-Pages /intern/agents/memory + Detail"
```

---

### Task 19: Integration-Tests fuer MemoryService

**Files:** `src/__tests__/integration/services/agents/memory.service.test.ts`

- [ ] **Step 1: Test schreiben**

`src/__tests__/integration/services/agents/memory.service.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import path from 'node:path'
import fs from 'node:fs/promises'
import os from 'node:os'

const skip = !process.env.DATABASE_URL ? 'DATABASE_URL fehlt' : null

describe.skipIf(skip !== null)('MemoryService Integration', () => {
  let tmpRoot: string

  beforeAll(async () => {
    tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'agents-memory-test-'))
    vi.stubEnv('AGENT_MEMORY_DIR', tmpRoot)
    vi.stubEnv('GOOGLE_AI_API_KEY', '')
  })

  afterAll(async () => {
    await fs.rm(tmpRoot, { recursive: true, force: true })
    vi.unstubAllEnvs()
  })

  it('write erstellt summary.md mit Frontmatter', async () => {
    const { MemoryService } = await import('@/lib/services/agents')
    const r = await MemoryService.write('projects/integration-test', '# Test\nBody')
    expect(r.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(r.path).toMatch(/projects[\/\\]integration-test[\/\\]summary\.md$/)
    const written = await fs.readFile(r.path, 'utf8')
    expect(written).toContain('---')
    expect(written).toContain('para: projects')
    expect(written).toContain('# Test')
  })

  it('read laedt geschriebenes File ueber scope', async () => {
    const { MemoryService } = await import('@/lib/services/agents')
    const r = await MemoryService.read('projects/integration-test')
    expect(r.body.trim()).toBe('# Test\nBody')
  })

  it('write fuegt items in items.yaml hinzu', async () => {
    const { MemoryService } = await import('@/lib/services/agents')
    await MemoryService.write('projects/integration-test', '# Test\nBody', [
      { fact: 'Fakt A', source: 'manual' },
      { fact: 'Fakt B', source: 'manual' },
    ])
    const r = await MemoryService.read('projects/integration-test')
    expect(r.items).toHaveLength(2)
    expect(r.items[0].fact).toBe('Fakt A')
  })

  it('list liefert Eintraege fuer projects', async () => {
    const { MemoryService } = await import('@/lib/services/agents')
    const items = await MemoryService.list('projects', 50)
    expect(items.some((i) => i.scope === 'projects/integration-test')).toBe(true)
  })

  it('expandRefs liefert Inhalt oder leeren Body', async () => {
    const { MemoryService } = await import('@/lib/services/agents')
    const expanded = await MemoryService.expandRefs(['memory://projects/integration-test', 'memory://projects/does-not-exist'])
    expect(expanded[0].body.length).toBeGreaterThan(0)
    expect(expanded[1].body).toBe('')
  })
})
```

- [ ] **Step 2: Run mit DATABASE_URL**

```bash
DATABASE_URL=<dev-url> npm run test:integration -- src/__tests__/integration/services/agents/memory.service.test.ts
```

Erwartet: 5/5 passed (oder skipped wenn DATABASE_URL nicht gesetzt).

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/integration/services/agents/memory.service.test.ts
git commit -m "test(agents): MemoryService Integration-Test (Disk + DB)"
```

---

### Task 20: Recall-Test mit 20 Fixtures

**Files:** `src/lib/services/agents/memory/index-fixtures.ts`, `src/__tests__/integration/services/agents/memory-recall.test.ts`

- [ ] **Step 1: Fixtures**

`src/lib/services/agents/memory/index-fixtures.ts`:

```ts
/**
 * 20 Memory-Fixtures fuer Recall-Tests.
 * Deutsche Inhalte aus xKMU-Domain (CRM, Cybersecurity, KI-Beratung, Marketing).
 */

export const MEMORY_FIXTURES: Array<{ scope: string; body: string; expectedQueries: string[] }> = [
  { scope: 'projects/acme-leadgen', body: '# Acme Lead-Pipeline\nVerantwortlich fuer Outbound-Kampagne und CRM-Pflege bei Acme GmbH. Hauptansprechpartner Lisa Weber.', expectedQueries: ['acme', 'outbound', 'lisa'] },
  { scope: 'projects/cyber-audit-stadtwerke', body: '# Stadtwerke Mustermann\nBSI-Grundschutz-Audit, Asset-Inventar mit 120 Servern, Schwachstellen-Scan-Report.', expectedQueries: ['grundschutz', 'stadtwerke', 'audit'] },
  { scope: 'projects/wiba-handel', body: '# WIBA-Bewertung Handel-Kunde\nWirtschaftlichkeitsbetrachtung KI-Implementation, ROI 18 Monate.', expectedQueries: ['wiba', 'handel', 'roi'] },
  { scope: 'areas/people/lisa-weber', body: '# Lisa Weber (CMO Acme)\nPraeferenz fuer LinkedIn-Outreach. Reagiert auf datengetriebene Pitches.', expectedQueries: ['lisa weber', 'linkedin'] },
  { scope: 'areas/people/max-mustermann', body: '# Max Mustermann (Geschaeftsfuehrer Stadtwerke)\nFokus auf Compliance und Versorgungssicherheit.', expectedQueries: ['mustermann', 'compliance'] },
  { scope: 'areas/companies/acme-gmbh', body: '# Acme GmbH\nMaschinenbau, 250 MA, Standort Hannover, Hauptkontakt Lisa Weber.', expectedQueries: ['acme', 'maschinenbau', 'hannover'] },
  { scope: 'areas/companies/stadtwerke-mustermann', body: '# Stadtwerke Mustermann\nKommunaler Versorger, Wasser/Strom/Gas, ca. 80 MA.', expectedQueries: ['stadtwerke', 'versorger'] },
  { scope: 'areas/topics/dsgvo', body: '# DSGVO-Compliance\nRechtsgrundlagen Art. 6, Auftragsverarbeitung, TOMs nach Art. 32.', expectedQueries: ['dsgvo', 'compliance', 'art 32'] },
  { scope: 'areas/topics/iso-27001', body: '# ISO 27001\nManagement-System fuer Informationssicherheit. Risikoanalyse, SoA.', expectedQueries: ['iso 27001', 'isms', 'risikoanalyse'] },
  { scope: 'areas/topics/social-media', body: '# Social-Media-Strategie\nLinkedIn als B2B-Hauptkanal, Instagram fuer Brand. Posting-Frequenz 3x/Woche.', expectedQueries: ['linkedin', 'instagram', 'b2b'] },
  { scope: 'resources/cold-email-frameworks', body: '# Cold-Email-Frameworks\nAIDA, BAB (Before-After-Bridge), QVC (Question-Value-Close). Subject-Line-Best-Practices.', expectedQueries: ['cold email', 'aida', 'subject line'] },
  { scope: 'resources/lead-scoring', body: '# Lead-Scoring-Modell\nDemographic + Behavioral. Punkteschema 0-100. MQL ab 50, SQL ab 75.', expectedQueries: ['lead scoring', 'mql', 'sql'] },
  { scope: 'resources/bsi-grundschutz-tipps', body: '# BSI-Grundschutz-Praxis\nBaustein-Auswahl je Schichtmodell, Sicherheitskonzept-Erstellung.', expectedQueries: ['grundschutz', 'bsi', 'baustein'] },
  { scope: 'resources/ki-prompt-guide', body: '# KI-Prompt-Guide\nFew-Shot, Chain-of-Thought, ReAct-Pattern. JSON-Mode fuer strukturierte Outputs.', expectedQueries: ['prompt', 'few-shot', 'chain of thought'] },
  { scope: 'resources/crm-pipeline-spec', body: '# CRM-Pipeline\nStufen: Lead -> MQL -> SQL -> Angebot -> Won/Lost. Conversion-Targets je Stufe.', expectedQueries: ['crm', 'pipeline', 'mql'] },
  { scope: 'archives/projects/2025-website-relaunch', body: '# Website-Relaunch 2025\nNext.js 15 + TipTap-CMS-Migration, abgeschlossen Q3 2025.', expectedQueries: ['website', 'relaunch', 'tiptap'] },
  { scope: 'archives/projects/2024-newsletter-tool', body: '# Newsletter-Tool 2024\nSelbstgebautes Mailing-System mit Resend, abgeloest durch Brevo.', expectedQueries: ['newsletter', 'resend', 'brevo'] },
  { scope: 'projects/n8n-automation-rollout', body: '# n8n Automation Rollout\nWorkflow-Engine-Integration mit n8n als externe Backup-Engine.', expectedQueries: ['n8n', 'automation', 'workflow'] },
  { scope: 'projects/social-media-q2', body: '# Social-Media-Plan Q2 2026\nThemen: KI-Beratung Reihe A1-A4, Cybersecurity-Bytes. Wochenlich Mo/Mi/Fr.', expectedQueries: ['social media', 'q2', 'ki-beratung'] },
  { scope: 'areas/topics/ki-beratung', body: '# KI-Beratung-Methodik\nPakete A1 (Audit), A2 (Strategie), A3 (Implementation), A4 (Operate).', expectedQueries: ['ki beratung', 'a1', 'a2'] },
]
```

- [ ] **Step 2: Recall-Test**

`src/__tests__/integration/services/agents/memory-recall.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import path from 'node:path'
import fs from 'node:fs/promises'
import os from 'node:os'

const skip = !process.env.DATABASE_URL ? 'DATABASE_URL fehlt — Recall-Test wird uebersprungen' : null

describe.skipIf(skip !== null)('MemoryService Recall', () => {
  let tmpRoot: string

  beforeAll(async () => {
    tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'agents-memory-recall-'))
    vi.stubEnv('AGENT_MEMORY_DIR', tmpRoot)
    const { MemoryService } = await import('@/lib/services/agents')
    const { MEMORY_FIXTURES } = await import('@/lib/services/agents/memory/index-fixtures')
    for (const f of MEMORY_FIXTURES) {
      await MemoryService.write(f.scope, f.body)
    }
  }, 60_000)

  afterAll(async () => {
    await fs.rm(tmpRoot, { recursive: true, force: true })
    vi.unstubAllEnvs()
  })

  it('Recall@1 mind. 80% fuer alle Fixtures', async () => {
    const { MemoryService } = await import('@/lib/services/agents')
    const { MEMORY_FIXTURES } = await import('@/lib/services/agents/memory/index-fixtures')
    let total = 0
    let hits = 0
    for (const f of MEMORY_FIXTURES) {
      for (const query of f.expectedQueries) {
        total += 1
        const found = await MemoryService.search(query, undefined, 3)
        if (found.length > 0 && found[0].scope === f.scope) hits += 1
      }
    }
    const recall = hits / total
    // eslint-disable-next-line no-console
    console.log(`Recall@1 = ${(recall * 100).toFixed(1)}% (${hits}/${total})`)
    expect(recall).toBeGreaterThanOrEqual(0.8)
  }, 60_000)

  it('Recall@3 mind. 95%', async () => {
    const { MemoryService } = await import('@/lib/services/agents')
    const { MEMORY_FIXTURES } = await import('@/lib/services/agents/memory/index-fixtures')
    let total = 0
    let hits = 0
    for (const f of MEMORY_FIXTURES) {
      for (const query of f.expectedQueries) {
        total += 1
        const found = await MemoryService.search(query, undefined, 3)
        if (found.some((h) => h.scope === f.scope)) hits += 1
      }
    }
    expect(hits / total).toBeGreaterThanOrEqual(0.95)
  }, 60_000)
})
```

- [ ] **Step 3: Run**

```bash
DATABASE_URL=<dev-url> npm run test:integration -- src/__tests__/integration/services/agents/memory-recall.test.ts
```

Erwartet: 2/2 passed mit Recall@1 >= 80%.

- [ ] **Step 4: Commit**

```bash
git add src/lib/services/agents/memory/index-fixtures.ts src/__tests__/integration/services/agents/memory-recall.test.ts
git commit -m "test(agents): Memory-Recall mit 20 deutschen Fixtures"
```

---

### Task 21: Final-Verification

**Files:** keine

- [ ] **Step 1: Voller Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 2: Voller Test-Lauf (Unit)**

```bash
npm run test:unit
```

Erwartet: alle bisherigen Tests + die neuen Memory-Unit-Tests gruen.

- [ ] **Step 3: Integration-Tests (mit DATABASE_URL gesetzt)**

```bash
DATABASE_URL=<dev-url> npm run test:integration -- src/__tests__/integration/services/agents/
```

- [ ] **Step 4: Manuelles Smoke**

```bash
npm run dev
```

Manuell pruefen:
- `http://localhost:3000/intern/agents/memory` zeigt Tree
- File anlegen `data/agent-memory/projects/manual-test/summary.md` mit Frontmatter -> erscheint im UI nach <5s
- Search-Bar liefert Hits

- [ ] **Step 5: Push**

```bash
git push -u origin feat/agents-memory
```

---

## Self-Review-Notiz

**Spec-Coverage Phase 2** (`docs/superpowers/specs/2026-05-08-agent-system-design.md` §4):
- §4.1 Disk-Layout -> Tasks 2, 3
- §4.2 Frontmatter-Schema -> Task 5
- §4.3 items.yaml + supersede -> Tasks 6, 12
- §4.4 Sync-Mechanik (3 Pfade) -> Tasks 10, 14, 15
- §4.5 Memory-Tools -> Tasks 8-13
- §4.8 Worker-Kontext-Expansion -> Task 13
- DoD: File-Watcher Disk -> UI <5s -> Tasks 14-18, manuelle Verifikation Task 21
- Test: 20 Fixtures Recall-Test -> Task 20

**Was bewusst NICHT in Phase 2:**
- Memory-Editor (Markdown-UI mit Save) -> Phase 7
- Tool-Adapter `memory:*` (LLM-aufrufbar) -> Phase 3
- Audit-Log-Anbindung -> spaeter

---

## Geschätzter Aufwand

21 Tasks à ca. 5-15 min pro Task = **~6-8 Stunden** reine Implementation. Realistisch 2-3 Arbeitstage.
