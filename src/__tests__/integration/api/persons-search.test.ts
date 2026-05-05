import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setupDbMock } from '@/__tests__/helpers/mock-db'

vi.mock('@/lib/auth/require-permission', () => ({
  withPermission: vi.fn((req, mod, action, fn) => fn({ userId: 'u-1', role: 'owner' })),
}))

describe('GET /api/v1/persons/search', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('returns matching persons for a name query (happy path)', async () => {
    const helper = setupDbMock()
    const rows = [
      {
        id: 'p-1',
        firstName: 'Walter',
        lastName: 'White',
        email: 'walter@example.com',
        phone: null,
        mobile: null,
      },
    ]
    helper.selectMock.mockResolvedValueOnce(rows)
    vi.doMock('@/lib/db', () => ({ db: helper.db }))

    const { GET } = await import('@/app/api/v1/persons/search/route')
    const res = await GET(
      new Request('https://x/api/v1/persons/search?q=walt') as never,
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data).toEqual(rows)
  })

  it('returns matching persons for an email query', async () => {
    const helper = setupDbMock()
    const rows = [
      {
        id: 'p-2',
        firstName: 'Anna',
        lastName: 'Schmidt',
        email: 'anna@example.com',
        phone: '+49123',
        mobile: null,
      },
    ]
    helper.selectMock.mockResolvedValueOnce(rows)
    vi.doMock('@/lib/db', () => ({ db: helper.db }))

    const { GET } = await import('@/app/api/v1/persons/search/route')
    const res = await GET(
      new Request('https://x/api/v1/persons/search?q=anna@example.com') as never,
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(1)
    expect(body.data[0].email).toBe('anna@example.com')
  })

  it('returns 400 with VALIDATION_ERROR for short query', async () => {
    const helper = setupDbMock()
    vi.doMock('@/lib/db', () => ({ db: helper.db }))

    const { GET } = await import('@/app/api/v1/persons/search/route')
    const res = await GET(
      new Request('https://x/api/v1/persons/search?q=a') as never,
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('returns 400 when q is missing entirely', async () => {
    const helper = setupDbMock()
    vi.doMock('@/lib/db', () => ({ db: helper.db }))

    const { GET } = await import('@/app/api/v1/persons/search/route')
    const res = await GET(
      new Request('https://x/api/v1/persons/search') as never,
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })
})
