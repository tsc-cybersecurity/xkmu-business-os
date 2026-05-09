import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({ db: { select: vi.fn() } }))
vi.mock('@/lib/db/schema', () => ({ agentDefinitions: { role: 'role', isActive: 'isActive' } }))
vi.mock('@/lib/services/agents/smart-worker.service', () => ({
  SmartWorkerService: { run: vi.fn() },
}))

describe('agentToolAdapter', () => {
  beforeEach(() => vi.clearAllMocks())

  it('list() liefert nur role=worker, isActive=true', async () => {
    const { db } = await import('@/lib/db')
    const where = vi.fn().mockResolvedValue([
      { slug: 'writer', name: 'Writer', systemPrompt: 'P', allowedTools: ['memory:*'], maxIterations: 6 },
      { slug: 'researcher', name: 'Researcher', systemPrompt: 'P', allowedTools: ['memory:*', 'service:*'], maxIterations: 8 },
    ])
    const from = vi.fn().mockReturnValue({ where })
    ;(db.select as unknown as { mockReturnValue: (v: unknown) => void }).mockReturnValue({ from })

    const { agentToolAdapter } = await import('@/lib/services/agents/tools/agent-adapter')
    const tools = await agentToolAdapter.list()
    expect(tools.map((t) => t.ref.raw)).toEqual(['agent:writer', 'agent:researcher'])
    expect(tools[0].description).toContain('Writer')
  })

  it('invoke() delegiert an SmartWorkerService.run mit slug aus ref', async () => {
    const { SmartWorkerService } = await import('@/lib/services/agents/smart-worker.service')
    ;(SmartWorkerService.run as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 'succeeded',
      output: { text: 'fertig', iterations: 1, toolCalls: 0 },
      usage: { inputTokens: 5, outputTokens: 3, costCents: 0, provider: 'p', model: 'm' },
    })

    const { agentToolAdapter } = await import('@/lib/services/agents/tools/agent-adapter')
    const r = await agentToolAdapter.invoke({
      ref: { namespace: 'agent', name: 'writer', raw: 'agent:writer' },
      input: { task: 'schreib was' },
      context: { runId: 'r1', stepId: 's1', goalId: 'g1' },
    })

    expect(SmartWorkerService.run).toHaveBeenCalledWith({
      definitionSlug: 'writer',
      input: { task: 'schreib was' },
      runId: 'r1', stepId: 's1', goalId: 'g1',
    })
    expect(r.status).toBe('succeeded')
    expect(r.output?.text).toBe('fertig')
    expect(r.usage?.inputTokens).toBe(5)
  })

  it('invoke() reicht failed-Status durch', async () => {
    const { SmartWorkerService } = await import('@/lib/services/agents/smart-worker.service')
    ;(SmartWorkerService.run as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 'failed', error: 'maxIterations',
    })

    const { agentToolAdapter } = await import('@/lib/services/agents/tools/agent-adapter')
    const r = await agentToolAdapter.invoke({
      ref: { namespace: 'agent', name: 'writer', raw: 'agent:writer' },
      input: {},
      context: { runId: 'r', stepId: 's', goalId: 'g' },
    })
    expect(r.status).toBe('failed')
    expect(r.error).toBe('maxIterations')
  })
})
