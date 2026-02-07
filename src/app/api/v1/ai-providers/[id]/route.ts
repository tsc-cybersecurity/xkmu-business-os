import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiNotFound,
  apiError,
} from '@/lib/utils/api-response'
import { AiProviderService } from '@/lib/services/ai-provider.service'
import { withPermission } from '@/lib/auth/require-permission'

type Params = Promise<{ id: string }>

// GET /api/v1/ai-providers/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  return withPermission(request, 'ai_providers', 'read', async (auth) => {
    const { id } = await params
    const provider = await AiProviderService.getById(auth.tenantId, id)

    if (!provider) {
      return apiNotFound('KI-Anbieter nicht gefunden')
    }

    return apiSuccess({
      ...provider,
      apiKey: provider.apiKey ? `****${provider.apiKey.slice(-4)}` : null,
    })
  })
}

// PUT /api/v1/ai-providers/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Params }
) {
  return withPermission(request, 'ai_providers', 'update', async (auth) => {
    const { id } = await params

    try {
      const body = await request.json()

      // Wenn apiKey als "****..." gesendet wird, nicht aktualisieren
      const updateData: Record<string, unknown> = {}
      if (body.providerType !== undefined) updateData.providerType = body.providerType
      if (body.name !== undefined) updateData.name = body.name
      if (body.apiKey !== undefined && !body.apiKey?.startsWith('****')) {
        updateData.apiKey = body.apiKey
      }
      if (body.baseUrl !== undefined) updateData.baseUrl = body.baseUrl
      if (body.model !== undefined) updateData.model = body.model
      if (body.maxTokens !== undefined) updateData.maxTokens = body.maxTokens
      if (body.temperature !== undefined) updateData.temperature = body.temperature
      if (body.priority !== undefined) updateData.priority = body.priority
      if (body.isActive !== undefined) updateData.isActive = body.isActive
      if (body.isDefault !== undefined) updateData.isDefault = body.isDefault

      const provider = await AiProviderService.update(auth.tenantId, id, updateData)

      if (!provider) {
        return apiNotFound('KI-Anbieter nicht gefunden')
      }

      return apiSuccess({
        ...provider,
        apiKey: provider.apiKey ? `****${provider.apiKey.slice(-4)}` : null,
      })
    } catch (error) {
      console.error('Failed to update AI provider:', error)
      return apiError('INTERNAL_ERROR', 'Fehler beim Aktualisieren des KI-Anbieters', 500)
    }
  })
}

// DELETE /api/v1/ai-providers/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Params }
) {
  return withPermission(request, 'ai_providers', 'delete', async (auth) => {
    const { id } = await params
    const deleted = await AiProviderService.delete(auth.tenantId, id)

    if (!deleted) {
      return apiNotFound('KI-Anbieter nicht gefunden')
    }

    return apiSuccess({ message: 'KI-Anbieter erfolgreich gelöscht' })
  })
}
