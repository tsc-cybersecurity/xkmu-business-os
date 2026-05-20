import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('IterationService.runIteration', () => {
  let lastIterationUpdate: Record<string, unknown> = {}
  let lastPlanUpdate: Record<string, unknown> = {}
  let enqueueNextCalls = 0

  beforeEach(() => {
    vi.resetModules()
    lastIterationUpdate = {}
    lastPlanUpdate = {}
    enqueueNextCalls = 0
  })

  // Hilfs-Mock: db so chainable, dass alle Calls sauber durchlaufen.
  // Tests overriden danach gezielt einzelne Mocks (z.B. select-results).
  function mockDb(opts: {
    plan: Record<string, unknown> | null
    lastIteration: Record<string, unknown> | null
    newIterationId?: string
  }) {
    // BusinessPlanService.get() ist separat gemockt (via globalThis); der
    // einzige db.select-Call hier ist loadLastIteration.
    const selectQueue: Array<unknown[]> = [
      opts.lastIteration ? [opts.lastIteration] : [],
    ]
    let selectCallIdx = 0

    vi.doMock('@/lib/db', () => {
      const updateChain: any = {
        set: vi.fn(function (this: any, val: any) {
          // Differenzieren: ob wir gerade iteration oder plan updaten ist
          // ueber die Where-Klausel feststellbar — wir merken einfach den
          // letzten Call pro Tabelle ueber globale Vars.
          if ('score' in (val.analysis ?? {}) || val.analysis !== undefined) {
            lastIterationUpdate = { ...lastIterationUpdate, ...val }
          } else if (val.status === 'completed' || val.status === 'failed' || val.status === 'running' || val.currentIteration !== undefined || val.finalScore !== undefined) {
            // wir interessieren uns vor allem fuer Plan-Status-Updates
            lastPlanUpdate = { ...lastPlanUpdate, ...val }
          } else {
            lastIterationUpdate = { ...lastIterationUpdate, ...val }
          }
          return this
        }),
        where: vi.fn().mockResolvedValue([]),
      }
      const insertChain: any = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ id: opts.newIterationId ?? 'iter-1' }]),
      }
      const selectChain: any = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockImplementation(() => {
          const result = selectQueue[selectCallIdx] ?? []
          selectCallIdx++
          return Promise.resolve(result)
        }),
      }
      return {
        db: {
          insert: vi.fn(() => insertChain),
          update: vi.fn(() => updateChain),
          select: vi.fn(() => selectChain),
        },
      }
    })
  }

  function mockActions(opts: {
    storyResult?: { success: boolean; data?: Record<string, unknown>; error?: string }
    planResult?: { success: boolean; data?: Record<string, unknown>; error?: string }
    simulationResult?: { success: boolean; data?: Record<string, unknown>; error?: string }
    analysisResult?: { success: boolean; data?: Record<string, unknown>; error?: string }
    revisionResult?: { success: boolean; data?: Record<string, unknown>; error?: string }
  }) {
    vi.doMock('@/lib/services/business-plan/actions', () => ({
      generateBusinessStoryAction: vi.fn().mockResolvedValue(
        opts.storyResult ?? { success: true, data: { story: 'A story' } },
      ),
      generateBusinessPlanAction: vi.fn().mockResolvedValue(
        opts.planResult ?? {
          success: true,
          data: { canvas: { problem: ['P'] }, kfw: { markdown: '## EXEC' } },
        },
      ),
      simulateWithMirofishAction: vi.fn().mockResolvedValue(
        opts.simulationResult ?? {
          success: true,
          data: { request: { question: 'Q' }, result: { summary: 'OK' } },
        },
      ),
      analyzeSimulationAction: vi.fn().mockResolvedValue(
        opts.analysisResult ?? {
          success: true,
          data: { score: 85, reasoning: 'gut', strengths: [], weaknesses: [], improvements: ['I1'] },
        },
      ),
      reviseBusinessPlanAction: vi.fn().mockResolvedValue(
        opts.revisionResult ?? {
          success: true,
          data: { canvas: { problem: ['P2'] }, kfw: { markdown: '## EXEC v2' } },
        },
      ),
    }))
  }

  function mockBusinessPlanService() {
    vi.doMock('@/lib/services/business-plan/business-plan.service', () => ({
      BusinessPlanService: {
        get: vi.fn().mockImplementation(async (id: string) => {
          // Wir leiten den plan aus mockDb-selectQueue ab. Damit der Test
          // nicht zu komplex wird, geben wir Tests ein flexibles override.
          return (globalThis as any).__planForBpService ?? null
        }),
        enqueueNextIteration: vi.fn().mockImplementation(async () => {
          enqueueNextCalls++
        }),
      },
    }))
  }

  it('marks plan as completed when score >= threshold', async () => {
    const plan = {
      id: 'p1', status: 'running', mode: 'both', inputType: 'quick',
      seedInput: { idea: 'X' }, maxIterations: 5, scoreThreshold: 80,
    }
    ;(globalThis as any).__planForBpService = plan
    mockDb({ plan, lastIteration: null })
    mockActions({
      analysisResult: { success: true, data: { score: 95, reasoning: 'top', strengths: [], weaknesses: [], improvements: [] } },
    })
    mockBusinessPlanService()

    const { IterationService } = await import('@/lib/services/business-plan/iteration.service')
    await IterationService.runIteration('p1')

    expect(lastPlanUpdate.status).toBe('completed')
    expect(enqueueNextCalls).toBe(0)
  })

  it('enqueues next iteration when score < threshold and iter < max', async () => {
    const plan = {
      id: 'p1', status: 'running', mode: 'canvas', inputType: 'quick',
      seedInput: { idea: 'X' }, maxIterations: 5, scoreThreshold: 80,
    }
    ;(globalThis as any).__planForBpService = plan
    mockDb({ plan, lastIteration: null })
    mockActions({
      analysisResult: { success: true, data: { score: 60, reasoning: 'mid', strengths: [], weaknesses: [], improvements: ['I'] } },
    })
    mockBusinessPlanService()

    const { IterationService } = await import('@/lib/services/business-plan/iteration.service')
    await IterationService.runIteration('p1')

    // Plan-Status sollte NICHT completed sein
    expect(lastPlanUpdate.status).not.toBe('completed')
    expect(enqueueNextCalls).toBe(1)
  })

  it('marks plan completed when reaching maxIterations even with low score', async () => {
    const plan = {
      id: 'p1', status: 'running', mode: 'canvas', inputType: 'quick',
      seedInput: { idea: 'X' }, maxIterations: 3, scoreThreshold: 80,
    }
    ;(globalThis as any).__planForBpService = plan
    // Simuliere: wir sind in Iteration 3 (lastIter.iterationNumber=2)
    mockDb({
      plan,
      lastIteration: { iterationNumber: 2, planCanvas: { problem: ['P'] }, analysis: { score: 50, improvements: ['I'] } },
    })
    mockActions({
      analysisResult: { success: true, data: { score: 55, reasoning: 'low', strengths: [], weaknesses: [], improvements: [] } },
    })
    mockBusinessPlanService()

    const { IterationService } = await import('@/lib/services/business-plan/iteration.service')
    await IterationService.runIteration('p1')

    expect(lastPlanUpdate.status).toBe('completed')
    expect(enqueueNextCalls).toBe(0)
  })

  it('marks plan failed when Mirofish simulation errors', async () => {
    const plan = {
      id: 'p1', status: 'running', mode: 'canvas', inputType: 'quick',
      seedInput: { idea: 'X' }, maxIterations: 5, scoreThreshold: 80,
    }
    ;(globalThis as any).__planForBpService = plan
    mockDb({ plan, lastIteration: null })
    mockActions({
      simulationResult: { success: false, error: 'Mirofish ECONNREFUSED' },
    })
    mockBusinessPlanService()

    const { IterationService } = await import('@/lib/services/business-plan/iteration.service')
    await expect(IterationService.runIteration('p1')).rejects.toThrow(/Mirofish/)
    expect(lastPlanUpdate.status).toBe('failed')
  })

  it('skips iteration if plan is not in running status', async () => {
    const plan = {
      id: 'p1', status: 'stopped', mode: 'canvas', inputType: 'quick',
      seedInput: { idea: 'X' }, maxIterations: 5, scoreThreshold: 80,
    }
    ;(globalThis as any).__planForBpService = plan
    mockDb({ plan, lastIteration: null })
    mockActions({})
    mockBusinessPlanService()

    const { IterationService } = await import('@/lib/services/business-plan/iteration.service')
    await IterationService.runIteration('p1')

    // Keine Iteration-Row angelegt, kein Status-Update
    expect(enqueueNextCalls).toBe(0)
    expect(lastIterationUpdate.status).toBeUndefined()
  })
})
