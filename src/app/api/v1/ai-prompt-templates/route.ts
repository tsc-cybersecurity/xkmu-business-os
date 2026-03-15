import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiError,
} from '@/lib/utils/api-response'
import { AiPromptTemplateService, TEMPLATE_PLACEHOLDERS } from '@/lib/services/ai-prompt-template.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

// GET /api/v1/ai-prompt-templates - Alle Templates auflisten
export async function GET(request: NextRequest) {
  return withPermission(request, 'ai_prompts', 'read', async (auth) => {
    try {
      const templates = await AiPromptTemplateService.list(auth.tenantId)
      return apiSuccess({
        templates,
        placeholders: TEMPLATE_PLACEHOLDERS,
      })
    } catch (error) {
      logger.error('Failed to list AI prompt templates', error, { module: 'AiPromptTemplatesAPI' })
      return apiError('INTERNAL_ERROR', 'Fehler beim Laden der KI-Prompt-Vorlagen', 500)
    }
  })
}

// POST /api/v1/ai-prompt-templates - Neues Template erstellen
export async function POST(request: NextRequest) {
  return withPermission(request, 'ai_prompts', 'create', async (auth) => {
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
      logger.error('Failed to create AI prompt template', error, { module: 'AiPromptTemplatesAPI' })
      return apiError('INTERNAL_ERROR', 'Fehler beim Erstellen der KI-Prompt-Vorlage', 500)
    }
  })
}
