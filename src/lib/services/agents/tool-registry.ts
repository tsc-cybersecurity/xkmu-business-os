/**
 * Tool Registry — Adapter-Definitionen für die fünf Tool-Namespaces.
 * Phase 1: Skeleton (Type-Definitionen). Adapter-Implementation in Phase 3.
 *
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §5
 */

import type { ToolNamespace, ToolRef } from './types'

export interface ToolDescriptor {
  ref: ToolRef
  description: string
  /** JSON-Schema des Inputs — wird erst beim Worker-Start an LLM gegeben. */
  inputSchema: Record<string, unknown>
  /** JSON-Schema des Outputs (optional, für strukturierte Validierung). */
  outputSchema?: Record<string, unknown>
}

export interface ToolInvocation {
  ref: ToolRef
  input: Record<string, unknown>
  /** Kontext: laufender Run/Step für Cost-Tracking & Provenance. */
  context: {
    runId: string
    stepId: string
    goalId: string
  }
}

export interface ToolInvocationResult {
  status: 'succeeded' | 'failed'
  output?: Record<string, unknown>
  error?: string
  /** Optional: vom Tool ausgegebene Token/Cost-Daten (z.B. bei `prompt:*`). */
  usage?: { inputTokens: number; outputTokens: number; costCents: number; provider: string; model: string }
}

export interface ToolAdapter {
  namespace: ToolNamespace
  /** Listet alle Tools dieses Namespaces (z.B. alle aktiven Workflows als `workflow:<trigger>`). */
  list(): Promise<ToolDescriptor[]>
  /** Führt einen einzelnen Tool-Call aus. */
  invoke(invocation: ToolInvocation): Promise<ToolInvocationResult>
}

const adapters = new Map<ToolNamespace, ToolAdapter>()

export const ToolRegistry = {
  register(adapter: ToolAdapter): void {
    adapters.set(adapter.namespace, adapter)
  },

  get(namespace: ToolNamespace): ToolAdapter | undefined {
    return adapters.get(namespace)
  },

  async listAll(): Promise<ToolDescriptor[]> {
    const all: ToolDescriptor[] = []
    for (const adapter of adapters.values()) {
      all.push(...(await adapter.list()))
    }
    return all
  },

  /** Parsed `'memory:search'` zu ToolRef. */
  parseRef(raw: string): ToolRef {
    const sep = raw.indexOf(':')
    if (sep < 0) throw new Error(`Invalid tool ref (missing ':'): ${raw}`)
    const namespace = raw.slice(0, sep) as ToolNamespace
    const name = raw.slice(sep + 1)
    return { namespace, name, raw }
  },

  async invoke(invocation: ToolInvocation): Promise<ToolInvocationResult> {
    const adapter = this.get(invocation.ref.namespace)
    if (!adapter) {
      return { status: 'failed', error: `Kein Adapter fuer Namespace '${invocation.ref.namespace}' registriert` }
    }
    return adapter.invoke(invocation)
  },
}
