import { NextRequest } from 'next/server'
import { apiSuccess, apiServerError } from '@/lib/utils/api-response'
import { ProjectService } from '@/lib/services/project.service'
import { withPermission } from '@/lib/auth/require-permission'

export async function GET(request: NextRequest) {
  return withPermission(request, 'processes', 'read', async (auth) => {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || undefined
    const items = await ProjectService.list(auth.tenantId, status)
    return apiSuccess(items)
  })
}

export async function POST(request: NextRequest) {
  return withPermission(request, 'processes', 'create', async (auth) => {
    try {
      const body = await request.json()

      const project = await ProjectService.create(auth.tenantId, {
        ...body,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
      })
      return apiSuccess(project, undefined, 201)
    } catch {
      return apiServerError()
    }
  })
}
