/**
 * agent-Tool-Adapter — startet Smart-Worker-Sub-Run via SmartWorkerService.
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §5.1
 */

import type { ToolAdapter, ToolDescriptor, ToolInvocation, ToolInvocationResult } from '../tool-registry'

export const agentToolAdapter: ToolAdapter = {
  namespace: 'agent',

  async list(): Promise<ToolDescriptor[]> {
    const { db } = await import('@/lib/db')
    const { agentDefinitions } = await import('@/lib/db/schema')
    const { eq, and } = await import('drizzle-orm')

    const rows = (await db
      .select()
      .from(agentDefinitions)
      .where(and(eq(agentDefinitions.role, 'worker'), eq(agentDefinitions.isActive, true)))) as Array<{
        slug: string; name: string | null; systemPrompt: string; allowedTools: string[]; maxIterations: number
      }>

    return rows.map((row) => ({
      ref: { namespace: 'agent', name: row.slug, raw: `agent:${row.slug}` },
      description: `Smart-Worker '${row.name ?? row.slug}' — ${row.systemPrompt.slice(0, 200)}`,
      inputSchema: {
        type: 'object',
        description: 'Input fuer Smart-Worker (frei strukturiert; Worker-System-Prompt definiert Konvention)',
        properties: {
          task: { type: 'string', description: 'Beschreibung der Sub-Aufgabe' },
        },
      },
    }))
  },

  async invoke(invocation: ToolInvocation): Promise<ToolInvocationResult> {
    const { SmartWorkerService } = await import('../smart-worker.service')
    const result = await SmartWorkerService.run({
      definitionSlug: invocation.ref.name,
      input: invocation.input,
      runId: invocation.context.runId,
      stepId: invocation.context.stepId,
      goalId: invocation.context.goalId,
    })

    return {
      status: result.status,
      output: result.output as Record<string, unknown> | undefined,
      error: result.error,
      usage: result.usage,
    }
  },
}
