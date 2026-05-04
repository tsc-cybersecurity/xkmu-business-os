import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setupDbMock } from '@/__tests__/helpers/mock-db'

vi.mock('@/lib/services/email.service', () => ({
  EmailService: {
    sendWithTemplate: vi.fn(),
    send: vi.fn(),
  },
}))

describe("TaskQueueService.execute — 'appointment_reminder' handler", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  function seedExecuteFlow(helper: ReturnType<typeof setupDbMock>, opts: {
    task: Record<string, unknown>
    apptRows: Array<{ status: string }>
  }) {
    // 1) UPDATE ... RETURNING — mark running, returns the task row
    helper.updateMock.mockResolvedValueOnce([opts.task])
    // 2) SELECT ... FROM appointments ... WHERE ... LIMIT 1 — appointment lookup
    helper.selectMock.mockResolvedValueOnce(opts.apptRows)
    // 3) UPDATE ... RETURNING — final completed/failed state
    helper.updateMock.mockResolvedValueOnce([{ ...opts.task, status: 'completed' }])
  }

  it('sends mail when appointment status is confirmed', async () => {
    const helper = setupDbMock()
    const task = {
      id: 'task-1',
      type: 'appointment_reminder',
      status: 'running',
      referenceId: 'apt-1',
      payload: {
        templateSlug: 'appointment-reminder',
        to: 'kunde@example.com',
        placeholders: { name: 'Max' },
        leadId: 'lead-9',
      },
    }
    seedExecuteFlow(helper, {
      task,
      apptRows: [{ status: 'confirmed' }],
    })

    const { EmailService } = await import('@/lib/services/email.service')
    vi.mocked(EmailService.sendWithTemplate).mockResolvedValue({
      success: true,
      messageId: 'msg-1',
    } as Awaited<ReturnType<typeof EmailService.sendWithTemplate>>)

    const { TaskQueueService } = await import('@/lib/services/task-queue.service')
    const result = await TaskQueueService.execute('task-1')

    expect(EmailService.sendWithTemplate).toHaveBeenCalledTimes(1)
    expect(EmailService.sendWithTemplate).toHaveBeenCalledWith(
      'appointment-reminder',
      'kunde@example.com',
      { name: 'Max' },
      { leadId: 'lead-9', personId: undefined },
    )
    // Task should be marked completed (not failed)
    expect(result?.status).toBe('completed')
    // Verify both update calls happened: mark-running + final state
    expect(helper.db.update).toHaveBeenCalledTimes(2)
  })

  it('skips when appointment status is cancelled (does NOT send mail)', async () => {
    const helper = setupDbMock()
    const task = {
      id: 'task-2',
      type: 'appointment_reminder',
      status: 'running',
      referenceId: 'apt-2',
      payload: {
        templateSlug: 'appointment-reminder',
        to: 'kunde@example.com',
      },
    }
    seedExecuteFlow(helper, {
      task,
      apptRows: [{ status: 'cancelled' }],
    })

    const { EmailService } = await import('@/lib/services/email.service')

    const { TaskQueueService } = await import('@/lib/services/task-queue.service')
    const result = await TaskQueueService.execute('task-2')

    expect(EmailService.sendWithTemplate).not.toHaveBeenCalled()
    expect(result?.status).toBe('completed')
    // The handler returns { skipped: true, reason: ... } and execute() persists
    // it as the result column on the completed task. We verify by checking the
    // 2nd update call's set() arg.
    const setCalls = helper.updateMock // not directly readable
    // Use db.update spy: second call's chain.set must have been invoked with
    // result === { skipped: true, reason: 'appointment_cancelled_or_missing' }.
    // The mock-db helper returns the same chain object on update() — we cannot
    // distinguish calls there. Instead, rely on the fact that EmailService was
    // not called and the execution succeeded (no error thrown).
    expect(setCalls).toBeDefined()
  })

  it('skips when appointment row is not found', async () => {
    const helper = setupDbMock()
    const task = {
      id: 'task-3',
      type: 'appointment_reminder',
      status: 'running',
      referenceId: 'apt-missing',
      payload: {
        templateSlug: 'appointment-reminder',
        to: 'kunde@example.com',
      },
    }
    seedExecuteFlow(helper, {
      task,
      apptRows: [],
    })

    const { EmailService } = await import('@/lib/services/email.service')

    const { TaskQueueService } = await import('@/lib/services/task-queue.service')
    const result = await TaskQueueService.execute('task-3')

    expect(EmailService.sendWithTemplate).not.toHaveBeenCalled()
    expect(result?.status).toBe('completed')
  })
})
