import { NextRequest } from 'next/server'
import { apiSuccess, apiServerError } from '@/lib/utils/api-response'
import { SopService } from '@/lib/services/sop.service'
import { withPermission } from '@/lib/auth/require-permission'
import { TENANT_ID } from '@/lib/constants/tenant'

export async function GET(request: NextRequest) {
  return withPermission(request, 'processes', 'read', async (auth) => {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') || undefined
    const status = searchParams.get('status') || undefined
    const search = searchParams.get('q') || searchParams.get('search') || undefined
    const sops = await SopService.list(TENANT_ID, { category, status, search })
    return apiSuccess(sops)
  })
}

export async function POST(request: NextRequest) {
  return withPermission(request, 'processes', 'create', async (auth) => {
    try {
      const body = await request.json()
      const sop = await SopService.create(TENANT_ID, { ...body, ownerId: body.ownerId || auth.userId })
      return apiSuccess(sop, undefined, 201)
    } catch { return apiServerError() }
  })
}
