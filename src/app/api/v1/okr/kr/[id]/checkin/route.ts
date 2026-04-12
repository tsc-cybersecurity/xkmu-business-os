import { NextRequest } from 'next/server'
import { apiSuccess, apiServerError } from '@/lib/utils/api-response'
import { OkrService } from '@/lib/services/okr.service'
import { withPermission } from '@/lib/auth/require-permission'

type Params = Promise<{ id: string }>

export async function GET(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'processes', 'read', async () => {
    const { id } = await params
    const checkins = await OkrService.listCheckins(id)
    return apiSuccess(checkins)
  })
}

export async function POST(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'processes', 'create', async (auth) => {
    try {
      const { id } = await params
      const body = await request.json()
      const checkin = await OkrService.addCheckin(id, { ...body, createdBy: auth.userId })
      return apiSuccess(checkin, undefined, 201)
    } catch { return apiServerError() }
  })
}
