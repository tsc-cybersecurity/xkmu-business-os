/**
 * Tests fuer computeDagLayout — pure helper ohne DOM-Abhaengigkeit.
 *
 * 5 Faelle:
 *  1. einzelner Step
 *  2. zwei parallele Steps (keine Abhaengigkeiten)
 *  3. lineare Kette a -> b -> c
 *  4. Diamond a -> b,c -> d
 *  5. unbekannte Abhaengigkeiten werden toleriert (kein Absturz)
 */
import { describe, it, expect } from 'vitest'
import { computeDagLayout } from '@/components/agents/runs/run-dag-view'

// Minimal Step-Fixture-Typ der dem echten AgentStep-Shape entspricht
interface StepFixture {
  id: string
  stepKey: string
  workerType: string
  status: string
  dependsOnStepKeys: string[]
}

function makeStep(stepKey: string, dependsOn: string[] = [], status = 'completed'): StepFixture {
  return { id: stepKey, stepKey, workerType: 'test-worker', status, dependsOnStepKeys: dependsOn }
}

describe('computeDagLayout', () => {
  it('einzelner Step landet auf Layer 0', () => {
    const nodes = computeDagLayout([makeStep('a')])
    expect(nodes).toHaveLength(1)
    expect(nodes[0].layer).toBe(0)
    expect(nodes[0].stepKey).toBe('a')
  })

  it('zwei parallele Steps (keine Deps) landen beide auf Layer 0', () => {
    const nodes = computeDagLayout([makeStep('a'), makeStep('b')])
    expect(nodes).toHaveLength(2)
    expect(nodes[0].layer).toBe(0)
    expect(nodes[1].layer).toBe(0)
  })

  it('lineare Kette a->b->c ergibt Layer 0,1,2', () => {
    const nodes = computeDagLayout([
      makeStep('a'),
      makeStep('b', ['a']),
      makeStep('c', ['b']),
    ])
    const byKey = Object.fromEntries(nodes.map((n) => [n.stepKey, n]))
    expect(byKey['a'].layer).toBe(0)
    expect(byKey['b'].layer).toBe(1)
    expect(byKey['c'].layer).toBe(2)
  })

  it('diamond a->b,c->d: b und c auf Layer 1, d auf Layer 2', () => {
    const nodes = computeDagLayout([
      makeStep('a'),
      makeStep('b', ['a']),
      makeStep('c', ['a']),
      makeStep('d', ['b', 'c']),
    ])
    const byKey = Object.fromEntries(nodes.map((n) => [n.stepKey, n]))
    expect(byKey['a'].layer).toBe(0)
    expect(byKey['b'].layer).toBe(1)
    expect(byKey['c'].layer).toBe(1)
    expect(byKey['d'].layer).toBe(2)
  })

  it('unbekannte Abhaengigkeit fuerht nicht zu Absturz', () => {
    // 'ghost' existiert nicht als Step — soll toleriert werden
    const nodes = computeDagLayout([makeStep('a', ['ghost'])])
    expect(nodes).toHaveLength(1)
    // 'a' haengt von unbekanntem 'ghost' ab — faellt auf Layer 0 zurueck
    expect(nodes[0].layer).toBeGreaterThanOrEqual(0)
  })
})
