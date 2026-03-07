import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiValidationError,
  apiServerError,
} from '@/lib/utils/api-response'
import { WibaService } from '@/lib/services/wiba.service'
import { withPermission } from '@/lib/auth/require-permission'
import { z } from 'zod'
import { validateAndParse, formatZodErrors } from '@/lib/utils/validation'

const answerSchema = z.object({
  prueffrageId: z.number().int().positive(),
  answer: z.enum(['ja', 'nein', 'nicht_relevant']),
  notizen: z.string().max(2000).optional(),
})

const saveAnswersSchema = z.union([
  answerSchema,
  z.object({ answers: z.array(answerSchema) }),
])

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'basisabsicherung', 'read', async (auth) => {
    try {
      const { id } = await params
      const { searchParams } = new URL(request.url)
      const checklistId = searchParams.get('checklistId')

      let answers
      if (checklistId) {
        answers = await WibaService.getAnswersByChecklist(auth.tenantId, id, parseInt(checklistId, 10))
      } else {
        answers = await WibaService.getAnswers(auth.tenantId, id)
      }

      return apiSuccess(answers)
    } catch (error) {
      console.error('Error getting WiBA answers:', error)
      return apiServerError()
    }
  })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'basisabsicherung', 'update', async (auth) => {
    try {
      const { id } = await params
      const body = await request.json()
      const validation = validateAndParse(saveAnswersSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }

      // Handle single answer or bulk answers
      if ('answers' in validation.data) {
        const saved = await WibaService.saveBulkAnswers(auth.tenantId, id, auth.userId!, validation.data.answers)
        return apiSuccess(saved)
      } else {
        const saved = await WibaService.saveAnswer(auth.tenantId, id, auth.userId!, validation.data)
        return apiSuccess(saved)
      }
    } catch (error) {
      console.error('Error saving WiBA answers:', error)
      return apiServerError()
    }
  })
}
