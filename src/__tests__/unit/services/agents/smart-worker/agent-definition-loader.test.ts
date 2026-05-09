import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({ db: { select: vi.fn() } }))
vi.mock('@/lib/db/schema', () => ({ agentDefinitions: { slug: 'slug', isActive: 'isActive' } }))

describe('loadAgentDefinition', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const { _resetAgentDefinitionCache } = await import('@/lib/services/agents/smart-worker/agent-definition-loader')
    _resetAgentDefinitionCache()
  })

  it('liefert Definition aus DB beim ersten Aufruf', async () => {
    const fakeRow = { id: 'd1', slug: 'writer', role: 'worker', name: 'Writer', systemPrompt: 'Du schreibst.', allowedTools: ['memory:*'], modelHint: null, maxTokensPerCall: 4096, maxIterations: 8, isActive: true, metadata: {}, createdAt: new Date(), updatedAt: new Date() }
    const { db } = await import('@/lib/db')
    const limit = vi.fn().mockResolvedValue([fakeRow])
    const where = vi.fn().mockReturnValue({ limit })
    const from = vi.fn().mockReturnValue({ where })
    ;(db.select as unknown as { mockReturnValue: (v: unknown) => void }).mockReturnValue({ from })

    const { loadAgentDefinition } = await import('@/lib/services/agents/smart-worker/agent-definition-loader')
    const def = await loadAgentDefinition('writer')
    expect(def?.slug).toBe('writer')
    expect(db.select).toHaveBeenCalledTimes(1)
  })

  it('cached Definition — zweiter Aufruf laedt nicht erneut', async () => {
    const fakeRow = { id: 'd1', slug: 'writer', role: 'worker', name: 'Writer', systemPrompt: 'p', allowedTools: [], modelHint: null, maxTokensPerCall: 4096, maxIterations: 8, isActive: true, metadata: {}, createdAt: new Date(), updatedAt: new Date() }
    const { db } = await import('@/lib/db')
    const limit = vi.fn().mockResolvedValue([fakeRow])
    const where = vi.fn().mockReturnValue({ limit })
    const from = vi.fn().mockReturnValue({ where })
    ;(db.select as unknown as { mockReturnValue: (v: unknown) => void }).mockReturnValue({ from })

    const { loadAgentDefinition } = await import('@/lib/services/agents/smart-worker/agent-definition-loader')
    await loadAgentDefinition('writer')
    await loadAgentDefinition('writer')
    expect(db.select).toHaveBeenCalledTimes(1)
  })

  it('liefert null wenn Definition fehlt', async () => {
    const { db } = await import('@/lib/db')
    const limit = vi.fn().mockResolvedValue([])
    const where = vi.fn().mockReturnValue({ limit })
    const from = vi.fn().mockReturnValue({ where })
    ;(db.select as unknown as { mockReturnValue: (v: unknown) => void }).mockReturnValue({ from })

    const { loadAgentDefinition } = await import('@/lib/services/agents/smart-worker/agent-definition-loader')
    const def = await loadAgentDefinition('does-not-exist')
    expect(def).toBeNull()
  })
})
