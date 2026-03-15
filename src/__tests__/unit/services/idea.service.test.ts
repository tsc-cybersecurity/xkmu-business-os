import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'

const TEST_TENANT_ID = '00000000-0000-0000-0000-000000000001'
const TEST_USER_ID = '00000000-0000-0000-0000-000000000002'
const TEST_IDEA_ID = '00000000-0000-0000-0000-000000000030'

function ideaFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_IDEA_ID,
    tenantId: TEST_TENANT_ID,
    rawContent: 'Eine tolle Idee für das Produkt',
    type: 'text',
    status: 'backlog',
    tags: [],
    structuredContent: {},
    createdBy: TEST_USER_ID,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  }
}

describe('IdeaService', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
  })

  async function getService() {
    const mod = await import('@/lib/services/idea.service')
    return mod.IdeaService
  }

  // ---- create ----

  describe('create', () => {
    it('creates an idea and returns it', async () => {
      const fixture = ideaFixture()
      dbMock.mockInsert.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.create(TEST_TENANT_ID, {
        rawContent: 'Eine tolle Idee für das Produkt',
      }, TEST_USER_ID)

      expect(result).toEqual(fixture)
      expect(dbMock.db.insert).toHaveBeenCalled()
    })

    it('sets default type to text', async () => {
      const fixture = ideaFixture({ type: 'text' })
      dbMock.mockInsert.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.create(TEST_TENANT_ID, {
        rawContent: 'Test Idee',
      })

      expect(result.type).toBe('text')
    })

    it('sets default status to backlog', async () => {
      const fixture = ideaFixture({ status: 'backlog' })
      dbMock.mockInsert.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.create(TEST_TENANT_ID, {
        rawContent: 'Test Idee',
      })

      expect(result.status).toBe('backlog')
    })

    it('uses provided type and status', async () => {
      const fixture = ideaFixture({ type: 'feature', status: 'in_progress' })
      dbMock.mockInsert.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.create(TEST_TENANT_ID, {
        rawContent: 'Feature Idee',
        type: 'feature',
        status: 'in_progress',
      })

      expect(result.type).toBe('feature')
      expect(result.status).toBe('in_progress')
    })

    it('sets default empty tags and structuredContent', async () => {
      const fixture = ideaFixture({ tags: [], structuredContent: {} })
      dbMock.mockInsert.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.create(TEST_TENANT_ID, {
        rawContent: 'Test',
      })

      expect(result.tags).toEqual([])
      expect(result.structuredContent).toEqual({})
    })
  })

  // ---- getById ----

  describe('getById', () => {
    it('returns idea when found', async () => {
      const fixture = ideaFixture()
      dbMock.mockSelect.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.getById(TEST_TENANT_ID, TEST_IDEA_ID)

      expect(result).toEqual(fixture)
    })

    it('returns null when not found', async () => {
      dbMock.mockSelect.mockResolvedValue([])

      const service = await getService()
      const result = await service.getById(TEST_TENANT_ID, 'nonexistent')

      expect(result).toBeNull()
    })
  })

  // ---- update ----

  describe('update', () => {
    it('updates and returns idea', async () => {
      const fixture = ideaFixture({ status: 'in_progress' })
      dbMock.mockUpdate.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.update(TEST_TENANT_ID, TEST_IDEA_ID, {
        status: 'in_progress',
      })

      expect(result).toEqual(fixture)
      expect(result!.status).toBe('in_progress')
    })

    it('returns null when not found', async () => {
      dbMock.mockUpdate.mockResolvedValue([])

      const service = await getService()
      const result = await service.update(TEST_TENANT_ID, 'nonexistent', { status: 'converted' })

      expect(result).toBeNull()
    })

    it('updates rawContent', async () => {
      const fixture = ideaFixture({ rawContent: 'Aktualisierter Inhalt' })
      dbMock.mockUpdate.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.update(TEST_TENANT_ID, TEST_IDEA_ID, {
        rawContent: 'Aktualisierter Inhalt',
      })

      expect(result!.rawContent).toBe('Aktualisierter Inhalt')
    })

    it('updates tags', async () => {
      const fixture = ideaFixture({ tags: ['important', 'urgent'] })
      dbMock.mockUpdate.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.update(TEST_TENANT_ID, TEST_IDEA_ID, {
        tags: ['important', 'urgent'],
      })

      expect(result!.tags).toEqual(['important', 'urgent'])
    })

    it('updates structuredContent', async () => {
      const structuredContent = { title: 'Neue Funktion', description: 'Details...' }
      const fixture = ideaFixture({ structuredContent })
      dbMock.mockUpdate.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.update(TEST_TENANT_ID, TEST_IDEA_ID, {
        structuredContent,
      })

      expect(result!.structuredContent).toEqual(structuredContent)
    })
  })

  // ---- delete ----

  describe('delete', () => {
    it('returns true when deleted', async () => {
      dbMock.mockDelete.mockResolvedValue([{ id: TEST_IDEA_ID }])

      const service = await getService()
      const result = await service.delete(TEST_TENANT_ID, TEST_IDEA_ID)

      expect(result).toBe(true)
    })

    it('returns false when not found', async () => {
      dbMock.mockDelete.mockResolvedValue([])

      const service = await getService()
      const result = await service.delete(TEST_TENANT_ID, 'nonexistent')

      expect(result).toBe(false)
    })
  })

  // ---- list ----

  describe('list', () => {
    it('returns paginated results with meta', async () => {
      const fixtures = [ideaFixture(), ideaFixture({ id: '00000000-0000-0000-0000-000000000031', rawContent: 'Zweite Idee' })]

      dbMock.mockSelect.mockResolvedValueOnce(fixtures)
      dbMock.mockSelect.mockResolvedValueOnce([{ total: 2 }])

      const service = await getService()
      const result = await service.list(TEST_TENANT_ID)

      expect(result.items).toHaveLength(2)
      expect(result.meta.total).toBe(2)
      expect(result.meta.page).toBe(1)
      expect(result.meta.limit).toBe(50)
      expect(result.meta.totalPages).toBe(1)
    })

    it('uses default page=1 and limit=50', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockSelect.mockResolvedValueOnce([{ total: 0 }])

      const service = await getService()
      const result = await service.list(TEST_TENANT_ID)

      expect(result.meta.page).toBe(1)
      expect(result.meta.limit).toBe(50)
    })

    it('respects custom pagination', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockSelect.mockResolvedValueOnce([{ total: 100 }])

      const service = await getService()
      const result = await service.list(TEST_TENANT_ID, { page: 2, limit: 25 })

      expect(result.meta.page).toBe(2)
      expect(result.meta.limit).toBe(25)
      expect(result.meta.totalPages).toBe(4)
    })

    it('passes status filter to query', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockSelect.mockResolvedValueOnce([{ total: 0 }])

      const service = await getService()
      await service.list(TEST_TENANT_ID, { status: 'in_progress' })

      expect(dbMock.db.select).toHaveBeenCalledTimes(2)
    })

    it('passes type filter to query', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockSelect.mockResolvedValueOnce([{ total: 0 }])

      const service = await getService()
      await service.list(TEST_TENANT_ID, { type: 'feature' })

      expect(dbMock.db.select).toHaveBeenCalledTimes(2)
    })
  })

  // ---- listGroupedByStatus ----

  describe('listGroupedByStatus', () => {
    it('returns ideas grouped by status', async () => {
      const backlogIdea = ideaFixture({ status: 'backlog' })
      const inProgressIdea = ideaFixture({ id: '00000000-0000-0000-0000-000000000031', status: 'in_progress' })
      const convertedIdea = ideaFixture({ id: '00000000-0000-0000-0000-000000000032', status: 'converted' })

      dbMock.mockSelect.mockResolvedValue([backlogIdea, inProgressIdea, convertedIdea])

      const service = await getService()
      const result = await service.listGroupedByStatus(TEST_TENANT_ID)

      expect(result.backlog).toHaveLength(1)
      expect(result.in_progress).toHaveLength(1)
      expect(result.converted).toHaveLength(1)
      expect(result.backlog[0].id).toBe(TEST_IDEA_ID)
    })

    it('returns empty arrays for all status groups when no ideas', async () => {
      dbMock.mockSelect.mockResolvedValue([])

      const service = await getService()
      const result = await service.listGroupedByStatus(TEST_TENANT_ID)

      expect(result.backlog).toEqual([])
      expect(result.in_progress).toEqual([])
      expect(result.converted).toEqual([])
    })

    it('handles ideas with null status by assigning to backlog', async () => {
      const idea = ideaFixture({ status: null })
      dbMock.mockSelect.mockResolvedValue([idea])

      const service = await getService()
      const result = await service.listGroupedByStatus(TEST_TENANT_ID)

      expect(result.backlog).toHaveLength(1)
    })

    it('handles custom status groups dynamically', async () => {
      const idea = ideaFixture({ status: 'archived' })
      dbMock.mockSelect.mockResolvedValue([idea])

      const service = await getService()
      const result = await service.listGroupedByStatus(TEST_TENANT_ID)

      expect(result.archived).toHaveLength(1)
    })
  })
})
