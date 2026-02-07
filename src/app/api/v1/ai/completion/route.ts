import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/lib/utils/api-response'
import { AIService } from '@/lib/services/ai'
import { withPermission } from '@/lib/auth/require-permission'

export async function POST(request: NextRequest) {
  return withPermission(request, 'ai_providers', 'read', async (auth) => {
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
  })
}
