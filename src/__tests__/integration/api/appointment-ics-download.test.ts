import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setupDbMock } from '@/__tests__/helpers/mock-db'

const APPT_ID = 'a1111111-1111-4111-8111-111111111111'

function makeReq(): Request {
  return new Request(`https://x/api/v1/appointments/${APPT_ID}/ics`, { method: 'GET' })
}

function baseRow(overrides: Record<string, unknown> = {}) {
  return {
    apptId: APPT_ID,
    icsSequence: 0,
    startAt: new Date('2026-09-01T09:00:00.000Z'),
    endAt: new Date('2026-09-01T09:30:00.000Z'),
    status: 'confirmed',
    customerName: 'Anna Schmidt',
    customerEmail: 'anna@example.com',
    customerPhone: '+49 1234 567',
    customerMessage: 'Hallo, freue mich auf das Gespraech.',
    slotTypeName: 'Erstberatung',
    slotTypeLocation: 'phone',
    slotTypeLocationDetails: 'Telefonisch',
    organizerEmail: 'tino@xkmu.de',
    organizerFirst: 'Tino',
    organizerLast: 'Stenzel',
    ...overrides,
  }
}

describe('GET /api/v1/appointments/[id]/ics', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks() })

  it('happy path: returns 200 with ics body and METHOD:REQUEST for confirmed appt', async () => {
    const helper = setupDbMock()
    helper.selectMock.mockResolvedValueOnce([baseRow()])
    vi.doMock('@/lib/db', () => ({ db: helper.db }))

    const { GET } = await import('@/app/api/v1/appointments/[id]/ics/route')
    const res = await GET(makeReq() as never, {
      params: Promise.resolve({ id: APPT_ID }),
    } as never)

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('text/calendar; charset=utf-8')
    expect(res.headers.get('Content-Disposition')).toContain('termin.ics')

    const body = await res.text()
    expect(body.startsWith('BEGIN:VCALENDAR')).toBe(true)
    expect(body).toContain(`UID:${APPT_ID}@xkmu.de`)
    expect(body).toContain('METHOD:REQUEST')
    expect(body).toContain('STATUS:CONFIRMED')
  })

  it('cancelled appointment: METHOD:CANCEL and STATUS:CANCELLED', async () => {
    const helper = setupDbMock()
    helper.selectMock.mockResolvedValueOnce([baseRow({ status: 'cancelled' })])
    vi.doMock('@/lib/db', () => ({ db: helper.db }))

    const { GET } = await import('@/app/api/v1/appointments/[id]/ics/route')
    const res = await GET(makeReq() as never, {
      params: Promise.resolve({ id: APPT_ID }),
    } as never)

    expect(res.status).toBe(200)
    const body = await res.text()
    expect(body).toContain('METHOD:CANCEL')
    expect(body).toContain('STATUS:CANCELLED')
  })

  it('returns 404 when no appointment row found', async () => {
    const helper = setupDbMock()
    helper.selectMock.mockResolvedValueOnce([])
    vi.doMock('@/lib/db', () => ({ db: helper.db }))

    const { GET } = await import('@/app/api/v1/appointments/[id]/ics/route')
    const res = await GET(makeReq() as never, {
      params: Promise.resolve({ id: APPT_ID }),
    } as never)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body).toEqual({ error: 'not_found' })
  })

  it('returns 400 for malformed (non-UUID) id', async () => {
    const helper = setupDbMock()
    vi.doMock('@/lib/db', () => ({ db: helper.db }))

    const { GET } = await import('@/app/api/v1/appointments/[id]/ics/route')
    const res = await GET(makeReq() as never, {
      params: Promise.resolve({ id: 'not-a-uuid' }),
    } as never)

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body).toEqual({ error: 'invalid_id' })
  })
})
