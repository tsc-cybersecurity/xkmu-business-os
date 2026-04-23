import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createTestDb, seedTestTenant, cleanupTestTenant, TEST_INTEGRATION_TENANT_A } from '../setup/test-db'
import type { TestDb } from '../setup/test-db'

const hasTestDb = !!process.env.TEST_DATABASE_URL

// Adaptation from plan: leads schema uses source (required), contactFirstName/contactLastName
// not name/email. The update method supports status field updates.
describe.skipIf(!hasTestDb)('CRUD: Leads — real DB', () => {
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

  it('create() inserts a lead and returns it with an id', async () => {
    const { LeadService } = await import('@/lib/services/lead.service')
    const lead = await LeadService.create({
      source: 'manual',
      status: 'new',
      contactFirstName: 'Integration',
      contactLastName: 'Test Lead',
      contactEmail: 'lead-test@test-ffff.invalid',
      // companyId: not set — avoid FK dependency on companies table
    })
    expect(lead.id).toBeTruthy()
    expect(lead.source).toBe('manual')
    createdId = lead.id
  })

  it('getById() returns the created lead', async () => {
    const { LeadService } = await import('@/lib/services/lead.service')
    const found = await LeadService.getById(createdId)
    expect(found).not.toBeNull()
    expect(found!.id).toBe(createdId)
  })

  it('getById() returns null for unknown id', async () => {
    const { LeadService } = await import('@/lib/services/lead.service')
    const notFound = await LeadService.getById('00000000-0000-0000-0000-000000000099')
    expect(notFound).toBeNull()
  })

  it('list() includes the created lead', async () => {
    const { LeadService } = await import('@/lib/services/lead.service')
    const result = await LeadService.list({})
    const found = result.items.find(l => l.id === createdId)
    expect(found).toBeDefined()
  })

  it('update() changes the lead status', async () => {
    const { LeadService } = await import('@/lib/services/lead.service')
    // Adaptation: update status (not name — leads don't have a name field)
    const updated = await LeadService.update(createdId, { status: 'qualified' })
    expect(updated).not.toBeNull()
    expect(updated!.status).toBe('qualified')
  })

  it('delete() removes the lead; subsequent getById returns null', async () => {
    const { LeadService } = await import('@/lib/services/lead.service')
    await LeadService.delete(createdId)
    const gone = await LeadService.getById(createdId)
    expect(gone).toBeNull()
  })
})
