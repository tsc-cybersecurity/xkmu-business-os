import { NextRequest } from 'next/server'
import { apiSuccess, apiServerError } from '@/lib/utils/api-response'
import { GrundschutzAuditService } from '@/lib/services/grundschutz-audit.service'
import { withPermission } from '@/lib/auth/require-permission'

export async function GET(request: NextRequest) {
  return withPermission(request, 'basisabsicherung', 'read', async (auth) => {
    try {
      const sessions = await GrundschutzAuditService.list(auth.tenantId)
      return apiSuccess(sessions)
    } catch { return apiServerError() }
  })
}

export async function POST(request: NextRequest) {
  return withPermission(request, 'basisabsicherung', 'create', async (auth) => {
    try {
      const body = await request.json()
      const session = await GrundschutzAuditService.create(auth.tenantId, auth.userId!, body)
      return apiSuccess(session, undefined, 201)
    } catch { return apiServerError() }
  })
}
