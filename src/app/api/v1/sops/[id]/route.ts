import { NextRequest } from 'next/server'
import { apiSuccess, apiNotFound, apiServerError } from '@/lib/utils/api-response'
import { SopService } from '@/lib/services/sop.service'
import { withPermission } from '@/lib/auth/require-permission'
type Params = Promise<{ id: string }>

export async function GET(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'processes', 'read', async (auth) => {
    const { id } = await params
    const sop = await SopService.getByIdWithDeliverable(id)
    if (!sop) return apiNotFound('SOP nicht gefunden')
    return apiSuccess(sop)
  })
}

export async function PUT(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'processes', 'update', async (auth) => {
    try {
      const { id } = await params
      const body = await request.json()
      const sop = await SopService.update(id, body)
      if (!sop) return apiNotFound('SOP nicht gefunden')
      return apiSuccess(sop)
    } catch { return apiServerError() }
  })
}

export async function DELETE(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'processes', 'delete', async (auth) => {
    const { id } = await params
    const deleted = await SopService.delete(id)
    if (!deleted) return apiNotFound('SOP nicht gefunden')
    return apiSuccess({ deleted: true })
  })
}
