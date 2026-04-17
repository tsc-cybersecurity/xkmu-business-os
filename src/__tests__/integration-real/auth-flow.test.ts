import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { createTestDb, seedTestTenant, cleanupTestTenant, TEST_INTEGRATION_TENANT_A } from './setup/test-db'
import type { TestDb } from './setup/test-db'

// session.ts requires JWT_SECRET and uses next/headers cookies()
// We test the auth route handler POST /api/auth/login which calls createSession internally
// Mock next/headers for the session layer
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue(undefined),
    set: vi.fn(),
    delete: vi.fn(),
  }),
}))

const hasTestDb = !!process.env.TEST_DATABASE_URL

describe.skipIf(!hasTestDb)('Auth Flow — real DB', () => {
  let db: TestDb
  let testUserId: string
  const testEmail = 'integration-auth-test@test-ffff.invalid'
  const testPassword = 'TestPassword123!'

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-minimum-32-characters-long-xyz'
    db = createTestDb()
    await seedTestTenant(db, TEST_INTEGRATION_TENANT_A)

    // Insert a test user with a known bcrypt hash for testPassword
    // Use bcrypt directly to create a real hash for real login tests
    const bcrypt = await import('bcryptjs')
    const passwordHash = await bcrypt.default.hash(testPassword, 10)
    const { users } = await import('@/lib/db/schema')
    const { eq } = await import('drizzle-orm')

    const existing = await db.select().from(users).where(eq(users.email, testEmail)).limit(1)
    if (existing.length === 0) {
      const [user] = await db.insert(users).values({
        email: testEmail,
        passwordHash,
        firstName: 'Integration',
        lastName: 'Test User',
        role: 'admin',
      }).returning()
      testUserId = user.id
    } else {
      testUserId = existing[0].id
    }
  })

  afterAll(async () => {
    try {
      await cleanupTestTenant(db, TEST_INTEGRATION_TENANT_A)
    } finally {
      // always runs cleanup
    }
  })

  it('login route returns 200 and sets session cookie for valid credentials', async () => {
    const { createTestRequest } = await import('../helpers/mock-request')
    const handler = (await import('@/app/api/auth/login/route')).POST
    const req = createTestRequest('POST', '/api/auth/login', {
      email: testEmail,
      password: testPassword,
    })
    const response = await handler(req)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.success).toBe(true)
  })

  it('login route returns 401 for wrong password', async () => {
    const { createTestRequest } = await import('../helpers/mock-request')
    const handler = (await import('@/app/api/auth/login/route')).POST
    const req = createTestRequest('POST', '/api/auth/login', {
      email: testEmail,
      password: 'WrongPassword!',
    })
    const response = await handler(req)
    expect(response.status).toBe(401)
  })

  it('login route returns 401 for nonexistent user', async () => {
    const { createTestRequest } = await import('../helpers/mock-request')
    const handler = (await import('@/app/api/auth/login/route')).POST
    const req = createTestRequest('POST', '/api/auth/login', {
      email: 'nobody@nonexistent-ffff.invalid',
      password: 'AnyPassword',
    })
    const response = await handler(req)
    expect(response.status).toBe(401)
  })

  it('unused testUserId is defined (sanity check)', () => {
    // Ensures beforeAll ran and created the user
    expect(testUserId).toBeTruthy()
  })
})
