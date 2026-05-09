import { describe, it, expect, vi, beforeEach } from 'vitest'

// Smart-Worker ruft jetzt completeWithContext (DB-Provider zuerst).
// Tests greifen weiterhin auf AIService.complete als Mock-Target zu — wir
// aliasen completeWithContext auf dieselbe vi.fn() damit existierende Test-
// Mocks weiter funktionieren.
const _aiMock = vi.fn()
vi.mock('@/lib/services/ai', () => ({
  AIService: { complete: _aiMock, completeWithContext: _aiMock },
}))

vi.mock('@/lib/services/agents/smart-worker/agent-definition-loader', () => ({
  loadAgentDefinition: vi.fn(),
  _resetAgentDefinitionCache: vi.fn(),
}))

vi.mock('@/lib/services/agents/tool-registry', () => ({
  ToolRegistry: {
    listAll: vi.fn(),
    parseRef: (raw: string) => ({ namespace: raw.split(':')[0], name: raw.split(':').slice(1).join(':'), raw }),
    invoke: vi.fn(),
  },
}))

vi.mock('@/lib/services/agents/tools/bootstrap', () => ({
  initializeToolRegistry: vi.fn(),
}))

vi.mock('@/lib/services/agents/cost-tracker.service', () => ({
  CostTrackerService: { record: vi.fn().mockResolvedValue(undefined) },
}))

