import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTestRequest } from '../../helpers/mock-request'
import { TEST_TENANT_ID, TEST_USER_ID } from '../../helpers/fixtures'

// ─── GET /api/v1/export/database ─────────────────────────────────────────────

describe('GET /api/v1/export/database', () => {
  const executeMock = vi.fn().mockResolvedValue([])

  beforeEach(() => {
    vi.resetModules()
    executeMock.mockReset().mockResolvedValue([])

    vi.doMock('@/lib/db', () => ({ db: { execute: executeMock } }))
    vi.doMock('drizzle-orm', () => ({
      sql: Object.assign(
        (...args: unknown[]) => args,
        {
          raw: (...args: unknown[]) => args,
          identifier: (name: string) => name,
          join: (...args: unknown[]) => args,
        },
      ),
    }))
  })

  function mockSessionAuth(role: string = 'admin') {
    vi.doMock('@/lib/auth/session', () => ({
      getSession: vi.fn().mockResolvedValue({
        user: { tenantId: TEST_TENANT_ID, userId: TEST_USER_ID, role },
      }),
    }))
    vi.doMock('@/lib/auth/api-key', () => ({
      validateApiKey: vi.fn(),
      getApiKeyFromRequest: vi.fn(),
      hasPermission: vi.fn(),
    }))
  }

  function mockNoAuth() {
    vi.doMock('@/lib/auth/session', () => ({
      getSession: vi.fn().mockResolvedValue(null),
    }))
    vi.doMock('@/lib/auth/api-key', () => ({
      validateApiKey: vi.fn(),
      getApiKeyFromRequest: vi.fn().mockReturnValue(null),
      hasPermission: vi.fn(),
    }))
  }

  function mockApiKeyAuth(hasRead: boolean = true) {
    vi.doMock('@/lib/auth/session', () => ({
      getSession: vi.fn().mockResolvedValue(null),
    }))
    vi.doMock('@/lib/auth/api-key', () => ({
      validateApiKey: vi.fn().mockResolvedValue({ tenantId: TEST_TENANT_ID }),
      getApiKeyFromRequest: vi.fn().mockReturnValue('test-api-key'),
      hasPermission: vi.fn().mockReturnValue(hasRead),
    }))
  }

  async function getHandler() {
    const mod = await import('@/app/api/v1/export/database/route')
    return mod.GET
  }

  it('returns SQL dump for authenticated admin', async () => {
    mockSessionAuth('admin')
    executeMock.mockResolvedValue([])

    const handler = await getHandler()
    const req = createTestRequest('GET', '/api/v1/export/database')
    const res = await handler(req)

    expect(res.status).toBe(200)
    const text = await res.text()
    expect(text).toContain(`-- SQL Export fuer Tenant: ${TEST_TENANT_ID}`)
    expect(text).toContain('-- Export abgeschlossen')
    expect(res.headers.get('Content-Type')).toBe('text/plain; charset=utf-8')
    expect(res.headers.get('Content-Disposition')).toContain('attachment; filename="database-export-')
  })

  it('returns SQL dump for authenticated owner', async () => {
    mockSessionAuth('owner')

    const handler = await getHandler()
    const req = createTestRequest('GET', '/api/v1/export/database')
    const res = await handler(req)

    expect(res.status).toBe(200)
    const text = await res.text()
    expect(text).toContain('-- Export abgeschlossen')
  })

  it('returns 401 for unauthenticated request', async () => {
    mockNoAuth()

    const handler = await getHandler()
    const req = createTestRequest('GET', '/api/v1/export/database')
    const res = await handler(req)
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error).toBe('Nicht authentifiziert')
  })

  it('returns 403 for non-admin user', async () => {
    mockSessionAuth('member')

    const handler = await getHandler()
    const req = createTestRequest('GET', '/api/v1/export/database')
    const res = await handler(req)
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error).toBe('Keine Berechtigung')
  })

  it('returns 403 for viewer role', async () => {
    mockSessionAuth('viewer')

    const handler = await getHandler()
    const req = createTestRequest('GET', '/api/v1/export/database')
    const res = await handler(req)

    expect(res.status).toBe(403)
  })

  it('works with API key auth', async () => {
    mockApiKeyAuth(true)

    const handler = await getHandler()
    const req = createTestRequest('GET', '/api/v1/export/database')
    const res = await handler(req)

    expect(res.status).toBe(200)
    const text = await res.text()
    expect(text).toContain(`-- SQL Export fuer Tenant: ${TEST_TENANT_ID}`)
    expect(text).toContain('-- Export abgeschlossen')
  })

  it('returns 403 when API key lacks read permission', async () => {
    mockApiKeyAuth(false)

    const handler = await getHandler()
    const req = createTestRequest('GET', '/api/v1/export/database')
    const res = await handler(req)

    expect(res.status).toBe(403)
  })

  it('includes INSERT statements when tables have data', async () => {
    mockSessionAuth('admin')
    executeMock.mockResolvedValue([
      { id: 'row-1', name: 'Test', tenant_id: TEST_TENANT_ID },
    ])

    const handler = await getHandler()
    const req = createTestRequest('GET', '/api/v1/export/database')
    const res = await handler(req)

    expect(res.status).toBe(200)
    const text = await res.text()
    expect(text).toContain('INSERT INTO')
  })
})
