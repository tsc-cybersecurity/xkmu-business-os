import { NextRequest } from 'next/server'
import { apiSuccess, apiUnauthorized } from '@/lib/utils/api-response'
import { AIService } from '@/lib/services/ai'
import { getSession } from '@/lib/auth/session'
import { validateApiKey, getApiKeyFromRequest } from '@/lib/auth/api-key'

async function getAuthContext(request: NextRequest) {
  const session = await getSession()
  if (session) {
    return { tenantId: session.user.tenantId, userId: session.user.id }
  }
  const apiKey = getApiKeyFromRequest(request)
  if (apiKey) {
    const payload = await validateApiKey(apiKey)
    if (payload) return { tenantId: payload.tenantId, userId: null }
  }
  return null
}

export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request)
  if (!auth) return apiUnauthorized()

  // Tenant-aware Provider-Status
  const dbProviders = await AIService.getAvailableProvidersForTenant(auth.tenantId)

  // Legacy Fallback
  const staticProviders = await AIService.getAvailableProviders()

  return apiSuccess({
    available: dbProviders.some((p) => p.available) || staticProviders.length > 0,
    providers: dbProviders.length > 0 ? dbProviders : staticProviders.map((name) => ({
      id: null,
      name,
      providerType: name,
      model: 'default',
      available: true,
    })),
  })
}
