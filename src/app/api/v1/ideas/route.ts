import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiValidationError,
  apiUnauthorized,
  apiServerError,
  parsePaginationParams,
} from '@/lib/utils/api-response'
import {
  createIdeaSchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { IdeaService } from '@/lib/services/idea.service'
import { IdeaAIService } from '@/lib/services/ai/idea-ai.service'
import { getSession } from '@/lib/auth/session'
import { validateApiKey, getApiKeyFromRequest } from '@/lib/auth/api-key'

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

export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request)
  if (!auth) return apiUnauthorized()

  const { searchParams } = new URL(request.url)
  const grouped = searchParams.get('grouped') === 'true'
  const status = searchParams.get('status') || undefined
  const type = searchParams.get('type') || undefined

  if (grouped) {
    const result = await IdeaService.listGroupedByStatus(auth.tenantId)
    return apiSuccess(result)
  }

  const pagination = parsePaginationParams(searchParams)
  const result = await IdeaService.list(auth.tenantId, { ...pagination, status, type })
  return apiSuccess(result.items, result.meta)
}

export async function POST(request: NextRequest) {
  const auth = await getAuthContext(request)
  if (!auth) return apiUnauthorized()

  try {
    const body = await request.json()
    const validation = validateAndParse(createIdeaSchema, body)
    if (!validation.success) {
      return apiValidationError(formatZodErrors(validation.errors))
    }

    const idea = await IdeaService.create(auth.tenantId, validation.data, auth.userId ?? undefined)

    // KI-Verarbeitung asynchron starten
    IdeaAIService.processIdea(idea.rawContent, {
      tenantId: auth.tenantId,
      userId: auth.userId,
      feature: 'idea_processing',
    }).then(async (result) => {
      await IdeaService.update(auth.tenantId, idea.id, {
        structuredContent: { summary: result.summary },
        tags: result.tags,
      })
    }).catch((error) => {
      console.error('[Ideas] KI-Verarbeitung fehlgeschlagen:', error)
    })

    return apiSuccess(idea, undefined, 201)
  } catch (error) {
    console.error('Error creating idea:', error)
    return apiServerError()
  }
}
