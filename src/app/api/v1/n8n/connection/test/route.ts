import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/lib/utils/api-response'
import { withPermission } from '@/lib/auth/require-permission'
import { N8nService } from '@/lib/services/n8n.service'

// POST /api/v1/n8n/connection/test - Verbindung testen
export async function POST(request: NextRequest) {
  return withPermission(request, 'n8n_workflows', 'update', async (auth) => {
    try {
      const result = await N8nService.testConnection(auth.tenantId)
      return apiSuccess(result)
    } catch (error) {
      console.error('Failed to test n8n connection:', error)
      return apiError('INTERNAL_ERROR', 'Fehler beim Testen der n8n-Verbindung', 500)
    }
  })
}
