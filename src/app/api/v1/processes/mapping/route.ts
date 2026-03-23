import { NextRequest } from 'next/server'
import { apiSuccess, apiServerError } from '@/lib/utils/api-response'
import { ProcessService } from '@/lib/services/process.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'

// POST /api/v1/processes/mapping - Bulk update app mapping for tasks
export async function POST(request: NextRequest) {
  return withPermission(request, 'processes', 'update', async (auth) => {
    try {
      const body = await request.json() as Record<string, {
        appStatus?: string
        appModule?: string | null
        appNotes?: string
        devRequirements?: unknown
      }>

      let updated = 0
      for (const [taskKey, mapping] of Object.entries(body)) {
        const success = await ProcessService.updateTaskByKey(auth.tenantId, taskKey, {
          ...mapping,
        })
        if (success) updated++
      }

      logger.info(`Process mapping updated: ${updated}/${Object.keys(body).length} tasks`, { module: 'ProcessMappingAPI' })
      return apiSuccess({ updated, total: Object.keys(body).length })
    } catch (error) {
      logger.error('Process mapping error', error, { module: 'ProcessMappingAPI' })
      return apiServerError()
    }
  })
}
