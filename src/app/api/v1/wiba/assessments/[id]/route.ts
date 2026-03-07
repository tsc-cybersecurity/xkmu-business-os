import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiNotFound,
  apiValidationError,
  apiServerError,
} from '@/lib/utils/api-response'
import { WibaService } from '@/lib/services/wiba.service'
import { withPermission } from '@/lib/auth/require-permission'
import { z } from 'zod'
import { validateAndParse, formatZodErrors } from '@/lib/utils/validation'

const updateAssessmentSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  status: z.enum(['draft', 'in_progress', 'completed']).optional(),
  completedAt: z.string().datetime().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'basisabsicherung', 'read', async (auth) => {
    try {
      const { id } = await params
      const assessment = await WibaService.getAssessmentById(auth.tenantId, id)
      if (!assessment) {
        return apiNotFound('Assessment nicht gefunden')
      }
      return apiSuccess(assessment)
    } catch (error) {
      console.error('Error getting WiBA assessment:', error)
      return apiServerError()
    }
  })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'basisabsicherung', 'update', async (auth) => {
    try {
      const { id } = await params
      const body = await request.json()
      const validation = validateAndParse(updateAssessmentSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }

      const data: Record<string, unknown> = { ...validation.data }
      if (validation.data.completedAt) {
        data.completedAt = new Date(validation.data.completedAt)
      }

      const assessment = await WibaService.updateAssessment(auth.tenantId, id, data as Parameters<typeof WibaService.updateAssessment>[2])
      if (!assessment) {
        return apiNotFound('Assessment nicht gefunden')
      }
      return apiSuccess(assessment)
    } catch (error) {
      console.error('Error updating WiBA assessment:', error)
      return apiServerError()
    }
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'basisabsicherung', 'delete', async (auth) => {
    try {
      const { id } = await params
      const deleted = await WibaService.deleteAssessment(auth.tenantId, id)
      if (!deleted) {
        return apiNotFound('Assessment nicht gefunden')
      }
      return apiSuccess({ deleted: true })
    } catch (error) {
      console.error('Error deleting WiBA assessment:', error)
      return apiServerError()
    }
  })
}
