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

export async function seedTestTenants(db: TestDb): Promise<void> {
  // Insert both test tenants — idempotent (ignore if already exists from a previous crashed run)
  await db.insert(schema.tenants).values([
    {
      id: TEST_INTEGRATION_TENANT_A,
      name: 'Integration Test Tenant A',
      slug: 'integration-test-tenant-a-ffff',
      status: 'active',
    },
    {
      id: TEST_INTEGRATION_TENANT_B,
      name: 'Integration Test Tenant B',
      slug: 'integration-test-tenant-b-ffff',
      status: 'active',
    },
  ]).onConflictDoNothing()
}

export async function cleanupTestTenants(db: TestDb): Promise<void> {
  const tenantIds = [TEST_INTEGRATION_TENANT_A, TEST_INTEGRATION_TENANT_B]

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
    // Delete test tenants
    for (const tenantId of tenantIds) {
      await db.delete(schema.tenants).where(eq(schema.tenants.id, tenantId))
    }
  } catch (err) {
    // Log but do not rethrow — cleanup must not fail silently hiding test results
    console.warn(`[test-db] Cleanup warning:`, err)
  }
}

// Single-tenant variants for tests that only need one tenant
export async function seedTestTenant(db: TestDb, tenantId = TEST_INTEGRATION_TENANT_A): Promise<string> {
  const name = tenantId === TEST_INTEGRATION_TENANT_A
    ? 'Integration Test Tenant A'
    : 'Integration Test Tenant B'
  const slug = `integration-test-${tenantId.slice(-4)}-ffff`
  await db.insert(schema.tenants).values({
    id: tenantId,
    name,
    slug,
    status: 'active',
  }).onConflictDoNothing()
  return tenantId
}

export async function cleanupTestTenant(db: TestDb, tenantId = TEST_INTEGRATION_TENANT_A): Promise<void> {
  // Use the multi-tenant cleanup which handles both tenant IDs safely
  return cleanupTestTenants(db)
}
