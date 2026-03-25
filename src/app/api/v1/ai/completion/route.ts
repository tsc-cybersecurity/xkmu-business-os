import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/lib/utils/api-response'
import { AIService } from '@/lib/services/ai'
import { withPermission } from '@/lib/auth/require-permission'
import { rateLimit } from '@/lib/utils/rate-limit'
import { logger } from '@/lib/utils/logger'

export async function POST(request: NextRequest) {
  return withPermission(request, 'ai_providers', 'read', async (auth) => {
    try {
      // Rate limit: max 30 AI completions per minute per IP
      const limited = rateLimit(request, 'ai-completion', 30, 60_000)
      if (limited) return limited

      const body = await request.json()
      const { prompt, maxTokens, temperature, model, providerId, systemPrompt } = body

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
        providerId,
        systemPrompt,
      })

      return apiSuccess(response)
    } catch (error) {
      logger.error('AI completion failed', error, { module: 'AICompletionAPI' })
      const message = error instanceof Error ? error.message : 'AI completion failed'
      return apiError('AI_ERROR', message, 500)
    }
  })
}
