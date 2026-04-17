import { NextRequest } from 'next/server'
import { apiSuccess, apiServerError } from '@/lib/utils/api-response'
import { MarketingTaskService } from '@/lib/services/marketing-task.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'
import { TENANT_ID } from '@/lib/constants/tenant'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'marketing', 'read', async (auth) => {
    try {
      const { id } = await params
      const tasks = await MarketingTaskService.listByCampaign(TENANT_ID, id)
      return apiSuccess(tasks)
    } catch (error) {
      logger.error('Error fetching campaign tasks', error, { module: 'MarketingCampaignsTasksAPI' })
      return apiServerError()
    }
  })
}
