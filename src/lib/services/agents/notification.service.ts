/**
 * Mini-Wrapper um EmailService fuer Agent-Goal-Terminal-Notifications.
 * Gold rule: Notification-Fehler darf Goal-Done nicht blockieren — wir schlucken
 * Exceptions und loggen sie ueber den normalen Logger.
 *
 * Spec: docs/superpowers/specs/2026-05-08-agent-system-design.md §8 (Phase 8)
 */

import { logger } from '@/lib/utils/logger'

export interface NotifyGoalTerminalInput {
  goalId: string
  goalTitle: string
  status: 'done' | 'failed'
  summary?: string
  runId?: string
}

export const AgentNotificationService = {
  async notifyGoalTerminal(input: NotifyGoalTerminalInput): Promise<{ sent: boolean; error?: string }> {
    try {
      const { EmailService } = await import('@/lib/services/email.service')
      const recipient = await EmailService.resolveAdminRecipient()
      if (!recipient) {
        logger.warn('AgentNotification: kein Admin-Empfaenger ermittelbar', { module: 'AgentNotification' })
        return { sent: false, error: 'no_admin_recipient' }
      }

      const subject = input.status === 'done'
        ? `Agent-Goal abgeschlossen: ${input.goalTitle}`
        : `Agent-Goal fehlgeschlagen: ${input.goalTitle}`
      const body = `Goal-ID: ${input.goalId}\nStatus: ${input.status}\n` +
        (input.runId ? `Run-ID: ${input.runId}\n` : '') +
        `\n${input.summary ?? '(keine Zusammenfassung)'}\n\n` +
        `Detail: /intern/agents/goals/${input.goalId}`

      const result = await EmailService.send({ to: recipient, subject, body })
      return { sent: result.success, error: result.error }
    } catch (e) {
      const msg = (e as Error).message
      logger.error(`AgentNotification fehlgeschlagen: ${msg}`, e, { module: 'AgentNotification' })
      return { sent: false, error: msg }
    }
  },
}
