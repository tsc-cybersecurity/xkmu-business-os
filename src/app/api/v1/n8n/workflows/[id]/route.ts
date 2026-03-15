import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/lib/utils/api-response'
import { withPermission } from '@/lib/auth/require-permission'
import { N8nService } from '@/lib/services/n8n.service'
import { logger } from '@/lib/utils/logger'

// GET /api/v1/n8n/workflows/[id] - Workflow Details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'n8n_workflows', 'read', async (auth) => {
    try {
      const { id } = await params
      const workflow = await N8nService.getWorkflow(auth.tenantId, id)
      return apiSuccess(workflow)
    } catch (error) {
      logger.error('Failed to get n8n workflow', error, { module: 'N8nWorkflowsAPI' })
      const message = error instanceof Error ? error.message : 'Fehler beim Laden des Workflows'
      return apiError('INTERNAL_ERROR', message, 500)
    }
  })
}

// PUT /api/v1/n8n/workflows/[id] - Workflow aktualisieren
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'n8n_workflows', 'update', async (auth) => {
    try {
      const { id } = await params
      const body = await request.json()
      const workflow = await N8nService.updateWorkflow(auth.tenantId, id, body)
      return apiSuccess(workflow)
    } catch (error) {
      logger.error('Failed to update n8n workflow', error, { module: 'N8nWorkflowsAPI' })
      const message = error instanceof Error ? error.message : 'Fehler beim Aktualisieren des Workflows'
      return apiError('INTERNAL_ERROR', message, 500)
    }
  })
}

// DELETE /api/v1/n8n/workflows/[id] - Workflow löschen
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'n8n_workflows', 'delete', async (auth) => {
    try {
      const { id } = await params
      await N8nService.deleteWorkflow(auth.tenantId, id)
      return apiSuccess({ deleted: true })
    } catch (error) {
      logger.error('Failed to delete n8n workflow', error, { module: 'N8nWorkflowsAPI' })
      const message = error instanceof Error ? error.message : 'Fehler beim Löschen des Workflows'
      return apiError('INTERNAL_ERROR', message, 500)
    }
  })
}
