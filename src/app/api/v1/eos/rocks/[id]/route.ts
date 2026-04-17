import { NextRequest } from 'next/server'
import { apiSuccess, apiNotFound, apiServerError } from '@/lib/utils/api-response'
import { EosService } from '@/lib/services/eos.service'
import { withPermission } from '@/lib/auth/require-permission'
type Params = Promise<{ id: string }>

export async function GET(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'processes', 'read', async (auth) => {
    const { id } = await params
    const rock = await EosService.getRock(id)
    if (!rock) return apiNotFound('Rock nicht gefunden')
    return apiSuccess(rock)
  })
}

export async function PUT(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'processes', 'update', async (auth) => {
    try {
      const { id } = await params
      const body = await request.json()
      const rock = await EosService.updateRock(id, body)
      if (!rock) return apiNotFound('Rock nicht gefunden')
      return apiSuccess(rock)
    } catch { return apiServerError() }
  })
}

export async function DELETE(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'processes', 'delete', async (auth) => {
    const { id } = await params
    const deleted = await EosService.deleteRock(id)
    if (!deleted) return apiNotFound('Rock nicht gefunden')
    return apiSuccess({ deleted: true })
  })
}
