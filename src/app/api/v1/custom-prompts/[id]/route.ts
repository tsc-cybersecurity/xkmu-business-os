import { NextRequest } from 'next/server'
import { apiSuccess, apiNotFound, apiError } from '@/lib/utils/api-response'
import { CustomAiPromptService } from '@/lib/services/ai/custom-prompt.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

type Params = Promise<{ id: string }>

// GET /api/v1/custom-prompts/[id]
export async function GET(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'ai_prompts', 'read', async () => {
    const { id } = await params
    try {
      const prompt = await CustomAiPromptService.getById(id)
      if (!prompt) return apiNotFound('Prompt nicht gefunden')
      return apiSuccess(prompt)
    } catch (error) {
      logger.error('Failed to get custom prompt', error, { module: 'CustomPromptsAPI' })
      return apiError('INTERNAL_ERROR', 'Fehler beim Laden des Prompts', 500)
    }
  })
}

// PUT /api/v1/custom-prompts/[id]
export async function PUT(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'ai_prompts', 'update', async () => {
    const { id } = await params
    try {
      const body = await request.json()
      const prompt = await CustomAiPromptService.update(id, {
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
      })
      if (!prompt) return apiNotFound('Prompt nicht gefunden')
      return apiSuccess(prompt)
    } catch (error) {
      logger.error('Failed to update custom prompt', error, { module: 'CustomPromptsAPI' })
      return apiError('INTERNAL_ERROR', 'Fehler beim Aktualisieren des Prompts', 500)
    }
  })
}

// DELETE /api/v1/custom-prompts/[id]
export async function DELETE(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'ai_prompts', 'delete', async () => {
    const { id } = await params
    try {
      const deleted = await CustomAiPromptService.delete(id)
      if (!deleted) return apiNotFound('Prompt nicht gefunden')
      return apiSuccess({ deleted: true })
    } catch (error) {
      logger.error('Failed to delete custom prompt', error, { module: 'CustomPromptsAPI' })
      return apiError('INTERNAL_ERROR', 'Fehler beim Löschen des Prompts', 500)
    }
  })
}
