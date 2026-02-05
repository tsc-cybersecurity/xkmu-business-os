import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiUnauthorized,
  apiNotFound,
  apiError,
} from '@/lib/utils/api-response'
import { AiProviderService } from '@/lib/services/ai-provider.service'
import { getSession } from '@/lib/auth/session'
import { validateApiKey, getApiKeyFromRequest } from '@/lib/auth/api-key'

type Params = Promise<{ id: string }>

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

// GET /api/v1/ai-logs/[id] - Einzelnes Log mit vollem Prompt/Response
export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  const auth = await getAuthContext(request)
  if (!auth) return apiUnauthorized()

  if (auth.role !== 'owner' && auth.role !== 'admin') {
    return apiError('FORBIDDEN', 'Keine Berechtigung', 403)
  }

  const { id } = await params
  const log = await AiProviderService.getLogById(auth.tenantId, id)

  if (!log) {
    return apiNotFound('Log-Eintrag nicht gefunden')
  }

  return apiSuccess(log)
}
