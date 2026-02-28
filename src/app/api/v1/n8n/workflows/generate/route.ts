import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/lib/utils/api-response'
import { withPermission } from '@/lib/auth/require-permission'
import { N8nWorkflowBuilderService } from '@/lib/services/ai/n8n-workflow-builder.service'

// POST /api/v1/n8n/workflows/generate - Workflow aus Beschreibung generieren
export async function POST(request: NextRequest) {
  return withPermission(request, 'n8n_workflows', 'create', async (auth) => {
    try {
      const body = await request.json()

      if (!body.prompt) {
        return apiError('VALIDATION_ERROR', 'prompt ist erforderlich', 400)
      }

      if (body.autoDeploy) {
        const result = await N8nWorkflowBuilderService.generateAndDeploy(
          auth.tenantId,
          auth.userId || null,
          body.prompt
        )

        return apiSuccess({
          workflowJson: result.workflowJson,
          workflowId: result.workflowId,
          logId: result.logId,
          status: 'deployed',
        }, undefined, 201)
      }

      const result = await N8nWorkflowBuilderService.generateWorkflow(
        auth.tenantId,
        auth.userId || null,
        body.prompt
      )

      return apiSuccess({
        workflowJson: result.workflowJson,
        logId: result.logId,
        status: 'draft',
      })
    } catch (error) {
      console.error('Failed to generate n8n workflow:', error)
      const message = error instanceof Error ? error.message : 'Fehler bei der Workflow-Generierung'
      return apiError('INTERNAL_ERROR', message, 500)
    }
  })
}
