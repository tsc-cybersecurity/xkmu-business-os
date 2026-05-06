import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setupDbMock } from '@/__tests__/helpers/mock-db'

describe("TaskQueueService.execute — 'social_token_refresh' handler", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  function seedExecuteFlow(helper: ReturnType<typeof setupDbMock>, opts: {
    task: Record<string, unknown>
  }) {
    // 1) UPDATE ... RETURNING — mark running, returns the task row
    helper.updateMock.mockResolvedValueOnce([opts.task])
    // 2) UPDATE ... RETURNING — final completed state
    helper.updateMock.mockResolvedValueOnce([{ ...opts.task, status: 'completed' }])
  }

  it('completes without error and logs skeleton message', async () => {
    const helper = setupDbMock()
    const task = {
      id: 'task-social-1',
      type: 'social_token_refresh',
      status: 'running',
      payload: {},
    }
    seedExecuteFlow(helper, { task })

    const { TaskQueueService } = await import('@/lib/services/task-queue.service')
    const result = await TaskQueueService.execute('task-social-1')

    expect(result?.status).toBe('completed')
    expect(console.log).toHaveBeenCalledWith(
      '[task-queue] social_token_refresh tick — skeleton only (no refresh in phase 1)'
    )
    // Verify both update calls happened: mark-running + final state
    expect(helper.db.update).toHaveBeenCalledTimes(2)
  })

  it('handles task with custom payload gracefully', async () => {
    const helper = setupDbMock()
    const task = {
      id: 'task-social-2',
      type: 'social_token_refresh',
      status: 'running',
      payload: { platformId: 'instagram-123' },
    }
    seedExecuteFlow(helper, { task })

    const { TaskQueueService } = await import('@/lib/services/task-queue.service')
    const result = await TaskQueueService.execute('task-social-2')

    expect(result?.status).toBe('completed')
    // Handler should complete successfully without throwing
    expect(result).toBeDefined()
  })
})
