import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'

// In-memory cookie store used across createSession / getSession
let cookieStore = new Map<string, string>()

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    get: (name: string) => {
      const v = cookieStore.get(name)
      return v ? { name, value: v } : undefined
    },
    set: (name: string, value: string) => { cookieStore.set(name, value) },
    delete: (name: string) => { cookieStore.delete(name) },
  }),
}))

beforeAll(() => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-minimum-32-characters-long-xyz'
})

describe('session with companyId', () => {
  beforeEach(() => cookieStore.clear())

  it('round-trips companyId for portal_user', async () => {
    const { createSession, getSession } = await import('@/lib/auth/session')
    await createSession({
      id: 'u1',
      email: 'p@ex.com',
      firstName: null,
      lastName: null,
      role: 'portal_user',
      roleId: null,
      companyId: 'c1',
    })
    const session = await getSession()
    expect(session?.user.role).toBe('portal_user')
    expect(session?.user.companyId).toBe('c1')
  })

  it('companyId is undefined/null for internal users', async () => {
    const { createSession, getSession } = await import('@/lib/auth/session')
    await createSession({
      id: 'u2',
      email: 'a@ex.com',
      firstName: null,
      lastName: null,
      role: 'admin',
      roleId: null,
    })
    const session = await getSession()
    expect(session?.user.role).toBe('admin')
    expect(session?.user.companyId ?? null).toBeNull()
  })
})
