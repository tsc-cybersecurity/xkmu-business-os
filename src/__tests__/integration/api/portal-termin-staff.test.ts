import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setupDbMock } from '@/__tests__/helpers/mock-db'

function mockSession(value: unknown) {
  vi.doMock('@/lib/auth/session', () => ({
    getSession: vi.fn().mockResolvedValue(value),
  }))
}

describe('GET /api/portal/termin/staff', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    setupDbMock()
    mockSession(null)

    const { GET } = await import('@/app/api/portal/termin/staff/route')
    const res = await GET()
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'unauthorized' })
  })

  it('returns 200 with staff and attached slot types', async () => {
    const helper = setupDbMock()
    helper.selectMock.mockResolvedValueOnce([
      {
        id: 'u-1', firstName: 'Tino', lastName: 'Stenzel',
        bookingSlug: 'tino', bookingPageTitle: 'Termin mit Tino',
        bookingPageSubtitle: null, timezone: 'Europe/Berlin',
      },
      {
        id: 'u-2', firstName: 'Anna', lastName: 'B',
        bookingSlug: 'anna', bookingPageTitle: null,
        bookingPageSubtitle: null, timezone: 'Europe/Berlin',
      },
    ])
    helper.selectMock.mockResolvedValueOnce([
      {
        id: 'st-1', userId: 'u-1', name: 'Erstgespräch', durationMinutes: 30,
        location: 'video', locationDetails: null, description: null, color: '#3b82f6',
        minNoticeHours: 0, maxAdvanceDays: 365,
      },
      {
        id: 'st-2', userId: 'u-1', name: 'Folgetermin', durationMinutes: 60,
        location: 'phone', locationDetails: null, description: null, color: '#10b981',
        minNoticeHours: 24, maxAdvanceDays: 30,
      },
    ])
    mockSession({
      user: { id: 'pu-1', email: 'p@example.com', role: 'portal_user' },
    })

    const { GET } = await import('@/app/api/portal/termin/staff/route')
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.staff).toHaveLength(2)
    expect(body.staff[0].id).toBe('u-1')
    expect(body.staff[0].slotTypes).toHaveLength(2)
    expect(body.staff[0].slotTypes[0].id).toBe('st-1')
    expect(body.staff[1].id).toBe('u-2')
    expect(body.staff[1].slotTypes).toEqual([])
  })
})
