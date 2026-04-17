import { NextRequest } from 'next/server'
import { z } from 'zod'
import { apiSuccess, apiError } from '@/lib/utils/api-response'
import { validateAndParse } from '@/lib/utils/validation'
import { CustomAiPromptService } from '@/lib/services/ai/custom-prompt.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

type Params = Promise<{ id: string }>

const executeSchema = z.object({
  companyId: z.string().uuid().optional(),
})

// POST /api/v1/custom-prompts/[id]/execute
export async function POST(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'ai_prompts', 'read', async (auth) => {
    const { id } = await params
    try {
      const body = await request.json().catch(() => ({}))
      const validation = validateAndParse(executeSchema, body)
      if (!validation.success) {
        return apiError('VALIDATION_ERROR', 'Ungültige Eingabe', 400)
      }

      const result = await CustomAiPromptService.execute({
        promptId: id,
        companyId: validation.data.companyId,
        userId: auth.userId,
      })

      return apiSuccess(result)
    } catch (error) {
      logger.error('Custom prompt execution error', error, { module: 'CustomPromptsAPI' })
      return apiError(
        'EXECUTION_FAILED',
        error instanceof Error ? error.message : 'Prompt-Ausführung fehlgeschlagen',
        500
      )
    }
  })
}
