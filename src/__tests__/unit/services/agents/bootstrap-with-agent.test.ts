import { describe, it, expect } from 'vitest'

describe('ToolRegistry-Bootstrap (mit agent-Adapter)', () => {
  it('agent-Namespace nach init verfuegbar', async () => {
    const { initializeToolRegistry } = await import('@/lib/services/agents/tools/bootstrap')
    const { ToolRegistry } = await import('@/lib/services/agents/tool-registry')
    initializeToolRegistry()
    expect(ToolRegistry.get('agent')).toBeDefined()
    expect(ToolRegistry.get('memory')).toBeDefined()
  })
})
