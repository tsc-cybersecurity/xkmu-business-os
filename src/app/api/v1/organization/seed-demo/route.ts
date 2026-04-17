import { NextRequest } from 'next/server'
import { withPermission } from '@/lib/auth/require-permission'
import { apiSuccess, apiError, apiServerError } from '@/lib/utils/api-response'
import { OrganizationSeedService } from '@/lib/services/organization-seed.service'
import { logger } from '@/lib/utils/logger'
export async function POST(request: NextRequest) {
  return withPermission(request, 'settings', 'update', async (auth) => {
    try {
      if (!auth.userId) {
        return apiError('MISSING_USER', 'Benutzer-ID fehlt', 400)
      }

      const result = await OrganizationSeedService.seedDemoData(auth.userId)

      return apiSuccess({
        message: 'Demo-Daten erfolgreich importiert',
        ...result,
      })
    } catch (error) {
      logger.error('Seed demo data error', error, { module: 'OrganizationSeedDemoAPI' })
      return apiServerError('Fehler beim Importieren der Demo-Daten')
    }
  })
}
