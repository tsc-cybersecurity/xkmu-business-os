import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/lib/services/appointment.service', () => ({
  AppointmentService: { bookForPortal: vi.fn() },
  SlotNoLongerAvailableError: class extends Error {
    constructor(message = 'Slot is no longer available') {
      super(message)
      this.name = 'SlotNoLongerAvailableError'
    }
  },
}))

function mockSession(value: unknown) {
  vi.doMock('@/lib/auth/session', () => ({
    getSession: vi.fn().mockResolvedValue(value),
  }))
}

const VALID_USER_ID = 'a0000000-0000-4000-8000-0000000000aa'
const VALID_SLOT_TYPE_ID = 'a0000000-0000-4000-8000-000000000001'
const VALID_START = '2026-09-01T09:00:00.000Z'

function makeReq(body: unknown, opts: { rawText?: string } = {}): Request {
  const init: RequestInit = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: opts.rawText !== undefined ? opts.rawText : JSON.stringify(body),
  }
  return new Request('https://x/api/portal/termin/book', init)
}

describe('POST /api/portal/termin/book', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    mockSession(null)

    const { POST } = await import('@/app/api/portal/termin/book/route')
    const res = await POST(makeReq({
      userId: VALID_USER_ID,
      slotTypeId: VALID_SLOT_TYPE_ID,
      startAtUtc: VALID_START,
    }) as never)
    expect(res.status).toBe(401)
  })

  it('returns 400 invalid_body when userId missing', async () => {
    mockSession({ user: { id: 'pu-1', email: 'p@example.com', role: 'portal_user' } })

    const { POST } = await import('@/app/api/portal/termin/book/route')
    const res = await POST(makeReq({
      slotTypeId: VALID_SLOT_TYPE_ID,
      startAtUtc: VALID_START,
    }) as never)
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'invalid_body' })
  })

  it('returns 200 with success on happy path', async () => {
    mockSession({ user: { id: 'pu-1', email: 'p@example.com', role: 'portal_user' } })

    const { AppointmentService } = await import('@/lib/services/appointment.service')
    const fakeResult = {
      id: 'appt-1',
      status: 'confirmed',
      startAt: new Date(VALID_START),
      endAt: new Date('2026-09-01T09:30:00.000Z'),
    }
    vi.mocked(AppointmentService.bookForPortal).mockResolvedValueOnce(fakeResult)

    const { POST } = await import('@/app/api/portal/termin/book/route')
    const res = await POST(makeReq({
      userId: VALID_USER_ID,
      slotTypeId: VALID_SLOT_TYPE_ID,
      startAtUtc: VALID_START,
      message: 'Hello',
    }) as never)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.id).toBe('appt-1')
    expect(AppointmentService.bookForPortal).toHaveBeenCalledWith({
      portalUserId: 'pu-1',
      userId: VALID_USER_ID,
      slotTypeId: VALID_SLOT_TYPE_ID,
      startAtUtc: new Date(VALID_START),
      message: 'Hello',
    })
  })

  it('returns 409 on SlotNoLongerAvailableError', async () => {
    mockSession({ user: { id: 'pu-1', email: 'p@example.com', role: 'portal_user' } })

    const { AppointmentService, SlotNoLongerAvailableError } = await import('@/lib/services/appointment.service')
    vi.mocked(AppointmentService.bookForPortal).mockRejectedValueOnce(new SlotNoLongerAvailableError())

    const { POST } = await import('@/app/api/portal/termin/book/route')
    const res = await POST(makeReq({
      userId: VALID_USER_ID,
      slotTypeId: VALID_SLOT_TYPE_ID,
      startAtUtc: VALID_START,
    }) as never)
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ error: 'slot_unavailable' })
  })

  it('returns 412 on person_not_linked', async () => {
    mockSession({ user: { id: 'pu-1', email: 'p@example.com', role: 'portal_user' } })

    const { AppointmentService } = await import('@/lib/services/appointment.service')
    vi.mocked(AppointmentService.bookForPortal).mockRejectedValueOnce(new Error('person_not_linked'))

    const { POST } = await import('@/app/api/portal/termin/book/route')
    const res = await POST(makeReq({
      userId: VALID_USER_ID,
      slotTypeId: VALID_SLOT_TYPE_ID,
      startAtUtc: VALID_START,
    }) as never)
    expect(res.status).toBe(412)
    expect(await res.json()).toEqual({ error: 'person_not_linked' })
  })
})
