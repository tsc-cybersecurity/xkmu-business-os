/**
 * Lazy DB-Loader fuer agent_definitions mit In-Memory-Cache.
 * Cache wird bei Hot-Reload / Test via _resetAgentDefinitionCache geleert.
 *
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §3.2 + §5.1
 */

import type { AgentDefinition } from '../types'

const cache = new Map<string, AgentDefinition>()

export async function loadAgentDefinition(slug: string): Promise<AgentDefinition | null> {
  if (cache.has(slug)) return cache.get(slug)!

  const { db } = await import('@/lib/db')
  const { agentDefinitions } = await import('@/lib/db/schema')
  const { eq, and } = await import('drizzle-orm')

  const rows = await db
    .select()
    .from(agentDefinitions)
    .where(and(eq(agentDefinitions.slug, slug), eq(agentDefinitions.isActive, true)))
    .limit(1)

  const row = rows[0] as AgentDefinition | undefined
  if (!row) return null
  cache.set(slug, row)
  return row
}

/** Nur fuer Tests + Hot-Reload-Reset. */
export function _resetAgentDefinitionCache(): void {
  cache.clear()
}
