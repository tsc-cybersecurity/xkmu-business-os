import { NextRequest } from 'next/server'
import { z } from 'zod'
import { apiSuccess, apiError, apiServerError } from '@/lib/utils/api-response'
import { validateAndParse } from '@/lib/utils/validation'
import { GrundschutzAuditService } from '@/lib/services/grundschutz-audit.service'
import { withPermission } from '@/lib/auth/require-permission'

const createAuditSchema = z.object({
  clientCompanyId: z.string().uuid(),
  title: z.string().max(255).optional(),
  filterGroups: z.array(z.string()).optional(),
  filterSecLevel: z.string().optional(),
})

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
      const parsed = validateAndParse(createAuditSchema, body)
      if (!parsed.success) {
        return apiError('VALIDATION_ERROR', 'clientCompanyId ist erforderlich', 400)
      }
      const session = await GrundschutzAuditService.create(auth.tenantId, auth.userId!, parsed.data)
      return apiSuccess(session, undefined, 201)
    } catch { return apiServerError() }
  })
}
