import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AuthContext } from '@/lib/auth/auth-context'
import type { NextRequest } from 'next/server'

// Mock getAuthContext to control what auth context is returned
vi.mock('@/lib/auth/auth-context', () => ({
  getAuthContext: vi.fn(),
}))

// Mock hasPermission from permissions module
vi.mock('@/lib/auth/permissions', () => ({
  hasPermission: vi.fn().mockResolvedValue(true),
}))

function makeRequest(): NextRequest {
  return new Request('http://localhost/api/v1/leads') as unknown as NextRequest
}

function makeAuthContext(overrides: Partial<AuthContext> = {}): AuthContext {
  return {
    userId: null,
    role: 'api',
    roleId: null,
    apiKeyPermissions: ['*'],
    ...overrides,
  }
}

describe('withPermission() — social_media module', () => {
  let getAuthContextMock: ReturnType<typeof vi.fn>
  let hasPermissionMock: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.resetModules()
    hasPermissionMock = vi.fn().mockResolvedValue(false)
    vi.doMock('@/lib/auth/permissions', () => ({
      hasPermission: hasPermissionMock,
    }))
    const authContextModule = await import('@/lib/auth/auth-context')
    getAuthContextMock = vi.mocked(authContextModule.getAuthContext)
  })

  it('owner can social_media:update (legacy path, roleId null → returns 200)', async () => {
    const { withPermission } = await import('@/lib/auth/require-permission')
    const auth: AuthContext = {
      userId: '00000000-0000-0000-0000-000000000002',
      role: 'owner',
      roleId: null,
      apiKeyPermissions: null,
    }
    getAuthContextMock.mockResolvedValueOnce(auth)

    const handler = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))
    const response = await withPermission(makeRequest(), 'social_media', 'update', handler)

    expect(handler).toHaveBeenCalledWith(auth)
    expect(response.status).toBe(200)
  })

  it('member CANNOT social_media:update (legacy path, roleId null → returns 403)', async () => {
    const { withPermission } = await import('@/lib/auth/require-permission')
    const auth: AuthContext = {
      userId: '00000000-0000-0000-0000-000000000003',
      role: 'member',
      roleId: null,
      apiKeyPermissions: null,
    }
    getAuthContextMock.mockResolvedValueOnce(auth)

    const handler = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))
    const response = await withPermission(makeRequest(), 'social_media', 'update', handler)

    expect(handler).not.toHaveBeenCalled()
    expect(response.status).toBe(403)
  })

  it('member CANNOT social_media:create (legacy path, roleId null → returns 403)', async () => {
    const { withPermission } = await import('@/lib/auth/require-permission')
    const auth: AuthContext = {
      userId: '00000000-0000-0000-0000-000000000003',
      role: 'member',
      roleId: null,
      apiKeyPermissions: null,
    }
    getAuthContextMock.mockResolvedValueOnce(auth)

    const handler = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))
    const response = await withPermission(makeRequest(), 'social_media', 'create', handler)

    expect(handler).not.toHaveBeenCalled()
    expect(response.status).toBe(403)
  })

  it('viewer CANNOT social_media:update (legacy path, roleId null → returns 403)', async () => {
    const { withPermission } = await import('@/lib/auth/require-permission')
    const auth: AuthContext = {
      userId: '00000000-0000-0000-0000-000000000004',
      role: 'viewer',
      roleId: null,
      apiKeyPermissions: null,
    }
    getAuthContextMock.mockResolvedValueOnce(auth)

    const handler = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))
    const response = await withPermission(makeRequest(), 'social_media', 'update', handler)

    expect(handler).not.toHaveBeenCalled()
    expect(response.status).toBe(403)
  })

  it('viewer CANNOT social_media:read (legacy path, roleId null → returns 403)', async () => {
    const { withPermission } = await import('@/lib/auth/require-permission')
    const auth: AuthContext = {
      userId: '00000000-0000-0000-0000-000000000004',
      role: 'viewer',
      roleId: null,
      apiKeyPermissions: null,
    }
    getAuthContextMock.mockResolvedValueOnce(auth)

    const handler = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))
    const response = await withPermission(makeRequest(), 'social_media', 'read', handler)

    expect(handler).not.toHaveBeenCalled()
    expect(response.status).toBe(403)
  })

  it('member with roleId — hasPermission returning false → 403 (registry path)', async () => {
    hasPermissionMock.mockResolvedValue(false)
    const { withPermission } = await import('@/lib/auth/require-permission')
    const auth: AuthContext = {
      userId: '00000000-0000-0000-0000-000000000003',
      role: 'member',
      roleId: 'role-member-uuid',
      apiKeyPermissions: null,
    }
    getAuthContextMock.mockResolvedValueOnce(auth)

    const handler = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))
    const response = await withPermission(makeRequest(), 'social_media', 'update', handler)

    expect(hasPermissionMock).toHaveBeenCalledWith('role-member-uuid', 'social_media', 'update')
    expect(handler).not.toHaveBeenCalled()
    expect(response.status).toBe(403)
  })

  it('owner with roleId — hasPermission returning true → 200 (registry path)', async () => {
    hasPermissionMock.mockResolvedValue(true)
    const { withPermission } = await import('@/lib/auth/require-permission')
    const auth: AuthContext = {
      userId: '00000000-0000-0000-0000-000000000002',
      role: 'owner',
      roleId: 'role-owner-uuid',
      apiKeyPermissions: null,
    }
    getAuthContextMock.mockResolvedValueOnce(auth)

    const handler = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))
    const response = await withPermission(makeRequest(), 'social_media', 'update', handler)

    expect(hasPermissionMock).toHaveBeenCalledWith('role-owner-uuid', 'social_media', 'update')
    expect(handler).toHaveBeenCalledWith(auth)
    expect(response.status).toBe(200)
  })
})

