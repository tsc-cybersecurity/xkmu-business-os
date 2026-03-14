import { NextRequest } from 'next/server'
import { apiSuccess } from '@/lib/utils/api-response'
import { WibaRequirementService, WIBA_CATEGORY_NAMES, WIBA_CATEGORY_ORDER_IDS, WIBA_CATEGORY_PRIORITIES } from '@/lib/services/wiba-requirement.service'
import { withPermission } from '@/lib/auth/require-permission'

export async function GET(request: NextRequest) {
  return withPermission(request, 'wiba_audits', 'read', async () => {
    const requirements = await WibaRequirementService.list()
    return apiSuccess({
      requirements,
      categoryNames: WIBA_CATEGORY_NAMES,
      categoryOrder: WIBA_CATEGORY_ORDER_IDS,
      categoryPriorities: WIBA_CATEGORY_PRIORITIES,
    })
  })
}
