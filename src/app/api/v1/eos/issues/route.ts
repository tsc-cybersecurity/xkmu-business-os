import { NextRequest } from 'next/server'
import { apiSuccess, apiServerError } from '@/lib/utils/api-response'
import { EosService } from '@/lib/services/eos.service'
import { withPermission } from '@/lib/auth/require-permission'
export async function GET(request: NextRequest) {
  return withPermission(request, 'processes', 'read', async (auth) => {
    const status = new URL(request.url).searchParams.get('status') || undefined
    const issues = await EosService.listIssues(status)
    return apiSuccess(issues)
  })
}

export async function POST(request: NextRequest) {
  return withPermission(request, 'processes', 'create', async (auth) => {
    try {
      const body = await request.json()
      const issue = await EosService.createIssue({ ...body, createdBy: auth.userId })
      return apiSuccess(issue, undefined, 201)
    } catch { return apiServerError() }
  })
}
