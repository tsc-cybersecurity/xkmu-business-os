import { NextRequest } from 'next/server'
import { apiSuccess, apiNotFound, apiServerError } from '@/lib/utils/api-response'
import { BusinessPlanService } from '@/lib/services/business-plan/business-plan.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withPermission(request, 'business_plans', 'update', async () => {
    try {
      const { id } = await params
      const plan = await BusinessPlanService.get(id)
      if (!plan) return apiNotFound('Plan nicht gefunden')
      await BusinessPlanService.stop(id)
      const updated = await BusinessPlanService.get(id)
      return apiSuccess(updated)
    } catch (err) {
      logger.error('Error stopping business plan', err, { module: 'BusinessPlansAPI' })
      return apiServerError()
    }
  })
}
