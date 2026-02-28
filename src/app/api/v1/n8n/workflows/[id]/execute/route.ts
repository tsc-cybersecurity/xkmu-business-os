import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/lib/utils/api-response'
import { withPermission } from '@/lib/auth/require-permission'
import { N8nService } from '@/lib/services/n8n.service'

// POST /api/v1/n8n/workflows/[id]/execute - Workflow ausführen
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'n8n_workflows', 'create', async (auth) => {
    try {
      const { id } = await params
      const body = await request.json().catch(() => ({}))

      const result = await N8nService.executeWorkflow(auth.tenantId, id, body.data)
      return apiSuccess(result)
    } catch (error) {
      console.error('Failed to execute n8n workflow:', error)
      const message = error instanceof Error ? error.message : 'Fehler beim Ausführen des Workflows'
      return apiError('INTERNAL_ERROR', message, 500)
    }
  })
}
