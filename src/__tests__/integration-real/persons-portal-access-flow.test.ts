import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { createTestDb } from './setup/test-db'
import type { TestDb } from './setup/test-db'

// next/headers is required by session helpers imported transitively
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue(undefined),
    set: vi.fn(),
    delete: vi.fn(),
  }),
}))

const hasTestDb = !!process.env.TEST_DATABASE_URL

describe.skipIf(!hasTestDb)('persons portal-access flow', () => {
  let db: TestDb
  let companyId: string
  let personId: string
  let createdUserId: string | null = null

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-minimum-32-characters-long-xyz'
    db = createTestDb()

    const { companies, persons } = await import('@/lib/db/schema')

    const [c] = await db.insert(companies).values({
      name: `PPAFlow-${Date.now()} ffff`,
    }).returning()
    companyId = c.id

    const [p] = await db.insert(persons).values({
      companyId,
      firstName: 'Max',
      lastName: 'Muster',
      email: `pp-${Date.now()}@test-ffff.invalid`,
    }).returning()
    personId = p.id
  })

  afterAll(async () => {
    const { users, persons, companies } = await import('@/lib/db/schema')
    const { eq } = await import('drizzle-orm')
    try {
      if (createdUserId) await db.delete(users).where(eq(users.id, createdUserId))
    } catch { /* ignore */ }
    try {
      if (personId) await db.delete(persons).where(eq(persons.id, personId))
    } catch { /* ignore */ }
    try {
      if (companyId) await db.delete(companies).where(eq(companies.id, companyId))
    } catch { /* ignore */ }
  })

  it('createPortalAccess(invite) → person linked, user has invite token', async () => {
    const { PersonService } = await import('@/lib/services/person.service')
    const result = await PersonService.createPortalAccess(personId, { method: 'invite' })
    expect(result.user.id).toBeTruthy()
    expect(result.user.inviteToken).toBeTruthy()
    expect(result.person.portalUserId).toBe(result.user.id)
    createdUserId = result.user.id
  })

  it('re-creating portal access on same person throws', async () => {
    const { PersonService } = await import('@/lib/services/person.service')
    await expect(PersonService.createPortalAccess(personId, { method: 'invite' }))
      .rejects.toThrow(/bereits/i)
  })
})
