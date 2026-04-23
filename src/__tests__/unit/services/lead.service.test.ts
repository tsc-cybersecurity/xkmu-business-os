import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'

const TEST_USER_ID = '00000000-0000-0000-0000-000000000002'
const TEST_COMPANY_ID = '00000000-0000-0000-0000-000000000003'
const TEST_LEAD_ID = '00000000-0000-0000-0000-000000000020'
const TEST_PERSON_ID = '00000000-0000-0000-0000-000000000010'

// Mock webhook service (dynamic import inside updateStatus)
vi.mock('@/lib/services/webhook.service', () => ({
  WebhookService: { fire: vi.fn().mockResolvedValue(undefined) },
}))

function leadFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_LEAD_ID,
    companyId: TEST_COMPANY_ID,
    personId: TEST_PERSON_ID,
    title: 'Test Lead',
    source: 'website',
    sourceDetail: null,
    status: 'new',
    score: 0,
    assignedTo: null,
    tags: [],
    notes: null,
    rawData: {},
    contactFirstName: null,
    contactLastName: null,
    contactCompany: null,
    contactPhone: null,
    contactEmail: null,
    aiResearchStatus: null,
    aiResearchResult: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  }
}

function leadWithRelationsFixture(overrides: Record<string, unknown> = {}) {
  return {
    ...leadFixture(),
    company: { id: TEST_COMPANY_ID, name: 'Test GmbH' },
    person: { id: TEST_PERSON_ID, firstName: 'Max', lastName: 'Mustermann', email: 'max@example.de' },
    assignedToUser: null,
    ...overrides,
  }
}

