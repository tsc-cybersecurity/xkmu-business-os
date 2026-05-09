import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/services/audit-log.service', () => ({
  AuditLogService: { log: vi.fn().mockResolvedValue(undefined) },
}))

describe('logAgentEvent', () => {
  beforeEach(() => vi.clearAllMocks())

  it('schreibt Run-Event mit entityType=agent_run', async () => {
    const { AuditLogService } = await import('@/lib/services/audit-log.service')
    const { logAgentEvent } = await import('@/lib/services/agents/recovery/activity-log')
    await logAgentEvent({
      action: 'agent.run.stranded',
      runId: 'r1',
      goalId: 'g1',
      detail: 'Inline-Loop nach Pod-Restart strandend',
    })
    expect(AuditLogService.log).toHaveBeenCalledWith(expect.objectContaining({
      action: 'agent.run.stranded',
      entityType: 'agent_run',
      entityId: 'r1',
      payload: expect.objectContaining({ goalId: 'g1', detail: expect.stringContaining('Inline-Loop') }),
    }))
  })

  it('schreibt Goal-Event mit entityType=agent_goal', async () => {
    const { AuditLogService } = await import('@/lib/services/audit-log.service')
    const { logAgentEvent } = await import('@/lib/services/agents/recovery/activity-log')
    await logAgentEvent({
      action: 'agent.goal.paused_by_recovery',
      goalId: 'g2',
      detail: 'Kein Liveness-Pfad gefunden',
    })
    expect(AuditLogService.log).toHaveBeenCalledWith(expect.objectContaining({
      action: 'agent.goal.paused_by_recovery',
      entityType: 'agent_goal',
      entityId: 'g2',
      payload: expect.objectContaining({ detail: expect.stringContaining('Liveness') }),
    }))
  })

  it('schluckt AuditLog-Fehler — Recovery soll dadurch nicht abbrechen', async () => {
    const { AuditLogService } = await import('@/lib/services/audit-log.service')
    ;(AuditLogService.log as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('DB down'))
    const { logAgentEvent } = await import('@/lib/services/agents/recovery/activity-log')
    await expect(
      logAgentEvent({ action: 'agent.run.recovered', runId: 'r1', goalId: 'g1' }),
    ).resolves.toBeUndefined()
  })
})
