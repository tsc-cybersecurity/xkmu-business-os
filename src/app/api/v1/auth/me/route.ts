import { NextRequest } from 'next/server'
import { apiSuccess, apiUnauthorized } from '@/lib/utils/api-response'
import { getSession } from '@/lib/auth/session'
import { getApiKeyFromRequest, validateApiKey } from '@/lib/auth/api-key'

/**
 * Liefert Informationen ueber die aktuelle Authentifizierung.
 *
 * Akzeptiert sowohl Session-Cookies als auch x-api-key-Header.
 * - Bei Session-Auth: { auth: 'session', user: {...} }
 * - Bei API-Key-Auth: { auth: 'api-key', apiKey: { id, permissions } } (kein user)
 *
 * 401 nur, wenn weder gueltige Session noch gueltiger API-Key vorhanden ist.
 */
export async function GET(request: NextRequest) {
  const session = await getSession()
  if (session) {
    return apiSuccess({
      auth: 'session' as const,
      user: session.user,
    })
  }

  const key = getApiKeyFromRequest(request)
  if (key) {
    const payload = await validateApiKey(key)
    if (payload) {
      return apiSuccess({
        auth: 'api-key' as const,
        apiKey: {
          id: payload.keyId,
          permissions: payload.permissions,
        },
      })
    }
  }

  return apiUnauthorized()
}
