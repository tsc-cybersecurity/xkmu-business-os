import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { eq, ilike } from 'drizzle-orm'
import * as schema from '@/lib/db/schema'

// Reserved UUID namespace for integration tests — 'ffff' in segment 2
// Cleanup is safe: these IDs are never created by application code or seeds
export const TEST_INTEGRATION_TENANT_A = '00000000-ffff-0000-0000-000000000001'
export const TEST_INTEGRATION_TENANT_B = '00000000-ffff-0000-0000-000000000002'

export type TestDb = ReturnType<typeof createTestDb>

export function createTestDb() {
  const url = process.env.TEST_DATABASE_URL
  if (!url) {
    throw new Error('TEST_DATABASE_URL not set — create .env.test with TEST_DATABASE_URL pointing to your Neon database')
  }
  const client = postgres(url, {
    max: 3,
    ssl: process.env.DATABASE_SSL === 'require' ? 'require' : undefined,
  })
  return drizzle(client, { schema })
}

// Single-tenant: organization table is a singleton managed by migrations.
// seedTestTenants / seedTestTenant are no-ops — nothing to insert.
export async function seedTestTenants(_db: TestDb): Promise<void> {
  // no-op: organization is a singleton, already seeded by migrations
}

export async function cleanupTestTenants(db: TestDb): Promise<void> {
  // Delete test data by known test-email pattern (*.test-ffff.invalid)
  // FK-correct order: children before parents
  try {
    // Find test user IDs first
    const testUsers = await db.select({ id: schema.users.id }).from(schema.users)
      .where(ilike(schema.users.email, '%@test-ffff.invalid'))
    const testUserIds = testUsers.map(u => u.id)

    // Delete activities created by test users
    if (schema.activities && testUserIds.length > 0) {
      for (const uid of testUserIds) {
        await db.delete(schema.activities).where(eq(schema.activities.userId, uid))
      }
    }
    // Delete api keys owned by test users
    if (schema.apiKeys && testUserIds.length > 0) {
      for (const uid of testUserIds) {
        await db.delete(schema.apiKeys).where(eq(schema.apiKeys.userId, uid))
      }
    }
    // Delete leads created by test users
    if (schema.leads && testUserIds.length > 0) {
      for (const uid of testUserIds) {
        await db.delete(schema.leads).where(eq(schema.leads.assignedTo, uid))
      }
    }
    // Delete companies created by test users
    if (schema.companies && testUserIds.length > 0) {
      for (const uid of testUserIds) {
        await db.delete(schema.companies).where(eq(schema.companies.createdBy, uid))
      }
    }
    // Delete test users by email pattern
    if (testUserIds.length > 0) {
      await db.delete(schema.users).where(ilike(schema.users.email, '%@test-ffff.invalid'))
    }
    // NOTE: do NOT delete from organization — it is a singleton, not test-scoped
  } catch (err) {
    // Log but do not rethrow — cleanup must not fail silently hiding test results
    console.warn(`[test-db] Cleanup warning:`, err)
  }
}

// Single-tenant variants for tests that only need one context handle
export async function seedTestTenant(_db: TestDb, tenantId = TEST_INTEGRATION_TENANT_A): Promise<string> {
  // no-op: organization is a singleton, already seeded by migrations
  return tenantId
}

export async function cleanupTestTenant(db: TestDb, _tenantId = TEST_INTEGRATION_TENANT_A): Promise<void> {
  return cleanupTestTenants(db)
}
