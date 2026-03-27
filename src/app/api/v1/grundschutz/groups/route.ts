import { NextRequest } from 'next/server'
import { apiSuccess, apiServerError } from '@/lib/utils/api-response'
import { GrundschutzCatalogService } from '@/lib/services/grundschutz-catalog.service'
import { withPermission } from '@/lib/auth/require-permission'

// GET — Alle Gruppen mit Control-Counts
export async function GET(request: NextRequest) {
  return withPermission(request, 'basisabsicherung', 'read', async () => {
    try {
      const groups = await GrundschutzCatalogService.listGroups()
      return apiSuccess(groups)
    } catch {
      return apiServerError()
    }
  })
}
