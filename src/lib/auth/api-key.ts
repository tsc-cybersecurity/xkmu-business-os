import { db } from '@/lib/db'
import { apiKeys } from '@/lib/db/schema'
import { eq, and, gt, isNull, or } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import type { ApiKeyPayload } from '@/lib/types/auth.types'

const API_KEY_PREFIX = 'xkmu_'
const API_KEY_HEADER = 'x-api-key'

export function generateApiKey(): { key: string; prefix: string } {
  const randomPart = crypto.randomUUID().replace(/-/g, '')
  const key = `${API_KEY_PREFIX}${randomPart}`
  const prefix = key.substring(0, 10)
  return { key, prefix }
}

export async function hashApiKey(key: string): Promise<string> {
  return bcrypt.hash(key, 10)
}

export async function verifyApiKey(key: string, hash: string): Promise<boolean> {
  return bcrypt.compare(key, hash)
}

export async function validateApiKey(key: string): Promise<ApiKeyPayload | null> {
  if (!key.startsWith(API_KEY_PREFIX)) {
    return null
  }

  const prefix = key.substring(0, 10)

  const results = await db
    .select()
    .from(apiKeys)
    .where(
      and(
        eq(apiKeys.keyPrefix, prefix),
        or(
          isNull(apiKeys.expiresAt),
          gt(apiKeys.expiresAt, new Date())
        )
      )
    )
    .limit(10)

  for (const apiKey of results) {
    const isValid = await verifyApiKey(key, apiKey.keyHash)
    if (isValid) {
      // Update last used timestamp
      await db
        .update(apiKeys)
        .set({ lastUsedAt: new Date() })
        .where(eq(apiKeys.id, apiKey.id))

      return {
        keyId: apiKey.id,
        permissions: apiKey.permissions as string[] || ['read', 'write'],
      }
    }
  }

  return null
}

export function getApiKeyFromRequest(request: Request): string | null {
  return request.headers.get(API_KEY_HEADER)
}

export async function requireApiKey(request: Request): Promise<ApiKeyPayload> {
  const key = getApiKeyFromRequest(request)
  if (!key) {
    throw new Error('API key required')
  }

  const payload = await validateApiKey(key)
  if (!payload) {
    throw new Error('Invalid API key')
  }

  return payload
}

export function hasPermission(payload: ApiKeyPayload, permission: string): boolean {
  return payload.permissions.includes(permission) || payload.permissions.includes('*')
}
