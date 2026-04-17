import { NextRequest } from 'next/server'
import { apiSuccess, apiError, apiServerError } from '@/lib/utils/api-response'
import { TimeEntryService } from '@/lib/services/time-entry.service'
import { withPermission } from '@/lib/auth/require-permission'
import { parsePaginationParams } from '@/lib/utils/api-response'
import { TENANT_ID } from '@/lib/constants/tenant'

export async function GET(request: NextRequest) {
  return withPermission(request, 'time_entries', 'read', async (auth) => {
    const { searchParams } = new URL(request.url)
    const pagination = parsePaginationParams(searchParams)
    const companyId = searchParams.get('companyId') || undefined
    const from = searchParams.get('from') ? new Date(searchParams.get('from')!) : undefined
    const to = searchParams.get('to') ? new Date(searchParams.get('to')!) : undefined

    const result = await TimeEntryService.list(TENANT_ID, {
      ...pagination,
      userId: auth.userId || undefined,
      companyId,
      from,
      to,
    })
    return apiSuccess(result.items, result.meta)
  })
}

export async function POST(request: NextRequest) {
  return withPermission(request, 'time_entries', 'create', async (auth) => {
    if (!auth.userId) return apiError('NO_USER', 'Zeiterfassung erfordert einen angemeldeten Benutzer', 403)
    try {
      const body = await request.json()
      const entry = await TimeEntryService.create(TENANT_ID, auth.userId, {
        companyId: body.companyId || undefined,
        description: body.description,
        date: new Date(body.date || new Date()),
        startTime: body.startTime ? new Date(body.startTime) : undefined,
        endTime: body.endTime ? new Date(body.endTime) : undefined,
        durationMinutes: body.durationMinutes,
        billable: body.billable,
        hourlyRate: body.hourlyRate,
      })
      return apiSuccess(entry, undefined, 201)
    } catch {
      return apiServerError()
    }
  })
}
