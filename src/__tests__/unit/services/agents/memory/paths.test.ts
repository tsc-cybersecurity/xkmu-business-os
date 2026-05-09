import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('Memory Paths', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
  })

  it('getMemoryRoot nutzt AGENT_MEMORY_DIR wenn gesetzt', async () => {
    vi.stubEnv('AGENT_MEMORY_DIR', '/custom/memory')
    const { getMemoryRoot } = await import('@/lib/services/agents/memory/paths')
    expect(getMemoryRoot()).toBe('/custom/memory')
  })

  it('getMemoryRoot faellt zurueck auf data/agent-memory', async () => {
    vi.stubEnv('AGENT_MEMORY_DIR', '')
    const { getMemoryRoot } = await import('@/lib/services/agents/memory/paths')
    expect(getMemoryRoot()).toMatch(/data[\/\\]agent-memory$/)
  })

  it('scopeToFilePath baut korrekten Pfad', async () => {
    vi.stubEnv('AGENT_MEMORY_DIR', '/m')
    const { scopeToFilePath } = await import('@/lib/services/agents/memory/paths')
    expect(scopeToFilePath('projects/acme', 'summary.md')).toBe('/m/projects/acme/summary.md')
    expect(scopeToFilePath('areas/people/john', 'items.yaml')).toBe('/m/areas/people/john/items.yaml')
  })

  it('parseScope erkennt para aus scope', async () => {
    const { parseScope } = await import('@/lib/services/agents/memory/paths')
    expect(parseScope('projects/acme')).toEqual({ para: 'projects', remainder: 'acme' })
    expect(parseScope('areas/people/john')).toEqual({ para: 'areas', remainder: 'people/john' })
  })

  it('parseScope wirft bei unbekanntem PARA-Prefix', async () => {
    const { parseScope } = await import('@/lib/services/agents/memory/paths')
    expect(() => parseScope('unknown/foo')).toThrow(/Unbekannte PARA-Kategorie/)
  })

  it('isPathInsideMemoryRoot blockt path-traversal', async () => {
    vi.stubEnv('AGENT_MEMORY_DIR', '/m')
    const { isPathInsideMemoryRoot } = await import('@/lib/services/agents/memory/paths')
    expect(isPathInsideMemoryRoot('/m/projects/acme/summary.md')).toBe(true)
    expect(isPathInsideMemoryRoot('/etc/passwd')).toBe(false)
  })

  it('isPathInsideMemoryRoot blockt explizite ..-Segmente', async () => {
    vi.stubEnv('AGENT_MEMORY_DIR', '/m')
    const { isPathInsideMemoryRoot } = await import('@/lib/services/agents/memory/paths')
    expect(isPathInsideMemoryRoot('/m/projects/../../../etc/passwd')).toBe(false)
    expect(isPathInsideMemoryRoot('/m/projects/../../etc')).toBe(false)
    expect(isPathInsideMemoryRoot('/m/../m/projects/acme/summary.md')).toBe(true)  // resolves back inside
  })

  it('isPathInsideMemoryRoot blockt absolute Pfade ausserhalb Root', async () => {
    vi.stubEnv('AGENT_MEMORY_DIR', '/m')
    const { isPathInsideMemoryRoot } = await import('@/lib/services/agents/memory/paths')
    expect(isPathInsideMemoryRoot('/etc/passwd')).toBe(false)
    expect(isPathInsideMemoryRoot('/var/log/auth.log')).toBe(false)
  })
})
