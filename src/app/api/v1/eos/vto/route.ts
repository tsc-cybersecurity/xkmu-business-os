import { NextRequest } from 'next/server'
import { apiSuccess, apiServerError } from '@/lib/utils/api-response'
import { EosService } from '@/lib/services/eos.service'
import { withPermission } from '@/lib/auth/require-permission'
export async function GET(request: NextRequest) {
  return withPermission(request, 'processes', 'read', async (auth) => {
    const vto = await EosService.getVTO()
    return apiSuccess(vto)
  })
}

export async function PUT(request: NextRequest) {
  return withPermission(request, 'processes', 'update', async (auth) => {
    try {
      const body = await request.json()
      const vto = await EosService.upsertVTO(body, auth.userId ?? undefined)
      return apiSuccess(vto)
    } catch { return apiServerError() }
  })
}
