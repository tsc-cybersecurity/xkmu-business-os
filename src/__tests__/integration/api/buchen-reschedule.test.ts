import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest'
import { setupDbMock } from '@/__tests__/helpers/mock-db'

const ORIG_ENV = process.env

const APPT_ID = 'a0000000-0000-4000-8000-000000000001'
const SLOT_TYPE_ID = 'b0000000-0000-4000-8000-000000000002'
const USER_ID = 'c0000000-0000-4000-8000-000000000003'

// -----------------------------------------------------------------------------
// GET /api/buchen/reschedule/availability
// -----------------------------------------------------------------------------

vi.mock('@/lib/services/availability-calc.service', () => ({
  AvailabilityCalcService: { computeFreeSlots: vi.fn() },
}))

describe('GET /api/buchen/reschedule/availability', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    process.env = { ...ORIG_ENV, APPOINTMENT_TOKEN_SECRET: 'a'.repeat(64) }
  })

  afterAll(() => { process.env = ORIG_ENV })

  async function makeRescheduleToken() {
    const { generateAppointmentToken } = await import('@/lib/utils/appointment-token.util')
    return generateAppointmentToken({
      appointmentId: APPT_ID,
      purpose: 'reschedule',
      expiresAt: new Date(Date.now() + 3600_000),
    })
  }

  async function makeExpiredToken() {
    // Build an expired token by manipulating the payload directly.
    const { encodeBase64Url } = await import('@/lib/utils/appointment-token.util')
    const { createHmac } = await import('node:crypto')
    const payload = {
      a: APPT_ID,
      p: 'reschedule',
      e: Date.now() - 1000,
      n: 'deadbeefdeadbeef',
    }
    const payloadEnc = encodeBase64Url(JSON.stringify(payload))
    const sig = createHmac('sha256', Buffer.from(process.env.APPOINTMENT_TOKEN_SECRET!, 'utf8'))
      .update(payloadEnc).digest()
    return `${payloadEnc}.${encodeBase64Url(sig)}`
  }

  async function makeCancelToken() {
    const { generateAppointmentToken } = await import('@/lib/utils/appointment-token.util')
    return generateAppointmentToken({
      appointmentId: APPT_ID,
      purpose: 'cancel',
      expiresAt: new Date(Date.now() + 3600_000),
    })
  }

  it('returns 200 with slots, slotType and timezone for valid token', async () => {
    const { token, hash } = await makeRescheduleToken()

    const helper = setupDbMock()
    // appointment lookup
    helper.selectMock.mockResolvedValueOnce([{
      id: APPT_ID,
      userId: USER_ID,
      slotTypeId: SLOT_TYPE_ID,
      status: 'confirmed',
      rescheduleTokenHash: hash,
      startAt: new Date('2026-05-04T10:00:00Z'),
      endAt: new Date('2026-05-04T10:30:00Z'),
    }])
    // user
    helper.selectMock.mockResolvedValueOnce([{ id: USER_ID, timezone: 'Europe/Berlin' }])
    // slot type
    helper.selectMock.mockResolvedValueOnce([{
      id: SLOT_TYPE_ID,
      userId: USER_ID,
      name: 'Erstgespräch',
      isActive: true,
      durationMinutes: 30,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      minNoticeHours: 0,
      maxAdvanceDays: 365,
    }])
    // rules, overrides, existing appts (Promise.all order)
    helper.selectMock.mockResolvedValueOnce([])
    helper.selectMock.mockResolvedValueOnce([])
    helper.selectMock.mockResolvedValueOnce([])
    // accounts
    helper.selectMock.mockResolvedValueOnce([])

    const { AvailabilityCalcService } = await import('@/lib/services/availability-calc.service')
    vi.mocked(AvailabilityCalcService.computeFreeSlots).mockReturnValueOnce([
      new Date('2026-05-05T08:00:00Z'),
      new Date('2026-05-05T08:30:00Z'),
    ])

    const { GET } = await import('@/app/api/buchen/reschedule/availability/route')
    const req = new Request(
      `https://x/api/buchen/reschedule/availability?token=${encodeURIComponent(token)}&date=2026-05-05`,
    )
    const res = await GET(req as never)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.slots).toEqual(['2026-05-05T08:00:00.000Z', '2026-05-05T08:30:00.000Z'])
    expect(body.slotType).toEqual({ id: SLOT_TYPE_ID, name: 'Erstgespräch', durationMinutes: 30 })
    expect(body.timezone).toBe('Europe/Berlin')
  })

  it('returns 400 invalid_query when token is missing', async () => {
    setupDbMock()
    const { GET } = await import('@/app/api/buchen/reschedule/availability/route')
    const req = new Request('https://x/api/buchen/reschedule/availability?date=2026-05-05')
    const res = await GET(req as never)
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'invalid_query' })
  })

  it('returns 410 token_expired for expired token', async () => {
    setupDbMock()
    const expired = await makeExpiredToken()
    const { GET } = await import('@/app/api/buchen/reschedule/availability/route')
    const req = new Request(
      `https://x/api/buchen/reschedule/availability?token=${encodeURIComponent(expired)}&date=2026-05-05`,
    )
    const res = await GET(req as never)
    expect(res.status).toBe(410)
    expect(await res.json()).toEqual({ error: 'token_expired' })
  })

  it('returns 403 token_wrong_purpose for cancel-purpose token', async () => {
    setupDbMock()
    const { token } = await makeCancelToken()
    const { GET } = await import('@/app/api/buchen/reschedule/availability/route')
    const req = new Request(
      `https://x/api/buchen/reschedule/availability?token=${encodeURIComponent(token)}&date=2026-05-05`,
    )
    const res = await GET(req as never)
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'token_wrong_purpose' })
  })

  it('returns 403 token_revoked when DB hash does not match', async () => {
    const { token } = await makeRescheduleToken()
    const helper = setupDbMock()
    helper.selectMock.mockResolvedValueOnce([{
      id: APPT_ID,
      userId: USER_ID,
      slotTypeId: SLOT_TYPE_ID,
      status: 'confirmed',
      rescheduleTokenHash: 'different-hash',
      startAt: new Date('2026-05-04T10:00:00Z'),
      endAt: new Date('2026-05-04T10:30:00Z'),
    }])

    const { GET } = await import('@/app/api/buchen/reschedule/availability/route')
    const req = new Request(
      `https://x/api/buchen/reschedule/availability?token=${encodeURIComponent(token)}&date=2026-05-05`,
    )
    const res = await GET(req as never)
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'token_revoked' })
  })
})

