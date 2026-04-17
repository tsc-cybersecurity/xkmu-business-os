import { NextRequest } from 'next/server'
import { apiSuccess, apiNotFound, apiServerError } from '@/lib/utils/api-response'
import { DeliverableService } from '@/lib/services/deliverable.service'
import { withPermission } from '@/lib/auth/require-permission'
import { TENANT_ID } from '@/lib/constants/tenant'

type Params = Promise<{ id: string }>

export async function GET(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'processes', 'read', async (auth) => {
    const { id } = await params
    const deliverable = await DeliverableService.getById(TENANT_ID, id)
    if (!deliverable) return apiNotFound('Deliverable nicht gefunden')
    return apiSuccess(deliverable)
  })
}

export async function PATCH(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'processes', 'update', async (auth) => {
    try {
      const { id } = await params
      const body = await request.json()
      const deliverable = await DeliverableService.update(TENANT_ID, id, body)
      if (!deliverable) return apiNotFound('Deliverable nicht gefunden')
      return apiSuccess(deliverable)
    } catch { return apiServerError() }
  })
}

export async function DELETE(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'processes', 'delete', async (auth) => {
    const { id } = await params
    const deleted = await DeliverableService.delete(TENANT_ID, id)
    if (!deleted) return apiNotFound('Deliverable nicht gefunden')
    return apiSuccess({ deleted: true })
  })
}
