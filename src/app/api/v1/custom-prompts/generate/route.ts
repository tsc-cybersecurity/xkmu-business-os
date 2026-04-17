import { NextRequest } from 'next/server'
import { z } from 'zod'
import { apiSuccess, apiError } from '@/lib/utils/api-response'
import { validateAndParse } from '@/lib/utils/validation'
import { CustomAiPromptService } from '@/lib/services/ai/custom-prompt.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

const generateSchema = z.object({
  description: z.string().min(10, 'Beschreibung zu kurz (min. 10 Zeichen)'),
})

// POST /api/v1/custom-prompts/generate — LLM-assist prompt body generation
export async function POST(request: NextRequest) {
  return withPermission(request, 'ai_prompts', 'create', async (auth) => {
    try {
      const body = await request.json()
      const validation = validateAndParse(generateSchema, body)
      if (!validation.success) {
        return apiError('VALIDATION_ERROR', 'Ungültige Eingabe', 400)
      }

      const result = await CustomAiPromptService.generateFromDescription(
        validation.data.description,
        auth.userId
      )
      return apiSuccess(result)
    } catch (error) {
      logger.error('Custom prompt generation error', error, { module: 'CustomPromptsAPI' })
      return apiError(
        'GENERATION_FAILED',
        error instanceof Error ? error.message : 'Prompt-Generierung fehlgeschlagen',
        500
      )
    }
  })
}