describe('SmartWorkerService.run', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('haelt sich an maxIterations (1) und liefert maxIterations-Fehler', async () => {
    const { loadAgentDefinition } = await import('@/lib/services/agents/smart-worker/agent-definition-loader')
    ;(loadAgentDefinition as ReturnType<typeof vi.fn>).mockResolvedValue({
      slug: 'writer', role: 'worker', name: 'W', systemPrompt: 'p', allowedTools: ['memory:*'],
      modelHint: null, maxTokensPerCall: 1024, maxIterations: 1, isActive: true,
    })

    const { ToolRegistry } = await import('@/lib/services/agents/tool-registry')
    ;(ToolRegistry.listAll as ReturnType<typeof vi.fn>).mockResolvedValue([
      { ref: { namespace: 'memory', name: 'search', raw: 'memory:search' }, description: 'such', inputSchema: {} },
    ])
    ;(ToolRegistry.invoke as ReturnType<typeof vi.fn>).mockResolvedValue({ status: 'succeeded', output: { hits: [] } })

    const { AIService } = await import('@/lib/services/ai')
    ;(AIService.complete as ReturnType<typeof vi.fn>).mockResolvedValue({
      text: '{"toolCall":{"ref":"memory:search","input":{"query":"x"}},"reasoning":"r"}',
      provider: 'gemini', model: 'gemini-flash', usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
    })

    const { SmartWorkerService } = await import('@/lib/services/agents/smart-worker.service')
    const r = await SmartWorkerService.run({
      definitionSlug: 'writer',
      input: { task: 'irgendwas' },
      runId: 'r1', stepId: 's1', goalId: 'g1',
    })

    expect(r.status).toBe('failed')
    expect(r.error).toMatch(/maxIterations/)
  })

  it('liefert succeeded bei final-Output', async () => {
    const { loadAgentDefinition } = await import('@/lib/services/agents/smart-worker/agent-definition-loader')
    ;(loadAgentDefinition as ReturnType<typeof vi.fn>).mockResolvedValue({
      slug: 'writer', role: 'worker', name: 'W', systemPrompt: 'p', allowedTools: ['memory:*'],
      modelHint: null, maxTokensPerCall: 1024, maxIterations: 4, isActive: true,
    })

    const { ToolRegistry } = await import('@/lib/services/agents/tool-registry')
    ;(ToolRegistry.listAll as ReturnType<typeof vi.fn>).mockResolvedValue([])

    const { AIService } = await import('@/lib/services/ai')
    ;(AIService.complete as ReturnType<typeof vi.fn>).mockResolvedValue({
      text: '{"final":"Aufgabe erledigt","reasoning":"r"}',
      provider: 'gemini', model: 'gemini-flash', usage: { promptTokens: 30, completionTokens: 10, totalTokens: 40 },
    })

    const { SmartWorkerService } = await import('@/lib/services/agents/smart-worker.service')
    const r = await SmartWorkerService.run({
      definitionSlug: 'writer', input: { task: 't' }, runId: 'r1', stepId: 's1', goalId: 'g1',
    })

    expect(r.status).toBe('succeeded')
    expect(r.output?.text).toBe('Aufgabe erledigt')
    expect(r.usage?.inputTokens).toBe(30)
  })

  it('fuehrt Tool-Use-Loop aus: toolCall, dann final', async () => {
    const { loadAgentDefinition } = await import('@/lib/services/agents/smart-worker/agent-definition-loader')
    ;(loadAgentDefinition as ReturnType<typeof vi.fn>).mockResolvedValue({
      slug: 'writer', role: 'worker', name: 'W', systemPrompt: 'p', allowedTools: ['memory:*'],
      modelHint: null, maxTokensPerCall: 1024, maxIterations: 4, isActive: true,
    })

    const { ToolRegistry } = await import('@/lib/services/agents/tool-registry')
    ;(ToolRegistry.listAll as ReturnType<typeof vi.fn>).mockResolvedValue([
      { ref: { namespace: 'memory', name: 'search', raw: 'memory:search' }, description: 'such', inputSchema: {} },
    ])
    ;(ToolRegistry.invoke as ReturnType<typeof vi.fn>).mockResolvedValue({ status: 'succeeded', output: { hits: ['scope-a'] } })

    const { AIService } = await import('@/lib/services/ai')
    const completeFn = AIService.complete as ReturnType<typeof vi.fn>
    completeFn
      .mockResolvedValueOnce({ text: '{"toolCall":{"ref":"memory:search","input":{"query":"x"}}}', provider: 'p', model: 'm', usage: { promptTokens: 5, completionTokens: 3, totalTokens: 8 } })
      .mockResolvedValueOnce({ text: '{"final":"Habe scope-a gefunden"}', provider: 'p', model: 'm', usage: { promptTokens: 12, completionTokens: 8, totalTokens: 20 } })

    const { SmartWorkerService } = await import('@/lib/services/agents/smart-worker.service')
    const r = await SmartWorkerService.run({
      definitionSlug: 'writer', input: { task: 'finde scope' }, runId: 'r1', stepId: 's1', goalId: 'g1',
    })

    expect(r.status).toBe('succeeded')
    expect(r.output?.text).toBe('Habe scope-a gefunden')
    expect(r.usage?.inputTokens).toBe(5 + 12)
    expect(ToolRegistry.invoke).toHaveBeenCalledTimes(1)
  })

  it('blockt nicht-whitelisted Tool-Aufrufe (LLM halluziniert)', async () => {
    const { loadAgentDefinition } = await import('@/lib/services/agents/smart-worker/agent-definition-loader')
    ;(loadAgentDefinition as ReturnType<typeof vi.fn>).mockResolvedValue({
      slug: 'writer', role: 'worker', name: 'W', systemPrompt: 'p', allowedTools: ['memory:read'],
      modelHint: null, maxTokensPerCall: 1024, maxIterations: 2, isActive: true,
    })

    const { ToolRegistry } = await import('@/lib/services/agents/tool-registry')
    ;(ToolRegistry.listAll as ReturnType<typeof vi.fn>).mockResolvedValue([
      { ref: { namespace: 'memory', name: 'read', raw: 'memory:read' }, description: 'r', inputSchema: {} },
      { ref: { namespace: 'service', name: 'lead-research', raw: 'service:lead-research' }, description: 's', inputSchema: {} },
    ])

    const { AIService } = await import('@/lib/services/ai')
    const completeFn = AIService.complete as ReturnType<typeof vi.fn>
    completeFn
      .mockResolvedValueOnce({ text: '{"toolCall":{"ref":"service:lead-research","input":{}}}', provider: 'p', model: 'm', usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 } })
      .mockResolvedValueOnce({ text: '{"final":"abgebrochen, Tool nicht erlaubt"}', provider: 'p', model: 'm', usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 } })

    const { SmartWorkerService } = await import('@/lib/services/agents/smart-worker.service')
    const r = await SmartWorkerService.run({
      definitionSlug: 'writer', input: { task: 't' }, runId: 'r1', stepId: 's1', goalId: 'g1',
    })

    expect(ToolRegistry.invoke).not.toHaveBeenCalled()
    expect(r.status).toBe('succeeded')
  })

  it('liefert failed wenn definition nicht existiert', async () => {
    const { loadAgentDefinition } = await import('@/lib/services/agents/smart-worker/agent-definition-loader')
    ;(loadAgentDefinition as ReturnType<typeof vi.fn>).mockResolvedValue(null)

    const { SmartWorkerService } = await import('@/lib/services/agents/smart-worker.service')
    const r = await SmartWorkerService.run({
      definitionSlug: 'unknown', input: {}, runId: 'r1', stepId: 's1', goalId: 'g1',
    })
    expect(r.status).toBe('failed')
    expect(r.error).toMatch(/unknown/)
  })

  it('liefert failed wenn LLM-Output nicht parseable', async () => {
    const { loadAgentDefinition } = await import('@/lib/services/agents/smart-worker/agent-definition-loader')
    ;(loadAgentDefinition as ReturnType<typeof vi.fn>).mockResolvedValue({
      slug: 'writer', role: 'worker', name: 'W', systemPrompt: 'p', allowedTools: ['memory:*'],
      modelHint: null, maxTokensPerCall: 1024, maxIterations: 2, isActive: true,
    })
    const { ToolRegistry } = await import('@/lib/services/agents/tool-registry')
    ;(ToolRegistry.listAll as ReturnType<typeof vi.fn>).mockResolvedValue([])
    const { AIService } = await import('@/lib/services/ai')
    ;(AIService.complete as ReturnType<typeof vi.fn>).mockResolvedValue({
      text: 'das ist kein JSON', provider: 'p', model: 'm', usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
    })

    const { SmartWorkerService } = await import('@/lib/services/agents/smart-worker.service')
    const r = await SmartWorkerService.run({
      definitionSlug: 'writer', input: {}, runId: 'r1', stepId: 's1', goalId: 'g1',
    })
    expect(r.status).toBe('failed')
    expect(r.error).toMatch(/JSON|parse/i)
  })
})
