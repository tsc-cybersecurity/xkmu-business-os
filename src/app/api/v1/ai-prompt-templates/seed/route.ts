import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiUnauthorized,
  apiError,
} from '@/lib/utils/api-response'
import { AiPromptTemplateService } from '@/lib/services/ai-prompt-template.service'
import { getSession } from '@/lib/auth/session'
import { validateApiKey, getApiKeyFromRequest } from '@/lib/auth/api-key'
import { logger } from '@/lib/utils/logger'

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

// POST /api/v1/ai-prompt-templates/seed - Standard-Templates erstellen
export async function POST(request: NextRequest) {
  const auth = await getAuthContext(request)
  if (!auth) return apiUnauthorized()

  if (auth.role !== 'owner' && auth.role !== 'admin') {
    return apiError('FORBIDDEN', 'Keine Berechtigung', 403)
  }

  try {
    await AiPromptTemplateService.seedDefaults(auth.tenantId)
    const templates = await AiPromptTemplateService.list(auth.tenantId)
    return apiSuccess({ templates, seeded: true })
  } catch (error) {
    logger.error('Failed to seed AI prompt templates', error, { module: 'AiPromptTemplatesSeedAPI' })
    return apiError('INTERNAL_ERROR', 'Fehler beim Erstellen der Standard-Vorlagen', 500)
  }
}
