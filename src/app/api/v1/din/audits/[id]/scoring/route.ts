import { NextRequest } from 'next/server'
import { apiSuccess, apiServerError } from '@/lib/utils/api-response'
import { DinScoringService } from '@/lib/services/din-scoring.service'
import { TOPIC_NAMES } from '@/lib/services/din-requirement.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'din_audits', 'read', async () => {
    try {
      const { id } = await params
      const scoring = await DinScoringService.calculateScore(id)
      const riskLevel = DinScoringService.getRiskLevel(scoring.currentScore, scoring.maxScore)

      return apiSuccess({
        ...scoring,
        riskLevel,
        topicNames: TOPIC_NAMES,
      })
    } catch (error) {
      logger.error('Error calculating DIN score', error, { module: 'DinAuditsScoringAPI' })
      return apiServerError()
    }
  })
}
