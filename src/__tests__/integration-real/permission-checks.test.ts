import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { NextRequest } from 'next/server'
import type { AuthContext } from '@/lib/auth/auth-context'

// Mock ONLY getAuthContext to provide different role contexts
// Keep real withPermission() logic from require-permission.ts
// When roleId is null, withPermission uses inline owner/admin/member/viewer logic — no DB needed
vi.mock('@/lib/auth/auth-context', () => ({
  getAuthContext: vi.fn(),
}))

// These tests do NOT require TEST_DATABASE_URL:
// - roleId: null triggers inline permission logic in withPermission() (no DB lookup)
// - API key tests use apiKeyPermissions array (no DB lookup either)
describe('Permission Checks — withPermission() role matrix', () => {
  let getAuthContextMock: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.resetModules()
    const authCtxMod = await import('@/lib/auth/auth-context')
    getAuthContextMock = vi.mocked(authCtxMod.getAuthContext)
  })

  function makeRequest(): NextRequest {
    return new Request('http://localhost/api/test') as unknown as NextRequest
  }

  function makeAuth(role: string, apiKeyPermissions: string[] | null = null): AuthContext {
    return {
      tenantId: '00000000-ffff-0000-0000-000000000001',
      userId: role === 'api' ? null : '00000000-0000-0000-0000-000000000002',
      role,
      roleId: null, // null = use inline role logic, not DB lookup
      apiKeyPermissions,
    }
  }

  it('returns 401 when unauthenticated (getAuthContext returns null)', async () => {
    getAuthContextMock.mockResolvedValueOnce(null)
    const { withPermission } = await import('@/lib/auth/require-permission')
    const handler = vi.fn()
    const res = await withPermission(makeRequest(), 'companies', 'read', handler)
    expect(res.status).toBe(401)
    expect(handler).not.toHaveBeenCalled()
  })

  // Role matrix: owner and admin should have full access (require-permission.ts lines 44-46)
  const allowedCombinations = [
    { role: 'owner', module: 'companies', action: 'delete' },
    { role: 'owner', module: 'leads', action: 'create' },
    { role: 'admin', module: 'companies', action: 'delete' },
    { role: 'admin', module: 'leads', action: 'create' },
    { role: 'member', module: 'companies', action: 'read' },
    { role: 'member', module: 'companies', action: 'create' },
    // Adaptation: viewer can only read (not create)
    { role: 'viewer', module: 'companies', action: 'read' },
  ] as const

  for (const { role, module, action } of allowedCombinations) {
    it(`role "${role}" can ${action} on ${module} → 200`, async () => {
      getAuthContextMock.mockResolvedValueOnce(makeAuth(role))
      const { withPermission } = await import('@/lib/auth/require-permission')
      const handler = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))
      const res = await withPermission(makeRequest(), module, action as never, handler)
      expect(res.status).toBe(200)
    })
  }

  // Forbidden combinations based on require-permission.ts:
  // - viewer: only 'read' allowed, all other actions → 403
  // - member: 'read', 'create', 'update' allowed; 'delete' → 403
  const forbiddenCombinations = [
    { role: 'viewer', module: 'companies', action: 'create' },
    { role: 'viewer', module: 'leads', action: 'delete' },
    { role: 'member', module: 'companies', action: 'delete' },
  ] as const

  for (const { role, module, action } of forbiddenCombinations) {
    it(`role "${role}" cannot ${action} on ${module} → 403`, async () => {
      getAuthContextMock.mockResolvedValueOnce(makeAuth(role))
      const { withPermission } = await import('@/lib/auth/require-permission')
      const handler = vi.fn()
      const res = await withPermission(makeRequest(), module, action as never, handler)
      expect(res.status).toBe(403)
      expect(handler).not.toHaveBeenCalled()
    })
  }

  it('API key with wildcard ["*"] can access any module:action → 200', async () => {
    getAuthContextMock.mockResolvedValueOnce(makeAuth('api', ['*']))
    const { withPermission } = await import('@/lib/auth/require-permission')
    const handler = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))
    const res = await withPermission(makeRequest(), 'companies', 'delete', handler)
    expect(res.status).toBe(200)
  })

  it('API key with ["leads:read"] is denied companies:read → 403', async () => {
    getAuthContextMock.mockResolvedValueOnce(makeAuth('api', ['leads:read']))
    const { withPermission } = await import('@/lib/auth/require-permission')
    const handler = vi.fn()
    const res = await withPermission(makeRequest(), 'companies', 'read', handler)
    expect(res.status).toBe(403)
  })

  it('API key with exact scope ["companies:read"] can read companies → 200', async () => {
    getAuthContextMock.mockResolvedValueOnce(makeAuth('api', ['companies:read']))
    const { withPermission } = await import('@/lib/auth/require-permission')
    const handler = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))
    const res = await withPermission(makeRequest(), 'companies', 'read', handler)
    expect(res.status).toBe(200)
  })

  it('API key with exact scope ["companies:read"] cannot delete companies → 403', async () => {
    getAuthContextMock.mockResolvedValueOnce(makeAuth('api', ['companies:read']))
    const { withPermission } = await import('@/lib/auth/require-permission')
    const handler = vi.fn()
    const res = await withPermission(makeRequest(), 'companies', 'delete', handler)
    expect(res.status).toBe(403)
  })
})
