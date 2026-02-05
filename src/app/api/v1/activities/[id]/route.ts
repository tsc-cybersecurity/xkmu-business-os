import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiUnauthorized,
  apiNotFound,
} from '@/lib/utils/api-response'
import { ActivityService } from '@/lib/services/activity.service'
import { getSession } from '@/lib/auth/session'
import { validateApiKey, getApiKeyFromRequest } from '@/lib/auth/api-key'

type Params = Promise<{ id: string }>

async function getAuthContext(request: NextRequest) {
  const session = await getSession()
  if (session) {
    return {
      tenantId: session.user.tenantId,
      userId: session.user.id,
      role: session.user.role,
    }
  }
  const apiKey = getApiKeyFromRequest(request)
  if (apiKey) {
    const payload = await validateApiKey(apiKey)
    if (payload) {
      return { tenantId: payload.tenantId, userId: null, role: 'api' as const }
    }
  }
  return null
}

export async function GET(request: NextRequest, { params }: { params: Params }) {
  const auth = await getAuthContext(request)
  if (!auth) return apiUnauthorized()

  const { id } = await params
  const activity = await ActivityService.getById(auth.tenantId, id)
  if (!activity) return apiNotFound('Aktivitaet nicht gefunden')

  return apiSuccess(activity)
}

export async function DELETE(request: NextRequest, { params }: { params: Params }) {
  const auth = await getAuthContext(request)
  if (!auth) return apiUnauthorized()

  const { id } = await params
  const deleted = await ActivityService.delete(auth.tenantId, id)
  if (!deleted) return apiNotFound('Aktivitaet nicht gefunden')

  return apiSuccess({ deleted: true })
}
