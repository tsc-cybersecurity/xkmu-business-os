import { NextRequest } from 'next/server'
import { apiSuccess, apiNotFound, apiServerError } from '@/lib/utils/api-response'
import { GrundschutzAuditService } from '@/lib/services/grundschutz-audit.service'
import { withPermission } from '@/lib/auth/require-permission'
type Params = Promise<{ id: string }>

export async function GET(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'basisabsicherung', 'read', async (auth) => {
    const { id } = await params
    const session = await GrundschutzAuditService.getById(id)
    if (!session) return apiNotFound('Audit nicht gefunden')
    return apiSuccess(session)
  })
}

export async function PUT(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'basisabsicherung', 'update', async (auth) => {
    const { id } = await params
    const body = await request.json()
    const session = await GrundschutzAuditService.updateStatus(id, body.status)
    if (!session) return apiNotFound('Audit nicht gefunden')
    return apiSuccess(session)
  })
}

export async function DELETE(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'basisabsicherung', 'delete', async (auth) => {
    const { id } = await params
    const deleted = await GrundschutzAuditService.delete(id)
    if (!deleted) return apiNotFound('Audit nicht gefunden')
    return apiSuccess({ deleted: true })
  })
}
