import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../../helpers/mock-db'

describe('NewsPipelineWatchdog', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
  })

  it('runWatchdog issues SQL update and returns reaped count', async () => {
    dbMock.executeMock.mockResolvedValueOnce({ rowCount: 2 })
    const { runWatchdog } = await import('@/lib/services/news-pipeline-watchdog')
    const result = await runWatchdog()
    expect(result.reaped).toBe(2)
    expect(dbMock.db.execute).toHaveBeenCalled()
  })

  it('runWatchdog returns reaped:0 on db error (best-effort)', async () => {
    dbMock.executeMock.mockRejectedValueOnce(new Error('db unavailable'))
    const { runWatchdog } = await import('@/lib/services/news-pipeline-watchdog')
    const result = await runWatchdog()
    expect(result.reaped).toBe(0)
  })

  it('runWatchdog handles missing rowCount as 0', async () => {
    dbMock.executeMock.mockResolvedValueOnce({})
    const { runWatchdog } = await import('@/lib/services/news-pipeline-watchdog')
    const result = await runWatchdog()
    expect(result.reaped).toBe(0)
  })
})
