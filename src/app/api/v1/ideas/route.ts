import { NextRequest } from 'next/server'
import { apiSuccess,
  apiValidationError,
  apiServerError,
  parsePaginationParams,
} from '@/lib/utils/api-response'
import { createIdeaSchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { IdeaService } from '@/lib/services/idea.service'
import { IdeaAIService } from '@/lib/services/ai/idea-ai.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'
export async function GET(request: NextRequest) {
  return withPermission(request, 'ideas', 'read', async (auth) => {
    const { searchParams } = new URL(request.url)
    const grouped = searchParams.get('grouped') === 'true'
    const status = searchParams.get('status') || undefined
    const type = searchParams.get('type') || undefined

    if (grouped) {
      const result = await IdeaService.listGroupedByStatus()
      return apiSuccess(result)
    }

    const pagination = parsePaginationParams(searchParams)
    const result = await IdeaService.list({ ...pagination, status, type })
    return apiSuccess(result.items, result.meta)
  })
}

export async function POST(request: NextRequest) {
  return withPermission(request, 'ideas', 'create', async (auth) => {
    try {
      const body = await request.json()
      const validation = validateAndParse(createIdeaSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }

      const idea = await IdeaService.create(validation.data, auth.userId ?? undefined)

      // KI-Verarbeitung asynchron starten
      IdeaAIService.processIdea(idea.rawContent, {
        userId: auth.userId,
        feature: 'idea_processing',
      }).then(async (result) => {
        await IdeaService.update(idea.id, {
          structuredContent: { summary: result.summary },
          tags: result.tags,
        })
      }).catch((error) => {
        logger.error('KI-Verarbeitung fehlgeschlagen', error, { module: 'IdeasAPI' })
      })

      return apiSuccess(idea, undefined, 201)
    } catch (error) {
      logger.error('Error creating idea', error, { module: 'IdeasAPI' })
      return apiServerError()
    }
  })
}
