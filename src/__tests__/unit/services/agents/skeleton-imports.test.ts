/**
 * Smoke-Tests fuer Phase 1 — pruefen dass alle Agent-Module importierbar sind
 * und Skeleton-Methoden mit klarer "nicht implementiert"-Message werfen.
 */

import { describe, it, expect } from 'vitest'
import {
  OrchestratorService,
  WorkerService,
  MemoryService,
  CostTrackerService,
  ToolRegistry,
  AGENT_TASK_TYPES,
} from '@/lib/services/agents'

describe('Agent-Module Skeleton — Phase 1', () => {
  it('exportiert alle fuenf Service-Module', () => {
    expect(OrchestratorService).toBeDefined()
    expect(WorkerService).toBeDefined()
    expect(MemoryService).toBeDefined()
    expect(CostTrackerService).toBeDefined()
    expect(ToolRegistry).toBeDefined()
  })

  it('AGENT_TASK_TYPES enthaelt die drei task_queue-Typen', () => {
    expect(AGENT_TASK_TYPES).toEqual({
      STEP_RUN: 'agent_step_run',
      REPLAN: 'agent_replan',
      CONTINUATION: 'agent_continuation',
    })
  })

  it('OrchestratorService.plan wirft "nicht implementiert"', async () => {
    await expect(OrchestratorService.plan('goal-1')).rejects.toThrow(/nicht implementiert/)
  })

  it('OrchestratorService.replan wirft "nicht implementiert"', async () => {
    await expect(OrchestratorService.replan('run-1')).rejects.toThrow(/nicht implementiert/)
  })

  it('ToolRegistry.parseRef parst "memory:search" korrekt', () => {
    const ref = ToolRegistry.parseRef('memory:search')
    expect(ref).toEqual({ namespace: 'memory', name: 'search', raw: 'memory:search' })
  })

  it('ToolRegistry.parseRef wirft bei fehlendem Doppelpunkt', () => {
    expect(() => ToolRegistry.parseRef('invalid')).toThrow(/Invalid tool ref/)
  })

  it('ToolRegistry.invoke gibt failed-Result zurueck wenn kein Adapter registriert', async () => {
    const result = await ToolRegistry.invoke({
      ref: { namespace: 'memory', name: 'search', raw: 'memory:search' },
      input: {},
      context: { runId: 'r', stepId: 's', goalId: 'g' },
    })
    expect(result.status).toBe('failed')
    expect(result.error).toMatch(/Kein Adapter/)
  })
})
