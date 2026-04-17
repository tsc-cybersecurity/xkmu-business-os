import { NextRequest } from 'next/server'
import { apiSuccess,
  apiError,
} from '@/lib/utils/api-response'
import { AiPromptTemplateService } from '@/lib/services/ai-prompt-template.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'
// POST /api/v1/ai-prompt-templates/seed - Standard-Templates erstellen
export async function POST(request: NextRequest) {
  return withPermission(request, 'ai_prompts', 'create', async (auth) => {
  try {
    await AiPromptTemplateService.seedDefaults()
    const templates = await AiPromptTemplateService.list()
    return apiSuccess({ templates, seeded: true })
  } catch (error) {
    logger.error('Failed to seed AI prompt templates', error, { module: 'AiPromptTemplatesSeedAPI' })
    return apiError('INTERNAL_ERROR', 'Fehler beim Erstellen der Standard-Vorlagen', 500)
  }
  })
}
