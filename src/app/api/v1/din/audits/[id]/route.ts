import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiNotFound,
  apiServerError,
} from '@/lib/utils/api-response'
import { DinAuditService } from '@/lib/services/din-audit.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'din_audits', 'read', async (auth) => {
    const { id } = await params
    const session = await DinAuditService.getById(auth.tenantId, id)
    if (!session) return apiNotFound('Audit-Session nicht gefunden')
    return apiSuccess(session)
  })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'din_audits', 'update', async (auth) => {
    try {
      const { id } = await params
      const body = await request.json()
      const session = await DinAuditService.update(auth.tenantId, id, body)
      if (!session) return apiNotFound('Audit-Session nicht gefunden')
      return apiSuccess(session)
    } catch (error) {
      logger.error('Error updating DIN audit', error, { module: 'DinAuditsAPI' })
      return apiServerError()
    }
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'din_audits', 'delete', async (auth) => {
    const { id } = await params
    const deleted = await DinAuditService.delete(auth.tenantId, id)
    if (!deleted) return apiNotFound('Audit-Session nicht gefunden')
    return apiSuccess({ deleted: true })
  })
}
