import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('WorkflowEngine — Parallel step', () => {
  let lastStepResults: Array<Record<string, unknown>> = []
  let executionOrder: string[] = []

  beforeEach(() => {
    vi.resetModules()
    lastStepResults = []
    executionOrder = []

    vi.doMock('@/lib/db', () => {
      const insertChain: any = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ id: 'run-1' }]),
      }
      const updateChain: any = {
        set: vi.fn(function(this: any, val: any) {
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
        execute: async () => {
          executionOrder.push(name)
          if (name === 'fail_action') return { success: false, error: 'boom' }
          return { success: true, data: { fromAction: name } }
        },
      }),
    }))
  })

  it('runs all sub-steps and collects results in deterministic order', async () => {
    const { WorkflowEngine } = await import('@/lib/services/workflow/engine')

    const steps = [
      {
        id: 'p1', kind: 'parallel',
        steps: [
          { id: 's1', kind: 'action', action: 'task_a' },
          { id: 's2', kind: 'action', action: 'task_b' },
          { id: 's3', kind: 'action', action: 'task_c' },
        ],
      },
    ] as any

    await WorkflowEngine.executeWorkflow('wf', 'TestWf', steps, 'test', {})

    const summary = lastStepResults.find(r => r.kind === 'parallel')
    const sub = lastStepResults.filter(r => (r.path as string).startsWith('1.parallel.'))
    expect((summary?.result as any)?.ranSubSteps).toBe(3)
    expect((summary?.result as any)?.failedCount).toBe(0)
    expect(sub).toHaveLength(3)
    // Reihenfolge im stepResults-Array deterministisch nach Sub-Index
    expect(sub.map(r => r.path)).toEqual(['1.parallel.1', '1.parallel.2', '1.parallel.3'])
  })

  it('counts failed sub-steps but keeps workflow running', async () => {
    const { WorkflowEngine } = await import('@/lib/services/workflow/engine')

    const steps = [
      {
        id: 'p1', kind: 'parallel',
        steps: [
          { id: 's1', kind: 'action', action: 'task_a' },
          { id: 's2', kind: 'action', action: 'fail_action' },
          { id: 's3', kind: 'action', action: 'task_c' },
        ],
      },
      { id: 'after', kind: 'action', action: 'after_parallel' },
    ] as any

    await WorkflowEngine.executeWorkflow('wf', 'TestWf', steps, 'test', {})

    const summary = lastStepResults.find(r => r.kind === 'parallel')
    expect((summary?.result as any)?.failedCount).toBe(1)

    const after = lastStepResults.find(r => r.path === '2')
    expect(after?.status).toBe('completed')
  })

  it('handles empty parallel.steps gracefully', async () => {
    const { WorkflowEngine } = await import('@/lib/services/workflow/engine')

    const steps = [
      { id: 'p1', kind: 'parallel', steps: [] },
    ] as any

    await WorkflowEngine.executeWorkflow('wf', 'TestWf', steps, 'test', {})

    const summary = lastStepResults.find(r => r.kind === 'parallel')
    expect((summary?.result as any)?.ranSubSteps).toBe(0)
    expect((summary?.result as any)?.failedCount).toBe(0)
  })
})
