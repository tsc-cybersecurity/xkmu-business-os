import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiError,
  parsePaginationParams,
} from '@/lib/utils/api-response'
import { OpportunityService } from '@/lib/services/opportunity.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'
import { TENANT_ID } from '@/lib/constants/tenant'

export async function GET(request: NextRequest) {
  return withPermission(request, 'opportunities', 'read', async (auth) => {
    try {
      const { searchParams } = new URL(request.url)
      const pagination = parsePaginationParams(searchParams)
      const status = searchParams.get('status') || undefined
      const city = searchParams.get('city') || undefined
      const search = searchParams.get('search') || undefined

      const result = await OpportunityService.list(TENANT_ID, {
        ...pagination,
        status,
        city,
        search,
      })

      return apiSuccess(result.items, result.meta)
    } catch (error) {
      logger.error('List opportunities error', error, { module: 'OpportunitiesAPI' })
      return apiError('LIST_FAILED', 'Failed to list opportunities', 500)
    }
  })
}
