import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/lib/utils/api-response'
import { withPermission } from '@/lib/auth/require-permission'
import { N8nService } from '@/lib/services/n8n.service'
import { logger } from '@/lib/utils/logger'
import { TENANT_ID } from '@/lib/constants/tenant'

// GET /api/v1/n8n/workflows - Workflows auflisten
export async function GET(request: NextRequest) {
  return withPermission(request, 'n8n_workflows', 'read', async (auth) => {
    try {
      const workflows = await N8nService.listWorkflows(TENANT_ID)
      return apiSuccess(workflows)
    } catch (error) {
      logger.error('Failed to list n8n workflows', error, { module: 'N8nWorkflowsAPI' })
      const message = error instanceof Error ? error.message : 'Fehler beim Laden der Workflows'
      return apiError('INTERNAL_ERROR', message, 500)
    }
  })
}

// POST /api/v1/n8n/workflows - Workflow erstellen (JSON direkt)
export async function POST(request: NextRequest) {
  return withPermission(request, 'n8n_workflows', 'create', async (auth) => {
    try {
      const body = await request.json()

      if (!body.name && !body.nodes) {
        return apiError('VALIDATION_ERROR', 'Workflow-JSON mit name und nodes erforderlich', 400)
      }

      const workflow = await N8nService.createWorkflow(TENANT_ID, body)

      // Log erstellen
      N8nService.createWorkflowLog(TENANT_ID, {
        n8nWorkflowId: workflow.id,
        n8nWorkflowName: workflow.name,
        generatedJson: body,
        status: 'deployed',
        createdBy: auth.userId || undefined,
      }).catch((err) => {
        logger.error('Failed to log n8n workflow creation', err, { module: 'N8nWorkflowsAPI' })
      })

      return apiSuccess(workflow, undefined, 201)
    } catch (error) {
      logger.error('Failed to create n8n workflow', error, { module: 'N8nWorkflowsAPI' })
      const message = error instanceof Error ? error.message : 'Fehler beim Erstellen des Workflows'
      return apiError('INTERNAL_ERROR', message, 500)
    }
  })
}
