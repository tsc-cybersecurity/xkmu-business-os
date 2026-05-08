import { describe, it, expect, vi, beforeEach } from 'vitest'

const fireMock = vi.fn()
const dbMock = {
  select: vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn().mockResolvedValue([
        { trigger: 'lead.created', name: 'Lead-Pipeline', description: 'Auto-Score' },
        { trigger: 'order.created', name: 'Bestellung', description: null },
      ]),
    })),
  })),
}

vi.mock('@/lib/db', () => ({ db: dbMock }))
vi.mock('@/lib/db/schema', () => ({
  workflows: { trigger: 'trigger', name: 'name', description: 'description', isActive: 'isActive' },
}))
vi.mock('@/lib/services/workflow/engine', () => ({
  WorkflowEngine: { fire: fireMock },
}))

describe('Workflow-Tool-Adapter', () => {
  beforeEach(() => {
    fireMock.mockReset()
  })

  it('list() liefert ein Tool pro aktivem Workflow-Trigger', async () => {
    const { workflowToolAdapter } = await import('@/lib/services/agents/tools/workflow-adapter')
    const tools = await workflowToolAdapter.list()
    expect(tools).toHaveLength(2)
    expect(tools[0].ref.namespace).toBe('workflow')
    expect(tools[0].ref.name).toBe('lead.created')
    expect(tools[0].ref.raw).toBe('workflow:lead.created')
    expect(tools[0].description).toContain('Lead-Pipeline')
  })

  it('invoke ruft WorkflowEngine.fire mit trigger und data', async () => {
    fireMock.mockResolvedValue({ runId: 'wr-1', stepResults: [] })
    const { workflowToolAdapter } = await import('@/lib/services/agents/tools/workflow-adapter')
    const r = await workflowToolAdapter.invoke({
      ref: { namespace: 'workflow', name: 'lead.created', raw: 'workflow:lead.created' },
      input: { data: { leadId: 'l1' } },
      context: { runId: 'r', stepId: 's', goalId: 'g' },
    })
    expect(r.status).toBe('succeeded')
    expect(fireMock).toHaveBeenCalledWith('lead.created', { leadId: 'l1' })
    expect(r.output).toEqual({ runId: 'wr-1', stepResults: [] })
  })

  it('invoke faengt Engine-Errors als failed-Result', async () => {
    fireMock.mockRejectedValue(new Error('Workflow konnte nicht starten'))
    const { workflowToolAdapter } = await import('@/lib/services/agents/tools/workflow-adapter')
    const r = await workflowToolAdapter.invoke({
      ref: { namespace: 'workflow', name: 'lead.created', raw: 'workflow:lead.created' },
      input: { data: {} },
      context: { runId: 'r', stepId: 's', goalId: 'g' },
    })
    expect(r.status).toBe('failed')
    expect(r.error).toContain('konnte nicht starten')
  })
})