describe('withPermission() — API key scope enforcement', () => {
  let getAuthContextMock: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.resetModules()
    const authContextModule = await import('@/lib/auth/auth-context')
    getAuthContextMock = vi.mocked(authContextModule.getAuthContext)
  })

  it('API key with apiKeyPermissions: ["*"] passes leads:read check', async () => {
    const { withPermission } = await import('@/lib/auth/require-permission')
    const auth = makeAuthContext({ apiKeyPermissions: ['*'] })
    getAuthContextMock.mockResolvedValueOnce(auth)

    const handler = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))
    const response = await withPermission(makeRequest(), 'leads', 'read', handler)

    expect(handler).toHaveBeenCalledWith(auth)
    expect(response.status).toBe(200)
  })

  it('API key with apiKeyPermissions: ["*"] passes companies:create check', async () => {
    const { withPermission } = await import('@/lib/auth/require-permission')
    const auth = makeAuthContext({ apiKeyPermissions: ['*'] })
    getAuthContextMock.mockResolvedValueOnce(auth)

    const handler = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))
    const response = await withPermission(makeRequest(), 'companies', 'create', handler)

    expect(handler).toHaveBeenCalledWith(auth)
    expect(response.status).toBe(200)
  })

  it('API key with apiKeyPermissions: ["leads:read"] passes leads:read check', async () => {
    const { withPermission } = await import('@/lib/auth/require-permission')
    const auth = makeAuthContext({ apiKeyPermissions: ['leads:read'] })
    getAuthContextMock.mockResolvedValueOnce(auth)

    const handler = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))
    const response = await withPermission(makeRequest(), 'leads', 'read', handler)

    expect(handler).toHaveBeenCalledWith(auth)
    expect(response.status).toBe(200)
  })

  it('API key with apiKeyPermissions: ["leads:read"] fails companies:read check with 403', async () => {
    const { withPermission } = await import('@/lib/auth/require-permission')
    const auth = makeAuthContext({ apiKeyPermissions: ['leads:read'] })
    getAuthContextMock.mockResolvedValueOnce(auth)

    const handler = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))
    const response = await withPermission(makeRequest(), 'companies', 'read', handler)

    expect(handler).not.toHaveBeenCalled()
    expect(response.status).toBe(403)
  })

  it('API key with apiKeyPermissions: null defaults to ["*"] and passes any check', async () => {
    const { withPermission } = await import('@/lib/auth/require-permission')
    const auth = makeAuthContext({ apiKeyPermissions: null })
    getAuthContextMock.mockResolvedValueOnce(auth)

    const handler = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))
    const response = await withPermission(makeRequest(), 'documents', 'delete', handler)

    expect(handler).toHaveBeenCalledWith(auth)
    expect(response.status).toBe(200)
  })

  it('Session user (role: "owner", apiKeyPermissions: null) is not affected by scope check', async () => {
    const { withPermission } = await import('@/lib/auth/require-permission')
    const auth: AuthContext = {
      userId: '00000000-0000-0000-0000-000000000002',
      role: 'owner',
      roleId: null,
      apiKeyPermissions: null,
    }
    getAuthContextMock.mockResolvedValueOnce(auth)

    const handler = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))
    const response = await withPermission(makeRequest(), 'leads', 'delete', handler)

    expect(handler).toHaveBeenCalledWith(auth)
    expect(response.status).toBe(200)
  })
})
