/**
 * Memory-Tool-Adapter — exposes MemoryService als 5 Tools im `memory:*`-Namespace.
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §5.1
 */

import type { ToolAdapter, ToolDescriptor, ToolInvocation, ToolInvocationResult } from '../tool-registry'
import { MemoryService } from '../memory.service'
import type { MemoryRef } from '../types'

const TOOLS: ToolDescriptor[] = [
  {
    ref: { namespace: 'memory', name: 'search', raw: 'memory:search' },
    description: 'Hybrid-Suche (BM25 + Vector) ueber alle aktiven Memory-Eintraege.',
    inputSchema: {
      type: 'object',
      required: ['query'],
      properties: {
        query: { type: 'string' },
        scope: { type: 'string' },
        limit: { type: 'integer', minimum: 1, maximum: 50, default: 5 },
      },
    },
  },
  {
    ref: { namespace: 'memory', name: 'read', raw: 'memory:read' },
    description: 'Liest einen Memory-Eintrag (Markdown-Body + items.yaml) per ID, scope oder memory:// URI.',
    inputSchema: {
      type: 'object',
      required: ['ref'],
      properties: { ref: { type: 'string' } },
    },
  },
  {
    ref: { namespace: 'memory', name: 'write', raw: 'memory:write' },
    description: 'Schreibt oder aktualisiert einen Memory-Eintrag. Optional Items zum Anhaengen.',
    inputSchema: {
      type: 'object',
      required: ['scope', 'body'],
      properties: {
        scope: { type: 'string' },
        body: { type: 'string' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            required: ['fact', 'source'],
            properties: {
              fact: { type: 'string' },
              source: { type: 'string' },
              confidence: { type: 'number' },
            },
          },
        },
      },
    },
  },
  {
    ref: { namespace: 'memory', name: 'list', raw: 'memory:list' },
    description: 'Listet alle aktiven Memory-Eintraege einer PARA-Kategorie.',
    inputSchema: {
      type: 'object',
      required: ['para'],
      properties: {
        para: { type: 'string', enum: ['projects', 'areas', 'resources', 'archives'] },
        limit: { type: 'integer', minimum: 1, maximum: 200, default: 20 },
      },
    },
  },
  {
    ref: { namespace: 'memory', name: 'supersede', raw: 'memory:supersede' },
    description: 'Ersetzt einen items.yaml-Fakt durch einen neuen (never-delete-Pattern).',
    inputSchema: {
      type: 'object',
      required: ['itemId', 'newFact', 'source'],
      properties: {
        itemId: { type: 'string' },
        newFact: { type: 'string' },
        source: { type: 'string' },
      },
    },
  },
]

export const memoryToolAdapter: ToolAdapter = {
  namespace: 'memory',

  async list() {
    return TOOLS
  },

  async invoke(invocation: ToolInvocation): Promise<ToolInvocationResult> {
    const { name } = invocation.ref
    const input = invocation.input as Record<string, unknown>

    try {
      switch (name) {
        case 'search': {
          const query = String(input.query ?? '')
          const scope = typeof input.scope === 'string' ? input.scope : undefined
          const limit = typeof input.limit === 'number' ? input.limit : 5
          const hits = await MemoryService.search(query, scope, limit)
          return { status: 'succeeded', output: { hits } }
        }
        case 'read': {
          const ref = String(input.ref ?? '')
          const result = await MemoryService.read(ref)
          return { status: 'succeeded', output: result as unknown as Record<string, unknown> }
        }
        case 'write': {
          const scope = String(input.scope ?? '')
          const body = String(input.body ?? '')
          const items = Array.isArray(input.items)
            ? (input.items as Array<{ fact: string; source: string; confidence?: number }>)
            : undefined
          const result = await MemoryService.write(scope, body, items)
          return { status: 'succeeded', output: result }
        }
        case 'list': {
          const para = String(input.para ?? '') as 'projects' | 'areas' | 'resources' | 'archives'
          const limit = typeof input.limit === 'number' ? input.limit : 20
          const items = await MemoryService.list(para, limit)
          return { status: 'succeeded', output: { items } }
        }
        case 'supersede': {
          const itemId = String(input.itemId ?? '')
          const newFact = String(input.newFact ?? '')
          const source = String(input.source ?? '')
          await MemoryService.supersede(itemId, newFact, source)
          return { status: 'succeeded', output: { itemId } }
        }
        default:
          return { status: 'failed', error: `unbekanntes Memory-Tool: ${name}` }
      }
    } catch (e) {
      return { status: 'failed', error: (e as Error).message }
    }
  },
}

// Helper-Typ fuer Sub-Agenten / Tool-Documentation
export type _MemoryRef = MemoryRef
