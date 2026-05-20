import { NextRequest } from 'next/server'
import { apiSuccess, apiNotFound, apiServerError, apiValidationError } from '@/lib/utils/api-response'
import { BusinessPlanService } from '@/lib/services/business-plan/business-plan.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

/**
 * Manuell eine weitere Iteration anstossen — z.B. wenn der Operator nach
 * einem completed-Plan trotzdem weiteroptimieren moechte (neue Threshold)
 * oder einen failed-Plan wiederbeleben will.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withPermission(request, 'business_plans', 'update', async () => {
    try {
      const { id } = await params
      const plan = await BusinessPlanService.get(id)
      if (!plan) return apiNotFound('Plan nicht gefunden')

      if (plan.status === 'running') {
        return apiValidationError([
          { field: 'status', message: 'Plan laeuft bereits — kein erneutes Anstossen noetig' },
        ])
      }

      // Setze Plan zurueck auf 'running' und enqueue
      await BusinessPlanService.start(id)
      const updated = await BusinessPlanService.get(id)
      return apiSuccess(updated)
    } catch (err) {
      logger.error('Error triggering iteration', err, { module: 'BusinessPlansAPI' })
      return apiServerError()
    }
  })
}
