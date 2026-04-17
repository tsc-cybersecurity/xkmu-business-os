import { NextRequest } from 'next/server'
import { apiSuccess, apiServerError } from '@/lib/utils/api-response'
import { ProcessService } from '@/lib/services/process.service'
import { withPermission } from '@/lib/auth/require-permission'
import { logger } from '@/lib/utils/logger'
import fs from 'fs/promises'
import path from 'path'
// POST /api/v1/processes/seed - Import processes from JSON files
export async function POST(request: NextRequest) {
  return withPermission(request, 'processes', 'create', async (auth) => {
    try {
      const body = await request.json().catch(() => ({}))

      let mainJson: unknown
      let newSopsJson: unknown

      if (body.mainJson && body.newSopsJson) {
        // Accept JSON data directly in request body
        mainJson = body.mainJson
        newSopsJson = body.newSopsJson
      } else {
        // Read from temp files on server
        const tempDir = path.join(process.cwd(), 'temp')
        const mainPath = path.join(tempDir, 'SOP_KI-Beratung_59_Aufgaben.json')
        const newSopsPath = path.join(tempDir, 'new_sops.json')

        const [mainRaw, newSopsRaw] = await Promise.all([
          fs.readFile(mainPath, 'utf-8'),
          fs.readFile(newSopsPath, 'utf-8'),
        ])

        mainJson = JSON.parse(mainRaw)
        newSopsJson = JSON.parse(newSopsRaw)
      }

      const result = await ProcessService.seed(mainJson as Parameters<typeof ProcessService.seed>[1],
        newSopsJson as Parameters<typeof ProcessService.seed>[2])

      logger.info(`Process seed complete: ${result.processCount} processes, ${result.taskCount} tasks`, { module: 'ProcessSeedAPI' })

      return apiSuccess(result, undefined, 201)
    } catch (error) {
      logger.error('Process seed error', error, { module: 'ProcessSeedAPI' })
      return apiServerError()
    }
  })
}
