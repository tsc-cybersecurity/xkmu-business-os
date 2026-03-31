import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createTestDb, seedTestTenant, cleanupTestTenant, TEST_INTEGRATION_TENANT_A } from '../setup/test-db'
import type { TestDb } from '../setup/test-db'

const hasTestDb = !!process.env.TEST_DATABASE_URL

describe.skipIf(!hasTestDb)('CRUD: Companies — real DB', () => {
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

  it('create() inserts a company and returns it with an id', async () => {
    const { CompanyService } = await import('@/lib/services/company.service')
    const company = await CompanyService.create(TEST_INTEGRATION_TENANT_A, {
      name: 'CRUD Test GmbH',
      status: 'prospect',
      country: 'DE',
    })
    expect(company.id).toBeTruthy()
    expect(company.name).toBe('CRUD Test GmbH')
    expect(company.tenantId).toBe(TEST_INTEGRATION_TENANT_A)
    createdId = company.id
  })

  it('getById() returns the created company', async () => {
    const { CompanyService } = await import('@/lib/services/company.service')
    const found = await CompanyService.getById(TEST_INTEGRATION_TENANT_A, createdId)
    expect(found).not.toBeNull()
    expect(found!.id).toBe(createdId)
  })

  it('getById() returns null for wrong tenantId (isolation check)', async () => {
    const { CompanyService } = await import('@/lib/services/company.service')
    const notFound = await CompanyService.getById('00000000-0000-0000-0000-000000000099', createdId)
    expect(notFound).toBeNull()
  })

  it('list() includes the created company', async () => {
    const { CompanyService } = await import('@/lib/services/company.service')
    const result = await CompanyService.list(TEST_INTEGRATION_TENANT_A, {})
    const found = result.items.find(c => c.id === createdId)
    expect(found).toBeDefined()
  })

  it('update() changes the company name', async () => {
    const { CompanyService } = await import('@/lib/services/company.service')
    const updated = await CompanyService.update(TEST_INTEGRATION_TENANT_A, createdId, { name: 'Updated GmbH' })
    expect(updated).not.toBeNull()
    expect(updated!.name).toBe('Updated GmbH')
  })

  it('delete() removes the company; subsequent getById returns null', async () => {
    const { CompanyService } = await import('@/lib/services/company.service')
    await CompanyService.delete(TEST_INTEGRATION_TENANT_A, createdId)
    const gone = await CompanyService.getById(TEST_INTEGRATION_TENANT_A, createdId)
    expect(gone).toBeNull()
  })
})
