import { NextRequest } from 'next/server'
import { apiSuccess, apiServerError } from '@/lib/utils/api-response'
import { EosService } from '@/lib/services/eos.service'
import { withPermission } from '@/lib/auth/require-permission'
import { TENANT_ID } from '@/lib/constants/tenant'

export async function GET(request: NextRequest) {
  return withPermission(request, 'processes', 'read', async (auth) => {
    const meetings = await EosService.listMeetings(TENANT_ID)
    return apiSuccess(meetings)
  })
}

export async function POST(request: NextRequest) {
  return withPermission(request, 'processes', 'create', async (auth) => {
    try {
      const body = await request.json()
      const meeting = await EosService.createMeeting(TENANT_ID, body)
      return apiSuccess(meeting, undefined, 201)
    } catch { return apiServerError() }
  })
}
