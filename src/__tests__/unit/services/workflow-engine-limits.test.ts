import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('WorkflowEngine — defensive limits', () => {
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
      getAction: () => ({
        execute: async () => ({ success: true, data: {} }),
      }),
    }))
  })

  it('rejects parallel with > 100 sub-steps', async () => {
    const { WorkflowEngine } = await import('@/lib/services/workflow/engine')

    const subSteps = Array.from({ length: 101 }, (_, i) => ({
      id: `s${i}`, kind: 'action', action: 'noop',
    }))
    const steps = [{ id: 'p1', kind: 'parallel', steps: subSteps }] as any

    await WorkflowEngine.executeWorkflow('wf', 'TestWf', steps, 'test', {})

    const summary = lastStepResults.find(r => r.kind === 'parallel')
    expect(summary?.status).toBe('failed')
    expect(summary?.error).toMatch(/cardinality/i)
    // No sub-steps run
    expect(lastStepResults.filter(r => (r.path as string).startsWith('1.parallel.'))).toHaveLength(0)
  })

  it('rejects nesting deeper than 10 levels', async () => {
    const { WorkflowEngine } = await import('@/lib/services/workflow/engine')

    // Build 12 nested branches: branch -> then -> branch -> then -> ...
    function buildNested(depth: number): any[] {
      if (depth === 0) return [{ id: `leaf`, kind: 'action', action: 'noop' }]
      return [{
        id: `br${depth}`,
        kind: 'branch',
        ifCondition: 'data.x != null',
        then: buildNested(depth - 1),
      }]
    }

    const steps = buildNested(12)

    await WorkflowEngine.executeWorkflow('wf', 'TestWf', steps as any, 'test', { x: 'truthy' })

    // Find a step with status=failed and the depth-error
    const failed = lastStepResults.find(r => r.status === 'failed' && /nesting depth/i.test((r.error as string) ?? ''))
    expect(failed).toBeDefined()
  })
})
