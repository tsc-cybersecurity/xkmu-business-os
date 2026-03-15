import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'
import { TEST_TENANT_ID } from '../../helpers/fixtures'

const TEST_PAGE_ID = '00000000-0000-0000-0000-000000000010'
const TEST_BLOCK_ID = '00000000-0000-0000-0000-000000000020'
const TEST_BLOCK_ID_2 = '00000000-0000-0000-0000-000000000021'

function cmsBlockFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_BLOCK_ID,
    tenantId: TEST_TENANT_ID,
    pageId: TEST_PAGE_ID,
    blockType: 'hero',
    sortOrder: 0,
    content: { heading: 'Hello World' },
    settings: {},
    isVisible: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  }
}

describe('CmsBlockService', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
  })

  async function getService() {
    const mod = await import('@/lib/services/cms-block.service')
    return mod.CmsBlockService
  }

  // ---- listByPage ----

  describe('listByPage', () => {
    it('returns blocks for a page ordered by sortOrder', async () => {
      const blocks = [cmsBlockFixture(), cmsBlockFixture({ id: TEST_BLOCK_ID_2, sortOrder: 1 })]
      dbMock.mockSelect.mockResolvedValue(blocks)

      const service = await getService()
      const result = await service.listByPage(TEST_TENANT_ID, TEST_PAGE_ID)

      expect(result).toHaveLength(2)
      expect(dbMock.db.select).toHaveBeenCalled()
    })

    it('returns empty array when no blocks', async () => {
      dbMock.mockSelect.mockResolvedValue([])

      const service = await getService()
      const result = await service.listByPage(TEST_TENANT_ID, TEST_PAGE_ID)

      expect(result).toEqual([])
    })
  })

  // ---- create ----

  describe('create', () => {
    it('creates a block and returns it', async () => {
      const fixture = cmsBlockFixture()
      dbMock.mockInsert.mockResolvedValue([fixture])
      // markPageDraftChanges calls db.update
      dbMock.mockUpdate.mockResolvedValue([])

      const service = await getService()
      const result = await service.create(TEST_TENANT_ID, TEST_PAGE_ID, {
        blockType: 'hero',
      })

      expect(result).toEqual(fixture)
      expect(dbMock.db.insert).toHaveBeenCalled()
    })

    it('sets default sortOrder to 0', async () => {
      const fixture = cmsBlockFixture({ sortOrder: 0 })
      dbMock.mockInsert.mockResolvedValue([fixture])
      dbMock.mockUpdate.mockResolvedValue([])

      const service = await getService()
      const result = await service.create(TEST_TENANT_ID, TEST_PAGE_ID, {
        blockType: 'text',
      })

      expect(result.sortOrder).toBe(0)
    })

    it('sets default isVisible to true', async () => {
      const fixture = cmsBlockFixture({ isVisible: true })
      dbMock.mockInsert.mockResolvedValue([fixture])
      dbMock.mockUpdate.mockResolvedValue([])

      const service = await getService()
      const result = await service.create(TEST_TENANT_ID, TEST_PAGE_ID, {
        blockType: 'text',
      })

      expect(result.isVisible).toBe(true)
    })
  })

  // ---- update ----

  describe('update', () => {
    it('updates and returns block', async () => {
      const fixture = cmsBlockFixture({ blockType: 'text' })
      dbMock.mockUpdate.mockResolvedValueOnce([fixture])
      // markPageDraftChanges
      dbMock.mockUpdate.mockResolvedValueOnce([])

      const service = await getService()
      const result = await service.update(TEST_TENANT_ID, TEST_BLOCK_ID, {
        blockType: 'text',
      })

      expect(result).not.toBeNull()
      expect(result!.blockType).toBe('text')
    })

    it('returns null when block not found', async () => {
      dbMock.mockUpdate.mockResolvedValueOnce([])

      const service = await getService()
      const result = await service.update(TEST_TENANT_ID, 'nonexistent', {
        blockType: 'text',
      })

      expect(result).toBeNull()
    })
  })

  // ---- delete ----

  describe('delete', () => {
    it('returns true when deleted', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([{ pageId: TEST_PAGE_ID }])
      dbMock.mockDelete.mockResolvedValueOnce([{ id: TEST_BLOCK_ID }])
      dbMock.mockUpdate.mockResolvedValueOnce([])

      const service = await getService()
      const result = await service.delete(TEST_TENANT_ID, TEST_BLOCK_ID)

      expect(result).toBe(true)
    })

    it('returns false when not found', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockDelete.mockResolvedValueOnce([])

      const service = await getService()
      const result = await service.delete(TEST_TENANT_ID, 'nonexistent')

      expect(result).toBe(false)
    })
  })

  // ---- reorder ----

  describe('reorder', () => {
    it('returns true after reordering blocks', async () => {
      dbMock.mockUpdate.mockResolvedValue([])

      const service = await getService()
      const result = await service.reorder(TEST_TENANT_ID, TEST_PAGE_ID, [
        TEST_BLOCK_ID,
        TEST_BLOCK_ID_2,
      ])

      expect(result).toBe(true)
      expect(dbMock.db.update).toHaveBeenCalled()
    })

    it('handles empty blockIds array', async () => {
      dbMock.mockUpdate.mockResolvedValue([])

      const service = await getService()
      const result = await service.reorder(TEST_TENANT_ID, TEST_PAGE_ID, [])

      expect(result).toBe(true)
    })
  })

  // ---- duplicate ----

  describe('duplicate', () => {
    it('duplicates a block and returns the new one', async () => {
      const original = cmsBlockFixture({ sortOrder: 2 })
      const duplicated = cmsBlockFixture({ id: TEST_BLOCK_ID_2, sortOrder: 3 })

      dbMock.mockSelect.mockResolvedValueOnce([original])
      dbMock.mockInsert.mockResolvedValueOnce([duplicated])
      dbMock.mockUpdate.mockResolvedValueOnce([])

      const service = await getService()
      const result = await service.duplicate(TEST_TENANT_ID, TEST_BLOCK_ID)

      expect(result).not.toBeNull()
      expect(result!.id).toBe(TEST_BLOCK_ID_2)
    })

    it('returns null when original block not found', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])

      const service = await getService()
      const result = await service.duplicate(TEST_TENANT_ID, 'nonexistent')

      expect(result).toBeNull()
    })
  })
})
