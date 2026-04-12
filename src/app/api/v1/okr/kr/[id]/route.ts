import { NextRequest } from 'next/server'
import { apiSuccess, apiNotFound, apiServerError } from '@/lib/utils/api-response'
import { OkrService } from '@/lib/services/okr.service'
import { withPermission } from '@/lib/auth/require-permission'

type Params = Promise<{ id: string }>

export async function PUT(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'processes', 'update', async () => {
    try {
      const { id } = await params
      const body = await request.json()
      const kr = await OkrService.updateKeyResult(id, body)
      if (!kr) return apiNotFound('Key Result nicht gefunden')
      return apiSuccess(kr)
    } catch { return apiServerError() }
  })
}

export async function DELETE(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'processes', 'delete', async () => {
    const { id } = await params
    const deleted = await OkrService.deleteKeyResult(id)
    if (!deleted) return apiNotFound('Key Result nicht gefunden')
    return apiSuccess({ deleted: true })
  })
}