describe('LeadService', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
  })

  async function getService() {
    const mod = await import('@/lib/services/lead.service')
    return mod.LeadService
  }

  // ---- create ----

  describe('create', () => {
    it('creates a lead and returns it', async () => {
      const fixture = leadFixture()
      dbMock.mockInsert.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.create({
        source: 'website',
        title: 'Test Lead',
      })

      expect(result).toEqual(fixture)
      expect(dbMock.db.insert).toHaveBeenCalled()
    })

    it('sets default status to new', async () => {
      const fixture = leadFixture({ status: 'new' })
      dbMock.mockInsert.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.create({ source: 'manual' })

      expect(result.status).toBe('new')
    })

    it('sets default score to 0', async () => {
      const fixture = leadFixture({ score: 0 })
      dbMock.mockInsert.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.create({ source: 'manual' })

      expect(result.score).toBe(0)
    })

    it('converts empty strings to null', async () => {
      const fixture = leadFixture({ title: null, sourceDetail: null })
      dbMock.mockInsert.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.create({
        source: 'website',
        title: '',
        sourceDetail: '',
      })

      expect(result.title).toBeNull()
      expect(result.sourceDetail).toBeNull()
    })
  })

  // ---- getById ----

  describe('getById', () => {
    it('returns lead with relations when found', async () => {
      const fixture = leadWithRelationsFixture()
      dbMock.mockSelect.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.getById(TEST_LEAD_ID)

      expect(result).toBeDefined()
      expect(result!.id).toBe(TEST_LEAD_ID)
      expect(result!.company).not.toBeNull()
      expect(result!.person).not.toBeNull()
    })

    it('returns null when not found', async () => {
      dbMock.mockSelect.mockResolvedValue([])

      const service = await getService()
      const result = await service.getById('nonexistent')

      expect(result).toBeNull()
    })

    it('nullifies company/person when they have no id', async () => {
      const fixture = leadWithRelationsFixture({
        company: { id: null, name: null },
        person: { id: null, firstName: null, lastName: null, email: null },
        assignedToUser: { id: null, firstName: null, lastName: null, email: null },
      })
      dbMock.mockSelect.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.getById(TEST_LEAD_ID)

      expect(result!.company).toBeNull()
      expect(result!.person).toBeNull()
      expect(result!.assignedToUser).toBeNull()
    })
  })

  // ---- update ----

  describe('update', () => {
    it('updates and returns lead', async () => {
      const fixture = leadFixture({ status: 'qualified' })
      dbMock.mockUpdate.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.update(TEST_LEAD_ID, { status: 'qualified' })

      expect(result).toEqual(fixture)
      expect(result!.status).toBe('qualified')
    })

    it('returns null when not found', async () => {
      dbMock.mockUpdate.mockResolvedValue([])

      const service = await getService()
      const result = await service.update('nonexistent', { status: 'won' })

      expect(result).toBeNull()
    })

    it('handles aiResearchStatus update', async () => {
      const fixture = leadFixture({ aiResearchStatus: 'completed' })
      dbMock.mockUpdate.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.update(TEST_LEAD_ID, {
        aiResearchStatus: 'completed',
        aiResearchResult: { summary: 'done' },
      })

      expect(result!.aiResearchStatus).toBe('completed')
    })
  })

  // ---- delete ----

  describe('delete', () => {
    it('returns true when deleted', async () => {
      dbMock.mockDelete.mockResolvedValue([{ id: TEST_LEAD_ID }])

      const service = await getService()
      const result = await service.delete(TEST_LEAD_ID)

      expect(result).toBe(true)
    })

    it('returns false when not found', async () => {
      dbMock.mockDelete.mockResolvedValue([])

      const service = await getService()
      const result = await service.delete('nonexistent')

      expect(result).toBe(false)
    })
  })

  // ---- list ----

  describe('list', () => {
    it('returns paginated results with meta', async () => {
      const fixtures = [leadWithRelationsFixture(), leadWithRelationsFixture({ id: '00000000-0000-0000-0000-000000000021' })]

      dbMock.mockSelect.mockResolvedValueOnce(fixtures)
      dbMock.mockSelect.mockResolvedValueOnce([{ count: 2 }])

      const service = await getService()
      const result = await service.list()

      expect(result.items).toHaveLength(2)
      expect(result.meta.total).toBe(2)
      expect(result.meta.page).toBe(1)
      expect(result.meta.limit).toBe(20)
      expect(result.meta.totalPages).toBe(1)
    })

    it('uses default page=1 and limit=20', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockSelect.mockResolvedValueOnce([{ count: 0 }])

      const service = await getService()
      const result = await service.list()

      expect(result.meta.page).toBe(1)
      expect(result.meta.limit).toBe(20)
    })

    it('respects custom pagination', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockSelect.mockResolvedValueOnce([{ count: 30 }])

      const service = await getService()
      const result = await service.list({ page: 2, limit: 10 })

      expect(result.meta.page).toBe(2)
      expect(result.meta.limit).toBe(10)
      expect(result.meta.totalPages).toBe(3)
    })

    it('passes string status filter to query', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockSelect.mockResolvedValueOnce([{ count: 0 }])

      const service = await getService()
      await service.list({ status: 'qualified' })

      expect(dbMock.db.select).toHaveBeenCalledTimes(2)
    })

    it('passes array status filter to query', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockSelect.mockResolvedValueOnce([{ count: 0 }])

      const service = await getService()
      await service.list({ status: ['new', 'qualified'] })

      expect(dbMock.db.select).toHaveBeenCalledTimes(2)
    })

    it('passes source filter to query', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockSelect.mockResolvedValueOnce([{ count: 0 }])

      const service = await getService()
      await service.list({ source: 'website' })

      expect(dbMock.db.select).toHaveBeenCalledTimes(2)
    })

    it('passes assignedTo filter to query', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockSelect.mockResolvedValueOnce([{ count: 0 }])

      const service = await getService()
      await service.list({ assignedTo: TEST_USER_ID })

      expect(dbMock.db.select).toHaveBeenCalledTimes(2)
    })
  })

  // ---- updateStatus ----

  describe('updateStatus', () => {
    it('updates status and returns lead', async () => {
      const fixture = leadFixture({ status: 'won' })
      dbMock.mockUpdate.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.updateStatus(TEST_LEAD_ID, 'won', 'qualified')

      expect(result!.status).toBe('won')
    })

    it('returns null when lead not found', async () => {
      dbMock.mockUpdate.mockResolvedValue([])

      const service = await getService()
      const result = await service.updateStatus('nonexistent', 'won')

      expect(result).toBeNull()
    })
  })

  // ---- assignTo ----

  describe('assignTo', () => {
    it('assigns user to lead', async () => {
      const fixture = leadFixture({ assignedTo: TEST_USER_ID })
      dbMock.mockUpdate.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.assignTo(TEST_LEAD_ID, TEST_USER_ID)

      expect(result!.assignedTo).toBe(TEST_USER_ID)
    })

    it('unassigns user from lead with null', async () => {
      const fixture = leadFixture({ assignedTo: null })
      dbMock.mockUpdate.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.assignTo(TEST_LEAD_ID, null)

      expect(result!.assignedTo).toBeNull()
    })
  })

  // ---- getStatusCounts ----

  describe('getStatusCounts', () => {
    it('returns status counts', async () => {
      dbMock.mockSelect.mockResolvedValue([
        { status: 'new', count: 5 },
        { status: 'qualified', count: 3 },
        { status: 'won', count: 1 },
      ])

      const service = await getService()
      const result = await service.getStatusCounts()

      expect(result).toHaveLength(3)
      expect(result[0].status).toBe('new')
      expect(result[0].count).toBe(5)
      expect(result[1].status).toBe('qualified')
    })

    it('returns empty array when no leads', async () => {
      dbMock.mockSelect.mockResolvedValue([])

      const service = await getService()
      const result = await service.getStatusCounts()

      expect(result).toEqual([])
    })

    it('converts null status to unknown', async () => {
      dbMock.mockSelect.mockResolvedValue([{ status: null, count: 2 }])

      const service = await getService()
      const result = await service.getStatusCounts()

      expect(result[0].status).toBe('unknown')
    })
  })

  // ---- updateAIResearch ----

  describe('updateAIResearch', () => {
    it('updates AI research status and result', async () => {
      const fixture = leadFixture({ aiResearchStatus: 'completed', aiResearchResult: { data: 'test' } })
      dbMock.mockUpdate.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.updateAIResearch(TEST_LEAD_ID, 'completed', { data: 'test' })

      expect(result!.aiResearchStatus).toBe('completed')
    })

    it('updates AI research status without result', async () => {
      const fixture = leadFixture({ aiResearchStatus: 'running', aiResearchResult: null })
      dbMock.mockUpdate.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.updateAIResearch(TEST_LEAD_ID, 'running')

      expect(result!.aiResearchStatus).toBe('running')
    })
  })
})
