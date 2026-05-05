import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/lib/auth/require-permission', () => ({
  withPermission: vi.fn((req, mod, action, fn) => fn({ userId: 'u-1', role: 'owner' })),
}))

vi.mock('@/lib/services/appointment.service', () => ({
  AppointmentService: { bookManual: vi.fn() },
  SlotNoLongerAvailableError: class extends Error {
    constructor(message?: string) {
      super(message)
      this.name = 'SlotNoLongerAvailableError'
    }
  },
}))

const VALID_USER_ID = 'a0000000-0000-4000-8000-000000000001'
const VALID_SLOT_TYPE_ID = 'a0000000-0000-4000-8000-000000000002'
const VALID_PERSON_ID = 'a0000000-0000-4000-8000-000000000003'

const validBody = {
  userId: VALID_USER_ID,
  slotTypeId: VALID_SLOT_TYPE_ID,
  startAtUtc: '2026-09-01T09:00:00.000Z',
  customerName: 'Anna',
  customerEmail: 'anna@example.com',
  customerPhone: '+491234',
  customerMessage: null,
  personId: VALID_PERSON_ID,
}

function makeReq(body: unknown): Request {
  return new Request('https://x/api/v1/appointments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

describe('POST /api/v1/appointments', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('happy path returns 201 with appointment and forwards args correctly', async () => {
    const { AppointmentService } = await import('@/lib/services/appointment.service')
    const startAt = new Date('2026-09-01T09:00:00.000Z')
    const endAt = new Date('2026-09-01T09:30:00.000Z')
    vi.mocked(AppointmentService.bookManual).mockResolvedValueOnce({
      id: 'appt-1',
      status: 'confirmed',
      startAt,
      endAt,
    } as never)

    const { POST } = await import('@/app/api/v1/appointments/route')
    const res = await POST(makeReq(validBody) as never)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.appointment.id).toBe('appt-1')
    expect(body.appointment.status).toBe('confirmed')

    expect(AppointmentService.bookManual).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: VALID_USER_ID,
        slotTypeId: VALID_SLOT_TYPE_ID,
        startAtUtc: expect.any(Date),
        personId: VALID_PERSON_ID,
        customer: expect.objectContaining({
          name: 'Anna',
          email: 'anna@example.com',
          phone: '+491234',
          message: null,
        }),
      }),
    )
    const callArgs = vi.mocked(AppointmentService.bookManual).mock.calls[0][0]
    expect(callArgs.startAtUtc.toISOString()).toBe('2026-09-01T09:00:00.000Z')
  })

  it('returns 400 when required field (customerEmail) missing', async () => {
    const { POST } = await import('@/app/api/v1/appointments/route')
    const { customerEmail: _omit, ...invalid } = validBody
    void _omit
    const res = await POST(makeReq(invalid) as never)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('invalid_body')
    expect(body.details).toBeDefined()
  })

  it('returns 409 when slot is no longer available', async () => {
    const { AppointmentService, SlotNoLongerAvailableError } = await import(
      '@/lib/services/appointment.service'
    )
    vi.mocked(AppointmentService.bookManual).mockRejectedValueOnce(new SlotNoLongerAvailableError())

    const { POST } = await import('@/app/api/v1/appointments/route')
    const res = await POST(makeReq(validBody) as never)
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe('slot_unavailable')
  })

  it('forwards suppressCustomerMail flag to bookManual', async () => {
    const { AppointmentService } = await import('@/lib/services/appointment.service')
    vi.mocked(AppointmentService.bookManual).mockResolvedValueOnce({
      id: 'appt-2',
      status: 'confirmed',
      startAt: new Date(),
      endAt: new Date(),
    } as never)

    const { POST } = await import('@/app/api/v1/appointments/route')
    const res = await POST(
      makeReq({ ...validBody, suppressCustomerMail: true }) as never,
    )
    expect(res.status).toBe(201)
    expect(AppointmentService.bookManual).toHaveBeenCalledWith(
      expect.objectContaining({ suppressCustomerMail: true }),
    )
  })

  it('returns 400 for malformed JSON body', async () => {
    const { POST } = await import('@/app/api/v1/appointments/route')
    const res = await POST(makeReq('not-json') as never)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('invalid_json')
  })
})
