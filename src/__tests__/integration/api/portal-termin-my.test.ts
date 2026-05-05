import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setupDbMock } from '@/__tests__/helpers/mock-db'

function mockSession(value: unknown) {
  vi.doMock('@/lib/auth/session', () => ({
    getSession: vi.fn().mockResolvedValue(value),
  }))
}

describe('GET /api/portal/termin/my', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    setupDbMock()
    mockSession(null)

    const { GET } = await import('@/app/api/portal/termin/my/route')
    const res = await GET()
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'unauthorized' })
  })

  it('returns 200 with empty list when authenticated user has no linked person', async () => {
    const helper = setupDbMock()
    // First select: persons by portalUserId — empty result
    helper.selectMock.mockResolvedValueOnce([])
    mockSession({
      user: { id: 'pu-1', email: 'p@example.com', role: 'portal_user' },
    })

    const { GET } = await import('@/app/api/portal/termin/my/route')
    const res = await GET()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ appointments: [] })
  })

  it('returns 200 with appointments when authenticated user has linked person', async () => {
    const helper = setupDbMock()
    // 1) persons lookup
    helper.selectMock.mockResolvedValueOnce([{ id: 'pers-1' }])
    // 2) appointments rows
    const startAt = new Date('2026-09-01T09:00:00.000Z')
    const endAt = new Date('2026-09-01T09:30:00.000Z')
    helper.selectMock.mockResolvedValueOnce([
      {
        id: 'appt-1',
        startAt,
        endAt,
        status: 'confirmed',
        customerMessage: 'Hello',
        cancelledAt: null,
        cancellationReason: null,
        slotTypeName: 'Erstgespräch',
        slotTypeColor: '#3b82f6',
        location: 'video',
        locationDetails: null,
        durationMinutes: 30,
        staffFirstName: 'Tino',
        staffLastName: 'Stenzel',
        staffTimezone: 'Europe/Berlin',
        userId: 'u-1',
        slotTypeId: 'st-1',
      },
    ])
    mockSession({
      user: { id: 'pu-1', email: 'p@example.com', role: 'portal_user' },
    })

    const { GET } = await import('@/app/api/portal/termin/my/route')
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.appointments).toHaveLength(1)
    expect(body.appointments[0].id).toBe('appt-1')
    expect(body.appointments[0].slotTypeName).toBe('Erstgespräch')
    expect(body.appointments[0].staffFirstName).toBe('Tino')
  })
})
