import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTestRequest } from '../../helpers/mock-request'
import { TEST_TENANT_ID } from '../../helpers/fixtures'

// ─── POST /api/v1/import/database ────────────────────────────────────────────

const VICTIM_TENANT_ID = '99999999-9999-9999-9999-999999999999'
const TEST_USER_ID = '00000000-0000-0000-0000-000000000002'

// Helper to create a Request with FormData containing an SQL file
function createSqlRequest(sqlContent: string, mode = 'merge'): Request {
  const formData = new FormData()
  const file = new File([sqlContent], 'test.sql', { type: 'text/plain' })
  formData.append('file', file)
  formData.append('mode', mode)
  const url = 'http://localhost:3000/api/v1/import/database'
  return new Request(url, { method: 'POST', body: formData })
}

// SQL that injects a foreign tenant_id — used for cross-tenant isolation test
const CROSS_TENANT_SQL = `
INSERT INTO companies (id, name, tenant_id) VALUES ('aaaaaaaa-0000-0000-0000-000000000001', 'Evil Corp', '${VICTIM_TENANT_ID}');
`

// SQL with legitimate data for the authenticated tenant
const VALID_SQL = `
INSERT INTO companies (id, name, tenant_id) VALUES ('bbbbbbbb-0000-0000-0000-000000000001', 'Test GmbH', '${TEST_TENANT_ID}');
`

describe('POST /api/v1/import/database', () => {
  beforeEach(() => {
    vi.resetModules()

    // Mock drizzle-orm sql tagged template
    vi.doMock('drizzle-orm', () => ({
      sql: Object.assign(
        (..._args: unknown[]) => ({ _tag: 'sql', args: _args }),
        {
          raw: (s: string) => ({ _tag: 'sql.raw', s }),
          identifier: (name: string) => ({ _tag: 'sql.identifier', name }),
          join: (parts: unknown[], _sep: unknown) => ({ _tag: 'sql.join', parts }),
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
      getApiKeyFromRequest: vi.fn().mockReturnValue(null),
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

  function mockDbTransaction(capturedSqlCalls: unknown[]) {
    vi.doMock('@/lib/db', () => ({
      db: {
        transaction: vi.fn().mockImplementation(
          async (fn: (tx: { execute: (q: unknown) => Promise<void> }) => Promise<void>) => {
            const tx = {
              execute: vi.fn().mockImplementation(async (query: unknown) => {
                capturedSqlCalls.push(query)
              }),
            }
            await fn(tx)
          },
        ),
      },
    }))
  }

  async function getHandler() {
    const mod = await import('@/app/api/v1/import/database/route')
    return mod.POST
  }

  // ─── Test 1: Cross-tenant isolation ─────────────────────────────────────────
  it('cross-tenant isolation: tenant_id in uploaded SQL is overwritten with auth tenant', async () => {
    const capturedSqlCalls: unknown[] = []
    mockSessionAuth('admin')
    mockDbTransaction(capturedSqlCalls)

    const handler = await getHandler()
    const req = createSqlRequest(CROSS_TENANT_SQL, 'merge')
    const res = await handler(req as unknown as import('next/server').NextRequest)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)

    // Verify that the tenant_id value used in INSERT is TEST_TENANT_ID, not VICTIM_TENANT_ID
    // The INSERT query should contain parameterized values where tenant_id = TEST_TENANT_ID
    const insertCalls = capturedSqlCalls.filter((call) => {
      const callStr = JSON.stringify(call)
      // Check the call references the insert (not a DELETE)
      return callStr.includes('sql') && !callStr.includes('DELETE')
    })

    // The executed SQL should NOT contain the victim tenant ID as a value
    const allCallsStr = JSON.stringify(capturedSqlCalls)
    expect(allCallsStr).not.toContain(VICTIM_TENANT_ID)
    // The executed SQL should use the authenticated tenant ID
    expect(allCallsStr).toContain(TEST_TENANT_ID)

    // Specifically: at least one INSERT call must have been made
    expect(insertCalls.length).toBeGreaterThan(0)
  })

  // ─── Test 2: Valid SQL returns 200 with success ───────────────────────────
  it('returns 200 with success:true and stats.totalInserted > 0 for valid SQL', async () => {
    const capturedSqlCalls: unknown[] = []
    mockSessionAuth('admin')
    mockDbTransaction(capturedSqlCalls)

    const handler = await getHandler()
    const req = createSqlRequest(VALID_SQL, 'merge')
    const res = await handler(req as unknown as import('next/server').NextRequest)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.stats.totalInserted).toBeGreaterThan(0)
  })

  // ─── Test 3: No file returns 400 ─────────────────────────────────────────
  it('returns 400 when no file is uploaded', async () => {
    mockSessionAuth('admin')
    vi.doMock('@/lib/db', () => ({
      db: { transaction: vi.fn() },
    }))

    const handler = await getHandler()
    const formData = new FormData()
    formData.append('mode', 'merge')
    const req = new Request('http://localhost:3000/api/v1/import/database', {
      method: 'POST',
      body: formData,
    })
    const res = await handler(req as unknown as import('next/server').NextRequest)

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBeTruthy()
  })

  // ─── Test 4: Non-.sql file returns 400 ───────────────────────────────────
  it('returns 400 for non-.sql file extension', async () => {
    mockSessionAuth('admin')
    vi.doMock('@/lib/db', () => ({
      db: { transaction: vi.fn() },
    }))

    const handler = await getHandler()
    const formData = new FormData()
    const csvFile = new File(['a,b,c'], 'data.csv', { type: 'text/csv' })
    formData.append('file', csvFile)
    formData.append('mode', 'merge')
    const req = new Request('http://localhost:3000/api/v1/import/database', {
      method: 'POST',
      body: formData,
    })
    const res = await handler(req as unknown as import('next/server').NextRequest)

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBeTruthy()
  })

  // ─── Test 5: No auth returns 401 ─────────────────────────────────────────
  it('returns 401 for unauthenticated request', async () => {
    mockNoAuth()
    vi.doMock('@/lib/db', () => ({
      db: { transaction: vi.fn() },
    }))

    const handler = await getHandler()
    const req = createSqlRequest(VALID_SQL, 'merge')
    const res = await handler(req as unknown as import('next/server').NextRequest)

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBeTruthy()
  })
})
