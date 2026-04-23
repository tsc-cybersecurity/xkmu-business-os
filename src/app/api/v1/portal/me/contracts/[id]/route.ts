import { NextRequest } from 'next/server'
import { apiSuccess, apiError, apiNotFound } from '@/lib/utils/api-response'
import { withPortalAuth } from '@/lib/auth/with-portal-auth'
import { db } from '@/lib/db'
import { documents, documentItems } from '@/lib/db/schema'
import { eq, and, asc } from 'drizzle-orm'
import { sanitizeHtml } from '@/lib/utils/sanitize'
import { logger } from '@/lib/utils/logger'

type Params = Promise<{ id: string }>

export async function GET(request: NextRequest, { params }: { params: Params }) {
  return withPortalAuth(request, async (auth) => {
    const { id } = await params
    try {
      const [contract] = await db
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
          notes: documents.notes,
          paymentTerms: documents.paymentTerms,
          contractBodyHtml: documents.contractBodyHtml,
          createdAt: documents.createdAt,
        })
        .from(documents)
        .where(and(
          eq(documents.id, id),
          eq(documents.type, 'contract'),
          eq(documents.companyId, auth.companyId),
        ))
        .limit(1)

      if (!contract) return apiNotFound('Vertrag nicht gefunden')

      const items = await db
        .select({
          id: documentItems.id,
          position: documentItems.position,
          name: documentItems.name,
          description: documentItems.description,
          quantity: documentItems.quantity,
          unit: documentItems.unit,
          unitPrice: documentItems.unitPrice,
          vatRate: documentItems.vatRate,
          lineTotal: documentItems.lineTotal,
        })
        .from(documentItems)
        .where(eq(documentItems.documentId, id))
        .orderBy(asc(documentItems.position))

      const safeBodyHtml = contract.contractBodyHtml
        ? sanitizeHtml(contract.contractBodyHtml)
        : null

      return apiSuccess({
        ...contract,
        contractBodyHtml: safeBodyHtml,
        items,
      })
    } catch (error) {
      logger.error('Failed to load portal contract detail', error, { module: 'PortalContractsAPI' })
      return apiError('LOAD_FAILED', 'Vertrag konnte nicht geladen werden', 500)
    }
  })
}
