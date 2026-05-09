import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({ db: { execute: vi.fn() } }))
vi.mock('@/lib/services/agents/worker.service', () => ({
  WorkerService: { executeStep: vi.fn() },
}))
vi.mock('@/lib/services/agents/orchestrator.service', () => ({
  OrchestratorService: { replan: vi.fn() },
}))

describe('runImmediate', () => {
  beforeEach(() => vi.clearAllMocks())

  it('laeuft 1 Step + 1 Replan, beendet bei goal_complete', async () => {
    const { WorkerService } = await import('@/lib/services/agents/worker.service')
    const { OrchestratorService } = await import('@/lib/services/agents/orchestrator.service')
    ;(WorkerService.executeStep as ReturnType<typeof vi.fn>).mockResolvedValue({ status: 'succeeded', resultSummary: 's' })
    ;(OrchestratorService.replan as ReturnType<typeof vi.fn>).mockResolvedValue({ action: 'goal_complete' })

    const { runImmediate } = await import('@/lib/services/agents/immediate-lane.service')
    const r = await runImmediate({ runId: 'r1', startStepIds: ['s1'] })

    expect(WorkerService.executeStep).toHaveBeenCalledTimes(1)
    expect(OrchestratorService.replan).toHaveBeenCalledTimes(1)
    expect(r.terminalReason).toBe('goal_complete')
    expect(r.iterations).toBe(1)
  })

  it('laeuft inline weiter wenn nextStepMode=immediate + 1 nextStepId', async () => {
    const { WorkerService } = await import('@/lib/services/agents/worker.service')
    const { OrchestratorService } = await import('@/lib/services/agents/orchestrator.service')
    ;(WorkerService.executeStep as ReturnType<typeof vi.fn>).mockResolvedValue({ status: 'succeeded', resultSummary: 's' })
    const replanFn = OrchestratorService.replan as ReturnType<typeof vi.fn>
    replanFn
      .mockResolvedValueOnce({ action: 'continue', nextStepMode: 'immediate', nextStepIds: ['s2'] })
      .mockResolvedValueOnce({ action: 'goal_complete' })

    const { runImmediate } = await import('@/lib/services/agents/immediate-lane.service')
    const r = await runImmediate({ runId: 'r1', startStepIds: ['s1'] })

    expect(WorkerService.executeStep).toHaveBeenCalledTimes(2)
    expect(WorkerService.executeStep).toHaveBeenNthCalledWith(1, 's1')
    expect(WorkerService.executeStep).toHaveBeenNthCalledWith(2, 's2')
    expect(r.terminalReason).toBe('goal_complete')
    expect(r.iterations).toBe(2)
  })

  it('faellt zurueck in Cron-Lane bei nextStepMode=cron', async () => {
    const { WorkerService } = await import('@/lib/services/agents/worker.service')
    const { OrchestratorService } = await import('@/lib/services/agents/orchestrator.service')
    ;(WorkerService.executeStep as ReturnType<typeof vi.fn>).mockResolvedValue({ status: 'succeeded', resultSummary: 's' })
    ;(OrchestratorService.replan as ReturnType<typeof vi.fn>).mockResolvedValue({ action: 'continue', nextStepMode: 'cron', nextStepIds: ['s2'] })

    const { runImmediate } = await import('@/lib/services/agents/immediate-lane.service')
    const r = await runImmediate({ runId: 'r1', startStepIds: ['s1'] })

    expect(WorkerService.executeStep).toHaveBeenCalledTimes(1)
    expect(r.terminalReason).toBe('handed_to_cron')
  })

  it('faellt zurueck in Cron-Lane bei fan-out (mehr als 1 nextStepId)', async () => {
    const { WorkerService } = await import('@/lib/services/agents/worker.service')
    const { OrchestratorService } = await import('@/lib/services/agents/orchestrator.service')
    ;(WorkerService.executeStep as ReturnType<typeof vi.fn>).mockResolvedValue({ status: 'succeeded', resultSummary: 's' })
    ;(OrchestratorService.replan as ReturnType<typeof vi.fn>).mockResolvedValue({ action: 'continue', nextStepMode: 'immediate', nextStepIds: ['s2', 's3'] })

    const { runImmediate } = await import('@/lib/services/agents/immediate-lane.service')
    const r = await runImmediate({ runId: 'r1', startStepIds: ['s1'] })

    expect(WorkerService.executeStep).toHaveBeenCalledTimes(1)
    expect(r.terminalReason).toBe('handed_to_cron')
  })

  it('Watchdog-Deadline bricht ab und retourniert deadline_reached', async () => {
    const { WorkerService } = await import('@/lib/services/agents/worker.service')
    const { OrchestratorService } = await import('@/lib/services/agents/orchestrator.service')
    ;(WorkerService.executeStep as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      await new Promise((res) => setTimeout(res, 30))
      return { status: 'succeeded', resultSummary: 's' }
    })
    ;(OrchestratorService.replan as ReturnType<typeof vi.fn>).mockResolvedValue({ action: 'continue', nextStepMode: 'immediate', nextStepIds: ['next'] })

    const { runImmediate } = await import('@/lib/services/agents/immediate-lane.service')
    const r = await runImmediate({ runId: 'r1', startStepIds: ['s1'], deadlineMs: 50 })

    expect(r.terminalReason).toBe('deadline_reached')
  })

  it('beendet bei action=pause/fail', async () => {
    const { WorkerService } = await import('@/lib/services/agents/worker.service')
    const { OrchestratorService } = await import('@/lib/services/agents/orchestrator.service')
    ;(WorkerService.executeStep as ReturnType<typeof vi.fn>).mockResolvedValue({ status: 'succeeded', resultSummary: 's' })
    ;(OrchestratorService.replan as ReturnType<typeof vi.fn>).mockResolvedValue({ action: 'pause' })

    const { runImmediate } = await import('@/lib/services/agents/immediate-lane.service')
    const r = await runImmediate({ runId: 'r1', startStepIds: ['s1'] })

    expect(r.terminalReason).toBe('pause')
  })

  it('lehnt fan-in ab (mehrere startStepIds) und faellt sofort in Cron-Lane', async () => {
    const { WorkerService } = await import('@/lib/services/agents/worker.service')
    const { runImmediate } = await import('@/lib/services/agents/immediate-lane.service')
    const r = await runImmediate({ runId: 'r1', startStepIds: ['s1', 's2'] })
    expect(WorkerService.executeStep).not.toHaveBeenCalled()
    expect(r.terminalReason).toBe('handed_to_cron')
  })
})
