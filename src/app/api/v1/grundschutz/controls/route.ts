import { NextRequest } from 'next/server'
import { apiSuccess, apiServerError } from '@/lib/utils/api-response'
import { GrundschutzCatalogService } from '@/lib/services/grundschutz-catalog.service'
import { withPermission } from '@/lib/auth/require-permission'

// GET — Controls einer Gruppe (mit Filter)
export async function GET(request: NextRequest) {
  return withPermission(request, 'basisabsicherung', 'read', async () => {
    try {
      const { searchParams } = new URL(request.url)
      const groupId = searchParams.get('groupId')
      if (!groupId) return apiSuccess([])

      const secLevel = searchParams.get('secLevel') || undefined
      const search = searchParams.get('search') || undefined

      const controls = await GrundschutzCatalogService.listControls(groupId, { secLevel, search })
      return apiSuccess(controls)
    } catch {
      return apiServerError()
    }
  })
}
