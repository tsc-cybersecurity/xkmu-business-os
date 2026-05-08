import { describe, it, expect } from 'vitest'
import { InitialPlanSchema, ReplanDecisionSchema, PlannedStepSchema } from '@/lib/services/agents/orchestrator/plan-types'

describe('Orchestrator Plan-Types', () => {
  it('PlannedStepSchema akzeptiert valides workerType', () => {
    const r = PlannedStepSchema.parse({
      stepKey: 'research-acme',
      workerType: 'service:lead-research',
      config: { companyName: 'Acme' },
      contextRefs: [],
      dependsOnStepKeys: [],
    })
    expect(r.stepKey).toBe('research-acme')
  })

  it('PlannedStepSchema lehnt workerType ohne Namespace ab', () => {
    expect(() => PlannedStepSchema.parse({
      stepKey: 'x',
      workerType: 'invalid',
    })).toThrow(/workerType/)
  })

  it('PlannedStepSchema setzt Defaults fuer optionale Felder', () => {
    const r = PlannedStepSchema.parse({
      stepKey: 'x',
      workerType: 'memory:list',
    })
    expect(r.config).toEqual({})
    expect(r.contextRefs).toEqual([])
    expect(r.dependsOnStepKeys).toEqual([])
  })

  it('InitialPlanSchema verlangt mind. 1 Step', () => {
    expect(() => InitialPlanSchema.parse({ reasoning: '', steps: [] })).toThrow()
  })

  it('InitialPlanSchema akzeptiert max. 20 Steps', () => {
    const steps = Array.from({ length: 20 }, (_, i) => ({
      stepKey: `step-${i}`,
      workerType: 'memory:list',
    }))
    const r = InitialPlanSchema.parse({ reasoning: 'test', steps })
    expect(r.steps).toHaveLength(20)
  })

  it('InitialPlanSchema lehnt 21 Steps ab', () => {
    const steps = Array.from({ length: 21 }, (_, i) => ({
      stepKey: `step-${i}`,
      workerType: 'memory:list',
    }))
    expect(() => InitialPlanSchema.parse({ reasoning: '', steps })).toThrow()
  })

  it('ReplanDecisionSchema akzeptiert continue + newSteps', () => {
    const r = ReplanDecisionSchema.parse({
      action: 'continue',
      reasoning: 'Brauche mehr Daten',
      newSteps: [{ stepKey: 'next', workerType: 'memory:read' }],
    })
    expect(r.action).toBe('continue')
    expect(r.newSteps).toHaveLength(1)
  })

  it('ReplanDecisionSchema akzeptiert goal_complete ohne newSteps', () => {
    const r = ReplanDecisionSchema.parse({
      action: 'goal_complete',
      reasoning: 'Alles fertig',
    })
    expect(r.action).toBe('goal_complete')
    expect(r.newSteps).toEqual([])
  })

  it('ReplanDecisionSchema lehnt unbekannte action ab', () => {
    expect(() => ReplanDecisionSchema.parse({ action: 'unknown' })).toThrow()
  })
})
