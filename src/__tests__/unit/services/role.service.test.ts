import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'
import { TEST_TENANT_ID } from '../../helpers/fixtures'

const TEST_ROLE_ID = '00000000-0000-0000-0000-000000000020'

function roleFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_ROLE_ID,
    tenantId: TEST_TENANT_ID,
    name: 'editor',
    displayName: 'Editor',
    description: 'Can edit content',
    isSystem: false,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  }
}

function permissionFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: '00000000-0000-0000-0000-000000000030',
    roleId: TEST_ROLE_ID,
    module: 'companies',
    canCreate: true,
    canRead: true,
    canUpdate: false,
    canDelete: false,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  }
}

describe('RoleService', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
  })

  async function getService() {
    const mod = await import('@/lib/services/role.service')
    return mod.RoleService
  }

  // ---- getById ----

  describe('getById', () => {
    it('returns role when found', async () => {
      const fixture = roleFixture()
      dbMock.mockSelect.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.getById(TEST_TENANT_ID, TEST_ROLE_ID)

      expect(result).toEqual(fixture)
    })

    it('returns null when not found', async () => {
      dbMock.mockSelect.mockResolvedValue([])

      const service = await getService()
      const result = await service.getById(TEST_TENANT_ID, 'nonexistent')

      expect(result).toBeNull()
    })
  })

  // ---- getByName ----

  describe('getByName', () => {
    it('returns role when found', async () => {
      const fixture = roleFixture()
      dbMock.mockSelect.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.getByName(TEST_TENANT_ID, 'editor')

      expect(result).toEqual(fixture)
    })

    it('returns null when not found', async () => {
      dbMock.mockSelect.mockResolvedValue([])

      const service = await getService()
      const result = await service.getByName(TEST_TENANT_ID, 'nonexistent')

      expect(result).toBeNull()
    })
  })

  // ---- list ----

  describe('list', () => {
    it('returns all roles for tenant', async () => {
      const fixtures = [roleFixture(), roleFixture({ id: '00000000-0000-0000-0000-000000000021', name: 'viewer' })]
      dbMock.mockSelect.mockResolvedValue(fixtures)

      const service = await getService()
      const result = await service.list(TEST_TENANT_ID)

      expect(result).toHaveLength(2)
      expect(dbMock.db.select).toHaveBeenCalled()
    })

    it('returns empty array when no roles', async () => {
      dbMock.mockSelect.mockResolvedValue([])

      const service = await getService()
      const result = await service.list(TEST_TENANT_ID)

      expect(result).toEqual([])
    })
  })

  // ---- getWithPermissions ----

  describe('getWithPermissions', () => {
    it('returns role with permissions when found', async () => {
      const role = roleFixture()
      const perm = permissionFixture()

      // getById -> first select, then permissions select
      dbMock.mockSelect.mockResolvedValueOnce([role])
      dbMock.mockSelect.mockResolvedValueOnce([perm])

      const service = await getService()
      const result = await service.getWithPermissions(TEST_TENANT_ID, TEST_ROLE_ID)

      expect(result).not.toBeNull()
      expect(result!.permissions).toHaveLength(1)
      expect(result!.permissions[0].module).toBe('companies')
    })

    it('returns null when role not found', async () => {
      dbMock.mockSelect.mockResolvedValue([])

      const service = await getService()
      const result = await service.getWithPermissions(TEST_TENANT_ID, 'nonexistent')

      expect(result).toBeNull()
    })
  })

  // ---- create ----

  describe('create', () => {
    it('creates a role with permissions and returns it', async () => {
      const role = roleFixture()
      const perm = permissionFixture()

      dbMock.mockInsert.mockResolvedValue([role])
      dbMock.mockSelect.mockResolvedValue([perm])

      const service = await getService()
      const result = await service.create(TEST_TENANT_ID, {
        name: 'editor',
        displayName: 'Editor',
        permissions: [
          { module: 'companies', canCreate: true, canRead: true, canUpdate: false, canDelete: false },
        ],
      })

      expect(result).toBeDefined()
      expect(result.name).toBe('editor')
      expect(result.permissions).toHaveLength(1)
      expect(dbMock.db.insert).toHaveBeenCalled()
    })

    it('creates a role with no permissions', async () => {
      const role = roleFixture()
      dbMock.mockInsert.mockResolvedValue([role])
      dbMock.mockSelect.mockResolvedValue([])

      const service = await getService()
      const result = await service.create(TEST_TENANT_ID, {
        name: 'viewer',
        displayName: 'Viewer',
        permissions: [],
      })

      expect(result.permissions).toHaveLength(0)
    })
  })

  // ---- update ----

  describe('update', () => {
    it('updates role and returns it with permissions', async () => {
      const existing = roleFixture()
      const updated = roleFixture({ displayName: 'Senior Editor' })
      const perm = permissionFixture()

      // getById (for update check)
      dbMock.mockSelect.mockResolvedValueOnce([existing])
      // db.update
      dbMock.mockUpdate.mockResolvedValue([updated])
      // getWithPermissions -> getById
      dbMock.mockSelect.mockResolvedValueOnce([updated])
      // getWithPermissions -> permissions
      dbMock.mockSelect.mockResolvedValueOnce([perm])

      const service = await getService()
      const result = await service.update(TEST_TENANT_ID, TEST_ROLE_ID, {
        displayName: 'Senior Editor',
      })

      expect(result).not.toBeNull()
      expect(dbMock.db.update).toHaveBeenCalled()
    })

    it('returns null when role not found', async () => {
      dbMock.mockSelect.mockResolvedValue([])

      const service = await getService()
      const result = await service.update(TEST_TENANT_ID, 'nonexistent', { displayName: 'X' })

      expect(result).toBeNull()
    })

    it('does not update owner system role', async () => {
      const ownerRole = roleFixture({ name: 'owner', isSystem: true })
      const perm = permissionFixture()

      // getById -> existing
      dbMock.mockSelect.mockResolvedValueOnce([ownerRole])
      // getWithPermissions -> getById
      dbMock.mockSelect.mockResolvedValueOnce([ownerRole])
      // getWithPermissions -> permissions
      dbMock.mockSelect.mockResolvedValueOnce([perm])

      const service = await getService()
      const result = await service.update(TEST_TENANT_ID, TEST_ROLE_ID, { displayName: 'Changed' })

      // Should return without actually updating
      expect(dbMock.db.update).not.toHaveBeenCalled()
      expect(result).not.toBeNull()
    })
  })

  // ---- delete ----

  describe('delete', () => {
    it('returns true when non-system role is deleted', async () => {
      const role = roleFixture({ isSystem: false })
      dbMock.mockSelect.mockResolvedValue([role])
      dbMock.mockDelete.mockResolvedValue([{ id: TEST_ROLE_ID }])

      const service = await getService()
      const result = await service.delete(TEST_TENANT_ID, TEST_ROLE_ID)

      expect(result).toBe(true)
    })

    it('returns false when role not found', async () => {
      dbMock.mockSelect.mockResolvedValue([])

      const service = await getService()
      const result = await service.delete(TEST_TENANT_ID, 'nonexistent')

      expect(result).toBe(false)
    })

    it('returns false for system roles', async () => {
      const systemRole = roleFixture({ isSystem: true })
      dbMock.mockSelect.mockResolvedValue([systemRole])

      const service = await getService()
      const result = await service.delete(TEST_TENANT_ID, TEST_ROLE_ID)

      expect(result).toBe(false)
      expect(dbMock.db.delete).not.toHaveBeenCalled()
    })
  })

  // ---- setPermissions ----

  describe('setPermissions', () => {
    it('deletes existing and inserts new permissions', async () => {
      dbMock.mockDelete.mockResolvedValue([])
      dbMock.mockInsert.mockResolvedValue([permissionFixture()])

      const service = await getService()
      await service.setPermissions(TEST_ROLE_ID, [
        { module: 'companies', canCreate: true, canRead: true, canUpdate: true, canDelete: false },
      ])

      expect(dbMock.db.delete).toHaveBeenCalled()
      expect(dbMock.db.insert).toHaveBeenCalled()
    })

    it('only deletes when permissions array is empty', async () => {
      dbMock.mockDelete.mockResolvedValue([])

      const service = await getService()
      await service.setPermissions(TEST_ROLE_ID, [])

      expect(dbMock.db.delete).toHaveBeenCalled()
      expect(dbMock.db.insert).not.toHaveBeenCalled()
    })
  })

  // ---- getUserPermissions ----

  describe('getUserPermissions', () => {
    it('returns permissions map indexed by module', async () => {
      const perm = permissionFixture({ canCreate: true, canRead: true, canUpdate: false, canDelete: false })
      dbMock.mockSelect.mockResolvedValue([perm])

      const service = await getService()
      const result = await service.getUserPermissions(TEST_ROLE_ID)

      expect(result['companies']).toBeDefined()
      expect(result['companies'].create).toBe(true)
      expect(result['companies'].read).toBe(true)
      expect(result['companies'].update).toBe(false)
      expect(result['companies'].delete).toBe(false)
    })

    it('returns empty map when no permissions', async () => {
      dbMock.mockSelect.mockResolvedValue([])

      const service = await getService()
      const result = await service.getUserPermissions(TEST_ROLE_ID)

      expect(result).toEqual({})
    })
  })
})
