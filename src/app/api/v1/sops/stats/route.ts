import { NextRequest } from 'next/server'
import { eq, and, isNull, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { sopDocuments } from '@/lib/db/schema'
import { apiSuccess, apiServerError } from '@/lib/utils/api-response'
import { withPermission } from '@/lib/auth/require-permission'

const MATURITY_LABELS: Record<number, string> = {
  1: 'Anfaenger',
  2: 'Grundkenntnisse',
  3: 'Kompetent',
  4: 'Fortgeschritten',
  5: 'Experte',
}

export async function GET(request: NextRequest) {
  return withPermission(request, 'processes', 'read', async (auth) => {
    try {
      const rows = await db
        .select({
          level: sopDocuments.maturityLevel,
          count: sql<number>`count(*)::int`,
        })
        .from(sopDocuments)
        .where(
          and(
            eq(sopDocuments.tenantId, auth.tenantId),
            isNull(sopDocuments.deletedAt),
          )
        )
        .groupBy(sopDocuments.maturityLevel)

      const countMap: Record<number, number> = {}
      for (const row of rows) {
        if (row.level !== null) {
          countMap[row.level] = row.count
        }
      }

      const maturityDistribution = [1, 2, 3, 4, 5].map((level) => ({
        level,
        count: countMap[level] ?? 0,
        label: MATURITY_LABELS[level],
      }))

      const totalSops = maturityDistribution.reduce((sum, d) => sum + d.count, 0)

      return apiSuccess({ maturityDistribution, totalSops })
    } catch {
      return apiServerError()
    }
  })
}
