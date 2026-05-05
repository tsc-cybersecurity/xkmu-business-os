import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/lib/services/appointment.service', () => ({
  AppointmentService: {
    rescheduleByOwner: vi.fn(),
  },
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

const VALID_APPT_ID = 'a0000000-0000-4000-8000-000000000001'
const VALID_START = '2026-09-01T09:00:00.000Z'

function makeReq(body: unknown, opts: { rawText?: string } = {}): Request {
  const init: RequestInit = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: opts.rawText !== undefined ? opts.rawText : JSON.stringify(body),
  }
  return new Request(`https://x/api/portal/termin/${VALID_APPT_ID}/reschedule`, init)
}

function makeCtx(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe('POST /api/portal/termin/[id]/reschedule', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    mockSession(null)

    const { POST } = await import('@/app/api/portal/termin/[id]/reschedule/route')
    const res = await POST(makeReq({ startAtUtc: VALID_START }) as never, makeCtx(VALID_APPT_ID))
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'unauthorized' })
  })

  it('returns 400 invalid_id when id is not a UUID', async () => {
    mockSession({ user: { id: 'pu-1', email: 'p@example.com', role: 'portal_user' } })

    const { POST } = await import('@/app/api/portal/termin/[id]/reschedule/route')
    const res = await POST(makeReq({ startAtUtc: VALID_START }) as never, makeCtx('not-a-uuid'))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'invalid_id' })
  })

  it('returns 400 invalid_body when startAtUtc missing', async () => {
    mockSession({ user: { id: 'pu-1', email: 'p@example.com', role: 'portal_user' } })

    const { POST } = await import('@/app/api/portal/termin/[id]/reschedule/route')
    const res = await POST(makeReq({}) as never, makeCtx(VALID_APPT_ID))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'invalid_body' })
  })

  it('returns 200 on happy path', async () => {
    mockSession({ user: { id: 'pu-1', email: 'p@example.com', role: 'portal_user' } })
    const { AppointmentService } = await import('@/lib/services/appointment.service')
    const startAt = new Date(VALID_START)
    const endAt = new Date('2026-09-01T09:30:00.000Z')
    vi.mocked(AppointmentService.rescheduleByOwner).mockResolvedValueOnce({ startAt, endAt })

    const { POST } = await import('@/app/api/portal/termin/[id]/reschedule/route')
    const res = await POST(makeReq({ startAtUtc: VALID_START }) as never, makeCtx(VALID_APPT_ID))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({
      success: true,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
    })
    expect(AppointmentService.rescheduleByOwner).toHaveBeenCalledWith({
      appointmentId: VALID_APPT_ID,
      portalUserId: 'pu-1',
      newStartAtUtc: startAt,
    })
  })

  it('returns 409 on SlotNoLongerAvailableError', async () => {
    mockSession({ user: { id: 'pu-1', email: 'p@example.com', role: 'portal_user' } })
    const { AppointmentService, SlotNoLongerAvailableError } = await import('@/lib/services/appointment.service')
    vi.mocked(AppointmentService.rescheduleByOwner).mockRejectedValueOnce(new SlotNoLongerAvailableError())

    const { POST } = await import('@/app/api/portal/termin/[id]/reschedule/route')
    const res = await POST(makeReq({ startAtUtc: VALID_START }) as never, makeCtx(VALID_APPT_ID))
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ error: 'slot_unavailable' })
  })

  it('returns 403 when service throws not_owned', async () => {
    mockSession({ user: { id: 'pu-1', email: 'p@example.com', role: 'portal_user' } })
    const { AppointmentService } = await import('@/lib/services/appointment.service')
    vi.mocked(AppointmentService.rescheduleByOwner).mockRejectedValueOnce(new Error('not_owned'))

    const { POST } = await import('@/app/api/portal/termin/[id]/reschedule/route')
    const res = await POST(makeReq({ startAtUtc: VALID_START }) as never, makeCtx(VALID_APPT_ID))
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'forbidden' })
  })

  it('returns 410 when service throws appointment_cancelled', async () => {
    mockSession({ user: { id: 'pu-1', email: 'p@example.com', role: 'portal_user' } })
    const { AppointmentService } = await import('@/lib/services/appointment.service')
    vi.mocked(AppointmentService.rescheduleByOwner).mockRejectedValueOnce(new Error('appointment_cancelled'))

    const { POST } = await import('@/app/api/portal/termin/[id]/reschedule/route')
    const res = await POST(makeReq({ startAtUtc: VALID_START }) as never, makeCtx(VALID_APPT_ID))
    expect(res.status).toBe(410)
    expect(await res.json()).toEqual({ error: 'appointment_cancelled' })
  })

  it('returns 404 when service throws appointment_not_found', async () => {
    mockSession({ user: { id: 'pu-1', email: 'p@example.com', role: 'portal_user' } })
    const { AppointmentService } = await import('@/lib/services/appointment.service')
    vi.mocked(AppointmentService.rescheduleByOwner).mockRejectedValueOnce(new Error('appointment_not_found'))

    const { POST } = await import('@/app/api/portal/termin/[id]/reschedule/route')
    const res = await POST(makeReq({ startAtUtc: VALID_START }) as never, makeCtx(VALID_APPT_ID))
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'not_found' })
  })
})
