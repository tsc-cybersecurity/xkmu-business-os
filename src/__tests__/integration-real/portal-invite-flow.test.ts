import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { createTestDb } from './setup/test-db'
import type { TestDb } from './setup/test-db'

// session.ts uses next/headers cookies() — mock harmlessly for any indirect call
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue(undefined),
    set: vi.fn(),
    delete: vi.fn(),
  }),
}))

const hasTestDb = !!process.env.TEST_DATABASE_URL

describe.skipIf(!hasTestDb)('Portal invite flow — real DB', () => {
  let db: TestDb
  let companyId: string
  let createdUserId: string | null = null
  const testEmail = `portal-e2e-${Date.now()}@test-ffff.invalid`

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-minimum-32-characters-long-xyz'
    db = createTestDb()

    const { companies } = await import('@/lib/db/schema')
    const [c] = await db.insert(companies).values({
      name: `Portal Test GmbH ${Date.now()} ffff`,
    }).returning()
    companyId = c.id
  })

  afterAll(async () => {
    const { users, companies } = await import('@/lib/db/schema')
    const { eq } = await import('drizzle-orm')
    try {
      if (createdUserId) await db.delete(users).where(eq(users.id, createdUserId))
    } catch { /* user row may have FK dependents; ignore */ }
    try {
      await db.delete(companies).where(eq(companies.id, companyId))
    } catch { /* cleanup best-effort */ }
  })

  it('creates a portal user via invite, accepts it, and blocks reuse + duplicates', async () => {
    const { UserService } = await import('@/lib/services/user.service')

    // 1) Create with invite method
    const invited = await UserService.createPortalUser({
      companyId,
      firstName: 'E2E',
      lastName: 'Portal',
      email: testEmail,
      method: 'invite',
    })
    createdUserId = invited.id
    expect(invited.role).toBe('portal_user')
    expect(invited.companyId).toBe(companyId)
    expect(invited.inviteToken).toBeTruthy()
    expect(invited.inviteTokenExpiresAt).toBeTruthy()
    expect(invited.firstLoginAt).toBeNull()
    const originalToken = invited.inviteToken!

    // 2) Accept the invite
    const accepted = await UserService.acceptInvite(originalToken, 'NewSecret12345')
    expect(accepted.id).toBe(invited.id)
    expect(accepted.inviteToken).toBeNull()
    expect(accepted.inviteTokenExpiresAt).toBeNull()
    expect(accepted.firstLoginAt).toBeTruthy()

    // 3) Re-using the same token must fail
    await expect(
      UserService.acceptInvite(originalToken, 'OtherSecret12345')
    ).rejects.toThrow(/Ungueltig/i)

    // 4) Duplicate create for same email + same company must fail
    await expect(
      UserService.createPortalUser({
        companyId,
        firstName: 'Dup',
        lastName: 'Portal',
        email: testEmail,
        method: 'invite',
      })
    ).rejects.toThrow(/bereits/i)
  })
})
