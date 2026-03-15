import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/lib/utils/api-response'
import { AIService } from '@/lib/services/ai'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

export async function POST(request: NextRequest) {
  return withPermission(request, 'ai_providers', 'read', async (auth) => {
    try {
      const body = await request.json()
      const { companyName } = body

      if (!companyName || typeof companyName !== 'string') {
        return apiError('INVALID_COMPANY_NAME', 'Company name is required', 400)
      }

      const result = await AIService.research(companyName)

      return apiSuccess(result)
    } catch (error) {
      logger.error('AI research failed', error, { module: 'AIResearchAPI' })
      const message = error instanceof Error ? error.message : 'AI research failed'
      return apiError('AI_ERROR', message, 500)
    }
  })
}
