import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiUnauthorized,
  apiError,
} from '@/lib/utils/api-response'
import { AiPromptTemplateService, TEMPLATE_PLACEHOLDERS } from '@/lib/services/ai-prompt-template.service'
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

// GET /api/v1/ai-prompt-templates - Alle Templates auflisten
export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request)
  if (!auth) return apiUnauthorized()

  try {
    const templates = await AiPromptTemplateService.list(auth.tenantId)
    return apiSuccess({
      templates,
      placeholders: TEMPLATE_PLACEHOLDERS,
    })
  } catch (error) {
    console.error('Failed to list AI prompt templates:', error)
    return apiError('INTERNAL_ERROR', 'Fehler beim Laden der KI-Prompt-Vorlagen', 500)
  }
}

// POST /api/v1/ai-prompt-templates - Neues Template erstellen
export async function POST(request: NextRequest) {
  const auth = await getAuthContext(request)
  if (!auth) return apiUnauthorized()

  if (auth.role !== 'owner' && auth.role !== 'admin') {
    return apiError('FORBIDDEN', 'Keine Berechtigung', 403)
  }

  try {
    const body = await request.json()

    if (!body.slug || !body.name || !body.systemPrompt || !body.userPrompt) {
      return apiError('VALIDATION_ERROR', 'slug, name, systemPrompt und userPrompt sind erforderlich', 400)
    }

    const template = await AiPromptTemplateService.create(auth.tenantId, {
      slug: body.slug,
      name: body.name,
      description: body.description || null,
      systemPrompt: body.systemPrompt,
      userPrompt: body.userPrompt,
      outputFormat: body.outputFormat || null,
      isActive: body.isActive ?? true,
      isDefault: body.isDefault ?? false,
    })

    return apiSuccess(template, undefined, 201)
  } catch (error) {
    console.error('Failed to create AI prompt template:', error)
    return apiError('INTERNAL_ERROR', 'Fehler beim Erstellen der KI-Prompt-Vorlage', 500)
  }
}
