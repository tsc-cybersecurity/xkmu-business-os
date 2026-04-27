import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

describe('tryWithPermission', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('returns { allowed: false } when no auth context', async () => {
    vi.doMock('@/lib/auth/auth-context', () => ({
      getAuthContext: vi.fn().mockResolvedValue(null),
    }))
    const { tryWithPermission } = await import('@/lib/auth/require-permission')
    const req = new NextRequest('http://localhost/x')
    const result = await tryWithPermission(req, 'courses', 'read')
    expect(result.allowed).toBe(false)
  })

  it('returns { allowed: true, auth } when admin user', async () => {
    vi.doMock('@/lib/auth/auth-context', () => ({
      getAuthContext: vi.fn().mockResolvedValue({
        userId: 'u1', role: 'admin', roleId: null,
      }),
    }))
    vi.doMock('@/lib/auth/permissions', () => ({
      hasPermission: vi.fn().mockResolvedValue(false),
    }))
    const { tryWithPermission } = await import('@/lib/auth/require-permission')
    const req = new NextRequest('http://localhost/x')
    const result = await tryWithPermission(req, 'courses', 'read')
    expect(result.allowed).toBe(true)
    if (result.allowed) {
      expect(result.auth.role).toBe('admin')
    }
  })

  it('returns { allowed: false } for viewer trying update', async () => {
    vi.doMock('@/lib/auth/auth-context', () => ({
      getAuthContext: vi.fn().mockResolvedValue({
        userId: 'u1', role: 'viewer', roleId: null,
      }),
    }))
    vi.doMock('@/lib/auth/permissions', () => ({
      hasPermission: vi.fn().mockResolvedValue(false),
    }))
    const { tryWithPermission } = await import('@/lib/auth/require-permission')
    const req = new NextRequest('http://localhost/x')
    const result = await tryWithPermission(req, 'courses', 'update')
    expect(result.allowed).toBe(false)
  })
})
