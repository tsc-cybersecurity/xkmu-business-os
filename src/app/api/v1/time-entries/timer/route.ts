import { NextRequest } from 'next/server'
import { apiSuccess, apiError, apiServerError } from '@/lib/utils/api-response'
import { TimeEntryService } from '@/lib/services/time-entry.service'
import { withPermission } from '@/lib/auth/require-permission'

// POST /api/v1/time-entries/timer - Start or stop timer
export async function POST(request: NextRequest) {
  return withPermission(request, 'time_entries', 'create', async (auth) => {
    if (!auth.userId) return apiError('NO_USER', 'Timer erfordert einen angemeldeten Benutzer', 403)
    try {
      const body = await request.json()
      const { action } = body as { action: 'start' | 'stop' }

      if (action === 'start') {
        const entry = await TimeEntryService.startTimer(auth.tenantId, auth.userId, {
          companyId: body.companyId,
          description: body.description,
          hourlyRate: body.hourlyRate,
        })
        return apiSuccess(entry, undefined, 201)
      }

      if (action === 'stop') {
        const entry = await TimeEntryService.stopTimer(auth.tenantId, auth.userId)
        if (!entry) return apiError('NO_TIMER', 'Kein laufender Timer', 400)
        return apiSuccess(entry)
      }

      return apiError('BAD_ACTION', 'action: start oder stop erwartet', 400)
    } catch {
      return apiServerError()
    }
  })
}

// GET /api/v1/time-entries/timer - Get running timer
export async function GET(request: NextRequest) {
  return withPermission(request, 'time_entries', 'read', async (auth) => {
    if (!auth.userId) return apiSuccess(null)
    const running = await TimeEntryService.getRunningTimer(auth.tenantId, auth.userId)
    return apiSuccess(running)
  })
}
