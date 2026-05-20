import { NextRequest } from 'next/server'
import { apiSuccess, apiNotFound, apiValidationError, apiServerError } from '@/lib/utils/api-response'
import { updateBusinessPlanSchema, validateAndParse, formatZodErrors } from '@/lib/utils/validation'
import { BusinessPlanService } from '@/lib/services/business-plan/business-plan.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withPermission(request, 'business_plans', 'read', async () => {
    try {
      const { id } = await params
      const data = await BusinessPlanService.getWithIterations(id)
      if (!data) return apiNotFound('Plan nicht gefunden')
      return apiSuccess(data)
    } catch (err) {
      logger.error('Error fetching business plan', err, { module: 'BusinessPlansAPI' })
      return apiServerError()
    }
  })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withPermission(request, 'business_plans', 'update', async () => {
    try {
      const { id } = await params
      const body = await request.json()
      const validation = validateAndParse(updateBusinessPlanSchema, body)
      if (!validation.success) return apiValidationError(formatZodErrors(validation.errors))
      const plan = await BusinessPlanService.update(id, validation.data)
      if (!plan) return apiNotFound('Plan nicht gefunden')
      return apiSuccess(plan)
    } catch (err) {
      logger.error('Error updating business plan', err, { module: 'BusinessPlansAPI' })
      return apiServerError()
    }
  })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withPermission(request, 'business_plans', 'delete', async () => {
    try {
      const { id } = await params
      const ok = await BusinessPlanService.delete(id)
      if (!ok) return apiNotFound('Plan nicht gefunden')
      return apiSuccess({ deleted: true })
    } catch (err) {
      logger.error('Error deleting business plan', err, { module: 'BusinessPlansAPI' })
      return apiServerError()
    }
  })
}
