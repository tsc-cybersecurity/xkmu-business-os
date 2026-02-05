import { NextRequest } from 'next/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/utils/api-response'
import { getSession } from '@/lib/auth/session'
import { validateApiKey, getApiKeyFromRequest } from '@/lib/auth/api-key'
import { AIService } from '@/lib/services/ai'

async function getAuthContext(request: NextRequest) {
  const session = await getSession()
  if (session) {
    return { tenantId: session.user.tenantId, userId: session.user.id }
  }

  const apiKey = getApiKeyFromRequest(request)
  if (apiKey) {
    const payload = await validateApiKey(apiKey)
    if (payload) {
      return { tenantId: payload.tenantId, userId: null }
    }
  }

  return null
}

export async function POST(request: NextRequest) {
  const auth = await getAuthContext(request)
  if (!auth) {
    return apiUnauthorized()
  }

  try {
    const body = await request.json()
    const { prompt, maxTokens, temperature, model } = body

    if (!prompt || typeof prompt !== 'string') {
      return apiError('INVALID_PROMPT', 'Prompt is required and must be a string', 400)
    }

    // Nutze DB-basierte Provider mit Logging
    const response = await AIService.completeWithContext(prompt, {
      tenantId: auth.tenantId,
      userId: auth.userId,
      feature: 'completion',
    }, {
      maxTokens,
      temperature,
      model,
    })

    return apiSuccess(response)
  } catch (error) {
    console.error('AI completion error:', error)
    const message = error instanceof Error ? error.message : 'AI completion failed'
    return apiError('AI_ERROR', message, 500)
  }
}
