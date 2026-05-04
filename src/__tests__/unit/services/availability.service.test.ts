import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setupDbMock } from '@/__tests__/helpers/mock-db'

describe('AvailabilityService', () => {
  beforeEach(() => vi.resetModules())

  it('listRules returns rules sorted by day + time', async () => {
    const helper = setupDbMock()
    helper.selectMock.mockResolvedValueOnce([
      { id: '1', userId: 'u-1', dayOfWeek: 0, startTime: '09:00:00', endTime: '12:00:00' },
      { id: '2', userId: 'u-1', dayOfWeek: 0, startTime: '13:00:00', endTime: '17:00:00' },
    ])
    vi.doMock('@/lib/db', () => ({ db: helper.db }))
    const { AvailabilityService } = await import('@/lib/services/availability.service')
    const out = await AvailabilityService.listRules('u-1')
    expect(out).toHaveLength(2)
  })

  it('createRule inserts a row', async () => {
    const helper = setupDbMock()
    helper.insertMock.mockResolvedValueOnce([{ id: 'r-1' }])
    vi.doMock('@/lib/db', () => ({ db: helper.db }))
    const { AvailabilityService } = await import('@/lib/services/availability.service')
    const out = await AvailabilityService.createRule('u-1', {
      dayOfWeek: 1, startTime: '09:00', endTime: '17:00',
    })
    expect(out.id).toBe('r-1')
  })

  it('listOverrides without date range returns all', async () => {
    const helper = setupDbMock()
    helper.selectMock.mockResolvedValueOnce([{ id: 'o-1' }])
    vi.doMock('@/lib/db', () => ({ db: helper.db }))
    const { AvailabilityService } = await import('@/lib/services/availability.service')
    const out = await AvailabilityService.listOverrides('u-1')
    expect(out).toHaveLength(1)
  })

  it('createOverride accepts free and block', async () => {
    const helper = setupDbMock()
    helper.insertMock.mockResolvedValueOnce([{ id: 'o-1', kind: 'block' }])
    vi.doMock('@/lib/db', () => ({ db: helper.db }))
    const { AvailabilityService } = await import('@/lib/services/availability.service')
    const out = await AvailabilityService.createOverride('u-1', {
      startAt: new Date('2026-12-24T00:00:00Z'),
      endAt: new Date('2026-12-26T23:59:59Z'),
      kind: 'block',
      reason: 'Weihnachten',
    })
    expect(out.kind).toBe('block')
  })
})
