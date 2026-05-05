import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/lib/services/appointment.service', () => ({
  AppointmentService: { cancel: vi.fn() },
  AppointmentTokenError: class extends Error {
    constructor(public reason: 'expired' | 'invalid' | 'revoked' | 'wrong_purpose', message?: string) {
      super(message ?? reason)
      this.name = 'AppointmentTokenError'
    }
  },
}))

vi.mock('@/lib/services/audit-log.service', () => ({
  AuditLogService: { log: vi.fn() },
}))

const VALID_TOKEN = 'a'.repeat(40)

function makeReq(body: unknown, headers: Record<string, string> = {}, opts: { rawText?: string } = {}): Request {
  const init: RequestInit = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: opts.rawText !== undefined ? opts.rawText : JSON.stringify(body),
  }
  return new Request('https://x/api/buchen/cancel', init)
}

describe('POST /api/buchen/cancel', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  it('returns 200 with success on valid cancel', async () => {
    const { AppointmentService } = await import('@/lib/services/appointment.service')
    vi.mocked(AppointmentService.cancel).mockResolvedValueOnce({ alreadyCancelled: false, appointmentId: 'appt-1' })

    const { POST } = await import('@/app/api/buchen/cancel/route')
    const res = await POST(makeReq(
      { token: VALID_TOKEN, reason: 'no longer needed' },
      { 'x-forwarded-for': '1.0.0.1' },
    ) as never)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ success: true, alreadyCancelled: false })
    expect(AppointmentService.cancel).toHaveBeenCalledWith({
      token: VALID_TOKEN, reason: 'no longer needed',
    })
  })

  it('returns 200 with alreadyCancelled=true when service reports idempotent cancel', async () => {
    const { AppointmentService } = await import('@/lib/services/appointment.service')
    vi.mocked(AppointmentService.cancel).mockResolvedValueOnce({ alreadyCancelled: true, appointmentId: 'appt-1' })

    const { POST } = await import('@/app/api/buchen/cancel/route')
    const res = await POST(makeReq(
      { token: VALID_TOKEN },
      { 'x-forwarded-for': '1.0.0.2' },
    ) as never)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true, alreadyCancelled: true })
  })

  it('returns 400 invalid_body when token is missing', async () => {
    const { POST } = await import('@/app/api/buchen/cancel/route')
    const res = await POST(makeReq(
      { reason: 'whatever' },
      { 'x-forwarded-for': '1.0.0.3' },
    ) as never)
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'invalid_body' })
  })

  it('returns 400 invalid_json on malformed JSON', async () => {
    const { POST } = await import('@/app/api/buchen/cancel/route')
    const res = await POST(makeReq(
      undefined,
      { 'x-forwarded-for': '1.0.0.4' },
      { rawText: 'not-json{' },
    ) as never)
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'invalid_json' })
  })

  it('returns 410 token_expired for expired token', async () => {
    const { AppointmentService, AppointmentTokenError } = await import('@/lib/services/appointment.service')
    vi.mocked(AppointmentService.cancel).mockRejectedValueOnce(new AppointmentTokenError('expired'))

    const { POST } = await import('@/app/api/buchen/cancel/route')
    const res = await POST(makeReq(
      { token: VALID_TOKEN },
      { 'x-forwarded-for': '1.0.0.5' },
    ) as never)
    expect(res.status).toBe(410)
    expect(await res.json()).toEqual({ error: 'token_expired' })
  })

  it('returns 403 token_invalid for invalid token', async () => {
    const { AppointmentService, AppointmentTokenError } = await import('@/lib/services/appointment.service')
    vi.mocked(AppointmentService.cancel).mockRejectedValueOnce(new AppointmentTokenError('invalid'))

    const { POST } = await import('@/app/api/buchen/cancel/route')
    const res = await POST(makeReq(
      { token: VALID_TOKEN },
      { 'x-forwarded-for': '1.0.0.6' },
    ) as never)
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'token_invalid' })
  })

  it('returns 403 token_revoked for revoked token', async () => {
    const { AppointmentService, AppointmentTokenError } = await import('@/lib/services/appointment.service')
    vi.mocked(AppointmentService.cancel).mockRejectedValueOnce(new AppointmentTokenError('revoked'))

    const { POST } = await import('@/app/api/buchen/cancel/route')
    const res = await POST(makeReq(
      { token: VALID_TOKEN },
      { 'x-forwarded-for': '1.0.0.7' },
    ) as never)
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'token_revoked' })
  })

  it('returns 403 token_wrong_purpose for token with wrong purpose', async () => {
    const { AppointmentService, AppointmentTokenError } = await import('@/lib/services/appointment.service')
    vi.mocked(AppointmentService.cancel).mockRejectedValueOnce(new AppointmentTokenError('wrong_purpose'))

    const { POST } = await import('@/app/api/buchen/cancel/route')
    const res = await POST(makeReq(
      { token: VALID_TOKEN },
      { 'x-forwarded-for': '1.0.0.8' },
    ) as never)
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'token_wrong_purpose' })
  })

  it('returns 500 cancel_failed for unexpected service error', async () => {
    const { AppointmentService } = await import('@/lib/services/appointment.service')
    vi.mocked(AppointmentService.cancel).mockRejectedValueOnce(new Error('boom'))
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { POST } = await import('@/app/api/buchen/cancel/route')
    const res = await POST(makeReq(
      { token: VALID_TOKEN },
      { 'x-forwarded-for': '1.0.0.9' },
    ) as never)
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'cancel_failed' })

    errSpy.mockRestore()
  })

  it('returns 429 after rate limit threshold from same IP', async () => {
    const { AppointmentService } = await import('@/lib/services/appointment.service')
    vi.mocked(AppointmentService.cancel).mockResolvedValue({ alreadyCancelled: false, appointmentId: 'appt-1' })

    const { POST } = await import('@/app/api/buchen/cancel/route')
    const ip = '9.9.9.9'

    let lastStatus = 0
    for (let i = 0; i < 11; i++) {
      const res = await POST(makeReq(
        { token: VALID_TOKEN },
        { 'x-forwarded-for': ip },
      ) as never)
      lastStatus = res.status
    }
    expect(lastStatus).toBe(429)
  })
})
