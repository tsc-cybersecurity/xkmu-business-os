import { NextRequest } from 'next/server'
import { apiSuccess, apiNotFound, apiServerError } from '@/lib/utils/api-response'
import { BusinessPlanService } from '@/lib/services/business-plan/business-plan.service'
import { withPermission } from '@/lib/auth/require-permission'
import { AuditLogService } from '@/lib/services/audit-log.service'
import { logger } from '@/lib/utils/logger'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withPermission(request, 'business_plans', 'update', async (auth) => {
    try {
      const { id } = await params
      const plan = await BusinessPlanService.get(id)
      if (!plan) return apiNotFound('Plan nicht gefunden')
      await BusinessPlanService.stop(id)
      await AuditLogService.log({
        userId: auth.userId,
        userRole: auth.role,
        action: 'business_plan.stop',
        entityType: 'business_plans',
        entityId: id,
        payload: { previousStatus: plan.status, currentIteration: plan.currentIteration },
        request,
      })
      const updated = await BusinessPlanService.get(id)
      return apiSuccess(updated)
    } catch (err) {
      logger.error('Error stopping business plan', err, { module: 'BusinessPlansAPI' })
      return apiServerError()
    }
  })
}
