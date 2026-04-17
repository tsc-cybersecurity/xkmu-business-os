import { NextRequest } from 'next/server'
import { apiSuccess, apiServerError } from '@/lib/utils/api-response'
import { EosService } from '@/lib/services/eos.service'
import { withPermission } from '@/lib/auth/require-permission'
import { TENANT_ID } from '@/lib/constants/tenant'

export async function GET(request: NextRequest) {
  return withPermission(request, 'processes', 'read', async (auth) => {
    const quarter = new URL(request.url).searchParams.get('quarter') || undefined
    const rocks = await EosService.listRocks(TENANT_ID, quarter)
    return apiSuccess(rocks)
  })
}

export async function POST(request: NextRequest) {
  return withPermission(request, 'processes', 'create', async (auth) => {
    try {
      const body = await request.json()
      const rock = await EosService.createRock(TENANT_ID, body)
      return apiSuccess(rock, undefined, 201)
    } catch { return apiServerError() }
  })
}
