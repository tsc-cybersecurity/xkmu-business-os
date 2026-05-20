import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('MirofishClient', () => {
  const ORIGINAL_ENV = process.env.MIROFISH_BASE_URL

  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    if (ORIGINAL_ENV === undefined) delete process.env.MIROFISH_BASE_URL
    else process.env.MIROFISH_BASE_URL = ORIGINAL_ENV
  })

  describe('healthcheck', () => {
    it('returns true on any HTTP response (Flask is alive)', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }))
      const { MirofishClient } = await import('@/lib/services/mirofish/client')
      expect(await MirofishClient.healthcheck()).toBe(true)
    })

    it('returns false on network error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')))
      const { MirofishClient } = await import('@/lib/services/mirofish/client')
      expect(await MirofishClient.healthcheck()).toBe(false)
    })
  })

  describe('simulate (multi-step pipeline)', () => {
    /**
     * Verdrahtet einen Sequenz-Mock für die 8 fetch-Calls einer kompletten
     * Pipeline. Jede Call-Sequenz ist URL-basiert — wir routen via String-Match.
     */
    function setupHappyPath() {
      const calls: Array<{ url: string; init?: RequestInit }> = []
      const fetchMock = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
        calls.push({ url, init })
        // Step 1 — ontology/generate (multipart)
        if (url.endsWith('/api/graph/ontology/generate')) {
          return {
            ok: true,
            json: async () => ({
              success: true,
              data: { project_id: 'proj_abc', ontology: {}, files: [], total_text_length: 100 },
            }),
          }
        }
        // Step 2 — graph/build
        if (url.endsWith('/api/graph/build')) {
          return {
            ok: true,
            json: async () => ({
              success: true,
              data: { project_id: 'proj_abc', task_id: 'task_build_1', message: 'started' },
            }),
          }
        }
        // Step 3 — graph/task/<id> polling — returnt direkt completed
        if (url.includes('/api/graph/task/')) {
          return {
            ok: true,
            json: async () => ({
              success: true,
              data: {
                task_id: 'task_build_1',
                status: 'completed',
                progress: 100,
                result: { graph_id: 'mirofish_xyz' },
              },
            }),
          }
        }
        // Step 4 — simulation/create
        if (url.endsWith('/api/simulation/create')) {
          return {
            ok: true,
            json: async () => ({
              success: true,
              data: {
                simulation_id: 'sim_1',
                project_id: 'proj_abc',
                graph_id: 'mirofish_xyz',
                status: 'created',
              },
            }),
          }
        }
        // Step 5 — simulation/prepare
        if (url.endsWith('/api/simulation/prepare')) {
          return {
            ok: true,
            json: async () => ({ success: true, data: { task_id: 'task_prep_1' } }),
          }
        }
        // Step 6 — simulation/prepare/status — sofort ready
        if (url.endsWith('/api/simulation/prepare/status')) {
          return {
            ok: true,
            json: async () => ({ success: true, data: { status: 'ready', progress: 100 } }),
          }
        }
        // Step 7 — simulation/start
        if (url.endsWith('/api/simulation/start')) {
          return { ok: true, json: async () => ({ success: true, data: { started: true } }) }
        }
        // Step 8 — simulation/<id>/run-status — sofort completed
        if (url.includes('/run-status')) {
          return {
            ok: true,
            json: async () => ({
              success: true,
              data: {
                simulation_id: 'sim_1',
                runner_status: 'completed',
                current_round: 20,
                total_rounds: 20,
                progress_percent: 100,
                total_actions_count: 350,
              },
            }),
          }
        }
        // Final aggregation
        if (url.includes('/timeline')) {
          return { ok: true, json: async () => ({ success: true, data: { timeline: [{ round: 1 }] } }) }
        }
        if (url.includes('/posts')) {
          return { ok: true, json: async () => ({ success: true, data: { posts: [{ id: 'p1' }] } }) }
        }
        if (url.includes('/comments')) {
          return { ok: true, json: async () => ({ success: true, data: { comments: [] } }) }
        }
        if (url.includes('/agent-stats')) {
          return { ok: true, json: async () => ({ success: true, data: { stats: [{ agent: 'a1' }] } }) }
        }
        throw new Error(`Unexpected fetch in mock: ${url}`)
      })
      vi.stubGlobal('fetch', fetchMock)
      return { fetchMock, calls }
    }

    it('runs all 8 pipeline steps and aggregates results', async () => {
      const { fetchMock, calls } = setupHappyPath()
      const { MirofishClient } = await import('@/lib/services/mirofish/client')

      const result = await MirofishClient.simulate({
        simulationRequirement: 'Wie reagieren KMU?',
        seedMaterials: [{ filename: 'plan.md', contentType: 'text/markdown', content: '# Plan' }],
        pollIntervalMs: 1, // schnell
      })

      expect(result.simulationId).toBe('sim_1')
      expect(result.projectId).toBe('proj_abc')
      expect(result.graphId).toBe('mirofish_xyz')
      expect(result.status).toBe('completed')
      expect(result.timeline).toEqual([{ round: 1 }])
      expect(result.posts).toEqual([{ id: 'p1' }])
      expect(result.agentStats).toEqual([{ agent: 'a1' }])

      // 8 Step-Endpoints + 4 Aggregation-Endpoints = 12 fetch-Calls minimum
      expect(fetchMock).toHaveBeenCalled()
      const urls = calls.map((c) => c.url)
      expect(urls.some((u) => u.endsWith('/api/graph/ontology/generate'))).toBe(true)
      expect(urls.some((u) => u.endsWith('/api/graph/build'))).toBe(true)
      expect(urls.some((u) => u.includes('/api/graph/task/'))).toBe(true)
      expect(urls.some((u) => u.endsWith('/api/simulation/create'))).toBe(true)
      expect(urls.some((u) => u.endsWith('/api/simulation/prepare'))).toBe(true)
      expect(urls.some((u) => u.endsWith('/api/simulation/start'))).toBe(true)
      expect(urls.some((u) => u.includes('/run-status'))).toBe(true)
    })

    it('uses MIROFISH_BASE_URL from env', async () => {
      process.env.MIROFISH_BASE_URL = 'https://mirofish.example.com'
      const { fetchMock, calls } = setupHappyPath()
      const { MirofishClient } = await import('@/lib/services/mirofish/client')

      await MirofishClient.simulate({
        simulationRequirement: 'Q',
        seedMaterials: [{ filename: 'f.md', contentType: 'text/markdown', content: '#' }],
        pollIntervalMs: 1,
      })
      expect(fetchMock).toHaveBeenCalled()
      expect(calls.every((c) => c.url.startsWith('https://mirofish.example.com'))).toBe(true)
    })

    it('throws when graph build task reports failed', async () => {
      const fetchMock = vi.fn().mockImplementation(async (url: string) => {
        if (url.endsWith('/api/graph/ontology/generate')) {
          return { ok: true, json: async () => ({ success: true, data: { project_id: 'p', ontology: {}, files: [], total_text_length: 0 } }) }
        }
        if (url.endsWith('/api/graph/build')) {
          return { ok: true, json: async () => ({ success: true, data: { project_id: 'p', task_id: 't', message: '' } }) }
        }
        if (url.includes('/api/graph/task/')) {
          return { ok: true, json: async () => ({ success: true, data: { task_id: 't', status: 'failed', error: 'LLM error' } }) }
        }
        throw new Error(`unexpected fetch: ${url}`)
      })
      vi.stubGlobal('fetch', fetchMock)
      const { MirofishClient } = await import('@/lib/services/mirofish/client')

      await expect(
        MirofishClient.simulate({
          simulationRequirement: 'Q',
          seedMaterials: [{ filename: 'f.md', contentType: 'text/markdown', content: '#' }],
          pollIntervalMs: 1,
        }),
      ).rejects.toThrow(/graph build task.*failed/)
    })

    it('throws if HTTP request fails mid-pipeline', async () => {
      let callCount = 0
      const fetchMock = vi.fn().mockImplementation(async (url: string) => {
        callCount++
        if (callCount === 1) {
          // Erster Call (ontology/generate) — Server down
          return { ok: false, status: 500, text: async () => 'internal error' }
        }
        throw new Error(`unexpected fetch beyond step 1: ${url}`)
      })
      vi.stubGlobal('fetch', fetchMock)
      const { MirofishClient } = await import('@/lib/services/mirofish/client')

      await expect(
        MirofishClient.simulate({
          simulationRequirement: 'Q',
          seedMaterials: [{ filename: 'f.md', contentType: 'text/markdown', content: '#' }],
          pollIntervalMs: 1,
        }),
      ).rejects.toThrow(/HTTP 500/)
    })

    it('polls run-status until completed', async () => {
      let runStatusCalls = 0
      const fetchMock = vi.fn().mockImplementation(async (url: string) => {
        if (url.endsWith('/api/graph/ontology/generate')) {
          return { ok: true, json: async () => ({ success: true, data: { project_id: 'p', ontology: {}, files: [], total_text_length: 0 } }) }
        }
        if (url.endsWith('/api/graph/build')) {
          return { ok: true, json: async () => ({ success: true, data: { project_id: 'p', task_id: 't', message: '' } }) }
        }
        if (url.includes('/api/graph/task/')) {
          return { ok: true, json: async () => ({ success: true, data: { task_id: 't', status: 'completed', result: { graph_id: 'g' } } }) }
        }
        if (url.endsWith('/api/simulation/create')) {
          return { ok: true, json: async () => ({ success: true, data: { simulation_id: 's', project_id: 'p', graph_id: 'g', status: 'created' } }) }
        }
        if (url.endsWith('/api/simulation/prepare')) {
          return { ok: true, json: async () => ({ success: true, data: { task_id: 'tp' } }) }
        }
        if (url.endsWith('/api/simulation/prepare/status')) {
          return { ok: true, json: async () => ({ success: true, data: { status: 'ready' } }) }
        }
        if (url.endsWith('/api/simulation/start')) {
          return { ok: true, json: async () => ({ success: true, data: {} }) }
        }
        if (url.includes('/run-status')) {
          runStatusCalls++
          // erste 2 Polls running, 3. completed
          const status = runStatusCalls < 3 ? 'running' : 'completed'
          return { ok: true, json: async () => ({ success: true, data: { simulation_id: 's', runner_status: status, current_round: runStatusCalls * 5, total_rounds: 20 } }) }
        }
        // Aggregation defaults
        return { ok: true, json: async () => ({ success: true, data: {} }) }
      })
      vi.stubGlobal('fetch', fetchMock)
      const { MirofishClient } = await import('@/lib/services/mirofish/client')

      const result = await MirofishClient.simulate({
        simulationRequirement: 'Q',
        seedMaterials: [{ filename: 'f.md', contentType: 'text/markdown', content: '#' }],
        pollIntervalMs: 1,
      })
      expect(result.status).toBe('completed')
      expect(runStatusCalls).toBe(3)
    })
  })
})
