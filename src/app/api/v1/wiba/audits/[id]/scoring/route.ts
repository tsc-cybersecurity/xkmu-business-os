import { NextRequest } from 'next/server'
import { apiSuccess, apiServerError } from '@/lib/utils/api-response'
import { WibaScoringService } from '@/lib/services/wiba-scoring.service'
import { WIBA_CATEGORY_NAMES, WIBA_CATEGORY_ORDER_IDS, WIBA_CATEGORY_PRIORITIES } from '@/lib/services/wiba-requirement.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'wiba_audits', 'read', async () => {
    try {
      const { id } = await params
      const scoring = await WibaScoringService.calculateScore(id)
      const riskLevel = WibaScoringService.getRiskLevel(scoring.currentScore, scoring.maxScore)

      return apiSuccess({
        ...scoring,
        riskLevel,
        categoryNames: WIBA_CATEGORY_NAMES,
        categoryOrder: WIBA_CATEGORY_ORDER_IDS,
        categoryPriorities: WIBA_CATEGORY_PRIORITIES,
      })
    } catch (error) {
      logger.error('Error calculating WiBA score', error, { module: 'WibaAuditsScoringAPI' })
      return apiServerError()
    }
  })
}
