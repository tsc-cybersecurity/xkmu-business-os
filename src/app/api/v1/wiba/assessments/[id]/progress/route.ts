import { NextRequest } from 'next/server'
import { apiSuccess, apiServerError } from '@/lib/utils/api-response'
import { WibaService } from '@/lib/services/wiba.service'
import { withPermission } from '@/lib/auth/require-permission'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'basisabsicherung', 'read', async (auth) => {
    try {
      const { id } = await params
      const progress = await WibaService.getProgress(auth.tenantId, id)
      return apiSuccess(progress)
    } catch (error) {
      console.error('Error getting WiBA progress:', error)
      return apiServerError()
    }
  })
}
