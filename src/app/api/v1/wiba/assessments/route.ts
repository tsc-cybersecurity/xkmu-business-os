import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiValidationError,
  apiServerError,
  parsePaginationParams,
} from '@/lib/utils/api-response'
import { WibaService } from '@/lib/services/wiba.service'
import { withPermission } from '@/lib/auth/require-permission'
import { z } from 'zod'
import { validateAndParse, formatZodErrors } from '@/lib/utils/validation'

const createAssessmentSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  clientCompanyId: z.string().uuid(),
})

export async function GET(request: NextRequest) {
  return withPermission(request, 'basisabsicherung', 'read', async (auth) => {
    try {
      const { searchParams } = new URL(request.url)
      const pagination = parsePaginationParams(searchParams)
      const status = searchParams.get('status') || undefined
      const result = await WibaService.listAssessments(auth.tenantId, { ...pagination, status })
      return apiSuccess(result.items, result.meta)
    } catch (error) {
      console.error('Error listing WiBA assessments:', error)
      return apiServerError()
    }
  })
}

export async function POST(request: NextRequest) {
  return withPermission(request, 'basisabsicherung', 'create', async (auth) => {
    try {
      const body = await request.json()
      const validation = validateAndParse(createAssessmentSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }

      const assessment = await WibaService.createAssessment(
        auth.tenantId,
        auth.userId!,
        validation.data
      )
      return apiSuccess(assessment, undefined, 201)
    } catch (error) {
      console.error('Error creating WiBA assessment:', error)
      return apiServerError()
    }
  })
}
