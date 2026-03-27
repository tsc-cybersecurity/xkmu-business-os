import { NextRequest } from 'next/server'
import { apiSuccess, apiNotFound, apiServerError } from '@/lib/utils/api-response'
import { GrundschutzCatalogService } from '@/lib/services/grundschutz-catalog.service'
import { withPermission } from '@/lib/auth/require-permission'

// GET — Einzelnen Control abrufen
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, 'basisabsicherung', 'read', async () => {
    try {
      const { id } = await params
      const control = await GrundschutzCatalogService.getControl(id)
      if (!control) return apiNotFound('Control nicht gefunden')
      return apiSuccess(control)
    } catch {
      return apiServerError()
    }
  })
}
