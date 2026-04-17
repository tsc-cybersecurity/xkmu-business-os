import { NextRequest } from 'next/server'
import { apiSuccess,
  apiNotFound,
  apiError,
} from '@/lib/utils/api-response'
import { OpportunityService } from '@/lib/services/opportunity.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'
type Params = Promise<{ id: string }>

export async function POST(
  request: NextRequest,
  { params }: { params: Params }
) {
  return withPermission(request, 'opportunities', 'update', async (auth) => {
    const { id } = await params

    try {
      const opportunity = await OpportunityService.getById(id)
      if (!opportunity) {
        return apiNotFound('Opportunity not found')
      }

      const result = await OpportunityService.convert(id, auth.userId || undefined)

      return apiSuccess(result, undefined, 201)
    } catch (error) {
      logger.error('Convert opportunity error', error, { module: 'OpportunitiesAPI' })
      return apiError('CONVERT_FAILED', 'Failed to convert opportunity', 500)
    }
  })
}
