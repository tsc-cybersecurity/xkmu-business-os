import { NextRequest } from 'next/server'
import { withPermission } from '@/lib/auth/require-permission'
import { apiSuccess, apiError, apiServerError } from '@/lib/utils/api-response'
import { IrPlaybookService } from '@/lib/services/ir-playbook.service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'basisabsicherung', 'read', async () => {
    try {
      const { id } = await params
      const scenario = await IrPlaybookService.getScenario(id)

      if (!scenario) {
        return apiError('NOT_FOUND', 'Szenario nicht gefunden', 404)
      }

      return apiSuccess(scenario)
    } catch (error) {
      console.error('Error getting IR scenario:', error)
      return apiServerError()
    }
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'basisabsicherung', 'delete', async () => {
    try {
      const { id } = await params
      await IrPlaybookService.deleteScenario(id)
      return apiSuccess({ deleted: true })
    } catch (error) {
      console.error('Error deleting IR scenario:', error)
      return apiServerError()
    }
  })
}
