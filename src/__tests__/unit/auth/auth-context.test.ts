import { describe, it, expect, vi, beforeEach } from 'vitest'
vi.mock('@/lib/auth/session', () => ({ getSession: vi.fn() }))
vi.mock('@/lib/auth/api-key', () => ({
  getApiKeyFromRequest: vi.fn(),
  validateApiKey: vi.fn(),
}))

describe('getAuthContext()', () => {
  beforeEach(() => { vi.resetModules() })

  it('session-Zweig: userId und role werden gesetzt', async () => {
    const { getSession } = await import('@/lib/auth/session')
    vi.mocked(getSession).mockResolvedValue({
      user: { id: 'user-1', email: 'a@b.de', firstName: null, lastName: null, role: 'admin', roleId: null },
      expiresAt: new Date('2099-01-01'),
      v: 2,
    })

    const { getAuthContext } = await import('@/lib/auth/auth-context')
    const req = new Request('http://localhost/') as unknown as import('next/server').NextRequest
    const ctx = await getAuthContext(req)

    expect(ctx?.userId).toBe('user-1')
    expect(ctx?.role).toBe('admin')
    expect(ctx?.apiKeyPermissions).toBeNull()
  })

  it('api-key-Zweig: permissions werden aus payload gesetzt', async () => {
    const { getSession } = await import('@/lib/auth/session')
    vi.mocked(getSession).mockResolvedValue(null)

    const { getApiKeyFromRequest, validateApiKey } = await import('@/lib/auth/api-key')
    vi.mocked(getApiKeyFromRequest).mockReturnValue('xkmu_somekey')
    vi.mocked(validateApiKey).mockResolvedValue({
      keyId: 'key-1',
      permissions: ['*'],
    })

    const { getAuthContext } = await import('@/lib/auth/auth-context')
    const req = new Request('http://localhost/') as unknown as import('next/server').NextRequest
    const ctx = await getAuthContext(req)

    expect(ctx?.role).toBe('api')
    expect(ctx?.apiKeyPermissions).toEqual(['*'])
    expect(ctx?.userId).toBeNull()
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
