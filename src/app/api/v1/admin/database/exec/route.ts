import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/lib/utils/api-response'
import { withPermission } from '@/lib/auth/require-permission'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { logger } from '@/lib/utils/logger'

export const dynamic = 'force-dynamic'

/**
 * Admin-only: Fuehrt beliebiges SQL aus und gibt den echten PG-Fehler zurueck.
 * NUR FUER DEBUG/MAINTENANCE.
 */
export async function POST(request: NextRequest) {
  return withPermission(request, 'database', 'create', async () => {
    try {
      const body = await request.json() as { sql?: string }
      const sqlText = body?.sql
      if (!sqlText || typeof sqlText !== 'string') {
        return apiError('BAD_REQUEST', 'Missing sql field', 400)
      }

      try {
        const result = await db.execute(sql.raw(sqlText))
        return apiSuccess({
          ok: true,
          rowCount: Array.isArray(result) ? result.length : 0,
          rows: Array.isArray(result) ? (result as unknown[]).slice(0, 100) : result,
        })
      } catch (pgError) {
        const e = pgError as Record<string, unknown>
        // Extract ALL own properties including non-enumerable ones
        const dump: Record<string, unknown> = {}
        for (const key of Object.getOwnPropertyNames(e)) {
          const v = e[key]
          if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
            dump[key] = v
          } else if (v === null) {
            dump[key] = null
          } else if (v && typeof v === 'object') {
            try { dump[key] = JSON.stringify(v).slice(0, 300) } catch { dump[key] = '[unstringifiable]' }
          }
        }
        dump._constructor = (pgError as { constructor?: { name?: string } })?.constructor?.name || 'unknown'
        dump._toString = String(pgError).slice(0, 500)
        logger.error('SQL exec failed', pgError, { module: 'ExecAPI' })
        return apiSuccess({ ok: false, error: dump })
      }
    } catch (error) {
      return apiError('INTERNAL', error instanceof Error ? error.message : 'exec failed', 500)
    }
  })
}
