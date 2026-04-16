import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { validateApiKey, getApiKeyFromRequest } from '@/lib/auth/api-key'
import { TENANT_ID } from '@/lib/constants/tenant'

export interface AuthContext {
  tenantId: string
  userId: string | null
  role: string
  roleId: string | null
  apiKeyPermissions: string[] | null
}

export async function getAuthContext(
  request: NextRequest
): Promise<AuthContext | null> {
  // Session-Auth pruefen
  const session = await getSession()
  if (session) {
    return {
      tenantId: TENANT_ID,              // AUTH-03: statische Konstante, nicht aus JWT
      userId: session.user.id,
      role: session.user.role,
      roleId: session.user.roleId ?? null,
      apiKeyPermissions: null,
    }
  }

  // API-Key-Auth pruefen
  const apiKey = getApiKeyFromRequest(request)
  if (apiKey) {
    const payload = await validateApiKey(apiKey)
    if (payload) {
      return {
        tenantId: TENANT_ID,            // AUTH-04: payload.tenantId ignoriert, TENANT_ID stattdessen
        userId: null,
        role: 'api',
        roleId: null,
        apiKeyPermissions: payload.permissions,
      }
    }
  }

  return null
}
