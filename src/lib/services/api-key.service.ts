import { db } from '@/lib/db'
import { apiKeys } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { TENANT_ID } from '@/lib/constants/tenant'
import { generateApiKey, hashApiKey } from '@/lib/auth/api-key'
import type { InferSelectModel } from 'drizzle-orm'

export type ApiKey = InferSelectModel<typeof apiKeys>

export interface CreateApiKeyInput {
  name: string
  permissions?: string[]
  expiresAt?: Date | null
}

export interface ApiKeyWithRawKey extends ApiKey {
  rawKey: string
}

export const ApiKeyService = {
  async create(
    _tenantId: string,
    data: CreateApiKeyInput,
    userId?: string
  ): Promise<ApiKeyWithRawKey> {
    const { key, prefix } = generateApiKey()
    const keyHash = await hashApiKey(key)

    const [apiKey] = await db
      .insert(apiKeys)
      .values({
        userId,
        name: data.name,
        keyHash,
        keyPrefix: prefix,
        permissions: data.permissions || ['read', 'write'],
        expiresAt: data.expiresAt || null,
      })
      .returning()

    return {
      ...apiKey,
      rawKey: key,
    }
  },

  async getById(_tenantId: string, keyId: string): Promise<ApiKey | null> {
    const [apiKey] = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.id, keyId))
      .limit(1)

    return apiKey ?? null
  },

  async list(_tenantId: string): Promise<ApiKey[]> {
    const items = await db
      .select()
      .from(apiKeys)
      .orderBy(desc(apiKeys.createdAt))

    return items
  },

  async delete(_tenantId: string, keyId: string): Promise<boolean> {
    const result = await db
      .delete(apiKeys)
      .where(eq(apiKeys.id, keyId))
      .returning({ id: apiKeys.id })

    return result.length > 0
  },

  async updateLastUsed(keyId: string): Promise<void> {
    await db
      .update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, keyId))
  },
}
