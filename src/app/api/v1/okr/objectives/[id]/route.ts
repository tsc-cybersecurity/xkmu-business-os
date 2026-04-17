import { NextRequest } from 'next/server'
import { apiSuccess, apiNotFound, apiServerError } from '@/lib/utils/api-response'
import { OkrService } from '@/lib/services/okr.service'
import { withPermission } from '@/lib/auth/require-permission'
import { TENANT_ID } from '@/lib/constants/tenant'

type Params = Promise<{ id: string }>

export async function PUT(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'processes', 'update', async (auth) => {
    try {
      const { id } = await params
      const body = await request.json()
      const obj = await OkrService.updateObjective(TENANT_ID, id, body)
      if (!obj) return apiNotFound('Objective nicht gefunden')
      return apiSuccess(obj)
    } catch { return apiServerError() }
  })
}

export async function DELETE(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'processes', 'delete', async (auth) => {
    const { id } = await params
    const deleted = await OkrService.deleteObjective(TENANT_ID, id)
    if (!deleted) return apiNotFound('Objective nicht gefunden')
    return apiSuccess({ deleted: true })
  })
}
