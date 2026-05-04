import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setupDbMock } from '@/__tests__/helpers/mock-db'

vi.mock('@/lib/services/availability-calc.service', () => ({
  AvailabilityCalcService: { computeFreeSlots: vi.fn() },
}))

describe('GET /api/buchen/[slug]/availability', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  it('returns 404 when slug not found', async () => {
    const helper = setupDbMock()
    helper.selectMock.mockResolvedValueOnce([])  // no user
    vi.doMock('@/lib/db', () => ({ db: helper.db }))

    const { GET } = await import('@/app/api/buchen/[slug]/availability/route')
    const req = new Request('https://x/api/buchen/unknown/availability?slotTypeId=a0000000-0000-4000-8000-000000000001&date=2026-05-04')
    const res = await GET(req as never, { params: Promise.resolve({ slug: 'unknown' }) } as never)
    expect(res.status).toBe(404)
  })

  it('returns 404 when user inactive', async () => {
    const helper = setupDbMock()
    helper.selectMock.mockResolvedValueOnce([{
      id: 'u-1', timezone: 'Europe/Berlin', bookingPageActive: false,
    }])
    vi.doMock('@/lib/db', () => ({ db: helper.db }))

    const { GET } = await import('@/app/api/buchen/[slug]/availability/route')
    const req = new Request('https://x/api/buchen/tino/availability?slotTypeId=a0000000-0000-4000-8000-000000000001&date=2026-05-04')
    const res = await GET(req as never, { params: Promise.resolve({ slug: 'tino' }) } as never)
    expect(res.status).toBe(404)
  })

  it('returns 400 on invalid date format', async () => {
    const helper = setupDbMock()
    helper.selectMock.mockResolvedValueOnce([{
      id: 'u-1', timezone: 'Europe/Berlin', bookingPageActive: true,
    }])
    vi.doMock('@/lib/db', () => ({ db: helper.db }))

    const { GET } = await import('@/app/api/buchen/[slug]/availability/route')
    const req = new Request('https://x/api/buchen/tino/availability?slotTypeId=a0000000-0000-4000-8000-000000000001&date=invalid')
    const res = await GET(req as never, { params: Promise.resolve({ slug: 'tino' }) } as never)
    expect(res.status).toBe(400)
  })

  it('returns slots for valid request', async () => {
    const helper = setupDbMock()
    helper.selectMock.mockResolvedValueOnce([{ id: 'u-1', timezone: 'Europe/Berlin', bookingPageActive: true }])
    helper.selectMock.mockResolvedValueOnce([{
      id: 'st-1', userId: 'u-1', isActive: true,
      durationMinutes: 30, bufferBeforeMinutes: 0, bufferAfterMinutes: 0,
      minNoticeHours: 0, maxAdvanceDays: 365,
    }])
    helper.selectMock.mockResolvedValueOnce([])  // rules
    helper.selectMock.mockResolvedValueOnce([])  // overrides
    helper.selectMock.mockResolvedValueOnce([])  // appointments
    helper.selectMock.mockResolvedValueOnce([])  // accounts
    vi.doMock('@/lib/db', () => ({ db: helper.db }))

    const { AvailabilityCalcService } = await import('@/lib/services/availability-calc.service')
    vi.mocked(AvailabilityCalcService.computeFreeSlots).mockReturnValueOnce([
      new Date('2026-05-04T07:00:00Z'),
      new Date('2026-05-04T07:30:00Z'),
    ])

    const { GET } = await import('@/app/api/buchen/[slug]/availability/route')
    const req = new Request('https://x/api/buchen/tino/availability?slotTypeId=a0000000-0000-4000-8000-000000000001&date=2026-05-04')
    const res = await GET(req as never, { params: Promise.resolve({ slug: 'tino' }) } as never)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.slots).toEqual(['2026-05-04T07:00:00.000Z', '2026-05-04T07:30:00.000Z'])
  })
})
