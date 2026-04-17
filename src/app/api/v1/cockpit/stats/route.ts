import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/lib/utils/api-response'
import { CockpitService } from '@/lib/services/cockpit.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'
import { TENANT_ID } from '@/lib/constants/tenant'

export async function GET(request: NextRequest) {
  return withPermission(request, 'cockpit', 'read', async (auth) => {
    try {
      const stats = await CockpitService.getStats(TENANT_ID)
      return apiSuccess(stats)
    } catch (error) {
      logger.error('Get cockpit stats error', error, { module: 'CockpitAPI' })
      return apiError('STATS_FAILED', 'Failed to get cockpit stats', 500)
    }
  })
}
