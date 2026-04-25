import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('WorkflowEngine — for_each step', () => {
  let lastStepResults: Array<Record<string, unknown>> = []
  let executedConfigs: Array<Record<string, unknown>> = []

  beforeEach(() => {
    vi.resetModules()
    lastStepResults = []
    executedConfigs = []

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
        execute: async (ctx: any, config: any) => {
          executedConfigs.push({ ...config, _ctxItem: ctx.stepResults.__item, _ctxIndex: (ctx.stepResults.__loop as any)?.index })
          if (name === 'fail_action') return { success: false, error: 'boom' }
          return { success: true, data: { fromAction: name } }
        },
      }),
    }))
  })

  it('iterates sequentially over data.<array>', async () => {
    const { WorkflowEngine } = await import('@/lib/services/workflow/engine')

    const steps = [
      {
        id: 'loop1', kind: 'for_each',
        source: 'data.tags',
        steps: [{ id: 'a', kind: 'action', action: 'noop' }],
      },
    ] as any

    await WorkflowEngine.executeWorkflow('wf', 'TestWf', steps, 'test', { tags: ['x', 'y', 'z'] })

    const summary = lastStepResults.find(r => r.kind === 'for_each')
    expect((summary?.result as any)?.iterations).toBe(3)
    expect((summary?.result as any)?.failedCount).toBe(0)
    const subs = lastStepResults.filter(r => (r.path as string).includes('iter['))
    expect(subs).toHaveLength(3)
    expect(subs.map(r => r.path)).toEqual(['1.iter[1].1', '1.iter[2].1', '1.iter[3].1'])
  })

  it('exposes __item and __loop in action context for templating', async () => {
    const { WorkflowEngine } = await import('@/lib/services/workflow/engine')

    const steps = [
      {
        id: 'loop1', kind: 'for_each',
        source: 'data.items',
        steps: [{ id: 'a', kind: 'action', action: 'noop', config: { passthrough: true } }],
      },
    ] as any

    await WorkflowEngine.executeWorkflow('wf', 'TestWf', steps, 'test', { items: ['alpha', 'beta'] })

    expect(executedConfigs).toHaveLength(2)
    expect(executedConfigs[0]._ctxItem).toBe('alpha')
    expect(executedConfigs[0]._ctxIndex).toBe(0)
    expect(executedConfigs[1]._ctxItem).toBe('beta')
    expect(executedConfigs[1]._ctxIndex).toBe(1)
  })

  it('fails the for_each step when source is not an array', async () => {
    const { WorkflowEngine } = await import('@/lib/services/workflow/engine')

    const steps = [
      { id: 'loop1', kind: 'for_each', source: 'data.notArray', steps: [{ id: 'a', kind: 'action', action: 'noop' }] },
    ] as any

    await WorkflowEngine.executeWorkflow('wf', 'TestWf', steps, 'test', { notArray: 'string-not-array' })

    const summary = lastStepResults.find(r => r.kind === 'for_each')
    expect(summary?.status).toBe('failed')
    expect(summary?.error).toMatch(/not.*array|kein Array/i)
  })

  it('fails when iterations > MAX_LOOP_ITERATIONS', async () => {
    const { WorkflowEngine } = await import('@/lib/services/workflow/engine')

    const big = Array.from({ length: 101 }, (_, i) => i)
    const steps = [
      { id: 'loop1', kind: 'for_each', source: 'data.big', steps: [{ id: 'a', kind: 'action', action: 'noop' }] },
    ] as any

    await WorkflowEngine.executeWorkflow('wf', 'TestWf', steps, 'test', { big })

    const summary = lastStepResults.find(r => r.kind === 'for_each')
    expect(summary?.status).toBe('failed')
    expect(summary?.error).toMatch(/iterations|loop/i)
  })

  it('counts failed iterations in summary but keeps workflow running', async () => {
    const { WorkflowEngine } = await import('@/lib/services/workflow/engine')

    const steps = [
      {
        id: 'loop1', kind: 'for_each',
        source: 'data.items',
        steps: [{ id: 'a', kind: 'action', action: 'fail_action' }],
      },
      { id: 'after', kind: 'action', action: 'after_loop' },
    ] as any

    await WorkflowEngine.executeWorkflow('wf', 'TestWf', steps, 'test', { items: [1, 2] })

    const summary = lastStepResults.find(r => r.kind === 'for_each')
    expect((summary?.result as any)?.failedCount).toBe(2)

    const after = lastStepResults.find(r => r.path === '2')
    expect(after?.status).toBe('completed')
  })

  it('handles empty array gracefully', async () => {
    const { WorkflowEngine } = await import('@/lib/services/workflow/engine')

    const steps = [
      { id: 'loop1', kind: 'for_each', source: 'data.empty', steps: [{ id: 'a', kind: 'action', action: 'noop' }] },
    ] as any

    await WorkflowEngine.executeWorkflow('wf', 'TestWf', steps, 'test', { empty: [] })

    const summary = lastStepResults.find(r => r.kind === 'for_each')
    expect((summary?.result as any)?.iterations).toBe(0)
    expect((summary?.result as any)?.failedCount).toBe(0)
  })
})
