import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { validateApiKey, getApiKeyFromRequest } from '@/lib/auth/api-key'

export interface AuthContext {
  tenantId: string
  userId: string | null
  role: string
  roleId: string | null
}

export async function getAuthContext(
  request: NextRequest
): Promise<AuthContext | null> {
  // Session-Auth pruefen
  const session = await getSession()
  if (session) {
    return {
      tenantId: session.user.tenantId,
      userId: session.user.id,
      role: session.user.role,
      roleId: session.user.roleId ?? null,
    }
  }

  // API-Key-Auth pruefen
  const apiKey = getApiKeyFromRequest(request)
  if (apiKey) {
    const payload = await validateApiKey(apiKey)
    if (payload) {
      return {
        tenantId: payload.tenantId,
        userId: null,
        role: 'api',
        roleId: null,
      }
    }
  }

  return null
}
