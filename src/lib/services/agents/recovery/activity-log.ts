/**
 * Wrapper um AuditLogService fuer Agent-Recovery-Events.
 * Gold rule: Recovery darf nie an Audit-Fehlern haengenbleiben — wir schlucken
 * AuditLog-Exceptions und loggen sie ueber den normalen Logger.
 *
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §8 (Audit-Log-Anbindung)
 */

import { logger } from '@/lib/utils/logger'

export type AgentEventAction =
  | 'agent.run.stranded'
  | 'agent.run.recovered'
  | 'agent.run.continuation_failed'
  | 'agent.goal.paused_by_recovery'
  | 'agent.goal.cancel_cleanup'
  | 'agent.budget.exceeded'

export interface AgentEventInput {
  action: AgentEventAction
  goalId: string
  runId?: string
  stepId?: string
  detail?: string
  metadata?: Record<string, unknown>
}

export async function logAgentEvent(input: AgentEventInput): Promise<void> {
  const { AuditLogService } = await import('@/lib/services/audit-log.service')

  const isRunEvent = input.action.startsWith('agent.run.')
  const entityType = isRunEvent ? 'agent_run' : 'agent_goal'
  const entityId = isRunEvent ? input.runId ?? input.goalId : input.goalId

  try {
    await AuditLogService.log({
      action: input.action,
      entityType,
      entityId,
      payload: {
        goalId: input.goalId,
        runId: input.runId,
        stepId: input.stepId,
        detail: input.detail,
        ...input.metadata,
      },
    })
  } catch (e) {
    logger.error(`Agent-Activity-Log-Schreibung fehlgeschlagen: ${(e as Error).message}`, e, {
      module: 'AgentRecovery',
      action: input.action,
    })
  }
}
