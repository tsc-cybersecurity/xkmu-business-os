import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiValidationError,
  apiServerError,
} from '@/lib/utils/api-response'
import { WibaAuditService } from '@/lib/services/wiba-audit.service'
import { withPermission } from '@/lib/auth/require-permission'
import { z } from 'zod'
import { validateAndParse, formatZodErrors } from '@/lib/utils/validation'
import { logger } from '@/lib/utils/logger'

const answerSchema = z.object({
  requirementId: z.number().int().positive(),
  status: z.enum(['ja', 'nein', 'nicht_relevant']),
  notes: z.string().optional(),
})

const bulkAnswerSchema = z.object({
  answers: z.array(answerSchema),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'wiba_audits', 'read', async (auth) => {
    const { id } = await params
    const answers = await WibaAuditService.getAnswers(auth.tenantId, id)
    return apiSuccess(answers)
  })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'wiba_audits', 'update', async (auth) => {
    try {
      const { id } = await params
      const body = await request.json()

      // Support both single answer and bulk
      if (body.answers) {
        const validation = validateAndParse(bulkAnswerSchema, body)
        if (!validation.success) {
          return apiValidationError(formatZodErrors(validation.errors))
        }
        const results = await WibaAuditService.saveBulkAnswers(auth.tenantId, id, validation.data.answers)
        return apiSuccess(results)
      }

      const validation = validateAndParse(answerSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }
      const answer = await WibaAuditService.saveAnswer(auth.tenantId, id, validation.data)
      return apiSuccess(answer)
    } catch (error) {
      logger.error('Error saving WiBA audit answer', error, { module: 'WibaAuditsAnswersAPI' })
      return apiServerError()
    }
  })
}
