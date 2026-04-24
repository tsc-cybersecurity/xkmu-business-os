import { NextRequest } from 'next/server'
import { apiSuccess, apiError, apiNotFound } from '@/lib/utils/api-response'
import { withPortalAuth } from '@/lib/auth/with-portal-auth'
import { OrderService } from '@/lib/services/order.service'
import { AuditLogService } from '@/lib/services/audit-log.service'
import { db } from '@/lib/db'
import { orders, orderCategories, documents, projects } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { logger } from '@/lib/utils/logger'

type Params = Promise<{ id: string }>

export async function GET(request: NextRequest, { params }: { params: Params }) {
  return withPortalAuth(request, async (auth) => {
    const { id } = await params
    try {
      const [row] = await db
        .select({
          id: orders.id,
          title: orders.title,
          description: orders.description,
          status: orders.status,
          priority: orders.priority,
          rejectReason: orders.rejectReason,
          categoryId: orders.categoryId,
          categoryName: orderCategories.name,
          categoryColor: orderCategories.color,
          contractId: orders.contractId,
          contractNumber: documents.number,
          projectId: orders.projectId,
          projectName: projects.name,
          createdAt: orders.createdAt,
          acceptedAt: orders.acceptedAt,
          startedAt: orders.startedAt,
          completedAt: orders.completedAt,
          rejectedAt: orders.rejectedAt,
          cancelledAt: orders.cancelledAt,
        })
        .from(orders)
        .leftJoin(orderCategories, eq(orders.categoryId, orderCategories.id))
        .leftJoin(documents, eq(orders.contractId, documents.id))
        .leftJoin(projects, eq(orders.projectId, projects.id))
        .where(and(
          eq(orders.id, id),
          eq(orders.companyId, auth.companyId),
        ))
        .limit(1)

      if (!row) return apiNotFound('Auftrag nicht gefunden')
      return apiSuccess(row)
    } catch (error) {
      logger.error('Failed to load portal order detail', error, { module: 'PortalOrdersAPI' })
      return apiError('LOAD_FAILED', 'Auftrag konnte nicht geladen werden', 500)
    }
  })
}

export async function DELETE(request: NextRequest, { params }: { params: Params }) {
  return withPortalAuth(request, async (auth) => {
    const { id } = await params
    try {
      const ok = await OrderService.cancel(id, auth.userId)
      if (!ok) return apiNotFound('Auftrag nicht gefunden oder nicht stornierbar')

      try {
        await AuditLogService.log({
          userId: auth.userId,
          userRole: 'portal_user',
          action: 'portal.order_cancelled',
          entityType: 'order',
          entityId: id,
          payload: { companyId: auth.companyId },
          request,
        })
      } catch (err) {
        logger.error('Audit write failed for order_cancelled', err, { module: 'PortalOrdersAPI' })
      }

      return apiSuccess({ cancelled: true })
    } catch (error) {
      logger.error('Failed to cancel order', error, { module: 'PortalOrdersAPI' })
      return apiError('CANCEL_FAILED', 'Auftrag konnte nicht storniert werden', 500)
    }
  })
}
