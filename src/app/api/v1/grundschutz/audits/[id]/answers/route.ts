import { NextRequest } from 'next/server'
import { apiSuccess, apiServerError } from '@/lib/utils/api-response'
import { GrundschutzAuditService } from '@/lib/services/grundschutz-audit.service'
import { withPermission } from '@/lib/auth/require-permission'

type Params = Promise<{ id: string }>

// GET — Alle Answers einer Session (optional groupId-Filter)
export async function GET(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'basisabsicherung', 'read', async () => {
    try {
      const { id } = await params
      const { searchParams } = new URL(request.url)
      const groupId = searchParams.get('groupId') || undefined
      const answers = await GrundschutzAuditService.getAnswers(id, groupId)
      return apiSuccess(answers)
    } catch { return apiServerError() }
  })
}

// POST — Answer(s) speichern
export async function POST(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'basisabsicherung', 'update', async (auth) => {
    try {
      const { id } = await params
      const body = await request.json()

      // Einzeln oder Batch
      if (Array.isArray(body.answers)) {
        const saved = await GrundschutzAuditService.saveAnswersBatch(auth.tenantId, id, body.answers)
        return apiSuccess({ saved })
      }

      const answer = await GrundschutzAuditService.saveAnswer(auth.tenantId, id, body)
      return apiSuccess(answer)
    } catch { return apiServerError() }
  })
}
