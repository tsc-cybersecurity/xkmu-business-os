import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createTestDb, seedTestTenant, cleanupTestTenant, TEST_INTEGRATION_TENANT_A } from './setup/test-db'
import type { TestDb } from './setup/test-db'

const hasTestDb = !!process.env.TEST_DATABASE_URL

describe.skipIf(!hasTestDb)('API Key Scoping — real DB', () => {
  let db: TestDb
  let rawKey: string
  let keyId: string

  beforeAll(async () => {
    db = createTestDb()
    await seedTestTenant(db, TEST_INTEGRATION_TENANT_A)

    // Create a real API key via the service (real bcrypt hashing)
    const { ApiKeyService } = await import('@/lib/services/api-key.service')
    const result = await ApiKeyService.create({
      name: 'Integration Test Key',
      permissions: ['leads:read', 'companies:read'],
    })
    rawKey = result.rawKey
    keyId = result.id
  })

  afterAll(async () => {
    try {
      await cleanupTestTenant(db, TEST_INTEGRATION_TENANT_A)
    } finally {
      // always runs cleanup
    }
  })

  it('created key has rawKey starting with xkmu_', () => {
    expect(rawKey).toMatch(/^xkmu_/)
  })

  it('validateApiKey returns correct payload for the raw key', async () => {
    const { validateApiKey } = await import('@/lib/auth/api-key')
    const payload = await validateApiKey(rawKey)
    expect(payload).not.toBeNull()
    expect(payload!.keyId).toBe(keyId)
  })

  it('validateApiKey returns correct permissions on the payload', async () => {
    const { validateApiKey } = await import('@/lib/auth/api-key')
    const payload = await validateApiKey(rawKey)
    expect(payload!.permissions).toContain('leads:read')
    expect(payload!.permissions).toContain('companies:read')
  })

  it('validateApiKey returns null for a wrong key with same prefix', async () => {
    // Modify chars after the prefix — same prefix, different hash
    const tamperedKey = rawKey.slice(0, 10) + 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
    const { validateApiKey } = await import('@/lib/auth/api-key')
    const payload = await validateApiKey(tamperedKey)
    expect(payload).toBeNull()
  })

  it('hasPermission returns true for included scopes', async () => {
    const { hasPermission, validateApiKey } = await import('@/lib/auth/api-key')
    const payload = await validateApiKey(rawKey)
    expect(payload).not.toBeNull()
    expect(hasPermission(payload!, 'leads:read')).toBe(true)
    expect(hasPermission(payload!, 'companies:read')).toBe(true)
  })

  it('hasPermission returns false for excluded scopes', async () => {
    const { hasPermission, validateApiKey } = await import('@/lib/auth/api-key')
    const payload = await validateApiKey(rawKey)
    expect(payload).not.toBeNull()
    expect(hasPermission(payload!, 'leads:delete')).toBe(false)
    expect(hasPermission(payload!, 'companies:create')).toBe(false)
  })

  it('ApiKeyService.getById returns the key record', async () => {
    const { ApiKeyService } = await import('@/lib/services/api-key.service')
    const found = await ApiKeyService.getById(keyId)
    expect(found).not.toBeNull()
    expect(found!.keyPrefix).toBe(rawKey.substring(0, 10))
  })

  it('ApiKeyService.delete removes the key; subsequent validateApiKey returns null', async () => {
    const { ApiKeyService } = await import('@/lib/services/api-key.service')
    const deleted = await ApiKeyService.delete(keyId)
    expect(deleted).toBe(true)

    const { validateApiKey } = await import('@/lib/auth/api-key')
    const payload = await validateApiKey(rawKey)
    expect(payload).toBeNull()
  })
})
