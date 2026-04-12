import { NextRequest } from 'next/server'
import { apiSuccess, apiNotFound, apiServerError } from '@/lib/utils/api-response'
import { EosService } from '@/lib/services/eos.service'
import { withPermission } from '@/lib/auth/require-permission'

type Params = Promise<{ id: string }>

export async function PUT(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'processes', 'update', async (auth) => {
    try {
      const { id } = await params
      const body = await request.json()
      const meeting = await EosService.updateMeeting(auth.tenantId, id, body)
      if (!meeting) return apiNotFound('Meeting nicht gefunden')
      return apiSuccess(meeting)
    } catch { return apiServerError() }
  })
}
