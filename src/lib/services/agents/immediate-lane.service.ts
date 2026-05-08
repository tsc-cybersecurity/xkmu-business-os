/**
 * Immediate-Lane — Inline-Loop fuer executionMode='immediate' Goals.
 * Faehrt Step + Replan im selben Request durch, bis terminalisiert oder Deadline.
 *
 * Trigger:
 *   - GoalService.start mit goal.executionMode='immediate'
 *   - Replan-Output mit nextStepMode='immediate' + genau 1 nextStepId
 *
 * Fallback in Cron-Lane (kein Datenverlust — Replan hat naechsten Step bereits gequeued):
 *   - nextStepMode='cron'
 *   - >1 nextStepIds (fan-out)
 *   - Deadline erreicht
 *   - action != 'continue'
 *
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §6.6
 */

import { logger } from '@/lib/utils/logger'

export interface RunImmediateInput {
  runId: string
  startStepIds: string[]
  /** Watchdog-Deadline in ms (default 5 min). */
  deadlineMs?: number
}

export type ImmediateTerminalReason =
  | 'goal_complete'
  | 'pause'
  | 'fail'
  | 'handed_to_cron'
  | 'deadline_reached'

export interface RunImmediateResult {
  iterations: number
  terminalReason: ImmediateTerminalReason
  lastError?: string
}

const DEFAULT_DEADLINE_MS = 5 * 60 * 1000

export async function runImmediate(input: RunImmediateInput): Promise<RunImmediateResult> {
  const deadline = Date.now() + (input.deadlineMs ?? DEFAULT_DEADLINE_MS)
  let iterations = 0

  // Fan-in zum Start ist nicht inline-faehig — direkt in Cron-Lane lassen.
  if (input.startStepIds.length !== 1) {
    logger.info('Immediate-Lane: fan-in beim Start, faehrt in Cron-Lane', { module: 'ImmediateLane', runId: input.runId, startCount: input.startStepIds.length })
    return { iterations: 0, terminalReason: 'handed_to_cron' }
  }

  let nextStepId: string | null = input.startStepIds[0]

  while (nextStepId !== null) {
    if (Date.now() >= deadline) {
      logger.warn('Immediate-Lane: Watchdog-Deadline erreicht', { module: 'ImmediateLane', runId: input.runId, iterations })
      return { iterations, terminalReason: 'deadline_reached' }
    }

    const { WorkerService } = await import('./worker.service')
    const { OrchestratorService } = await import('./orchestrator.service')

    iterations += 1
    try {
      await WorkerService.executeStep(nextStepId)
    } catch (e) {
      const msg = (e as Error).message
      logger.error(`Immediate-Lane Worker-Fehler: ${msg}`, e, { module: 'ImmediateLane', runId: input.runId })
      return { iterations, terminalReason: 'handed_to_cron', lastError: msg }
    }

    if (Date.now() >= deadline) {
      return { iterations, terminalReason: 'deadline_reached' }
    }

    let decision: { action: 'continue' | 'goal_complete' | 'pause' | 'fail'; nextStepMode?: 'cron' | 'immediate'; nextStepIds?: string[]; reason?: string }
    try {
      decision = await OrchestratorService.replan(input.runId)
    } catch (e) {
      const msg = (e as Error).message
      logger.error(`Immediate-Lane Replan-Fehler: ${msg}`, e, { module: 'ImmediateLane', runId: input.runId })
      return { iterations, terminalReason: 'handed_to_cron', lastError: msg }
    }

    if (decision.action !== 'continue') {
      return { iterations, terminalReason: decision.action }
    }

    if (decision.nextStepMode !== 'immediate' || (decision.nextStepIds?.length ?? 0) !== 1) {
      return { iterations, terminalReason: 'handed_to_cron' }
    }

    nextStepId = decision.nextStepIds![0]
  }

  return { iterations, terminalReason: 'handed_to_cron' }
}
