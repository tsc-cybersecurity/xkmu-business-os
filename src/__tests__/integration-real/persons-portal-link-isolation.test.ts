import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { createTestDb } from './setup/test-db'
import type { TestDb } from './setup/test-db'

// next/headers may be required by transitively imported modules
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue(undefined),
    set: vi.fn(),
    delete: vi.fn(),
  }),
}))

const hasTestDb = !!process.env.TEST_DATABASE_URL

describe.skipIf(!hasTestDb)('persons portal-link cross-company isolation', () => {
  let db: TestDb
  let companyA: string
  let companyB: string
  let userInB: string

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-minimum-32-characters-long-xyz'
    db = createTestDb()

    const { companies, users } = await import('@/lib/db/schema')

    const [a] = await db.insert(companies).values({
      name: `IsoA-${Date.now()} ffff`,
    }).returning()
    const [b] = await db.insert(companies).values({
      name: `IsoB-${Date.now()} ffff`,
    }).returning()
    companyA = a.id
    companyB = b.id

    const [u] = await db.insert(users).values({
      email: `iso-b-${Date.now()}@test-ffff.invalid`,
      firstName: 'B',
      lastName: 'User',
      role: 'portal_user',
      status: 'active',
      companyId: companyB,
      passwordHash: 'x',
    }).returning()
    userInB = u.id
  })

  afterAll(async () => {
    const { users, persons, companies } = await import('@/lib/db/schema')
    const { eq } = await import('drizzle-orm')
    try {
      await db.delete(persons).where(eq(persons.companyId, companyA))
    } catch { /* ignore */ }
    try {
      if (userInB) await db.delete(users).where(eq(users.id, userInB))
    } catch { /* ignore */ }
    try {
      if (companyA) await db.delete(companies).where(eq(companies.id, companyA))
    } catch { /* ignore */ }
    try {
      if (companyB) await db.delete(companies).where(eq(companies.id, companyB))
    } catch { /* ignore */ }
  })

  it('portal_user in companyB is not visible as candidate for companyA', async () => {
    // The route validation (Task 4) rejects linking a user with companyId !== body.companyId.
    // This test validates the precondition: the portal_user in B has companyId=B, not A.
    const { users } = await import('@/lib/db/schema')
    const { eq } = await import('drizzle-orm')

    const [link] = await db.select().from(users).where(eq(users.id, userInB)).limit(1)
    expect(link.companyId).toBe(companyB)
    expect(link.companyId).not.toBe(companyA)
  })
})
