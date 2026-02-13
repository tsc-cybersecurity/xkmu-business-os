import { NextRequest } from 'next/server'
import { apiSuccess } from '@/lib/utils/api-response'
import { DinGrantService } from '@/lib/services/din-grant.service'
import { withPermission } from '@/lib/auth/require-permission'

export async function GET(request: NextRequest) {
  return withPermission(request, 'din_grants', 'read', async () => {
    const { searchParams } = new URL(request.url)
    const region = searchParams.get('region') || undefined
    const employeeCount = searchParams.get('employeeCount')
      ? parseInt(searchParams.get('employeeCount')!)
      : undefined

    const grants = await DinGrantService.list({ region, employeeCount })
    const regions = await DinGrantService.getRegions()

    return apiSuccess({ grants, regions })
  })
}
