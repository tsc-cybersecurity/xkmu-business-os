import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { withPortalAuth } from '@/lib/auth/with-portal-auth'
import { getSession } from '@/lib/auth/session'

vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(),
}))

function mockReq() {
  return new NextRequest('http://localhost/api/v1/portal/me/company')
}

// Minimal SessionUser shape — mock returns this as session.user
function sessionFor(user: { role: string; companyId?: string | null }) {
  return {
    user: {
      id: 'u1',
      email: 'p@x.de',
      firstName: null,
      lastName: null,
      roleId: null,
      role: user.role,
      companyId: user.companyId ?? null,
    },
    expiresAt: new Date(Date.now() + 3600_000),
    v: 2,
  }
}

describe('withPortalAuth', () => {
  beforeEach(() => vi.mocked(getSession).mockReset())

  it('returns 401 when no session', async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    const handler = vi.fn()
    const res = await withPortalAuth(mockReq(), handler)
    expect(res.status).toBe(401)
    expect(handler).not.toHaveBeenCalled()
  })

  it('returns 403 when role is not portal_user', async () => {
    vi.mocked(getSession).mockResolvedValue(sessionFor({ role: 'admin' }) as never)
    const handler = vi.fn()
    const res = await withPortalAuth(mockReq(), handler)
    expect(res.status).toBe(403)
    expect(handler).not.toHaveBeenCalled()
  })

  it('returns 403 when portal_user has no companyId', async () => {
    vi.mocked(getSession).mockResolvedValue(sessionFor({ role: 'portal_user', companyId: null }) as never)
    const handler = vi.fn()
    const res = await withPortalAuth(mockReq(), handler)
    expect(res.status).toBe(403)
  })

  it('invokes handler with auth context when valid', async () => {
    vi.mocked(getSession).mockResolvedValue(sessionFor({ role: 'portal_user', companyId: 'c1' }) as never)
    const handler = vi.fn().mockResolvedValue(new Response('ok'))
    await withPortalAuth(mockReq(), handler)
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'u1',
      companyId: 'c1',
      email: 'p@x.de',
    }))
  })
})
