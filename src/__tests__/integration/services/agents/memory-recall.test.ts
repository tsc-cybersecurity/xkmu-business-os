import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import path from 'node:path'
import fs from 'node:fs/promises'
import os from 'node:os'

const skip = !process.env.DATABASE_URL ? 'DATABASE_URL fehlt — Recall-Test wird uebersprungen' : null

describe.skipIf(skip !== null)('MemoryService Recall', () => {
  let tmpRoot: string

  beforeAll(async () => {
    tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'agents-memory-recall-'))
    vi.stubEnv('AGENT_MEMORY_DIR', tmpRoot)
    // Force lexical/BM25-only mode to keep recall test hermetic and free.
    // Override with AGENT_RECALL_USE_REAL_EMBEDDINGS=1 to test hybrid scoring.
    if (process.env.AGENT_RECALL_USE_REAL_EMBEDDINGS !== '1') {
      vi.stubEnv('GOOGLE_AI_API_KEY', '')
    }
    const { MemoryService } = await import('@/lib/services/agents')
    const { MEMORY_FIXTURES } = await import('@/lib/services/agents/memory/index-fixtures')
    for (const f of MEMORY_FIXTURES) {
      await MemoryService.write(f.scope, f.body)
    }
  }, 60_000)

  afterAll(async () => {
    await fs.rm(tmpRoot, { recursive: true, force: true })
    vi.unstubAllEnvs()
  })

  it('Recall@1 mind. 80% fuer alle Fixtures', async () => {
    const { MemoryService } = await import('@/lib/services/agents')
    const { MEMORY_FIXTURES } = await import('@/lib/services/agents/memory/index-fixtures')
    let total = 0
    let hits = 0
    for (const f of MEMORY_FIXTURES) {
      for (const query of f.expectedQueries) {
        total += 1
        const found = await MemoryService.search(query, undefined, 3)
        if (found.length > 0 && found[0].scope === f.scope) hits += 1
      }
    }
    const recall = hits / total
    // eslint-disable-next-line no-console
    console.log(`Recall@1 = ${(recall * 100).toFixed(1)}% (${hits}/${total})`)
    expect(recall).toBeGreaterThanOrEqual(0.8)
  }, 60_000)

  it('Recall@3 mind. 95%', async () => {
    const { MemoryService } = await import('@/lib/services/agents')
    const { MEMORY_FIXTURES } = await import('@/lib/services/agents/memory/index-fixtures')
    let total = 0
    let hits = 0
    for (const f of MEMORY_FIXTURES) {
      for (const query of f.expectedQueries) {
        total += 1
        const found = await MemoryService.search(query, undefined, 3)
        if (found.some((h) => h.scope === f.scope)) hits += 1
      }
    }
    expect(hits / total).toBeGreaterThanOrEqual(0.95)
  }, 60_000)
})
