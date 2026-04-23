import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupDbMock } from '../../helpers/mock-db'

const TEST_KEY_ID = '00000000-0000-0000-0000-000000000060'

// Mock bcryptjs
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('$2a$10$mockhashedvalue'),
    compare: vi.fn().mockResolvedValue(true),
  },
}))

function apiKeyRowFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_KEY_ID,
    userId: null,
    name: 'Test Key',
    keyHash: '$2a$10$mockhashedvalue',
    keyPrefix: 'xkmu_abcde',
    permissions: ['*'],
    expiresAt: null,
    lastUsedAt: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  }
}

describe('auth/api-key module', () => {
  let dbMock: ReturnType<typeof setupDbMock>

  beforeEach(() => {
    vi.resetModules()
    dbMock = setupDbMock()
  })

  async function getModule() {
    return import('@/lib/auth/api-key')
  }

  // ---- generateApiKey ----

  describe('generateApiKey', () => {
    it('returns key starting with xkmu_', async () => {
      const mod = await getModule()
      const { key } = mod.generateApiKey()
      expect(key).toMatch(/^xkmu_/)
    })

    it('returns prefix of length 10', async () => {
      const mod = await getModule()
      const { prefix } = mod.generateApiKey()
      expect(prefix).toHaveLength(10)
    })

    it('returns unique keys on repeated calls', async () => {
      const mod = await getModule()
      const { key: key1 } = mod.generateApiKey()
      const { key: key2 } = mod.generateApiKey()
      expect(key1).not.toBe(key2)
    })
  })

  // ---- hashApiKey / verifyApiKey ----

  describe('hashApiKey', () => {
    it('returns a bcrypt hash string', async () => {
      const mod = await getModule()
      const hash = await mod.hashApiKey('xkmu_testkey')
      expect(hash).toBe('$2a$10$mockhashedvalue')
    })
  })

  describe('verifyApiKey', () => {
    it('returns true for matching key+hash', async () => {
      const mod = await getModule()
      const result = await mod.verifyApiKey('xkmu_testkey', '$2a$10$mockhashedvalue')
      expect(result).toBe(true)
    })

    it('returns false for wrong key', async () => {
      const bcrypt = await import('bcryptjs')
      vi.mocked(bcrypt.default.compare).mockResolvedValueOnce(false as unknown as void)

      const mod = await getModule()
      const result = await mod.verifyApiKey('xkmu_wrongkey', '$2a$10$mockhashedvalue')
      expect(result).toBe(false)
    })
  })

  // ---- validateApiKey ----

  describe('validateApiKey', () => {
    it('returns null when key does not start with xkmu_', async () => {
      const mod = await getModule()
      const result = await mod.validateApiKey('invalid_key_format')
      expect(result).toBeNull()
    })

    it('returns null when prefix not found in DB', async () => {
      dbMock.mockSelect.mockResolvedValue([])

      const mod = await getModule()
      const result = await mod.validateApiKey('xkmu_notfoundkey0')
      expect(result).toBeNull()
    })

    it('returns null when bcrypt compare fails (wrong key)', async () => {
      const bcrypt = await import('bcryptjs')
      vi.mocked(bcrypt.default.compare).mockResolvedValueOnce(false as unknown as void)

      const row = apiKeyRowFixture()
      dbMock.mockSelect.mockResolvedValue([row])

      const mod = await getModule()
      const result = await mod.validateApiKey('xkmu_wrongkeyyyy')
      expect(result).toBeNull()
    })

    it('returns ApiKeyPayload with permissions when key is valid', async () => {
      const row = apiKeyRowFixture({ permissions: ['*'] })
      dbMock.mockSelect.mockResolvedValue([row])
      dbMock.mockUpdate.mockResolvedValue([])

      const mod = await getModule()
      const result = await mod.validateApiKey('xkmu_abcde12345')

      expect(result).not.toBeNull()
      expect(result?.keyId).toBe(TEST_KEY_ID)
      expect(result?.permissions).toEqual(['*'])
    })

    it('updates lastUsedAt after successful validation', async () => {
      const row = apiKeyRowFixture()
      dbMock.mockSelect.mockResolvedValue([row])
      dbMock.mockUpdate.mockResolvedValue([])

      const mod = await getModule()
      await mod.validateApiKey('xkmu_abcde12345')

      expect(dbMock.db.update).toHaveBeenCalled()
    })
  })

  // ---- getApiKeyFromRequest ----

  describe('getApiKeyFromRequest', () => {
    it('returns null when header missing', async () => {
      const mod = await getModule()
      const req = new Request('http://localhost/api/v1/test')
      const result = mod.getApiKeyFromRequest(req)
      expect(result).toBeNull()
    })

    it('returns the key when header present', async () => {
      const mod = await getModule()
      const req = new Request('http://localhost/api/v1/test', {
        headers: { 'x-api-key': 'xkmu_testkey12345' },
      })
      const result = mod.getApiKeyFromRequest(req)
      expect(result).toBe('xkmu_testkey12345')
    })
  })

  // ---- hasPermission ----

  describe('hasPermission', () => {
    it('returns true for wildcard permission', async () => {
      const mod = await getModule()
      const payload = { keyId: TEST_KEY_ID, permissions: ['*'] }
      expect(mod.hasPermission(payload, 'leads:read')).toBe(true)
    })

    it('returns true for exact permission match', async () => {
      const mod = await getModule()
      const payload = { keyId: TEST_KEY_ID, permissions: ['leads:read', 'companies:read'] }
      expect(mod.hasPermission(payload, 'leads:read')).toBe(true)
    })

    it('returns false when permission not in list', async () => {
      const mod = await getModule()
      const payload = { keyId: TEST_KEY_ID, permissions: ['leads:read'] }
      expect(mod.hasPermission(payload, 'companies:write')).toBe(false)
    })
  })
})
