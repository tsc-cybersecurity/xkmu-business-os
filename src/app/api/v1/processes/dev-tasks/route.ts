import { NextRequest } from 'next/server'
import { apiSuccess, apiServerError } from '@/lib/utils/api-response'
import { ProcessService } from '@/lib/services/process.service'
import { withPermission } from '@/lib/auth/require-permission'
// GET /api/v1/processes/dev-tasks - List all tasks with dev requirements
export async function GET(request: NextRequest) {
  return withPermission(request, 'processes', 'read', async (auth) => {
    try {
      const tasks = await ProcessService.listDevTasks()
      return apiSuccess(tasks)
    } catch {
      return apiServerError()
    }
  })
}
