/**
 * Workflow-Tool-Adapter — jeder aktive workflows.trigger wird als Tool aufrufbar.
 * Namespace: `workflow:*` — z.B. `workflow:lead.created`.
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §5.1
 */

import type { ToolAdapter, ToolDescriptor, ToolInvocation, ToolInvocationResult } from '../tool-registry'

export const workflowToolAdapter: ToolAdapter = {
  namespace: 'workflow',

  async list(): Promise<ToolDescriptor[]> {
    const { db } = await import('@/lib/db')
    const { workflows } = await import('@/lib/db/schema')
    const { eq } = await import('drizzle-orm')

    const rows = await db
      .select({
        trigger: workflows.trigger,
        name: workflows.name,
        description: workflows.description,
      })
      .from(workflows)
      .where(eq(workflows.isActive, true))

    // Eindeutige Trigger (mehrere workflows koennen denselben trigger haben)
    const seen = new Set<string>()
    const tools: ToolDescriptor[] = []
    for (const row of rows) {
      if (seen.has(row.trigger)) continue
      seen.add(row.trigger)
      tools.push({
        ref: { namespace: 'workflow', name: row.trigger, raw: `workflow:${row.trigger}` },
        description: `Triggert Workflow '${row.name}'${row.description ? ` — ${row.description}` : ''}`,
        inputSchema: {
          type: 'object',
          properties: {
            data: { type: 'object', description: 'Trigger-Data, wird an WorkflowEngine.fire weitergegeben' },
          },
        },
      })
    }
    return tools
  },

  async invoke(invocation: ToolInvocation): Promise<ToolInvocationResult> {
    const trigger = invocation.ref.name
    const input = invocation.input as { data?: Record<string, unknown> }
    const data = input.data ?? {}

    try {
      const { WorkflowEngine } = await import('@/lib/services/workflow/engine')
      const result = await WorkflowEngine.fire(trigger, data)
      return { status: 'succeeded', output: result as unknown as Record<string, unknown> }
    } catch (e) {
      return { status: 'failed', error: (e as Error).message }
    }
  },
}
