import { NextRequest } from 'next/server'
import { apiSuccess, apiServerError } from '@/lib/utils/api-response'
import { withPermission } from '@/lib/auth/require-permission'
import { AvailabilityService } from '@/lib/services/availability.service'
import { logger } from '@/lib/utils/logger'

// Diagnose-Endpoint fuer den Verfuegbarkeits-Renderbug. Liefert die rohen Rules
// und alle Overrides der naechsten 30 Tage so wie sie in der DB liegen — damit
// erkennbar ist, ob etwa eine Rule-Endzeit > 18:00 in der DB steht obwohl die
// UI 18:00 zeigt, oder ob ein 'free'-Override Abend-Slots aufmacht.
export async function GET(request: NextRequest) {
  return withPermission(request, 'appointments', 'read', async (auth) => {
    try {
      const userId = auth.userId
      if (!userId) return apiServerError('no userId')
      const from = new Date()
      from.setDate(from.getDate() - 7)
      const to = new Date()
      to.setDate(to.getDate() + 30)

      const [rules, overrides] = await Promise.all([
        AvailabilityService.listRules(userId),
        AvailabilityService.listOverrides(userId, from, to),
      ])

      return apiSuccess({
        userId,
        now: new Date().toISOString(),
        rangeFrom: from.toISOString(),
        rangeTo: to.toISOString(),
        rules: rules.map((r) => ({
          id: r.id,
          dayOfWeek: r.dayOfWeek,
          startTime: r.startTime,
          endTime: r.endTime,
          isActive: r.isActive,
          createdAt: r.createdAt,
        })),
        overrides: overrides.map((o) => ({
          id: o.id,
          startAt: o.startAt.toISOString(),
          endAt: o.endAt.toISOString(),
          kind: o.kind,
          reason: o.reason,
        })),
      })
    } catch (error) {
      logger.error('Availability diagnose failed', error, { module: 'AvailabilityDiagnoseAPI' })
      return apiServerError()
    }
  })
}
