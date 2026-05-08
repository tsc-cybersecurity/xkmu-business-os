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

  async read(_idOrPath: string): Promise<MemoryReadResult> {
    throw new Error('MemoryService.read: nicht implementiert (Phase 2)')
  },

  async write(
    _scope: string,
    _body: string,
    _items?: MemoryFact[],
  ): Promise<{ id: string; path: string }> {
    throw new Error('MemoryService.write: nicht implementiert (Phase 2)')
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
