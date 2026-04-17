import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/lib/utils/api-response'
import { CustomAiPromptService } from '@/lib/services/ai/custom-prompt.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

// GET /api/v1/custom-prompts
export async function GET(request: NextRequest) {
  return withPermission(request, 'ai_prompts', 'read', async () => {
    try {
      const url = new URL(request.url)
      const activeOnly = url.searchParams.get('active') === 'true'
      const prompts = await CustomAiPromptService.list({ activeOnly })
      return apiSuccess({ prompts })
    } catch (error) {
      logger.error('Failed to list custom prompts', error, { module: 'CustomPromptsAPI' })
      return apiError('INTERNAL_ERROR', 'Fehler beim Laden der Custom-Prompts', 500)
    }
  })
}

// POST /api/v1/custom-prompts
export async function POST(request: NextRequest) {
  return withPermission(request, 'ai_prompts', 'create', async (auth) => {
    try {
      const body = await request.json()

      if (!body.name || !body.userPrompt) {
        return apiError('VALIDATION_ERROR', 'name und userPrompt sind erforderlich', 400)
      }

      const prompt = await CustomAiPromptService.create({
        name: body.name,
        description: body.description,
        category: body.category,
        icon: body.icon,
        color: body.color,
        systemPrompt: body.systemPrompt,
        userPrompt: body.userPrompt,
        contextConfig: body.contextConfig,
        activityType: body.activityType,
        isActive: body.isActive,
      }, auth.userId)

      return apiSuccess(prompt, undefined, 201)
    } catch (error) {
      logger.error('Failed to create custom prompt', error, { module: 'CustomPromptsAPI' })
      return apiError('INTERNAL_ERROR', 'Fehler beim Erstellen des Custom-Prompts', 500)
    }
  })
}
