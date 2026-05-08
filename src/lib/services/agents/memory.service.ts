/**
 * Memory Service — PARA-Markdown auf Disk + DB-Index.
 * Phase 1: Skeleton. Vollimplementierung in Phase 2.
 *
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §4
 */

import type { AgentMemoryEntry, MemoryRef } from './types'

export interface MemorySearchHit {
  id: string
  scope: string
  title: string | null
  summary: string | null
  snippet: string
  score: number
}

export interface MemoryReadResult {
  id: string
  title: string | null
  body: string
  items: Array<{ id: string; fact: string; status: string; source: string }>
}

export interface MemoryFact {
  id?: string
  fact: string
  source: string
  confidence?: number
  status?: 'active' | 'superseded' | 'archived'
}

export const MemoryService = {
  async search(_query: string, _scope?: string, _limit = 5): Promise<MemorySearchHit[]> {
    throw new Error('MemoryService.search: nicht implementiert (Phase 2)')
  },

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

  async supersede(
    _itemId: string,
    _newFact: string,
    _source: string,
  ): Promise<void> {
    throw new Error('MemoryService.supersede: nicht implementiert (Phase 2)')
  },

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

  /** Expandiert MemoryRefs zu vollen Inhalten — wird beim Worker-Start aufgerufen. */
  async expandRefs(
    _refs: MemoryRef[],
  ): Promise<Array<{ ref: MemoryRef; title: string | null; body: string }>> {
    throw new Error('MemoryService.expandRefs: nicht implementiert (Phase 2)')
  },

  /** Komprimiert Run-History für Re-Plan-Kontext. */
  async compactRunHistory(_runId: string, _keepLast = 5): Promise<string> {
    throw new Error('MemoryService.compactRunHistory: nicht implementiert (Phase 2)')
  },
}
