import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiError,
} from '@/lib/utils/api-response'
import { AiProviderService } from '@/lib/services/ai-provider.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

// GET /api/v1/ai-providers - Alle Provider auflisten
export async function GET(request: NextRequest) {
  return withPermission(request, 'ai_providers', 'read', async (auth) => {
    try {
      const providers = await AiProviderService.list(auth.tenantId)

      // API Keys maskieren (nur letzte 4 Zeichen zeigen)
      const safeProviders = providers.map((p) => ({
        ...p,
        apiKey: p.apiKey ? `****${p.apiKey.slice(-4)}` : null,
      }))

      return apiSuccess(safeProviders)
    } catch (error) {
      logger.error('Failed to list AI providers', error, { module: 'AiProvidersAPI' })
      return apiError('INTERNAL_ERROR', 'Fehler beim Laden der KI-Anbieter', 500)
    }
  })
}

// POST /api/v1/ai-providers - Neuen Provider erstellen
export async function POST(request: NextRequest) {
  return withPermission(request, 'ai_providers', 'create', async (auth) => {
    try {
      const body = await request.json()

      // Basis-Validierung
      if (!body.providerType || !body.name) {
        return apiError('VALIDATION_ERROR', 'providerType und name sind erforderlich', 400)
      }

      // Firecrawl, kie und serpapi brauchen kein Model
      if (!['firecrawl', 'kie', 'serpapi'].includes(body.providerType) && !body.model) {
        return apiError('VALIDATION_ERROR', 'model ist für diesen Anbieter erforderlich', 400)
      }

      const validTypes = ['ollama', 'openrouter', 'gemini', 'openai', 'deepseek', 'kimi', 'firecrawl', 'kie', 'serpapi']
      if (!validTypes.includes(body.providerType)) {
        return apiError('VALIDATION_ERROR', `Ungültiger Provider-Typ. Erlaubt: ${validTypes.join(', ')}`, 400)
      }

      // Cloud-Provider brauchen einen API Key
      if (['openrouter', 'gemini', 'openai', 'deepseek', 'kimi', 'firecrawl', 'kie', 'serpapi'].includes(body.providerType) && !body.apiKey) {
        return apiError('VALIDATION_ERROR', 'API-Schlüssel ist für diesen Anbieter erforderlich', 400)
      }

      const provider = await AiProviderService.create(auth.tenantId, {
        providerType: body.providerType,
        name: body.name,
        apiKey: body.apiKey || null,
        baseUrl: body.baseUrl || null,
        model: body.model,
        maxTokens: body.maxTokens || 1000,
        temperature: body.temperature ?? 0.7,
        priority: body.priority ?? 0,
        isActive: body.isActive ?? true,
        isDefault: body.isDefault ?? false,
      })

      return apiSuccess({
        ...provider,
        apiKey: provider.apiKey ? `****${provider.apiKey.slice(-4)}` : null,
      }, undefined, 201)
    } catch (error) {
      logger.error('Failed to create AI provider', error, { module: 'AiProvidersAPI' })
      return apiError('INTERNAL_ERROR', 'Fehler beim Erstellen des KI-Anbieters', 500)
    }
  })
}
