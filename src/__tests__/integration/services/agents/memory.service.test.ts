import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import path from 'node:path'
import fs from 'node:fs/promises'
import os from 'node:os'

const skip = !process.env.DATABASE_URL ? 'DATABASE_URL fehlt' : null

describe.skipIf(skip !== null)('MemoryService Integration', () => {
  let tmpRoot: string

  beforeAll(async () => {
    tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'agents-memory-test-'))
    vi.stubEnv('AGENT_MEMORY_DIR', tmpRoot)
    vi.stubEnv('GOOGLE_AI_API_KEY', '')
  })

  afterAll(async () => {
    await fs.rm(tmpRoot, { recursive: true, force: true })
    vi.unstubAllEnvs()
  })

  it('write erstellt summary.md mit Frontmatter', async () => {
    const { MemoryService } = await import('@/lib/services/agents')
    const r = await MemoryService.write('projects/integration-test', '# Test\nBody')
    expect(r.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(r.path).toMatch(/projects[\/\\]integration-test[\/\\]summary\.md$/)
    const written = await fs.readFile(r.path, 'utf8')
    expect(written).toContain('---')
    expect(written).toContain('para: projects')
    expect(written).toContain('# Test')
  })

  it('read laedt geschriebenes File ueber scope', async () => {
    const { MemoryService } = await import('@/lib/services/agents')
    const r = await MemoryService.read('projects/integration-test')
    expect(r.body.trim()).toBe('# Test\nBody')
  })

  it('write fuegt items in items.yaml hinzu', async () => {
    const { MemoryService } = await import('@/lib/services/agents')
    await MemoryService.write('projects/integration-test', '# Test\nBody', [
      { fact: 'Fakt A', source: 'manual' },
      { fact: 'Fakt B', source: 'manual' },
    ])
    const r = await MemoryService.read('projects/integration-test')
    expect(r.items).toHaveLength(2)
    expect(r.items[0].fact).toBe('Fakt A')
  })

  it('list liefert Eintraege fuer projects', async () => {
    const { MemoryService } = await import('@/lib/services/agents')
    const items = await MemoryService.list('projects', 50)
    expect(items.some((i) => i.scope === 'projects/integration-test')).toBe(true)
  })

  it('expandRefs liefert Inhalt oder leeren Body', async () => {
    const { MemoryService } = await import('@/lib/services/agents')
    const expanded = await MemoryService.expandRefs(['memory://projects/integration-test', 'memory://projects/does-not-exist'])
    expect(expanded[0].body.length).toBeGreaterThan(0)
    expect(expanded[1].body).toBe('')
  })
})
