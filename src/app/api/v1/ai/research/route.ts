import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/lib/utils/api-response'
import { AIService } from '@/lib/services/ai'
import { withPermission } from '@/lib/auth/require-permission'

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
      console.error('AI research error:', error)
      const message = error instanceof Error ? error.message : 'AI research failed'
      return apiError('AI_ERROR', message, 500)
    }
  })
}
