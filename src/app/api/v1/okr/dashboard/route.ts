import { NextRequest } from 'next/server'
import { apiSuccess } from '@/lib/utils/api-response'
import { OkrService } from '@/lib/services/okr.service'
import { withPermission } from '@/lib/auth/require-permission'
export async function GET(request: NextRequest) {
  return withPermission(request, 'processes', 'read', async (auth) => {
    const dashboard = await OkrService.getDashboard()
    return apiSuccess(dashboard)
  })
}
