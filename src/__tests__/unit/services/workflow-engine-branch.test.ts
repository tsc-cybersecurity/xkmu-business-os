import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('WorkflowEngine — Branch step', () => {
  let lastStepResults: Array<Record<string, unknown>> = []

  beforeEach(() => {
    vi.resetModules()
    lastStepResults = []

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
        execute: async () => ({ success: true, data: { fromAction: name } }),
      }),
    }))
  })

  it('runs only THEN branch when ifCondition is true', async () => {
    const { WorkflowEngine } = await import('@/lib/services/workflow/engine')

    const steps = [
      {
        id: 'br1', kind: 'branch', ifCondition: "data.priority == 'hoch'",
        then: [{ id: 'a1', kind: 'action', action: 'first' }],
        else: [{ id: 'b1', kind: 'action', action: 'second' }],
      },
    ] as any

    await WorkflowEngine.executeWorkflow('wf', 'TestWf', steps, 'test', { priority: 'hoch' })

    const branch = lastStepResults.find(r => r.kind === 'branch')
    const a1 = lastStepResults.find(r => (r.path as string) === '1.then.1')
    const b1 = lastStepResults.find(r => (r.path as string) === '1.else.1')
    expect((branch?.result as any)?.taken).toBe('then')
    expect(a1?.status).toBe('completed')
    expect(b1).toBeUndefined()
  })

  it('runs only ELSE branch when ifCondition is false', async () => {
    const { WorkflowEngine } = await import('@/lib/services/workflow/engine')

    const steps = [
      {
        id: 'br1', kind: 'branch', ifCondition: "data.priority == 'hoch'",
        then: [{ id: 'a1', kind: 'action', action: 'first' }],
        else: [{ id: 'b1', kind: 'action', action: 'second' }],
      },
    ] as any

    await WorkflowEngine.executeWorkflow('wf', 'TestWf', steps, 'test', { priority: 'mittel' })

    const branch = lastStepResults.find(r => r.kind === 'branch')
    const b1 = lastStepResults.find(r => (r.path as string) === '1.else.1')
    expect((branch?.result as any)?.taken).toBe('else')
    expect(b1?.status).toBe('completed')
  })

  it('produces taken=none when condition false and no else', async () => {
    const { WorkflowEngine } = await import('@/lib/services/workflow/engine')

    const steps = [
      {
        id: 'br1', kind: 'branch', ifCondition: 'data.required != null',
        then: [{ id: 'a1', kind: 'action', action: 'first' }],
      },
    ] as any

    await WorkflowEngine.executeWorkflow('wf', 'TestWf', steps, 'test', {})

    const branch = lastStepResults.find(r => r.kind === 'branch')
    expect((branch?.result as any)?.taken).toBe('none')
    expect(lastStepResults.filter(r => r.kind === 'action')).toHaveLength(0)
  })

  it('legacy actionStep without kind still runs (backwards-compat)', async () => {
    const { WorkflowEngine } = await import('@/lib/services/workflow/engine')

    const steps = [
      { action: 'legacy_no_kind' },  // no kind, no id — old workflow
    ] as any

    await WorkflowEngine.executeWorkflow('wf', 'TestWf', steps, 'test', {})

    expect(lastStepResults).toHaveLength(1)
    expect(lastStepResults[0].kind).toBe('action')
    expect(lastStepResults[0].action).toBe('legacy_no_kind')
    expect(lastStepResults[0].status).toBe('completed')
  })
})
