import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiUnauthorized,
  apiError,
} from '@/lib/utils/api-response'
import { AiProviderService } from '@/lib/services/ai-provider.service'
import { getSession } from '@/lib/auth/session'
import { validateApiKey, getApiKeyFromRequest } from '@/lib/auth/api-key'

async function getAuthContext(request: NextRequest) {
  const session = await getSession()
  if (session) {
    return { tenantId: session.user.tenantId, userId: session.user.id, role: session.user.role }
  }
  const apiKey = getApiKeyFromRequest(request)
  if (apiKey) {
    const payload = await validateApiKey(apiKey)
    if (payload) return { tenantId: payload.tenantId, userId: null, role: 'admin' }
  }
  return null
}

// GET /api/v1/ai-providers - Alle Provider auflisten
export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request)
  if (!auth) return apiUnauthorized()

  try {
    const providers = await AiProviderService.list(auth.tenantId)

    // API Keys maskieren (nur letzte 4 Zeichen zeigen)
    const safeProviders = providers.map((p) => ({
      ...p,
      apiKey: p.apiKey ? `****${p.apiKey.slice(-4)}` : null,
    }))

    return apiSuccess(safeProviders)
  } catch (error) {
    console.error('Failed to list AI providers:', error)
    return apiError('INTERNAL_ERROR', 'Fehler beim Laden der KI-Anbieter', 500)
  }
}

// POST /api/v1/ai-providers - Neuen Provider erstellen
export async function POST(request: NextRequest) {
  const auth = await getAuthContext(request)
  if (!auth) return apiUnauthorized()

  // Nur Admin/Owner darf Provider konfigurieren
  if (auth.role !== 'owner' && auth.role !== 'admin') {
    return apiError('FORBIDDEN', 'Keine Berechtigung', 403)
  }

  try {
    const body = await request.json()

    // Basis-Validierung
    if (!body.providerType || !body.name || !body.model) {
      return apiError('VALIDATION_ERROR', 'providerType, name und model sind erforderlich', 400)
    }

    const validTypes = ['ollama', 'openrouter', 'gemini', 'openai']
    if (!validTypes.includes(body.providerType)) {
      return apiError('VALIDATION_ERROR', `Ungültiger Provider-Typ. Erlaubt: ${validTypes.join(', ')}`, 400)
    }

    // Cloud-Provider brauchen einen API Key
    if (['openrouter', 'gemini', 'openai'].includes(body.providerType) && !body.apiKey) {
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
    console.error('Failed to create AI provider:', error)
    return apiError('INTERNAL_ERROR', 'Fehler beim Erstellen des KI-Anbieters', 500)
  }
}
