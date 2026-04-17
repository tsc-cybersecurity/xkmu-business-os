import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createTestDb,
  seedTestTenants,
  cleanupTestTenants,
  TEST_INTEGRATION_TENANT_A,
  TEST_INTEGRATION_TENANT_B,
} from './setup/test-db'
import type { TestDb } from './setup/test-db'

const hasTestDb = !!process.env.TEST_DATABASE_URL

describe.skipIf(!hasTestDb)('Tenant Isolation — real DB', () => {
  let db: TestDb
  let companyAId: string

  beforeAll(async () => {
    db = createTestDb()
    await seedTestTenants(db)

    // Seed a company for Tenant A — the critical test data
    const { CompanyService } = await import('@/lib/services/company.service')
    const company = await CompanyService.create(TEST_INTEGRATION_TENANT_A, {
      name: 'Tenant A Exclusive GmbH',
      status: 'prospect',
      country: 'DE',
    })
    companyAId = company.id
  })

  afterAll(async () => {
    try {
      await cleanupTestTenants(db)
    } finally {
      // always runs cleanup
    }
  })

  it('Tenant A can see its own company', async () => {
    const { CompanyService } = await import('@/lib/services/company.service')
    const result = await CompanyService.list(TEST_INTEGRATION_TENANT_A, {})
    const found = result.items.find(c => c.id === companyAId)
    expect(found).toBeDefined()
    expect(found!.name).toBe('Tenant A Exclusive GmbH')
  })

  it('Tenant B cannot see Tenant A company in list', async () => {
    const { CompanyService } = await import('@/lib/services/company.service')
    const result = await CompanyService.list(TEST_INTEGRATION_TENANT_B, {})
    const leaked = result.items.find(c => c.id === companyAId)
    // Critical assertion: Tenant B MUST NOT see Tenant A data
    expect(leaked).toBeUndefined()
  })

  it('Tenant B getById for Tenant A company returns null', async () => {
    const { CompanyService } = await import('@/lib/services/company.service')
    const result = await CompanyService.getById(TEST_INTEGRATION_TENANT_B, companyAId)
    expect(result).toBeNull()
  })
})
