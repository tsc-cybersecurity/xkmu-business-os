import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiValidationError,
  apiError,
  apiServerError,
} from '@/lib/utils/api-response'
import {
  generateMarketingContentSchema,
  validateAndParse,
  formatZodErrors,
} from '@/lib/utils/validation'
import { MarketingAIService } from '@/lib/services/ai/marketing-ai.service'
import { withPermission } from '@/lib/auth/require-permission'

export async function POST(request: NextRequest) {
  return withPermission(request, 'marketing', 'create', async (auth) => {
    try {
      const body = await request.json()
      const validation = validateAndParse(generateMarketingContentSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }

      const { type, tone, language, context } = validation.data

      const result = await MarketingAIService.generateContent(
        {
          type,
          recipientName: body.recipientName,
          recipientCompany: body.recipientCompany,
          tone,
          language,
          context,
        },
        {
          tenantId: auth.tenantId,
          userId: auth.userId,
          feature: 'marketing',
          entityType: 'marketing_task',
        }
      )

      return apiSuccess(result)
    } catch (error) {
      console.error('Error generating marketing content:', error)
      if (error instanceof Error) {
        return apiError('GENERATION_FAILED', error.message, 500)
      }
      return apiServerError()
    }
  })
}
