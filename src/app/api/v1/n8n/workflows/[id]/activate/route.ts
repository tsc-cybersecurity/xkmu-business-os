import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/lib/utils/api-response'
import { withPermission } from '@/lib/auth/require-permission'
import { N8nService } from '@/lib/services/n8n.service'
import { logger } from '@/lib/utils/logger'

// POST /api/v1/n8n/workflows/[id]/activate - Workflow aktivieren/deaktivieren
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'n8n_workflows', 'update', async (auth) => {
    try {
      const { id } = await params
      const body = await request.json().catch(() => ({}))
      const active = body.active !== false // Default: aktivieren

      const workflow = await N8nService.activateWorkflow(auth.tenantId, id, active)
      return apiSuccess(workflow)
    } catch (error) {
      logger.error('Failed to activate n8n workflow', error, { module: 'N8nWorkflowsActivateAPI' })
      const message = error instanceof Error ? error.message : 'Fehler beim Aktivieren des Workflows'
      return apiError('INTERNAL_ERROR', message, 500)
    }
  })
}
