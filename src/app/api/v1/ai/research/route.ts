import { NextRequest } from 'next/server'
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/utils/api-response'
import { getSession } from '@/lib/auth/session'
import { validateApiKey, getApiKeyFromRequest } from '@/lib/auth/api-key'
import { AIService } from '@/lib/services/ai'

async function getAuthContext(request: NextRequest) {
  const session = await getSession()
  if (session) {
    return { tenantId: session.user.tenantId }
  }

  const apiKey = getApiKeyFromRequest(request)
  if (apiKey) {
    const payload = await validateApiKey(apiKey)
    if (payload) {
      return { tenantId: payload.tenantId }
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
    const { companyName } = body

    if (!companyName || typeof companyName !== 'string') {
      return apiError('INVALID_COMPANY_NAME', 'Company name is required', 400)
    }

    const result = await AIService.research(companyName)

    return apiSuccess(result)
  } catch (error) {
    console.error('AI research error:', error)
    const message = error instanceof Error ? error.message : 'AI research failed'
    return apiError('AI_ERROR', message, 500)
  }
}
