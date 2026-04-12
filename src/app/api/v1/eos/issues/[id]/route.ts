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
      const issue = await EosService.updateIssue(auth.tenantId, id, body)
      if (!issue) return apiNotFound('Issue nicht gefunden')
      return apiSuccess(issue)
    } catch { return apiServerError() }
  })
}

export async function DELETE(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'processes', 'delete', async (auth) => {
    const { id } = await params
    const deleted = await EosService.deleteIssue(auth.tenantId, id)
    if (!deleted) return apiNotFound('Issue nicht gefunden')
    return apiSuccess({ deleted: true })
  })
}
