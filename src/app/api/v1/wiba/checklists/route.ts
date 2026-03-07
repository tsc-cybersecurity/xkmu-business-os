import { NextRequest } from 'next/server'
import { apiSuccess, apiServerError } from '@/lib/utils/api-response'
import { WibaService } from '@/lib/services/wiba.service'
import { withPermission } from '@/lib/auth/require-permission'

export async function GET(request: NextRequest) {
  return withPermission(request, 'basisabsicherung', 'read', async () => {
    try {
      const checklists = await WibaService.listChecklists()
      return apiSuccess(checklists)
    } catch (error) {
      console.error('Error listing WiBA checklists:', error)
      return apiServerError()
    }
  })
}
