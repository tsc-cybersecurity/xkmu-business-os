import { NextRequest } from 'next/server'
import { apiSuccess, apiServerError } from '@/lib/utils/api-response'
import { MarketingTaskService } from '@/lib/services/marketing-task.service'
import { withPermission } from '@/lib/auth/require-permission'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'marketing', 'read', async (auth) => {
    try {
      const { id } = await params
      const tasks = await MarketingTaskService.listByCampaign(auth.tenantId, id)
      return apiSuccess(tasks)
    } catch (error) {
      console.error('Error fetching campaign tasks:', error)
      return apiServerError()
    }
  })
}
