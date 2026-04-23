import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/lib/utils/api-response'
import { withPortalAuth } from '@/lib/auth/with-portal-auth'
import { db } from '@/lib/db'
import { documents } from '@/lib/db/schema'
import { eq, and, desc, sql } from 'drizzle-orm'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  return withPortalAuth(request, async (auth) => {
    try {
      const rows = await db
        .select({
          id: documents.id,
          number: documents.number,
          status: documents.status,
          contractStartDate: documents.contractStartDate,
          contractEndDate: documents.contractEndDate,
          contractRenewalType: documents.contractRenewalType,
          contractRenewalPeriod: documents.contractRenewalPeriod,
          contractNoticePeriodDays: documents.contractNoticePeriodDays,
          subtotal: documents.subtotal,
          taxTotal: documents.taxTotal,
          total: documents.total,
          createdAt: documents.createdAt,
        })
        .from(documents)
        .where(and(
          eq(documents.type, 'contract'),
          eq(documents.companyId, auth.companyId),
        ))
        .orderBy(sql`${documents.contractStartDate} DESC NULLS LAST`, desc(documents.createdAt))
      return apiSuccess(rows)
    } catch (error) {
      logger.error('Failed to list portal contracts', error, { module: 'PortalContractsAPI' })
      return apiError('LIST_FAILED', 'Verträge konnten nicht geladen werden', 500)
    }
  })
}
