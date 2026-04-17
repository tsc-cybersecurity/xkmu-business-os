import { NextRequest } from 'next/server'
import { apiSuccess,
  apiNotFound,
  apiError,
} from '@/lib/utils/api-response'
import { AiPromptTemplateService } from '@/lib/services/ai-prompt-template.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'
type Params = Promise<{ id: string }>

// GET /api/v1/ai-prompt-templates/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  return withPermission(request, 'ai_prompts', 'read', async (auth) => {
    const { id } = await params

    try {
      const template = await AiPromptTemplateService.getById(id)
      if (!template) {
        return apiNotFound('Prompt-Vorlage nicht gefunden')
      }
      return apiSuccess(template)
    } catch (error) {
      logger.error('Failed to get AI prompt template', error, { module: 'AiPromptTemplatesAPI' })
      return apiError('INTERNAL_ERROR', 'Fehler beim Laden der KI-Prompt-Vorlage', 500)
    }
  })
}

// PUT /api/v1/ai-prompt-templates/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Params }
) {
  return withPermission(request, 'ai_prompts', 'update', async (auth) => {
    const { id } = await params

    try {
      const body = await request.json()

      const template = await AiPromptTemplateService.update(id, {
        name: body.name,
        description: body.description,
        systemPrompt: body.systemPrompt,
        userPrompt: body.userPrompt,
        outputFormat: body.outputFormat,
        isActive: body.isActive,
      })

      if (!template) {
        return apiNotFound('Prompt-Vorlage nicht gefunden')
      }

      return apiSuccess(template)
    } catch (error) {
      logger.error('Failed to update AI prompt template', error, { module: 'AiPromptTemplatesAPI' })
      return apiError('INTERNAL_ERROR', 'Fehler beim Aktualisieren der KI-Prompt-Vorlage', 500)
    }
  })
}

// PATCH /api/v1/ai-prompt-templates/[id] - Auf Standard zurücksetzen
export async function PATCH(
  request: NextRequest,
  { params }: { params: Params }
) {
  return withPermission(request, 'ai_prompts', 'update', async (auth) => {
    const { id } = await params

    try {
      const template = await AiPromptTemplateService.resetToDefault(id)
      if (!template) {
        return apiError('RESET_FAILED', 'Vorlage konnte nicht zurückgesetzt werden. Kein Standard vorhanden.', 400)
      }
      return apiSuccess(template)
    } catch (error) {
      logger.error('Failed to reset AI prompt template', error, { module: 'AiPromptTemplatesAPI' })
      return apiError('INTERNAL_ERROR', 'Fehler beim Zurücksetzen der KI-Prompt-Vorlage', 500)
    }
  })
}

// DELETE /api/v1/ai-prompt-templates/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Params }
) {
  return withPermission(request, 'ai_prompts', 'delete', async (auth) => {
    const { id } = await params

    try {
      const deleted = await AiPromptTemplateService.delete(id)
      if (!deleted) {
        return apiError('DELETE_FAILED', 'Vorlage konnte nicht gelöscht werden. Standard-Vorlagen können nicht gelöscht werden.', 400)
      }
      return apiSuccess({ deleted: true })
    } catch (error) {
      logger.error('Failed to delete AI prompt template', error, { module: 'AiPromptTemplatesAPI' })
      return apiError('INTERNAL_ERROR', 'Fehler beim Löschen der KI-Prompt-Vorlage', 500)
    }
  })
}
