import { NextRequest } from 'next/server'
import { apiSuccess, apiNotFound, apiServerError } from '@/lib/utils/api-response'
import { WibaService } from '@/lib/services/wiba.service'
import { withPermission } from '@/lib/auth/require-permission'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'basisabsicherung', 'read', async () => {
    try {
      const { id } = await params
      const checklistId = parseInt(id, 10)
      if (isNaN(checklistId)) {
        return apiNotFound('Checkliste nicht gefunden')
      }

      const checklist = await WibaService.getChecklistById(checklistId)
      if (!checklist) {
        return apiNotFound('Checkliste nicht gefunden')
      }

      return apiSuccess(checklist)
    } catch (error) {
      console.error('Error getting WiBA checklist:', error)
      return apiServerError()
    }
  })
}
