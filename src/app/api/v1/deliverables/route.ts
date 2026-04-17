import { NextRequest } from 'next/server'
import { apiSuccess, apiServerError, parsePaginationParams } from '@/lib/utils/api-response'
import { DeliverableService } from '@/lib/services/deliverable.service'
import { withPermission } from '@/lib/auth/require-permission'
export async function GET(request: NextRequest) {
  return withPermission(request, 'processes', 'read', async (auth) => {
    const { searchParams } = new URL(request.url)
    // Support both moduleId (UUID) and module (code like "A1")
    const moduleId = searchParams.get('moduleId') || undefined
    const moduleCode = searchParams.get('module') || undefined
    const categoryCode = searchParams.get('categoryCode') || searchParams.get('category') || undefined
    const status = searchParams.get('status') || undefined
    const { page, limit } = parsePaginationParams(searchParams)
    const pageNum = page ?? 1
    const limitNum = limit ?? 200

    // If module code given, resolve to moduleId
    let resolvedModuleId = moduleId
    if (!resolvedModuleId && moduleCode) {
      const modules = await DeliverableService.getModulesWithCount()
      const found = modules.find(m => m.code === moduleCode)
      resolvedModuleId = found?.id
    }

    const all = await DeliverableService.list({ moduleId: resolvedModuleId, categoryCode, status })
    const total = all.length
    const items = all.slice((pageNum - 1) * limitNum, pageNum * limitNum)
    return apiSuccess(items, { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) })
  })
}

export async function POST(request: NextRequest) {
  return withPermission(request, 'processes', 'create', async (auth) => {
    try {
      const body = await request.json()
      const deliverable = await DeliverableService.create(body)
      return apiSuccess(deliverable, undefined, 201)
    } catch { return apiServerError() }
  })
}
