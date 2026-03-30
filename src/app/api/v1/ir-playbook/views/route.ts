import { NextRequest } from 'next/server'
import { withPermission } from '@/lib/auth/require-permission'
import { apiSuccess, apiError, apiServerError } from '@/lib/utils/api-response'
import { IrPlaybookService } from '@/lib/services/ir-playbook.service'

export async function GET(request: NextRequest) {
  return withPermission(request, 'basisabsicherung', 'read', async () => {
    try {
      const view = new URL(request.url).searchParams.get('view')

      switch (view) {
        case 'immediate-actions':
          return apiSuccess(await IrPlaybookService.getImmediateActions())
        case 'dsgvo-checklist':
          return apiSuccess(await IrPlaybookService.getDsgvoChecklist())
        case 'bsi-mapping':
          return apiSuccess(await IrPlaybookService.getBsiControlMapping())
        case 'stats':
          return apiSuccess(await IrPlaybookService.getStats())
        default:
          return apiError(
            'INVALID_VIEW',
            'view muss immediate-actions, dsgvo-checklist, bsi-mapping oder stats sein',
            400
          )
      }
    } catch (error) {
      console.error('Error fetching IR view:', error)
      return apiServerError()
    }
  })
}
