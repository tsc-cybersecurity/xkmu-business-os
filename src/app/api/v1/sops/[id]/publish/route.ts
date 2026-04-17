import { NextRequest } from 'next/server'
import { apiSuccess, apiNotFound, apiServerError } from '@/lib/utils/api-response'
import { SopService } from '@/lib/services/sop.service'
import { withPermission } from '@/lib/auth/require-permission'
import { TENANT_ID } from '@/lib/constants/tenant'

type Params = Promise<{ id: string }>

export async function POST(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'processes', 'update', async (auth) => {
    try {
      const { id } = await params
      const doc = await SopService.publish(TENANT_ID, id, auth.userId ?? undefined)
      if (!doc) return apiNotFound('SOP nicht gefunden')
      return apiSuccess(doc)
    } catch { return apiServerError() }
  })
}
