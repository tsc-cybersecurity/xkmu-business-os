import { describe, it, expect, vi, beforeEach } from 'vitest'

const aiCompleteMock = vi.fn()
const dbMock = {
  select: vi.fn(),
}

vi.mock('@/lib/db', () => ({ db: dbMock }))
vi.mock('@/lib/db/schema', () => ({
  aiPromptTemplates: { slug: 'slug', name: 'name', description: 'description', systemPrompt: 'systemPrompt', userPrompt: 'userPrompt', isActive: 'isActive' },
  customAiPrompts: { slug: 'slug', name: 'name', description: 'description', systemPrompt: 'systemPrompt', userPrompt: 'userPrompt', isActive: 'isActive' },
}))
vi.mock('@/lib/services/ai', () => ({
  AIService: { complete: aiCompleteMock, completeWithContext: aiCompleteMock },
}))

function mockPromptListResponse(rows: Array<{ slug: string; name: string; description: string | null }>) {
  dbMock.select.mockReturnValueOnce({
    from: vi.fn(() => ({ where: vi.fn().mockResolvedValue(rows) })),
  })
  dbMock.select.mockReturnValueOnce({
    from: vi.fn(() => ({ where: vi.fn().mockResolvedValue([]) })),
  })
}

function mockPromptByName(row: { systemPrompt: string; userPrompt: string } | null) {
  dbMock.select.mockReturnValueOnce({
    from: vi.fn(() => ({
      where: vi.fn(() => ({ limit: () => Promise.resolve(row ? [row] : []) })),
    })),
  })
  if (!row) {
    dbMock.select.mockReturnValueOnce({
      from: vi.fn(() => ({
        where: vi.fn(() => ({ limit: () => Promise.resolve([]) })),
      })),
    })
  }
}

describe('Prompt-Tool-Adapter', () => {
  beforeEach(() => {
    aiCompleteMock.mockReset()
    dbMock.select.mockReset()
  })

  it('list() liefert je ein Tool pro aktivem Template + Custom-Prompt', async () => {
    mockPromptListResponse([
      { slug: 'lead_research', name: 'Lead-Recherche', description: 'KI-Analyse' },
      { slug: 'company_research', name: 'Firma', description: null },
    ])
    const { promptToolAdapter } = await import('@/lib/services/agents/tools/prompt-adapter')
    const tools = await promptToolAdapter.list()
    expect(tools).toHaveLength(2)
    expect(tools[0].ref.raw).toBe('prompt:lead_research')
    expect(tools[0].description).toContain('Lead-Recherche')
  })

  it('invoke rendert userPrompt mit variables und ruft AIService.complete', async () => {
    mockPromptByName({
      systemPrompt: 'Du bist Recherche-Assistent.',
      userPrompt: 'Analysiere {{company}} im Bereich {{topic}}.',
    })
    aiCompleteMock.mockResolvedValue({
      text: 'Acme ist top.',
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      usage: { promptTokens: 50, completionTokens: 20, totalTokens: 70 },
    })
    const { promptToolAdapter } = await import('@/lib/services/agents/tools/prompt-adapter')
    const r = await promptToolAdapter.invoke({
      ref: { namespace: 'prompt', name: 'lead_research', raw: 'prompt:lead_research' },
      input: { variables: { company: 'Acme GmbH', topic: 'B2B' } },
      context: { runId: 'r', stepId: 's', goalId: 'g' },
    })
    expect(r.status).toBe('succeeded')
    expect(aiCompleteMock).toHaveBeenCalledTimes(1)
    // completeWithContext-Signatur: (prompt, context, options) — systemPrompt liegt in [2]
    const callArgs = aiCompleteMock.mock.calls[0]
    expect(callArgs[0]).toContain('Acme GmbH')
    expect(callArgs[0]).toContain('B2B')
    expect(callArgs[2].systemPrompt).toContain('Recherche-Assistent')
    expect(r.output).toEqual({ text: 'Acme ist top.', provider: 'gemini', model: 'gemini-2.5-flash' })
    expect(r.usage).toEqual({
      inputTokens: 50,
      outputTokens: 20,
      costCents: 0,
      provider: 'gemini',
      model: 'gemini-2.5-flash',
    })
  })

  it('invoke wirft failed bei unbekanntem slug', async () => {
    mockPromptByName(null)
    const { promptToolAdapter } = await import('@/lib/services/agents/tools/prompt-adapter')
    const r = await promptToolAdapter.invoke({
      ref: { namespace: 'prompt', name: 'unknown_slug', raw: 'prompt:unknown_slug' },
      input: { variables: {} },
      context: { runId: 'r', stepId: 's', goalId: 'g' },
    })
    expect(r.status).toBe('failed')
    expect(r.error).toMatch(/Prompt-Slug 'unknown_slug' nicht gefunden/)
  })
})
