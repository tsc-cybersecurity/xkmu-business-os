import { NextRequest } from 'next/server'
import { withPermission } from '@/lib/auth/require-permission'
import { apiSuccess, apiError, apiServerError } from '@/lib/utils/api-response'
import { IrPlaybookService } from '@/lib/services/ir-playbook.service'
import { logger } from '@/lib/utils/logger'

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
      logger.error('Error getting IR scenario', error, { module: 'IrPlaybookScenarioAPI' })
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
      logger.error('Error deleting IR scenario', error, { module: 'IrPlaybookScenarioAPI' })
      return apiServerError()
    }
  })
}
