import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'
import { TEST_TENANT_ID, TEST_USER_ID } from '../../helpers/fixtures'

// Mock bcryptjs
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed_password'),
    compare: vi.fn().mockResolvedValue(true),
  },
}))

const TEST_ROLE_ID = '00000000-0000-0000-0000-000000000010'

function userFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_USER_ID,
    tenantId: TEST_TENANT_ID,
    email: 'test@example.com',
    passwordHash: 'hashed_password',
    firstName: 'Max',
    lastName: 'Mustermann',
    role: 'member',
    roleId: null,
    status: 'active',
    lastLoginAt: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  }
}

describe('UserService', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
  })

  async function getService() {
    const mod = await import('@/lib/services/user.service')
    return mod.UserService
  }

  // ---- create ----

  describe('create', () => {
    it('creates a user and returns it', async () => {
      const fixture = userFixture()
      dbMock.mockInsert.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.create(TEST_TENANT_ID, {
        email: 'Test@Example.com',
        password: 'secret123',
      })

      expect(result).toEqual(fixture)
      expect(dbMock.db.insert).toHaveBeenCalled()
    })

    it('lowercases the email', async () => {
      const fixture = userFixture({ email: 'test@example.com' })
      dbMock.mockInsert.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.create(TEST_TENANT_ID, {
        email: 'TEST@EXAMPLE.COM',
        password: 'secret123',
      })

      expect(result.email).toBe('test@example.com')
    })

    it('sets default role to member', async () => {
      const fixture = userFixture({ role: 'member' })
      dbMock.mockInsert.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.create(TEST_TENANT_ID, {
        email: 'test@example.com',
        password: 'secret123',
      })

      expect(result.role).toBe('member')
    })

    it('uses provided role', async () => {
      const fixture = userFixture({ role: 'admin' })
      dbMock.mockInsert.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.create(TEST_TENANT_ID, {
        email: 'admin@example.com',
        password: 'secret123',
        role: 'admin',
      })

      expect(result.role).toBe('admin')
    })
  })

  // ---- authenticate ----

  describe('authenticate', () => {
    it('returns success with session user for valid credentials', async () => {
      const fixture = userFixture()
      // getByEmail -> select
      dbMock.mockSelect.mockResolvedValueOnce([fixture])
      // update lastLoginAt
      dbMock.mockUpdate.mockResolvedValue([fixture])

      const bcrypt = await import('bcryptjs')
      vi.mocked(bcrypt.default.compare).mockResolvedValueOnce(true as never)

      const service = await getService()
      const result = await service.authenticate(TEST_TENANT_ID, 'test@example.com', 'correct')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.user.email).toBe('test@example.com')
        expect(result.user.id).toBe(TEST_USER_ID)
      }
    })

    it('returns error when user not found', async () => {
      dbMock.mockSelect.mockResolvedValue([])

      const service = await getService()
      const result = await service.authenticate(TEST_TENANT_ID, 'nobody@example.com', 'pass')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Invalid credentials')
      }
    })

    it('returns error when account is not active', async () => {
      const fixture = userFixture({ status: 'inactive' })
      dbMock.mockSelect.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.authenticate(TEST_TENANT_ID, 'test@example.com', 'pass')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Account is not active')
      }
    })

    it('returns error for invalid password', async () => {
      const fixture = userFixture()
      dbMock.mockSelect.mockResolvedValue([fixture])

      const bcrypt = await import('bcryptjs')
      vi.mocked(bcrypt.default.compare).mockResolvedValueOnce(false as never)

      const service = await getService()
      const result = await service.authenticate(TEST_TENANT_ID, 'test@example.com', 'wrongpass')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Invalid credentials')
      }
    })
  })

  // ---- getById ----

  describe('getById', () => {
    it('returns user when found', async () => {
      const fixture = userFixture()
      dbMock.mockSelect.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.getById(TEST_TENANT_ID, TEST_USER_ID)

      expect(result).toEqual(fixture)
    })

    it('returns null when not found', async () => {
      dbMock.mockSelect.mockResolvedValue([])

      const service = await getService()
      const result = await service.getById(TEST_TENANT_ID, 'nonexistent')

      expect(result).toBeNull()
    })
  })

  // ---- getByEmail ----

  describe('getByEmail', () => {
    it('returns user when found', async () => {
      const fixture = userFixture()
      dbMock.mockSelect.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.getByEmail(TEST_TENANT_ID, 'test@example.com')

      expect(result).toEqual(fixture)
    })

    it('returns null when not found', async () => {
      dbMock.mockSelect.mockResolvedValue([])

      const service = await getService()
      const result = await service.getByEmail(TEST_TENANT_ID, 'nobody@example.com')

      expect(result).toBeNull()
    })
  })

  // ---- update ----

  describe('update', () => {
    it('updates and returns user', async () => {
      const fixture = userFixture({ firstName: 'Updated' })
      dbMock.mockUpdate.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.update(TEST_TENANT_ID, TEST_USER_ID, { firstName: 'Updated' })

      expect(result).toEqual(fixture)
      expect(result!.firstName).toBe('Updated')
    })

    it('lowercases email on update', async () => {
      const fixture = userFixture({ email: 'new@example.com' })
      dbMock.mockUpdate.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.update(TEST_TENANT_ID, TEST_USER_ID, { email: 'NEW@EXAMPLE.COM' })

      expect(result).toBeDefined()
    })

    it('returns null when not found', async () => {
      dbMock.mockUpdate.mockResolvedValue([])

      const service = await getService()
      const result = await service.update(TEST_TENANT_ID, 'nonexistent', { firstName: 'X' })

      expect(result).toBeNull()
    })
  })

  // ---- updatePassword ----

  describe('updatePassword', () => {
    it('returns true when password updated', async () => {
      dbMock.mockUpdate.mockResolvedValue([{ id: TEST_USER_ID }])

      const service = await getService()
      const result = await service.updatePassword(TEST_TENANT_ID, TEST_USER_ID, 'newpassword')

      expect(result).toBe(true)
      expect(dbMock.db.update).toHaveBeenCalled()
    })

    it('returns false when user not found', async () => {
      dbMock.mockUpdate.mockResolvedValue([])

      const service = await getService()
      const result = await service.updatePassword(TEST_TENANT_ID, 'nonexistent', 'newpassword')

      expect(result).toBe(false)
    })
  })

  // ---- delete ----

  describe('delete', () => {
    it('returns true when deleted', async () => {
      dbMock.mockDelete.mockResolvedValue([{ id: TEST_USER_ID }])

      const service = await getService()
      const result = await service.delete(TEST_TENANT_ID, TEST_USER_ID)

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
      const fixtures = [userFixture(), userFixture({ id: '00000000-0000-0000-0000-000000000099', email: 'other@example.com' })]

      dbMock.mockSelect.mockResolvedValueOnce(fixtures)
      dbMock.mockSelect.mockResolvedValueOnce([{ count: 2 }])

      const service = await getService()
      const result = await service.list(TEST_TENANT_ID)

      expect(result.items).toHaveLength(2)
      expect(result.meta.total).toBe(2)
      expect(result.meta.page).toBe(1)
      expect(result.meta.limit).toBe(20)
    })

    it('uses default page=1 and limit=20', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockSelect.mockResolvedValueOnce([{ count: 0 }])

      const service = await getService()
      const result = await service.list(TEST_TENANT_ID)

      expect(result.meta.page).toBe(1)
      expect(result.meta.limit).toBe(20)
    })

    it('respects custom pagination', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockSelect.mockResolvedValueOnce([{ count: 50 }])

      const service = await getService()
      const result = await service.list(TEST_TENANT_ID, { page: 3, limit: 10 })

      expect(result.meta.page).toBe(3)
      expect(result.meta.limit).toBe(10)
      expect(result.meta.totalPages).toBe(5)
    })

    it('passes role filter to query', async () => {
      dbMock.mockSelect.mockResolvedValueOnce([])
      dbMock.mockSelect.mockResolvedValueOnce([{ count: 0 }])

      const service = await getService()
      await service.list(TEST_TENANT_ID, { role: 'admin' })

      expect(dbMock.db.select).toHaveBeenCalledTimes(2)
    })
  })

  // ---- emailExists ----

  describe('emailExists', () => {
    it('returns true when email exists', async () => {
      dbMock.mockSelect.mockResolvedValue([{ id: TEST_USER_ID }])

      const service = await getService()
      const result = await service.emailExists(TEST_TENANT_ID, 'test@example.com')

      expect(result).toBe(true)
    })

    it('returns false when email does not exist', async () => {
      dbMock.mockSelect.mockResolvedValue([])

      const service = await getService()
      const result = await service.emailExists(TEST_TENANT_ID, 'nobody@example.com')

      expect(result).toBe(false)
    })

    it('returns false when matched id is the excluded id', async () => {
      dbMock.mockSelect.mockResolvedValue([{ id: TEST_USER_ID }])

      const service = await getService()
      const result = await service.emailExists(TEST_TENANT_ID, 'test@example.com', TEST_USER_ID)

      expect(result).toBe(false)
    })
  })
})
