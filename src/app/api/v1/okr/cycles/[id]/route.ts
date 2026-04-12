import { NextRequest } from 'next/server'
import { apiSuccess, apiNotFound, apiServerError } from '@/lib/utils/api-response'
import { OkrService } from '@/lib/services/okr.service'
import { withPermission } from '@/lib/auth/require-permission'

type Params = Promise<{ id: string }>

export async function PUT(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'processes', 'update', async (auth) => {
    try {
      const { id } = await params
      const body = await request.json()
      const cycle = await OkrService.updateCycle(auth.tenantId, id, body)
      if (!cycle) return apiNotFound('Zyklus nicht gefunden')
      return apiSuccess(cycle)
    } catch { return apiServerError() }
  })
}

export async function DELETE(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'processes', 'delete', async (auth) => {
    const { id } = await params
    const deleted = await OkrService.deleteCycle(auth.tenantId, id)
    if (!deleted) return apiNotFound('Zyklus nicht gefunden')
    return apiSuccess({ deleted: true })
  })
}
