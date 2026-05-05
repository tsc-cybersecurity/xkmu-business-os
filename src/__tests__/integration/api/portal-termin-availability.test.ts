import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setupDbMock } from '@/__tests__/helpers/mock-db'

vi.mock('@/lib/services/availability-calc.service', () => ({
  AvailabilityCalcService: { computeFreeSlots: vi.fn() },
}))

function mockSession(value: unknown) {
  vi.doMock('@/lib/auth/session', () => ({
    getSession: vi.fn().mockResolvedValue(value),
  }))
}

const VALID_USER_ID = 'a0000000-0000-4000-8000-0000000000aa'
const VALID_SLOT_TYPE_ID = 'a0000000-0000-4000-8000-000000000001'

describe('GET /api/portal/termin/availability', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    setupDbMock()
    mockSession(null)

    const { GET } = await import('@/app/api/portal/termin/availability/route')
    const req = new Request(`https://x/api/portal/termin/availability?userId=${VALID_USER_ID}&slotTypeId=${VALID_SLOT_TYPE_ID}&date=2026-05-04`)
    const res = await GET(req as never)
    expect(res.status).toBe(401)
  })

  it('returns 400 on invalid query', async () => {
    setupDbMock()
    mockSession({ user: { id: 'pu-1', email: 'p@example.com', role: 'portal_user' } })

    const { GET } = await import('@/app/api/portal/termin/availability/route')
    const req = new Request('https://x/api/portal/termin/availability?userId=not-a-uuid&slotTypeId=' + VALID_SLOT_TYPE_ID + '&date=invalid')
    const res = await GET(req as never)
    expect(res.status).toBe(400)
  })

  it('returns 404 when userId unknown', async () => {
    const helper = setupDbMock()
    helper.selectMock.mockResolvedValueOnce([])  // no user
    mockSession({ user: { id: 'pu-1', email: 'p@example.com', role: 'portal_user' } })

    const { GET } = await import('@/app/api/portal/termin/availability/route')
    const req = new Request(`https://x/api/portal/termin/availability?userId=${VALID_USER_ID}&slotTypeId=${VALID_SLOT_TYPE_ID}&date=2026-05-04`)
    const res = await GET(req as never)
    expect(res.status).toBe(404)
  })

  it('returns 404 when user inactive', async () => {
    const helper = setupDbMock()
    helper.selectMock.mockResolvedValueOnce([{
      id: VALID_USER_ID, timezone: 'Europe/Berlin', bookingPageActive: false,
    }])
    mockSession({ user: { id: 'pu-1', email: 'p@example.com', role: 'portal_user' } })

    const { GET } = await import('@/app/api/portal/termin/availability/route')
    const req = new Request(`https://x/api/portal/termin/availability?userId=${VALID_USER_ID}&slotTypeId=${VALID_SLOT_TYPE_ID}&date=2026-05-04`)
    const res = await GET(req as never)
    expect(res.status).toBe(404)
  })

  it('returns slots for valid request', async () => {
    const helper = setupDbMock()
    helper.selectMock.mockResolvedValueOnce([{
      id: VALID_USER_ID, timezone: 'Europe/Berlin', bookingPageActive: true,
    }])
    helper.selectMock.mockResolvedValueOnce([{
      id: VALID_SLOT_TYPE_ID, userId: VALID_USER_ID, isActive: true,
      durationMinutes: 30, bufferBeforeMinutes: 0, bufferAfterMinutes: 0,
      minNoticeHours: 0, maxAdvanceDays: 365,
    }])
    helper.selectMock.mockResolvedValueOnce([])  // rules
    helper.selectMock.mockResolvedValueOnce([])  // overrides
    helper.selectMock.mockResolvedValueOnce([])  // appointments
    helper.selectMock.mockResolvedValueOnce([])  // accounts
    mockSession({ user: { id: 'pu-1', email: 'p@example.com', role: 'portal_user' } })

    const { AvailabilityCalcService } = await import('@/lib/services/availability-calc.service')
    vi.mocked(AvailabilityCalcService.computeFreeSlots).mockReturnValueOnce([
      new Date('2026-05-04T07:00:00Z'),
      new Date('2026-05-04T07:30:00Z'),
    ])

    const { GET } = await import('@/app/api/portal/termin/availability/route')
    const req = new Request(`https://x/api/portal/termin/availability?userId=${VALID_USER_ID}&slotTypeId=${VALID_SLOT_TYPE_ID}&date=2026-05-04`)
    const res = await GET(req as never)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.slots).toEqual(['2026-05-04T07:00:00.000Z', '2026-05-04T07:30:00.000Z'])
  })
})
