import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/lib/services/appointment.service', () => ({
  AppointmentService: {
    cancelByOwner: vi.fn(),
  },
}))

function mockSession(value: unknown) {
  vi.doMock('@/lib/auth/session', () => ({
    getSession: vi.fn().mockResolvedValue(value),
  }))
}

const VALID_APPT_ID = 'a0000000-0000-4000-8000-000000000001'

function makeReq(body: unknown, opts: { rawText?: string } = {}): Request {
  const init: RequestInit = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: opts.rawText !== undefined ? opts.rawText : JSON.stringify(body),
  }
  return new Request(`https://x/api/portal/termin/${VALID_APPT_ID}/cancel`, init)
}

function makeCtx(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe('POST /api/portal/termin/[id]/cancel', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    mockSession(null)

    const { POST } = await import('@/app/api/portal/termin/[id]/cancel/route')
    const res = await POST(makeReq({}) as never, makeCtx(VALID_APPT_ID))
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'unauthorized' })
  })

  it('returns 400 when id is not a UUID', async () => {
    mockSession({ user: { id: 'pu-1', email: 'p@example.com', role: 'portal_user' } })

    const { POST } = await import('@/app/api/portal/termin/[id]/cancel/route')
    const res = await POST(makeReq({}) as never, makeCtx('not-a-uuid'))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'invalid_id' })
  })

  it('returns 200 on happy path', async () => {
    mockSession({ user: { id: 'pu-1', email: 'p@example.com', role: 'portal_user' } })
    const { AppointmentService } = await import('@/lib/services/appointment.service')
    vi.mocked(AppointmentService.cancelByOwner).mockResolvedValueOnce({ alreadyCancelled: false })

    const { POST } = await import('@/app/api/portal/termin/[id]/cancel/route')
    const res = await POST(makeReq({ reason: 'no longer needed' }) as never, makeCtx(VALID_APPT_ID))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true, alreadyCancelled: false })
    expect(AppointmentService.cancelByOwner).toHaveBeenCalledWith({
      appointmentId: VALID_APPT_ID,
      portalUserId: 'pu-1',
      reason: 'no longer needed',
    })
  })

  it('returns 200 with alreadyCancelled=true when service reports idempotent cancel', async () => {
    mockSession({ user: { id: 'pu-1', email: 'p@example.com', role: 'portal_user' } })
    const { AppointmentService } = await import('@/lib/services/appointment.service')
    vi.mocked(AppointmentService.cancelByOwner).mockResolvedValueOnce({ alreadyCancelled: true })

    const { POST } = await import('@/app/api/portal/termin/[id]/cancel/route')
    const res = await POST(makeReq({}) as never, makeCtx(VALID_APPT_ID))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true, alreadyCancelled: true })
  })

  it('returns 403 when service throws not_owned', async () => {
    mockSession({ user: { id: 'pu-1', email: 'p@example.com', role: 'portal_user' } })
    const { AppointmentService } = await import('@/lib/services/appointment.service')
    vi.mocked(AppointmentService.cancelByOwner).mockRejectedValueOnce(new Error('not_owned'))

    const { POST } = await import('@/app/api/portal/termin/[id]/cancel/route')
    const res = await POST(makeReq({}) as never, makeCtx(VALID_APPT_ID))
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'forbidden' })
  })

  it('returns 404 when service throws appointment_not_found', async () => {
    mockSession({ user: { id: 'pu-1', email: 'p@example.com', role: 'portal_user' } })
    const { AppointmentService } = await import('@/lib/services/appointment.service')
    vi.mocked(AppointmentService.cancelByOwner).mockRejectedValueOnce(new Error('appointment_not_found'))

    const { POST } = await import('@/app/api/portal/termin/[id]/cancel/route')
    const res = await POST(makeReq({}) as never, makeCtx(VALID_APPT_ID))
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'not_found' })
  })
})
