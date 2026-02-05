import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiUnauthorized,
  apiError,
} from '@/lib/utils/api-response'
import { AiProviderService } from '@/lib/services/ai-provider.service'
import { getSession } from '@/lib/auth/session'
import { validateApiKey, getApiKeyFromRequest } from '@/lib/auth/api-key'

async function getAuthContext(request: NextRequest) {
  const session = await getSession()
  if (session) {
    return { tenantId: session.user.tenantId, userId: session.user.id, role: session.user.role }
  }
  const apiKey = getApiKeyFromRequest(request)
  if (apiKey) {
    const payload = await validateApiKey(apiKey)
    if (payload) return { tenantId: payload.tenantId, userId: null, role: 'admin' }
  }
  return null
}

// GET /api/v1/ai-logs/stats - Aggregierte Statistiken
export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request)
  if (!auth) return apiUnauthorized()

  if (auth.role !== 'owner' && auth.role !== 'admin') {
    return apiError('FORBIDDEN', 'Keine Berechtigung', 403)
  }

  try {
    const stats = await AiProviderService.getLogStats(auth.tenantId)
    return apiSuccess(stats)
  } catch (error) {
    console.error('Failed to get AI log stats:', error)
    return apiError('INTERNAL_ERROR', 'Fehler beim Laden der Statistiken', 500)
  }
}
