import { NextRequest } from 'next/server'
import { apiSuccess, apiServerError } from '@/lib/utils/api-response'
import { DeliverableService } from '@/lib/services/deliverable.service'
import { withPermission } from '@/lib/auth/require-permission'
import { TENANT_ID } from '@/lib/constants/tenant'

export async function GET(request: NextRequest) {
  return withPermission(request, 'processes', 'read', async (auth) => {
    try {
      const modules = await DeliverableService.getModulesWithCount(TENANT_ID)
      return apiSuccess(modules)
    } catch { return apiServerError() }
  })
}
