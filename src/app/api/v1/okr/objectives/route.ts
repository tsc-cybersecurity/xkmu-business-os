import { NextRequest } from 'next/server'
import { apiSuccess, apiServerError } from '@/lib/utils/api-response'
import { OkrService } from '@/lib/services/okr.service'
import { withPermission } from '@/lib/auth/require-permission'
import { TENANT_ID } from '@/lib/constants/tenant'

export async function GET(request: NextRequest) {
  return withPermission(request, 'processes', 'read', async (auth) => {
    const cycleId = new URL(request.url).searchParams.get('cycleId') || undefined
    const objectives = await OkrService.listObjectives(TENANT_ID, cycleId)
    return apiSuccess(objectives)
  })
}

export async function POST(request: NextRequest) {
  return withPermission(request, 'processes', 'create', async (auth) => {
    try {
      const body = await request.json()
      const obj = await OkrService.createObjective(TENANT_ID, body)
      return apiSuccess(obj, undefined, 201)
    } catch { return apiServerError() }
  })
}
