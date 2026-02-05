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

// GET /api/v1/ai-logs - Logs mit Filtern auflisten
export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request)
  if (!auth) return apiUnauthorized()

  // Nur Admin/Owner darf Logs sehen
  if (auth.role !== 'owner' && auth.role !== 'admin') {
    return apiError('FORBIDDEN', 'Keine Berechtigung', 403)
  }

  try {
    const { searchParams } = new URL(request.url)

    const result = await AiProviderService.listLogs(auth.tenantId, {
      providerType: searchParams.get('providerType') || undefined,
      status: searchParams.get('status') || undefined,
      feature: searchParams.get('feature') || undefined,
      search: searchParams.get('search') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      page: parseInt(searchParams.get('page') || '1', 10),
      limit: Math.min(parseInt(searchParams.get('limit') || '50', 10), 100),
    })

    return apiSuccess(result.items, result.meta)
  } catch (error) {
    console.error('Failed to list AI logs:', error)
    return apiError('INTERNAL_ERROR', 'Fehler beim Laden der KI-Logs', 500)
  }
}
