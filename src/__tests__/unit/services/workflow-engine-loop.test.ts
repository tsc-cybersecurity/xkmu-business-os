import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('WorkflowEngine — loop step', () => {
  let lastStepResults: Array<Record<string, unknown>> = []
  let executedConfigs: Array<Record<string, unknown>> = []
  // mutable Counter, den das stop_action-Action im Action-Registry-Mock
  // sehen kann — wird in einzelnen Tests befuellt.
  let actionCounter = { value: 0 }

  beforeEach(() => {
    vi.resetModules()
    lastStepResults = []
    executedConfigs = []
    actionCounter = { value: 0 }

    vi.doMock('@/lib/db', () => {
      const insertChain: any = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ id: 'run-1' }]),
      }
      const updateChain: any = {
        set: vi.fn(function (this: any, val: any) {
          if (val.stepResults) lastStepResults = val.stepResults
          return this
        }),
        where: vi.fn().mockResolvedValue([]),
      }
      const selectChain: any = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      }
      return {
        db: {
          insert: vi.fn(() => insertChain),
          update: vi.fn(() => updateChain),
          select: vi.fn(() => selectChain),
        },
      }
    })

    vi.doMock('@/lib/services/workflow/action-registry', async () => ({
      getAction: (name: string) => ({
        name,
        execute: async (ctx: any, config: any) => {
          executedConfigs.push({
            action: name,
            config: { ...config },
            _loopIndex: (ctx.stepResults.__loop as any)?.index,
          })
          if (name === 'increment') {
            actionCounter.value += 1
            return { success: true, data: { count: actionCounter.value } }
          }
          if (name === 'fail_action') {
            return { success: false, error: 'boom' }
          }
          return { success: true, data: { fromAction: name } }
        },
      }),
    }))
  })

  it('iterates maxIterations times when no condition', async () => {
    const { WorkflowEngine } = await import('@/lib/services/workflow/engine')

    const steps = [
      {
        id: 'loop1',
        kind: 'loop',
        maxIterations: 4,
        steps: [{ id: 'a', kind: 'action', action: 'increment' }],
      },
    ] as any

    await WorkflowEngine.executeWorkflow('wf', 'LoopTest', steps, 'test', {})

    const summary = lastStepResults.find((r) => r.kind === 'loop')
    expect(summary).toBeDefined()
    expect((summary?.result as any)?.iterations).toBe(4)
    expect((summary?.result as any)?.failedCount).toBe(0)
    expect(actionCounter.value).toBe(4)

    const subs = lastStepResults.filter((r) =>
      typeof r.path === 'string' && (r.path as string).includes('loop['),
    )
    expect(subs).toHaveLength(4)
    expect(subs.map((r) => r.path)).toEqual([
      '1.loop[1].1',
      '1.loop[2].1',
      '1.loop[3].1',
      '1.loop[4].1',
    ])
  })

  it('exits early when condition becomes false mid-loop', async () => {
    const { WorkflowEngine } = await import('@/lib/services/workflow/engine')

    // Pre-Action initialisiert steps.increment.count=1 BEVOR der Loop startet.
    // Loop laeuft, solange increment.count < 3:
    //   vor Iter1: count=1 → 1<3 true → run → count=2
    //   vor Iter2: count=2 → 2<3 true → run → count=3
    //   vor Iter3: count=3 → 3<3 false → exit
    // Erwartung: 2 Loop-Iterationen + 1 Pre-Action = 3 total increment-Aufrufe
    const steps = [
      { id: 'increment', kind: 'action', action: 'increment' },
      {
        id: 'loop1',
        kind: 'loop',
        maxIterations: 10,
        condition: 'steps.increment.count < 3',
        steps: [{ id: 'increment', kind: 'action', action: 'increment' }],
      },
    ] as any

    await WorkflowEngine.executeWorkflow('wf', 'LoopEarlyExit', steps, 'test', {})

    const summary = lastStepResults.find((r) => r.kind === 'loop')
    expect((summary?.result as any)?.iterations).toBe(2)
    expect(actionCounter.value).toBe(3) // 1 pre + 2 loop
  })

  it('does not enter loop body when condition is initially false', async () => {
    const { WorkflowEngine } = await import('@/lib/services/workflow/engine')

    const steps = [
      {
        id: 'loop1',
        kind: 'loop',
        maxIterations: 5,
        condition: "data.shouldRun == 'yes'", // wir uebergeben 'no'
        steps: [{ id: 'a', kind: 'action', action: 'increment' }],
      },
    ] as any

    await WorkflowEngine.executeWorkflow('wf', 'LoopNoEnter', steps, 'test', { shouldRun: 'no' })

    const summary = lastStepResults.find((r) => r.kind === 'loop')
    expect((summary?.result as any)?.iterations).toBe(0)
    expect(actionCounter.value).toBe(0)
  })

  it('caps maxIterations to MAX_LOOP_ITERATIONS (100)', async () => {
    const { WorkflowEngine } = await import('@/lib/services/workflow/engine')

    const steps = [
      {
        id: 'loop1',
        kind: 'loop',
        maxIterations: 9999,
        steps: [{ id: 'a', kind: 'action', action: 'noop' }],
      },
    ] as any

    await WorkflowEngine.executeWorkflow('wf', 'LoopCap', steps, 'test', {})

    const summary = lastStepResults.find((r) => r.kind === 'loop')
    // hard cap 100 — siehe MAX_LOOP_ITERATIONS in engine.ts
    expect((summary?.result as any)?.iterations).toBe(100)
  })

  it('fails the loop step when maxIterations is non-positive', async () => {
    const { WorkflowEngine } = await import('@/lib/services/workflow/engine')

    const steps = [
      {
        id: 'loop1',
        kind: 'loop',
        maxIterations: 0,
        steps: [{ id: 'a', kind: 'action', action: 'noop' }],
      },
    ] as any

    await WorkflowEngine.executeWorkflow('wf', 'LoopZero', steps, 'test', {})

    const summary = lastStepResults.find((r) => r.kind === 'loop')
    expect(summary?.status).toBe('failed')
    expect(actionCounter.value).toBe(0)
  })

  it('exposes __loop.index to inner action context', async () => {
    const { WorkflowEngine } = await import('@/lib/services/workflow/engine')

    const steps = [
      {
        id: 'loop1',
        kind: 'loop',
        maxIterations: 3,
        steps: [{ id: 'a', kind: 'action', action: 'noop' }],
      },
    ] as any

    await WorkflowEngine.executeWorkflow('wf', 'LoopIndex', steps, 'test', {})

    const indices = executedConfigs.map((c) => c._loopIndex)
    expect(indices).toEqual([0, 1, 2])
  })

  it('counts failed sub-step iterations in failedCount', async () => {
    const { WorkflowEngine } = await import('@/lib/services/workflow/engine')

    const steps = [
      {
        id: 'loop1',
        kind: 'loop',
        maxIterations: 3,
        steps: [{ id: 'a', kind: 'action', action: 'fail_action' }],
      },
    ] as any

    await WorkflowEngine.executeWorkflow('wf', 'LoopFail', steps, 'test', {})

    const summary = lastStepResults.find((r) => r.kind === 'loop')
    expect((summary?.result as any)?.iterations).toBe(3)
    expect((summary?.result as any)?.failedCount).toBe(3)
  })
})
