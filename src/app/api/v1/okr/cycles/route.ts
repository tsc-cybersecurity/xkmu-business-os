import { NextRequest } from 'next/server'
import { apiSuccess, apiServerError } from '@/lib/utils/api-response'
import { OkrService } from '@/lib/services/okr.service'
import { withPermission } from '@/lib/auth/require-permission'
import { TENANT_ID } from '@/lib/constants/tenant'

export async function GET(request: NextRequest) {
  return withPermission(request, 'processes', 'read', async (auth) => {
    const cycles = await OkrService.listCycles(TENANT_ID)
    return apiSuccess(cycles)
  })
}

export async function POST(request: NextRequest) {
  return withPermission(request, 'processes', 'create', async (auth) => {
    try {
      const body = await request.json()
      const cycle = await OkrService.createCycle(TENANT_ID, body)
      return apiSuccess(cycle, undefined, 201)
    } catch { return apiServerError() }
  })
}
