import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('WorkflowEngine actionResults keying', () => {
  let firstCallStepResults: Record<string, unknown> | undefined
  let secondCallStepResults: Record<string, unknown> | undefined

  beforeEach(() => {
    vi.resetModules()
    firstCallStepResults = undefined
    secondCallStepResults = undefined

    vi.doMock('@/lib/db', () => {
      const insertChain: any = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ id: 'run-1' }]),
      }
      const updateChain: any = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      }
      const selectChain: any = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ id: 'wf-1', name: 'TestWf', steps: [], trigger: 'test' }]),
      }
      return {
        db: {
          insert: vi.fn(() => insertChain),
          update: vi.fn(() => updateChain),
          select: vi.fn(() => selectChain),
        },
      }
    })

    vi.doMock('@/lib/services/workflow/action-registry', async () => {
      return {
        getAction: (name: string) => {
          if (name === 'first_action' || name === 'echo') {
            return {
              name,
              execute: async (ctx: any) => {
                if (!firstCallStepResults) firstCallStepResults = { ...ctx.stepResults }
                else if (!secondCallStepResults) secondCallStepResults = { ...ctx.stepResults }
                return { success: true, data: { value: name + '-result' } }
              },
            }
          }
          return undefined
        },
      }
    })
  })

  it('uses step.id as the actionResults key when present, falling back to action name', async () => {
    const { WorkflowEngine } = await import('@/lib/services/workflow/engine')

    const steps = [
      { action: 'echo', id: 'step_a' },
      { action: 'echo', id: 'step_b' },
    ]

    await WorkflowEngine.executeWorkflow('wf-1', 'TestWf', steps as any, 'test', {})

    expect(firstCallStepResults).toEqual({})
    expect(secondCallStepResults).toMatchObject({
      step_a: { value: 'echo-result' },
      echo: { value: 'echo-result' },
    })
  })

  it('falls back to action name when step.id is missing (existing workflows)', async () => {
    const { WorkflowEngine } = await import('@/lib/services/workflow/engine')

    const steps = [
      { action: 'first_action' },
      { action: 'echo' },
    ]

    await WorkflowEngine.executeWorkflow('wf-1', 'TestWf', steps as any, 'test', {})

    expect(secondCallStepResults).toMatchObject({
      first_action: { value: 'first_action-result' },
    })
  })
})
