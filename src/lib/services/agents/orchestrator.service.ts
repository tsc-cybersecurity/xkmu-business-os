/**
 * Orchestrator Service — Hauptagent-Loop.
 * Phase 1: Skeleton. Implementation in Phase 4 (Orchestrator-Loop).
 *
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §2.2 + §6
 */

import type { ExecutionMode, PlannedStep } from './types'

export interface ReplanDecision {
  action: 'continue' | 'goal_complete' | 'pause' | 'fail'
  newSteps?: PlannedStep[]
  /** Wenn nur ein einziger naechster Step folgt und nextStepMode='immediate', kann Inline-Lane uebernommen werden. */
  nextStepMode?: ExecutionMode
  reason?: string
}

export const OrchestratorService = {
  /**
   * Erstes Plannen eines Goals.
   * - Sammle Tool-Liste (kurz)
   * - Sammle initiale Memory-Refs
   * - Rufe Orchestrator-LLM (JSON-Mode)
   * - Persistiere agent_runs + initiale agent_steps
   * - Queue agent_step_run-Tasks fuer Steps ohne unaufgeloeste Dependencies
   */
  async plan(_goalId: string): Promise<{ runId: string; steps: PlannedStep[] }> {
    throw new Error('OrchestratorService.plan: nicht implementiert (Phase 4)')
  },

  /**
   * Re-Plan nach jedem Worker-Result.
   * - Lade aktuellen Run-State (komprimiert via MemoryService.compactRunHistory)
   * - Rufe Orchestrator-LLM mit kompaktem Kontext (Sliding-Summary, Prompt-Caching)
   * - Parse Decision; bei newSteps -> erzeuge agent_steps + queue agent_step_run
   */
  async replan(_runId: string): Promise<ReplanDecision> {
    throw new Error('OrchestratorService.replan: nicht implementiert (Phase 4)')
  },
}
