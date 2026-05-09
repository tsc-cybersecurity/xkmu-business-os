import { describe, it, expect, vi, beforeEach } from 'vitest'

const sendMock = vi.fn()
const resolveAdminMock = vi.fn()
vi.mock('@/lib/services/email.service', () => ({
  EmailService: { send: sendMock, resolveAdminRecipient: resolveAdminMock },
}))

describe('AgentNotificationService.notifyGoalTerminal', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sendet Email an Admin', async () => {
    resolveAdminMock.mockResolvedValueOnce('admin@example.com')
    sendMock.mockResolvedValueOnce({ success: true, messageId: 'msg-1' })
    const { AgentNotificationService } = await import('@/lib/services/agents/notification.service')
    const r = await AgentNotificationService.notifyGoalTerminal({
      goalId: 'g1', goalTitle: 'Test-Goal', status: 'done', summary: 'fertig',
    })
    expect(r.sent).toBe(true)
    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({
      to: 'admin@example.com',
      subject: expect.stringContaining('Test-Goal'),
    }))
  })

  it('liefert sent=false wenn kein Admin-Recipient', async () => {
    resolveAdminMock.mockResolvedValueOnce(null)
    const { AgentNotificationService } = await import('@/lib/services/agents/notification.service')
    const r = await AgentNotificationService.notifyGoalTerminal({
      goalId: 'g1', goalTitle: 'T', status: 'failed',
    })
    expect(r.sent).toBe(false)
    expect(r.error).toBe('no_admin_recipient')
  })

  it('schluckt Exceptions im EmailService', async () => {
    resolveAdminMock.mockRejectedValueOnce(new Error('SMTP down'))
    const { AgentNotificationService } = await import('@/lib/services/agents/notification.service')
    const r = await AgentNotificationService.notifyGoalTerminal({
      goalId: 'g1', goalTitle: 'T', status: 'done',
    })
    expect(r.sent).toBe(false)
    expect(r.error).toMatch(/SMTP/)
  })
})
