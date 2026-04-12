import { NextRequest } from 'next/server'
import { apiSuccess, apiServerError } from '@/lib/utils/api-response'
import { OkrService } from '@/lib/services/okr.service'
import { withPermission } from '@/lib/auth/require-permission'

type Params = Promise<{ id: string }>

export async function POST(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'processes', 'create', async () => {
    try {
      const { id } = await params
      const body = await request.json()
      const kr = await OkrService.addKeyResult(id, body)
      return apiSuccess(kr, undefined, 201)
    } catch { return apiServerError() }
  })
}
