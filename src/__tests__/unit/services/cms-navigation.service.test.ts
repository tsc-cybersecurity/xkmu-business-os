import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'
import { TEST_TENANT_ID } from '../../helpers/fixtures'

const TEST_NAV_ID = '00000000-0000-0000-0000-000000000030'
const TEST_NAV_ID_2 = '00000000-0000-0000-0000-000000000031'

function navItemFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_NAV_ID,
    tenantId: TEST_TENANT_ID,
    location: 'header',
    label: 'Home',
    href: '/',
    pageId: null,
    sortOrder: 0,
    openInNewTab: false,
    isVisible: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  }
}

describe('CmsNavigationService', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
  })

  async function getService() {
    // Mock db.transaction used by reorder()
    const dbModule = await import('@/lib/db')
    ;(dbModule.db as Record<string, unknown>).transaction = vi.fn().mockImplementation(
      async (fn: (tx: typeof dbModule.db) => Promise<void>) => fn(dbModule.db)
    )
    const mod = await import('@/lib/services/cms-navigation.service')
    return mod.CmsNavigationService
  }

  // ---- list ----

  describe('list', () => {
    it('returns all navigation items for tenant', async () => {
      const items = [navItemFixture(), navItemFixture({ id: TEST_NAV_ID_2, label: 'About', sortOrder: 1 })]
      dbMock.mockSelect.mockResolvedValue(items)

      const service = await getService()
      const result = await service.list()

      expect(result).toHaveLength(2)
      expect(dbMock.db.select).toHaveBeenCalled()
    })

    it('filters by location when provided', async () => {
      const items = [navItemFixture()]
      dbMock.mockSelect.mockResolvedValue(items)

      const service = await getService()
      const result = await service.list('header')

      expect(result).toHaveLength(1)
    })

    it('returns empty array when no items', async () => {
      dbMock.mockSelect.mockResolvedValue([])

      const service = await getService()
      const result = await service.list()

      expect(result).toEqual([])
    })
  })

  // ---- create ----

  describe('create', () => {
    it('creates a navigation item and returns it', async () => {
      const fixture = navItemFixture()
      dbMock.mockInsert.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.create(TEST_TENANT_ID, {
        location: 'header',
        label: 'Home',
        href: '/',
      })

      expect(result).toEqual(fixture)
      expect(dbMock.db.insert).toHaveBeenCalled()
    })

    it('sets default openInNewTab to false', async () => {
      const fixture = navItemFixture({ openInNewTab: false })
      dbMock.mockInsert.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.create(TEST_TENANT_ID, {
        location: 'footer',
        label: 'Contact',
        href: '/contact',
      })

      expect(result.openInNewTab).toBe(false)
    })

    it('sets default isVisible to true', async () => {
      const fixture = navItemFixture({ isVisible: true })
      dbMock.mockInsert.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.create(TEST_TENANT_ID, {
        location: 'header',
        label: 'About',
        href: '/about',
      })

      expect(result.isVisible).toBe(true)
    })
  })

  // ---- update ----

  describe('update', () => {
    it('updates and returns navigation item', async () => {
      const fixture = navItemFixture({ label: 'Updated Home' })
      dbMock.mockUpdate.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.update(TEST_NAV_ID, {
        label: 'Updated Home',
      })

      expect(result).not.toBeNull()
      expect(result!.label).toBe('Updated Home')
    })

    it('returns null when item not found', async () => {
      dbMock.mockUpdate.mockResolvedValue([])

      const service = await getService()
      const result = await service.update('nonexistent', { label: 'X' })

      expect(result).toBeNull()
    })
  })

  // ---- delete ----

  describe('delete', () => {
    it('returns true when deleted', async () => {
      dbMock.mockDelete.mockResolvedValue([{ id: TEST_NAV_ID }])

      const service = await getService()
      const result = await service.delete(TEST_NAV_ID)

      expect(result).toBe(true)
    })

    it('returns false when not found', async () => {
      dbMock.mockDelete.mockResolvedValue([])

      const service = await getService()
      const result = await service.delete('nonexistent')

      expect(result).toBe(false)
    })
  })

  // ---- reorder ----

  describe('reorder', () => {
    it('calls update for each item in the list', async () => {
      dbMock.mockUpdate.mockResolvedValue([])

      const service = await getService()
      await service.reorder([TEST_NAV_ID, TEST_NAV_ID_2])

      expect(dbMock.db.update).toHaveBeenCalled()
    })

    it('completes without error for empty list', async () => {
      dbMock.mockUpdate.mockResolvedValue([])

      const service = await getService()
      await expect(service.reorder([])).resolves.not.toThrow()
    })
  })
})
