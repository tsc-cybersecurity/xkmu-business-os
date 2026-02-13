import { NextRequest } from 'next/server'
import { apiSuccess } from '@/lib/utils/api-response'
import { DinRequirementService } from '@/lib/services/din-requirement.service'
import { withPermission } from '@/lib/auth/require-permission'

export async function GET(request: NextRequest) {
  return withPermission(request, 'din_audits', 'read', async () => {
    const requirements = await DinRequirementService.list()
    const topicNames = DinRequirementService.getTopicNames()
    return apiSuccess({ requirements, topicNames })
  })
}
