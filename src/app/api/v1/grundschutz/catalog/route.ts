import { NextRequest } from 'next/server'
import { apiSuccess, apiServerError } from '@/lib/utils/api-response'
import { GrundschutzCatalogService } from '@/lib/services/grundschutz-catalog.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

// GET — Katalog-Metadaten + Update-Check
export async function GET(request: NextRequest) {
  return withPermission(request, 'basisabsicherung', 'read', async () => {
    try {
      const meta = await GrundschutzCatalogService.getMeta()
      const updateInfo = await GrundschutzCatalogService.checkForUpdate()
      return apiSuccess({ meta, ...updateInfo })
    } catch (error) {
      logger.error('Grundschutz catalog meta error', error, { module: 'GrundschutzCatalogAPI' })
      return apiServerError()
    }
  })
}

// POST — Katalog von GitHub importieren/aktualisieren
export async function POST(request: NextRequest) {
  return withPermission(request, 'basisabsicherung', 'create', async () => {
    try {
      const result = await GrundschutzCatalogService.importFromGitHub()
      return apiSuccess(result)
    } catch (error) {
      logger.error('Grundschutz catalog import error', error, { module: 'GrundschutzCatalogAPI' })
      return apiServerError('Import fehlgeschlagen')
    }
  })
}
