import { NextRequest } from 'next/server'
import { z } from 'zod'
import { apiSuccess, apiError, apiServerError } from '@/lib/utils/api-response'
import { withPermission } from '@/lib/auth/require-permission'
import { validateAndParse, formatZodErrors } from '@/lib/utils/validation'
import { MarketingAgentService } from '@/lib/services/ai/marketing-agent.service'
import { logger } from '@/lib/utils/logger'

const analyzeSchema = z.object({
  url: z.string().min(1, 'URL ist erforderlich').max(2000),
  language: z.enum(['de', 'en']).default('de'),
  platforms: z.array(z.enum(['linkedin', 'twitter', 'instagram', 'facebook', 'xing'])).optional(),
  tone: z.enum(['professional', 'casual', 'humorous', 'inspirational']).default('professional'),
  additionalContext: z.string().max(5000).optional(),
})

export async function POST(request: NextRequest) {
  return withPermission(request, 'marketing', 'create', async (auth) => {
    try {
      const body = await request.json()
      const validation = validateAndParse(analyzeSchema, body)

      if (!validation.success) {
        return apiError('VALIDATION_ERROR', 'Validierungsfehler', 400, formatZodErrors(validation.errors))
      }

      const result = await MarketingAgentService.analyze(validation.data, {
        userId: auth.userId,
        feature: 'marketing_agent',
      })

      return apiSuccess(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unbekannter Fehler'
      logger.error('Marketing Agent analysis failed', error, { module: 'MarketingAgentAPI' })

      if (message.includes('gescraped') || message.includes('URL')) {
        return apiError('SCRAPE_FAILED', message, 422)
      }

      return apiServerError()
    }
  })
}
