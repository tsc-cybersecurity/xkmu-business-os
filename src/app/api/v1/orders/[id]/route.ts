import { NextRequest } from 'next/server'
import { z } from 'zod'
import { apiSuccess, apiError, apiNotFound, apiValidationError } from '@/lib/utils/api-response'
import { validateAndParse, formatZodErrors } from '@/lib/utils/validation'
import { withPermission } from '@/lib/auth/require-permission'
import { OrderService } from '@/lib/services/order.service'
import { AuditLogService } from '@/lib/services/audit-log.service'
import { OrganizationService } from '@/lib/services/organization.service'
import { CompanyService } from '@/lib/services/company.service'
import { CmsDesignService } from '@/lib/services/cms-design.service'
import { TaskQueueService } from '@/lib/services/task-queue.service'
import { db } from '@/lib/db'
import { orders, orderCategories, companies, users, documents, projects } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { logger } from '@/lib/utils/logger'

type Params = Promise<{ id: string }>

export async function GET(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'users', 'read', async () => {
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
          companyId: orders.companyId,
          companyName: companies.name,
          requestedBy: orders.requestedBy,
          requestedByEmail: users.email,
          contractId: orders.contractId,
          contractNumber: documents.number,
          projectId: orders.projectId,
          projectName: projects.name,
          assignedTo: orders.assignedTo,
          createdAt: orders.createdAt,
          acceptedAt: orders.acceptedAt,
          startedAt: orders.startedAt,
          completedAt: orders.completedAt,
          rejectedAt: orders.rejectedAt,
          cancelledAt: orders.cancelledAt,
          updatedAt: orders.updatedAt,
        })
        .from(orders)
        .leftJoin(orderCategories, eq(orders.categoryId, orderCategories.id))
        .leftJoin(companies, eq(orders.companyId, companies.id))
        .leftJoin(users, eq(orders.requestedBy, users.id))
        .leftJoin(documents, eq(orders.contractId, documents.id))
        .leftJoin(projects, eq(orders.projectId, projects.id))
        .where(eq(orders.id, id))
        .limit(1)

      if (!row) return apiNotFound('Auftrag nicht gefunden')
      return apiSuccess(row)
    } catch (error) {
      logger.error('Failed to load order detail (admin)', error, { module: 'AdminOrdersAPI' })
      return apiError('LOAD_FAILED', 'Auftrag konnte nicht geladen werden', 500)
    }
  })
}

const patchSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('accept') }),
  z.object({ action: z.literal('start') }),
  z.object({ action: z.literal('complete') }),
  z.object({ action: z.literal('reject'), rejectReason: z.string().min(1).max(1000) }),
  z.object({ action: z.literal('assign'), assignedTo: z.string().uuid().nullable() }),
])

export async function PATCH(request: NextRequest, { params }: { params: Params }) {
  return withPermission(request, 'users', 'update', async (auth) => {
    if (!auth.userId) {
      return apiError('FORBIDDEN', 'API-Key darf keine Auftrags-Aktionen ausführen', 403)
    }
    const { id } = await params
    try {
      const body = await request.json()
      const validation = validateAndParse(patchSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }
      const data = validation.data

      if (data.action === 'assign') {
        try {
          const updated = await OrderService.assign(id, data.assignedTo)
          try {
            await AuditLogService.log({
              userId: auth.userId,
              userRole: auth.role,
              action: 'admin.order_assigned',
              entityType: 'order',
              entityId: id,
              payload: { assignedTo: data.assignedTo },
              request,
            })
          } catch (err) {
            logger.error('Audit write failed for order_assigned', err, { module: 'AdminOrdersAPI' })
          }
          return apiSuccess({ id: updated.id, assignedTo: updated.assignedTo })
        } catch (error) {
          if (error instanceof Error && error.message === 'NOT_FOUND') {
            return apiNotFound('Auftrag nicht gefunden')
          }
          throw error
        }
      }

      // action is one of: accept, start, complete, reject
      const before = await OrderService.getById(id)
      if (!before) return apiNotFound('Auftrag nicht gefunden')

      try {
        const rejectReason = data.action === 'reject' ? data.rejectReason : undefined
        const updated = await OrderService.transitionStatus(id, data.action, rejectReason)

        // Audit
        try {
          await AuditLogService.log({
            userId: auth.userId,
            userRole: auth.role,
            action: 'admin.order_status_changed',
            entityType: 'order',
            entityId: id,
            payload: {
              from: before.status,
              to: updated.status,
              action: data.action,
              ...(rejectReason ? { rejectReason } : {}),
            },
            request,
          })
        } catch (err) {
          logger.error('Audit write failed for order_status_changed', err, { module: 'AdminOrdersAPI' })
        }

        // Customer notification email (fail-safe)
        if (before.requestedBy) {
          try {
            const [requester] = await db
              .select({ email: users.email, firstName: users.firstName, lastName: users.lastName })
              .from(users).where(eq(users.id, before.requestedBy)).limit(1)
            if (requester?.email) {
              const [org, company] = await Promise.all([
                OrganizationService.getById(),
                CompanyService.getById(before.companyId),
              ])
              const baseUrl = await CmsDesignService.getAppUrl()

              const STATUS_DE: Record<string, string> = {
                pending: 'offen',
                accepted: 'angenommen',
                in_progress: 'in Bearbeitung',
                done: 'abgeschlossen',
                rejected: 'abgelehnt',
                cancelled: 'storniert',
              }
              const esc = (s: string) => s
                .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
              const rejectReasonBlock = rejectReason
                ? `<p><strong>Begründung:</strong><br>${esc(rejectReason)}</p>`
                : ''

              await TaskQueueService.create({
                type: 'email',
                priority: 2,
                payload: {
                  templateSlug: 'portal_order_status_changed',
                  to: requester.email,
                  placeholders: {
                    name: `${requester.firstName ?? ''} ${requester.lastName ?? ''}`.trim() || requester.email,
                    firma: company?.name ?? 'Ihre Firma',
                    titel: updated.title,
                    statusAlt: STATUS_DE[before.status] ?? before.status,
                    statusNeu: STATUS_DE[updated.status] ?? updated.status,
                    rejectReasonBlock,
                    portalUrl: `${baseUrl}/portal/orders/${id}`,
                    absender: org?.name ?? 'Ihr Team',
                  },
                },
                referenceType: 'order',
                referenceId: id,
              })
            }
          } catch (err) {
            logger.error('Customer notification email queue failed for order', err, { module: 'AdminOrdersAPI' })
          }
        }

        return apiSuccess({
          id: updated.id,
          status: updated.status,
          acceptedAt: updated.acceptedAt,
          startedAt: updated.startedAt,
          completedAt: updated.completedAt,
          rejectedAt: updated.rejectedAt,
          rejectReason: updated.rejectReason,
        })
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === 'NOT_FOUND') return apiNotFound('Auftrag nicht gefunden')
          if (error.message === 'INVALID_TRANSITION') {
            return apiError('INVALID_TRANSITION', `Übergang von ${before.status} über "${data.action}" nicht erlaubt`, 409)
          }
        }
        throw error
      }
    } catch (error) {
      logger.error('Failed to patch order', error, { module: 'AdminOrdersAPI' })
      return apiError('PATCH_FAILED', 'Aktion konnte nicht ausgeführt werden', 500)
    }
  })
}
