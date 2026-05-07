import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTestRequest } from '../../helpers/mock-request'
import { mockAuthContext, mockAuthForbidden } from '../../helpers/mock-auth'
import { authFixture, TEST_TENANT_ID } from '../../helpers/fixtures'

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

  async function getHandler() {
    const mod = await import('@/app/api/v1/export/database/route')
    return mod.GET
  }

  it('returns SQL dump for authenticated admin', async () => {
    mockAuthContext(authFixture({ role: 'admin' }))
    executeMock.mockResolvedValue([])

    const handler = await getHandler()
    const req = createTestRequest('GET', '/api/v1/export/database')
    const res = await handler(req)

    expect(res.status).toBe(200)
    const text = await res.text()
    expect(text).toMatch(/SQL Export/)
    expect(text).toContain('-- Export abgeschlossen')
    expect(res.headers.get('Content-Type')).toBe('text/plain; charset=utf-8')
    expect(res.headers.get('Content-Disposition')).toContain('attachment; filename="database-export-')
  })

  it('returns SQL dump for authenticated owner', async () => {
    mockAuthContext(authFixture({ role: 'owner' }))

    const handler = await getHandler()
    const req = createTestRequest('GET', '/api/v1/export/database')
    const res = await handler(req)

    expect(res.status).toBe(200)
    const text = await res.text()
    expect(text).toContain('-- Export abgeschlossen')
  })

  it('returns 401 for unauthenticated request', async () => {
    mockAuthContext(null)

    const handler = await getHandler()
    const req = createTestRequest('GET', '/api/v1/export/database')
    const res = await handler(req)

    expect(res.status).toBe(401)
  })

  it('returns 403 for non-admin user', async () => {
    mockAuthForbidden()

    const handler = await getHandler()
    const req = createTestRequest('GET', '/api/v1/export/database')
    const res = await handler(req)

    expect(res.status).toBe(403)
  })

  it('returns 403 for viewer role', async () => {
    mockAuthForbidden()

    const handler = await getHandler()
    const req = createTestRequest('GET', '/api/v1/export/database')
    const res = await handler(req)

    expect(res.status).toBe(403)
  })

  it('works with API key auth (api role bypasses permission check)', async () => {
    mockAuthContext(authFixture({ role: 'api' as const }))

    const handler = await getHandler()
    const req = createTestRequest('GET', '/api/v1/export/database')
    const res = await handler(req)

    expect(res.status).toBe(200)
    const text = await res.text()
    expect(text).toMatch(/SQL Export/)
    expect(text).toContain('-- Export abgeschlossen')
  })

  it('returns 403 when permission denied', async () => {
    mockAuthForbidden()

    const handler = await getHandler()
    const req = createTestRequest('GET', '/api/v1/export/database')
    const res = await handler(req)

    expect(res.status).toBe(403)
  })

  it('includes INSERT statements when tables have data', async () => {
    mockAuthContext(authFixture({ role: 'admin' }))
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
