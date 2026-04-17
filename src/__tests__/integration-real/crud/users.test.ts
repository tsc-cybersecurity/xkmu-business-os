import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createTestDb, seedTestTenant, cleanupTestTenant, TEST_INTEGRATION_TENANT_A } from '../setup/test-db'
import type { TestDb } from '../setup/test-db'

const hasTestDb = !!process.env.TEST_DATABASE_URL

// Adaptation from plan: users table has firstName/lastName (not name) and passwordHash (not password/hashedPassword)
describe.skipIf(!hasTestDb)('CRUD: Users — real DB', () => {
  let db: TestDb
  let createdId: string

  beforeAll(async () => {
    db = createTestDb()
    await seedTestTenant(db, TEST_INTEGRATION_TENANT_A)
  })

  afterAll(async () => {
    try {
      await cleanupTestTenant(db, TEST_INTEGRATION_TENANT_A)
    } finally {
      // always runs cleanup
    }
  })

  it('insert a user directly via db and retrieve it', async () => {
    // UserService.create() uses bcrypt — use db.insert directly to avoid 100ms hashing
    // This tests the data layer, not bcrypt performance
    const { users } = await import('@/lib/db/schema')
    const bcrypt = await import('bcryptjs')
    const passwordHash = await bcrypt.default.hash('TestPassword123!', 4) // lower rounds for speed
    const [user] = await db.insert(users).values({
      email: 'crud-user-test@test-ffff.invalid',
      passwordHash,
      // Adaptation: schema uses firstName/lastName not name
      firstName: 'CRUD',
      lastName: 'Test User',
      role: 'member',
    }).returning()
    expect(user.id).toBeTruthy()
    expect(user.email).toBe('crud-user-test@test-ffff.invalid')
    createdId = user.id
  })

  it('select user by id returns correct record', async () => {
    const { users } = await import('@/lib/db/schema')
    const { eq } = await import('drizzle-orm')
    const [found] = await db.select().from(users).where(eq(users.id, createdId)).limit(1)
    expect(found).toBeDefined()
    expect(found.role).toBe('member')
  })

  it('select users by email includes created user', async () => {
    const { users } = await import('@/lib/db/schema')
    const { eq } = await import('drizzle-orm')
    const all = await db.select().from(users).where(eq(users.email, 'crud-user-test@test-ffff.invalid'))
    const found = all.find(u => u.id === createdId)
    expect(found).toBeDefined()
  })

  it('update user role via db.update', async () => {
    const { users } = await import('@/lib/db/schema')
    const { eq } = await import('drizzle-orm')
    await db.update(users).set({ role: 'admin' }).where(eq(users.id, createdId))
    const [updated] = await db.select().from(users).where(eq(users.id, createdId)).limit(1)
    expect(updated.role).toBe('admin')
  })

  it('delete user removes the record', async () => {
    const { users } = await import('@/lib/db/schema')
    const { eq } = await import('drizzle-orm')
    await db.delete(users).where(eq(users.id, createdId))
    const [gone] = await db.select().from(users).where(eq(users.id, createdId)).limit(1)
    expect(gone).toBeUndefined()
    createdId = '' // mark as deleted so afterAll cleanup doesn't fail
  })
})
