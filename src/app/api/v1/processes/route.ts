import { NextRequest } from 'next/server'
import { apiSuccess, apiServerError, apiValidationError } from '@/lib/utils/api-response'
import { ProcessService } from '@/lib/services/process.service'
import { withPermission } from '@/lib/auth/require-permission'
import { validateAndParse, formatZodErrors, createProcessSchema } from '@/lib/utils/validation'
import { TENANT_ID } from '@/lib/constants/tenant'

// GET /api/v1/processes - List all process areas
export async function GET(request: NextRequest) {
  return withPermission(request, 'processes', 'read', async (auth) => {
    const items = await ProcessService.list(TENANT_ID)
    return apiSuccess(items)
  })
}

// POST /api/v1/processes - Create a new process area
export async function POST(request: NextRequest) {
  return withPermission(request, 'processes', 'create', async (auth) => {
    try {
      const body = await request.json()
      const validation = validateAndParse(createProcessSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors!))
      }
      const process = await ProcessService.create(TENANT_ID, validation.data!)
      return apiSuccess(process, undefined, 201)
    } catch {
      return apiServerError()
    }
  })
}
