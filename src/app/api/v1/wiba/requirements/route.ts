import { NextRequest } from 'next/server'
import { apiSuccess } from '@/lib/utils/api-response'
import { WibaRequirementService, WIBA_CATEGORY_NAMES } from '@/lib/services/wiba-requirement.service'
import { withPermission } from '@/lib/auth/require-permission'

export async function GET(request: NextRequest) {
  return withPermission(request, 'wiba_audits', 'read', async () => {
    const requirements = await WibaRequirementService.list()
    const categoryNames = WIBA_CATEGORY_NAMES
    return apiSuccess({ requirements, categoryNames })
  })
}
