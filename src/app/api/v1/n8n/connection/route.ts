import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/lib/utils/api-response'
import { withPermission } from '@/lib/auth/require-permission'
import { N8nService } from '@/lib/services/n8n.service'
import { logger } from '@/lib/utils/logger'

// GET /api/v1/n8n/connection - Verbindung anzeigen
export async function GET(request: NextRequest) {
  return withPermission(request, 'n8n_workflows', 'read', async (auth) => {
    try {
      const conn = await N8nService.getConnection(auth.tenantId)

      if (!conn) {
        return apiSuccess(null)
      }

      return apiSuccess({
        ...conn,
        apiKey: conn.apiKey ? `****${conn.apiKey.slice(-4)}` : null,
      })
    } catch (error) {
      logger.error('Failed to get n8n connection', error, { module: 'N8nConnectionAPI' })
      return apiError('INTERNAL_ERROR', 'Fehler beim Laden der n8n-Verbindung', 500)
    }
  })
}

// POST /api/v1/n8n/connection - Verbindung erstellen/aktualisieren
export async function POST(request: NextRequest) {
  return withPermission(request, 'n8n_workflows', 'update', async (auth) => {
    try {
      const body = await request.json()

      if (!body.apiUrl || !body.apiKey) {
        return apiError('VALIDATION_ERROR', 'apiUrl und apiKey sind erforderlich', 400)
      }

      const conn = await N8nService.upsertConnection(auth.tenantId, {
        name: body.name || 'n8n Cloud',
        apiUrl: body.apiUrl,
        apiKey: body.apiKey,
      })

      return apiSuccess({
        ...conn,
        apiKey: conn.apiKey ? `****${conn.apiKey.slice(-4)}` : null,
      })
    } catch (error) {
      logger.error('Failed to save n8n connection', error, { module: 'N8nConnectionAPI' })
      return apiError('INTERNAL_ERROR', 'Fehler beim Speichern der n8n-Verbindung', 500)
    }
  })
}
