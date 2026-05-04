import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setupDbMock } from '@/__tests__/helpers/mock-db'

vi.mock('@/lib/services/appointment.service', () => ({
  AppointmentService: { book: vi.fn() },
  SlotNoLongerAvailableError: class extends Error {
    constructor(message?: string) { super(message); this.name = 'SlotNoLongerAvailableError' }
  },
}))

const VALID_SLOT_TYPE_ID = 'a0000000-0000-4000-8000-000000000001'

function makeReq(body: Record<string, unknown>, headers: Record<string, string> = {}): Request {
  return new Request('https://x/api/buchen/tino/book', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

const validBody = {
  slotTypeId: VALID_SLOT_TYPE_ID,
  startAt: '2026-09-01T09:00:00.000Z',
  customerName: 'Anna Schmidt',
  customerEmail: 'anna@example.com',
  customerPhone: '+491234',
  customerMessage: null,
  consentDsgvo: true,
}

describe('POST /api/buchen/[slug]/book', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  it('happy path returns redirectUrl', async () => {
    const helper = setupDbMock()
    helper.selectMock.mockResolvedValueOnce([{ id: 'u-1', bookingPageActive: true }])
    vi.doMock('@/lib/db', () => ({ db: helper.db }))

    const { AppointmentService } = await import('@/lib/services/appointment.service')
    vi.mocked(AppointmentService.book).mockResolvedValueOnce({
      id: 'appt-1', status: 'confirmed', startAt: new Date(), endAt: new Date(),
    } as never)

    const { POST } = await import('@/app/api/buchen/[slug]/book/route')
    const res = await POST(makeReq(validBody, { 'x-forwarded-for': '1.2.3.4' }) as never, {
      params: Promise.resolve({ slug: 'tino' }),
    } as never)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.appointmentId).toBe('appt-1')
    expect(body.redirectUrl).toBe('/buchen/tino/bestaetigt?id=appt-1')
  })

  it('returns 404 when slug not found', async () => {
    const helper = setupDbMock()
    helper.selectMock.mockResolvedValueOnce([])
    vi.doMock('@/lib/db', () => ({ db: helper.db }))

    const { POST } = await import('@/app/api/buchen/[slug]/book/route')
    const res = await POST(makeReq(validBody) as never, {
      params: Promise.resolve({ slug: 'unknown' }),
    } as never)
    expect(res.status).toBe(404)
  })

  it('returns 400 when consentDsgvo is false', async () => {
    const helper = setupDbMock()
    helper.selectMock.mockResolvedValueOnce([{ id: 'u-1', bookingPageActive: true }])
    vi.doMock('@/lib/db', () => ({ db: helper.db }))

    const { POST } = await import('@/app/api/buchen/[slug]/book/route')
    const res = await POST(makeReq({ ...validBody, consentDsgvo: false }, { 'x-forwarded-for': '5.6.7.8' }) as never, {
      params: Promise.resolve({ slug: 'tino' }),
    } as never)
    expect(res.status).toBe(400)
  })

  it('returns 409 when slot no longer available', async () => {
    const helper = setupDbMock()
    helper.selectMock.mockResolvedValueOnce([{ id: 'u-1', bookingPageActive: true }])
    vi.doMock('@/lib/db', () => ({ db: helper.db }))

    const { AppointmentService, SlotNoLongerAvailableError } = await import('@/lib/services/appointment.service')
    vi.mocked(AppointmentService.book).mockRejectedValueOnce(new SlotNoLongerAvailableError())

    const { POST } = await import('@/app/api/buchen/[slug]/book/route')
    const res = await POST(makeReq(validBody, { 'x-forwarded-for': '9.10.11.12' }) as never, {
      params: Promise.resolve({ slug: 'tino' }),
    } as never)
    expect(res.status).toBe(409)
  })

  it('returns 400 when email is invalid', async () => {
    const helper = setupDbMock()
    helper.selectMock.mockResolvedValueOnce([{ id: 'u-1', bookingPageActive: true }])
    vi.doMock('@/lib/db', () => ({ db: helper.db }))

    const { POST } = await import('@/app/api/buchen/[slug]/book/route')
    const res = await POST(makeReq({ ...validBody, customerEmail: 'not-an-email' }, { 'x-forwarded-for': '1.1.1.1' }) as never, {
      params: Promise.resolve({ slug: 'tino' }),
    } as never)
    expect(res.status).toBe(400)
  })
})
