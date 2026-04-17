import { NextRequest } from 'next/server'
import {
  apiSuccess,
  apiNotFound,
  apiServerError,
} from '@/lib/utils/api-response'
import { WibaAuditService } from '@/lib/services/wiba-audit.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'
import { TENANT_ID } from '@/lib/constants/tenant'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'wiba_audits', 'read', async (auth) => {
    const { id } = await params
    const session = await WibaAuditService.getById(TENANT_ID, id)
    if (!session) return apiNotFound('Audit-Session nicht gefunden')
    return apiSuccess(session)
  })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'wiba_audits', 'update', async (auth) => {
    try {
      const { id } = await params
      const body = await request.json()
      const session = await WibaAuditService.update(TENANT_ID, id, body)
      if (!session) return apiNotFound('Audit-Session nicht gefunden')
      return apiSuccess(session)
    } catch (error) {
      logger.error('Error updating WiBA audit', error, { module: 'WibaAuditsAPI' })
      return apiServerError()
    }
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'wiba_audits', 'delete', async (auth) => {
    const { id } = await params
    const deleted = await WibaAuditService.delete(TENANT_ID, id)
    if (!deleted) return apiNotFound('Audit-Session nicht gefunden')
    return apiSuccess({ deleted: true })
  })
}
