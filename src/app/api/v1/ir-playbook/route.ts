import { NextRequest } from 'next/server'
import { withPermission } from '@/lib/auth/require-permission'
import { apiSuccess, apiError, apiServerError } from '@/lib/utils/api-response'
import { IrPlaybookService } from '@/lib/services/ir-playbook.service'

export async function GET(request: NextRequest) {
  return withPermission(request, 'basisabsicherung', 'read', async () => {
    try {
      const { searchParams } = new URL(request.url)

      const filters = {
        series: searchParams.get('series') || undefined,
        severity: searchParams.get('severity') || undefined,
        dsgvo: searchParams.get('dsgvo') === 'true' ? true : undefined,
        search: searchParams.get('search') || undefined,
      }

      const scenarios = await IrPlaybookService.listScenarios(filters)
      return apiSuccess(scenarios)
    } catch (error) {
      console.error('Error listing IR scenarios:', error)
      return apiServerError()
    }
  })
}

export async function POST(request: NextRequest) {
  return withPermission(request, 'basisabsicherung', 'create', async () => {
    try {
      const body = await request.json()

      if (body.scenarios && Array.isArray(body.scenarios)) {
        const imported = await IrPlaybookService.importBatch(body.scenarios)
        return apiSuccess({ imported: imported.length, ids: imported }, undefined, 201)
      } else if (body.id) {
        const id = await IrPlaybookService.importScenario(body)
        return apiSuccess({ imported: 1, ids: [id] }, undefined, 201)
      }

      return apiError('INVALID_FORMAT', 'Erwartet {"scenarios": [...]} oder einzelnes Szenario mit "id"', 400)
    } catch (error) {
      console.error('Error importing IR scenario:', error)
      return apiServerError()
    }
  })
}
