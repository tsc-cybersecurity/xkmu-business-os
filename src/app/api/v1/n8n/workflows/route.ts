import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/lib/utils/api-response'
import { withPermission } from '@/lib/auth/require-permission'
import { N8nService } from '@/lib/services/n8n.service'

// GET /api/v1/n8n/workflows - Workflows auflisten
export async function GET(request: NextRequest) {
  return withPermission(request, 'n8n_workflows', 'read', async (auth) => {
    try {
      const workflows = await N8nService.listWorkflows(auth.tenantId)
      return apiSuccess(workflows)
    } catch (error) {
      console.error('Failed to list n8n workflows:', error)
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

      const workflow = await N8nService.createWorkflow(auth.tenantId, body)

      // Log erstellen
      N8nService.createWorkflowLog(auth.tenantId, {
        n8nWorkflowId: workflow.id,
        n8nWorkflowName: workflow.name,
        generatedJson: body,
        status: 'deployed',
        createdBy: auth.userId || undefined,
      }).catch((err) => {
        console.error('Failed to log n8n workflow creation:', err)
      })

      return apiSuccess(workflow, undefined, 201)
    } catch (error) {
      console.error('Failed to create n8n workflow:', error)
      const message = error instanceof Error ? error.message : 'Fehler beim Erstellen des Workflows'
      return apiError('INTERNAL_ERROR', message, 500)
    }
  })
}
