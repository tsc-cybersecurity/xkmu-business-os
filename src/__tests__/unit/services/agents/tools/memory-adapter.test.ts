import { describe, it, expect, vi, beforeEach } from 'vitest'

const memoryServiceMock = {
  search: vi.fn(),
  read: vi.fn(),
  write: vi.fn(),
  list: vi.fn(),
  supersede: vi.fn(),
}

vi.mock('@/lib/services/agents/memory.service', () => ({
  MemoryService: memoryServiceMock,
}))

describe('Memory-Tool-Adapter', () => {
  beforeEach(() => {
    Object.values(memoryServiceMock).forEach((fn) => fn.mockReset())
  })

  it('list() liefert 5 Memory-Tools', async () => {
    const { memoryToolAdapter } = await import('@/lib/services/agents/tools/memory-adapter')
    const tools = await memoryToolAdapter.list()
    expect(tools).toHaveLength(5)
    const names = tools.map((t) => t.ref.name)
    expect(names).toEqual(expect.arrayContaining(['search', 'read', 'write', 'list', 'supersede']))
    tools.forEach((t) => expect(t.ref.namespace).toBe('memory'))
  })

  it('invoke memory:search delegiert an MemoryService.search', async () => {
    memoryServiceMock.search.mockResolvedValue([{ id: 'm1', scope: 's', title: 't', summary: null, snippet: 'x', score: 0.5 }])
    const { memoryToolAdapter } = await import('@/lib/services/agents/tools/memory-adapter')
    const r = await memoryToolAdapter.invoke({
      ref: { namespace: 'memory', name: 'search', raw: 'memory:search' },
      input: { query: 'foo', limit: 5 },
      context: { runId: 'r', stepId: 's', goalId: 'g' },
    })
    expect(r.status).toBe('succeeded')
    expect(memoryServiceMock.search).toHaveBeenCalledWith('foo', undefined, 5)
    expect(r.output).toEqual({ hits: [{ id: 'm1', scope: 's', title: 't', summary: null, snippet: 'x', score: 0.5 }] })
  })

  it('invoke memory:write delegiert an MemoryService.write', async () => {
    memoryServiceMock.write.mockResolvedValue({ id: 'new-id', path: '/x/summary.md' })
    const { memoryToolAdapter } = await import('@/lib/services/agents/tools/memory-adapter')
    const r = await memoryToolAdapter.invoke({
      ref: { namespace: 'memory', name: 'write', raw: 'memory:write' },
      input: { scope: 'projects/test', body: '# Test' },
      context: { runId: 'r', stepId: 's', goalId: 'g' },
    })
    expect(r.status).toBe('succeeded')
    expect(memoryServiceMock.write).toHaveBeenCalledWith('projects/test', '# Test', undefined)
    expect(r.output).toEqual({ id: 'new-id', path: '/x/summary.md' })
  })

  it('invoke unbekannter Tool-Name liefert failed', async () => {
    const { memoryToolAdapter } = await import('@/lib/services/agents/tools/memory-adapter')
    const r = await memoryToolAdapter.invoke({
      ref: { namespace: 'memory', name: 'unknown', raw: 'memory:unknown' },
      input: {},
      context: { runId: 'r', stepId: 's', goalId: 'g' },
    })
    expect(r.status).toBe('failed')
    expect(r.error).toMatch(/unbekanntes Memory-Tool/)
  })

  it('invoke faengt MemoryService-Errors als failed-Result', async () => {
    memoryServiceMock.read.mockRejectedValue(new Error('not found'))
    const { memoryToolAdapter } = await import('@/lib/services/agents/tools/memory-adapter')
    const r = await memoryToolAdapter.invoke({
      ref: { namespace: 'memory', name: 'read', raw: 'memory:read' },
      input: { ref: 'memory://projects/x' },
      context: { runId: 'r', stepId: 's', goalId: 'g' },
    })
    expect(r.status).toBe('failed')
    expect(r.error).toContain('not found')
  })
})
