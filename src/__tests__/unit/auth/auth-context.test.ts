import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TENANT_ID } from '@/lib/constants/tenant'

vi.mock('@/lib/auth/session', () => ({ getSession: vi.fn() }))
vi.mock('@/lib/auth/api-key', () => ({
  getApiKeyFromRequest: vi.fn(),
  validateApiKey: vi.fn(),
}))

describe('getAuthContext()', () => {
  beforeEach(() => { vi.resetModules() })

  it('session-Zweig: tenantId ist TENANT_ID-Konstante', async () => {
    const { getSession } = await import('@/lib/auth/session')
    vi.mocked(getSession).mockResolvedValue({
      user: { id: 'user-1', email: 'a@b.de', firstName: null, lastName: null, role: 'admin', roleId: null },
      expiresAt: new Date('2099-01-01'),
      v: 2,
    })

    const { getAuthContext } = await import('@/lib/auth/auth-context')
    const req = new Request('http://localhost/') as unknown as import('next/server').NextRequest
    const ctx = await getAuthContext(req)

    expect(ctx?.tenantId).toBe(TENANT_ID)
    expect(ctx?.userId).toBe('user-1')
  })

  it('api-key-Zweig: tenantId ist TENANT_ID-Konstante, nicht payload.tenantId', async () => {
    const { getSession } = await import('@/lib/auth/session')
    vi.mocked(getSession).mockResolvedValue(null)

    const { getApiKeyFromRequest, validateApiKey } = await import('@/lib/auth/api-key')
    vi.mocked(getApiKeyFromRequest).mockReturnValue('xkmu_somekey')
    vi.mocked(validateApiKey).mockResolvedValue({
      tenantId: 'different-tenant-id',   // wird ignoriert — AUTH-04
      keyId: 'key-1',
      permissions: ['*'],
    })

    const { getAuthContext } = await import('@/lib/auth/auth-context')
    const req = new Request('http://localhost/') as unknown as import('next/server').NextRequest
    const ctx = await getAuthContext(req)

    expect(ctx?.tenantId).toBe(TENANT_ID)   // TENANT_ID, nicht 'different-tenant-id'
  })

  it('gibt null zurueck wenn weder Session noch API-Key vorhanden', async () => {
    const { getSession } = await import('@/lib/auth/session')
    vi.mocked(getSession).mockResolvedValue(null)

    const { getApiKeyFromRequest } = await import('@/lib/auth/api-key')
    vi.mocked(getApiKeyFromRequest).mockReturnValue(null)

    const { getAuthContext } = await import('@/lib/auth/auth-context')
    const req = new Request('http://localhost/') as unknown as import('next/server').NextRequest
    const ctx = await getAuthContext(req)

    expect(ctx).toBeNull()
  })
})