// -----------------------------------------------------------------------------
// POST /api/buchen/reschedule
// -----------------------------------------------------------------------------

vi.mock('@/lib/services/appointment.service', () => ({
  AppointmentService: { reschedule: vi.fn() },
  AppointmentTokenError: class extends Error {
    constructor(public reason: 'expired' | 'invalid' | 'revoked' | 'wrong_purpose', message?: string) {
      super(message ?? reason)
      this.name = 'AppointmentTokenError'
    }
  },
  SlotNoLongerAvailableError: class extends Error {
    constructor(message = 'Slot is no longer available') {
      super(message)
      this.name = 'SlotNoLongerAvailableError'
    }
  },
}))

const VALID_TOKEN = 'a'.repeat(40)

function makePostReq(body: unknown, headers: Record<string, string> = {}, opts: { rawText?: string } = {}): Request {
  const init: RequestInit = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: opts.rawText !== undefined ? opts.rawText : JSON.stringify(body),
  }
  return new Request('https://x/api/buchen/reschedule', init)
}

describe('POST /api/buchen/reschedule', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  it('returns 200 with success on valid reschedule', async () => {
    const { AppointmentService } = await import('@/lib/services/appointment.service')
    const startAt = new Date('2026-05-05T08:00:00.000Z')
    const endAt = new Date('2026-05-05T08:30:00.000Z')
    vi.mocked(AppointmentService.reschedule).mockResolvedValueOnce({ startAt, endAt })

    const { POST } = await import('@/app/api/buchen/reschedule/route')
    const res = await POST(makePostReq(
      { token: VALID_TOKEN, startAtUtc: startAt.toISOString() },
      { 'x-forwarded-for': '2.0.0.1' },
    ) as never)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      success: true,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
    })
    expect(AppointmentService.reschedule).toHaveBeenCalledWith({
      token: VALID_TOKEN,
      newStartAtUtc: startAt,
    })
  })

  it('returns 400 invalid_body when token is missing', async () => {
    const { POST } = await import('@/app/api/buchen/reschedule/route')
    const res = await POST(makePostReq(
      { startAtUtc: '2026-05-05T08:00:00.000Z' },
      { 'x-forwarded-for': '2.0.0.2' },
    ) as never)
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'invalid_body' })
  })

  it('returns 400 invalid_body when startAtUtc is not a valid datetime', async () => {
    const { POST } = await import('@/app/api/buchen/reschedule/route')
    const res = await POST(makePostReq(
      { token: VALID_TOKEN, startAtUtc: 'not-a-date' },
      { 'x-forwarded-for': '2.0.0.3' },
    ) as never)
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'invalid_body' })
  })

  it('returns 400 invalid_json on malformed JSON', async () => {
    const { POST } = await import('@/app/api/buchen/reschedule/route')
    const res = await POST(makePostReq(
      undefined,
      { 'x-forwarded-for': '2.0.0.4' },
      { rawText: 'not-json{' },
    ) as never)
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'invalid_json' })
  })

  it('returns 409 slot_unavailable when slot is taken', async () => {
    const { AppointmentService, SlotNoLongerAvailableError } = await import('@/lib/services/appointment.service')
    vi.mocked(AppointmentService.reschedule).mockRejectedValueOnce(new SlotNoLongerAvailableError())

    const { POST } = await import('@/app/api/buchen/reschedule/route')
    const res = await POST(makePostReq(
      { token: VALID_TOKEN, startAtUtc: '2026-05-05T08:00:00.000Z' },
      { 'x-forwarded-for': '2.0.0.5' },
    ) as never)
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ error: 'slot_unavailable' })
  })

  it('returns 410 token_expired for expired token', async () => {
    const { AppointmentService, AppointmentTokenError } = await import('@/lib/services/appointment.service')
    vi.mocked(AppointmentService.reschedule).mockRejectedValueOnce(new AppointmentTokenError('expired'))

    const { POST } = await import('@/app/api/buchen/reschedule/route')
    const res = await POST(makePostReq(
      { token: VALID_TOKEN, startAtUtc: '2026-05-05T08:00:00.000Z' },
      { 'x-forwarded-for': '2.0.0.6' },
    ) as never)
    expect(res.status).toBe(410)
    expect(await res.json()).toEqual({ error: 'token_expired' })
  })

  it('returns 403 token_invalid for invalid token', async () => {
    const { AppointmentService, AppointmentTokenError } = await import('@/lib/services/appointment.service')
    vi.mocked(AppointmentService.reschedule).mockRejectedValueOnce(new AppointmentTokenError('invalid'))

    const { POST } = await import('@/app/api/buchen/reschedule/route')
    const res = await POST(makePostReq(
      { token: VALID_TOKEN, startAtUtc: '2026-05-05T08:00:00.000Z' },
      { 'x-forwarded-for': '2.0.0.7' },
    ) as never)
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'token_invalid' })
  })

  it('returns 403 token_wrong_purpose for token with wrong purpose', async () => {
    const { AppointmentService, AppointmentTokenError } = await import('@/lib/services/appointment.service')
    vi.mocked(AppointmentService.reschedule).mockRejectedValueOnce(new AppointmentTokenError('wrong_purpose'))

    const { POST } = await import('@/app/api/buchen/reschedule/route')
    const res = await POST(makePostReq(
      { token: VALID_TOKEN, startAtUtc: '2026-05-05T08:00:00.000Z' },
      { 'x-forwarded-for': '2.0.0.8' },
    ) as never)
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'token_wrong_purpose' })
  })

  it('returns 500 reschedule_failed for unexpected service error', async () => {
    const { AppointmentService } = await import('@/lib/services/appointment.service')
    vi.mocked(AppointmentService.reschedule).mockRejectedValueOnce(new Error('boom'))
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { POST } = await import('@/app/api/buchen/reschedule/route')
    const res = await POST(makePostReq(
      { token: VALID_TOKEN, startAtUtc: '2026-05-05T08:00:00.000Z' },
      { 'x-forwarded-for': '2.0.0.9' },
    ) as never)
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'reschedule_failed' })

    errSpy.mockRestore()
  })

  it('returns 429 after rate limit threshold from same IP', async () => {
    const { AppointmentService } = await import('@/lib/services/appointment.service')
    vi.mocked(AppointmentService.reschedule).mockResolvedValue({
      startAt: new Date('2026-05-05T08:00:00.000Z'),
      endAt: new Date('2026-05-05T08:30:00.000Z'),
    })

    const { POST } = await import('@/app/api/buchen/reschedule/route')
    const ip = '8.8.8.8'

    let lastStatus = 0
    for (let i = 0; i < 11; i++) {
      const res = await POST(makePostReq(
        { token: VALID_TOKEN, startAtUtc: '2026-05-05T08:00:00.000Z' },
        { 'x-forwarded-for': ip },
      ) as never)
      lastStatus = res.status
    }
    expect(lastStatus).toBe(429)
  })
})
