import { NextRequest } from 'next/server'
import { apiSuccess, apiNotFound, apiValidationError, apiServerError } from '@/lib/utils/api-response'
import { updateBusinessPlanSchema, validateAndParse, formatZodErrors } from '@/lib/utils/validation'
import { BusinessPlanService } from '@/lib/services/business-plan/business-plan.service'
import { withPermission } from '@/lib/auth/require-permission'
import { AuditLogService } from '@/lib/services/audit-log.service'
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
  return withPermission(request, 'business_plans', 'update', async (auth) => {
    try {
      const { id } = await params
      const body = await request.json()
      const validation = validateAndParse(updateBusinessPlanSchema, body)
      if (!validation.success) return apiValidationError(formatZodErrors(validation.errors))
      const plan = await BusinessPlanService.update(id, validation.data)
      if (!plan) return apiNotFound('Plan nicht gefunden')
      await AuditLogService.log({
        userId: auth.userId,
        userRole: auth.role,
        action: 'business_plan.update',
        entityType: 'business_plans',
        entityId: id,
        payload: validation.data,
        request,
      })
      return apiSuccess(plan)
    } catch (err) {
      logger.error('Error updating business plan', err, { module: 'BusinessPlansAPI' })
      return apiServerError()
    }
  })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withPermission(request, 'business_plans', 'delete', async (auth) => {
    try {
      const { id } = await params
      // Plan-Daten vor dem Delete fuer Audit-Payload festhalten
      const planSnapshot = await BusinessPlanService.get(id)
      const ok = await BusinessPlanService.delete(id)
      if (!ok) return apiNotFound('Plan nicht gefunden')
      await AuditLogService.log({
        userId: auth.userId,
        userRole: auth.role,
        action: 'business_plan.delete',
        entityType: 'business_plans',
        entityId: id,
        payload: {
          title: planSnapshot?.title,
          status: planSnapshot?.status,
          finalScore: planSnapshot?.finalScore,
          currentIteration: planSnapshot?.currentIteration,
        },
        request,
      })
      return apiSuccess({ deleted: true })
    } catch (err) {
      logger.error('Error deleting business plan', err, { module: 'BusinessPlansAPI' })
      return apiServerError()
    }
  })
}
