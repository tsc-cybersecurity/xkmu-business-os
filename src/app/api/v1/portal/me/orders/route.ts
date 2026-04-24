import { NextRequest } from 'next/server'
import { z } from 'zod'
import { apiSuccess, apiError, apiValidationError } from '@/lib/utils/api-response'
import { validateAndParse, formatZodErrors } from '@/lib/utils/validation'
import { withPortalAuth } from '@/lib/auth/with-portal-auth'
import { OrderService } from '@/lib/services/order.service'
import { AuditLogService } from '@/lib/services/audit-log.service'
import { OrganizationService } from '@/lib/services/organization.service'
import { CompanyService } from '@/lib/services/company.service'
import { CmsDesignService } from '@/lib/services/cms-design.service'
import { TaskQueueService } from '@/lib/services/task-queue.service'
import { db } from '@/lib/db'
import { documents, projects, orderCategories, orders } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { logger } from '@/lib/utils/logger'

const createSchema = z.object({
  categoryId: z.string().uuid().optional(),
  title: z.string().min(3).max(255),
  description: z.string().min(10),
  priority: z.enum(['hoch', 'mittel', 'niedrig', 'kritisch']).default('mittel'),
  contractId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
}).strict()

export async function POST(request: NextRequest) {
  return withPortalAuth(request, async (auth) => {
    try {
      const body = await request.json()
      const validation = validateAndParse(createSchema, body)
      if (!validation.success) {
        return apiValidationError(formatZodErrors(validation.errors))
      }
      const data = validation.data

      // Cross-company validation: contractId and projectId must belong to auth.companyId
      if (data.contractId) {
        const [ok] = await db
          .select({ id: documents.id })
          .from(documents)
          .where(and(
            eq(documents.id, data.contractId),
            eq(documents.type, 'contract'),
            eq(documents.companyId, auth.companyId),
          ))
          .limit(1)
        if (!ok) return apiError('VALIDATION_ERROR', 'Vertrag gehört nicht zu Ihrer Firma', 400)
      }
      if (data.projectId) {
        const [ok] = await db
          .select({ id: projects.id })
          .from(projects)
          .where(and(
            eq(projects.id, data.projectId),
            eq(projects.companyId, auth.companyId),
          ))
          .limit(1)
        if (!ok) return apiError('VALIDATION_ERROR', 'Projekt gehört nicht zu Ihrer Firma', 400)
      }
      if (data.categoryId) {
        const [ok] = await db
          .select({ id: orderCategories.id })
          .from(orderCategories)
          .where(and(
            eq(orderCategories.id, data.categoryId),
            eq(orderCategories.isActive, true),
          ))
          .limit(1)
        if (!ok) return apiError('VALIDATION_ERROR', 'Kategorie nicht verfügbar', 400)
      }

      const order = await OrderService.create({
        companyId: auth.companyId,
        requestedBy: auth.userId,
        categoryId: data.categoryId,
        title: data.title,
        description: data.description,
        priority: data.priority,
        contractId: data.contractId,
        projectId: data.projectId,
      })

      // Audit (fail-safe)
      try {
        await AuditLogService.log({
          userId: auth.userId,
          userRole: 'portal_user',
          action: 'portal.order_created',
          entityType: 'order',
          entityId: order.id,
          payload: {
            title: order.title,
            categoryId: order.categoryId,
            priority: order.priority,
            companyId: auth.companyId,
          },
          request,
        })
      } catch (err) {
        logger.error('Audit write failed for order_created', err, { module: 'PortalOrdersAPI' })
      }

      // Admin notification email (fail-safe)
      try {
        const [org, company, category] = await Promise.all([
          OrganizationService.getById(),
          CompanyService.getById(auth.companyId),
          order.categoryId
            ? (await db.select().from(orderCategories).where(eq(orderCategories.id, order.categoryId)).limit(1))[0]
            : null,
        ])
        if (org?.email) {
          const baseUrl = await CmsDesignService.getAppUrl()
          await TaskQueueService.create({
            type: 'email',
            priority: 2,
            payload: {
              templateSlug: 'portal_order_created_admin',
              to: org.email,
              placeholders: {
                kunde: auth.email,
                firma: company?.name ?? 'Unbekannte Firma',
                kategorie: category?.name ?? '—',
                titel: order.title,
                prioritaet: order.priority,
                pruefUrl: `${baseUrl}/intern/orders/${order.id}`,
              },
            },
            referenceType: 'order',
            referenceId: order.id,
          })
        }
      } catch (err) {
        logger.error('Admin notification email queue failed for order', err, { module: 'PortalOrdersAPI' })
      }

      return apiSuccess({
        id: order.id,
        status: order.status,
        title: order.title,
        priority: order.priority,
        createdAt: order.createdAt,
      }, undefined, 201)
    } catch (error) {
      logger.error('Failed to create order', error, { module: 'PortalOrdersAPI' })
      return apiError('CREATE_FAILED', 'Auftrag konnte nicht erstellt werden', 500)
    }
  })
}

export async function GET(request: NextRequest) {
  return withPortalAuth(request, async (auth) => {
    try {
      const rows = await db
        .select({
          id: orders.id,
          title: orders.title,
          status: orders.status,
          priority: orders.priority,
          categoryId: orders.categoryId,
          categoryName: orderCategories.name,
          categoryColor: orderCategories.color,
          createdAt: orders.createdAt,
          acceptedAt: orders.acceptedAt,
          completedAt: orders.completedAt,
          rejectedAt: orders.rejectedAt,
          cancelledAt: orders.cancelledAt,
        })
        .from(orders)
        .leftJoin(orderCategories, eq(orders.categoryId, orderCategories.id))
        .where(eq(orders.companyId, auth.companyId))
        .orderBy(desc(orders.createdAt))
        .limit(100)

      return apiSuccess(rows)
    } catch (error) {
      logger.error('Failed to list portal orders', error, { module: 'PortalOrdersAPI' })
      return apiError('LIST_FAILED', 'Aufträge konnten nicht geladen werden', 500)
    }
  })
}
