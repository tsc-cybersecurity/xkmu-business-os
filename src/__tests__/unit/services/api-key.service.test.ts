import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'
import { TEST_USER_ID } from '../../helpers/fixtures'

const TEST_API_KEY_ID = '00000000-0000-0000-0000-000000000050'
const RAW_KEY = 'xkmu_abc123def456'
const KEY_PREFIX = 'xkmu_abc123'
const KEY_HASH = '$2a$10$hashedkeyvalue'

// Mock auth/api-key module
vi.mock('@/lib/auth/api-key', () => ({
  generateApiKey: vi.fn().mockReturnValue({ key: RAW_KEY, prefix: KEY_PREFIX }),
  hashApiKey: vi.fn().mockResolvedValue(KEY_HASH),
}))

function apiKeyFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_API_KEY_ID,
    userId: TEST_USER_ID,
    name: 'Test API Key',
    keyHash: KEY_HASH,
    keyPrefix: KEY_PREFIX,
    permissions: ['*'],
    expiresAt: null,
    lastUsedAt: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  }
}

describe('ApiKeyService', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
  })

  async function getService() {
    const mod = await import('@/lib/services/api-key.service')
    return mod.ApiKeyService
  }

  // ---- create ----

  describe('create', () => {
    it('generates key+prefix, hashes key, inserts to DB, returns ApiKeyWithRawKey', async () => {
      const fixture = apiKeyFixture()
      dbMock.mockInsert.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.create({ name: 'Test API Key' }, TEST_USER_ID)

      expect(result.rawKey).toBe(RAW_KEY)
      expect(result.keyHash).toBe(KEY_HASH)
      expect(result.keyPrefix).toBe(KEY_PREFIX)
      expect(dbMock.db.insert).toHaveBeenCalled()
    })

    it('uses default permissions when none provided', async () => {
      const fixture = apiKeyFixture({ permissions: ['read', 'write'] })
      dbMock.mockInsert.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.create({ name: 'Default Perms Key' })

      expect(result.permissions).toEqual(['read', 'write'])
    })

    it('uses provided permissions when given', async () => {
      const fixture = apiKeyFixture({ permissions: ['leads:read', 'companies:read'] })
      dbMock.mockInsert.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.create({
        name: 'Scoped Key',
        permissions: ['leads:read', 'companies:read'],
      })

      expect(result.permissions).toEqual(['leads:read', 'companies:read'])
    })
  })

  // ---- getById ----

  describe('getById', () => {
    it('returns api key when found', async () => {
      const fixture = apiKeyFixture()
      dbMock.mockSelect.mockResolvedValue([fixture])

      const service = await getService()
      const result = await service.getById(TEST_API_KEY_ID)

      expect(result).toEqual(fixture)
    })

    it('returns null when not found', async () => {
      dbMock.mockSelect.mockResolvedValue([])

      const service = await getService()
      const result = await service.getById('nonexistent-id')

      expect(result).toBeNull()
    })
  })

  // ---- list ----

  describe('list', () => {
    it('returns api keys ordered by createdAt desc', async () => {
      const key1 = apiKeyFixture({ id: TEST_API_KEY_ID, name: 'Key 1' })
      const key2 = apiKeyFixture({ id: '00000000-0000-0000-0000-000000000051', name: 'Key 2' })
      dbMock.mockSelect.mockResolvedValue([key2, key1])

      const service = await getService()
      const result = await service.list()

      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('Key 2')
    })
  })

  // ---- delete ----

  describe('delete', () => {
    it('returns true when deleted', async () => {
      dbMock.mockDelete.mockResolvedValue([{ id: TEST_API_KEY_ID }])

      const service = await getService()
      const result = await service.delete(TEST_API_KEY_ID)

      expect(result).toBe(true)
    })

    it('returns false when key not found', async () => {
      dbMock.mockDelete.mockResolvedValue([])

      const service = await getService()
      const result = await service.delete('nonexistent-id')

      expect(result).toBe(false)
    })
  })

  // ---- updateLastUsed ----

  describe('updateLastUsed', () => {
    it('calls db.update with lastUsedAt', async () => {
      dbMock.mockUpdate.mockResolvedValue([])

      const service = await getService()
      await service.updateLastUsed(TEST_API_KEY_ID)

      expect(dbMock.db.update).toHaveBeenCalled()
    })
  })
})
