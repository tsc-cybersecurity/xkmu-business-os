import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/lib/utils/api-response'
import { withPermission } from '@/lib/auth/require-permission'
import { db } from '@/lib/db'
import { orders, orderCategories, companies, users } from '@/lib/db/schema'
import { eq, and, desc, inArray } from 'drizzle-orm'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  return withPermission(request, 'users', 'read', async () => {
    try {
      const { searchParams } = new URL(request.url)
      const status = searchParams.get('status')
      const priority = searchParams.get('priority')
      const categoryId = searchParams.get('categoryId')
      const companyId = searchParams.get('companyId')
      const assignedTo = searchParams.get('assignedTo')
      const limitParam = searchParams.get('limit')
      const offsetParam = searchParams.get('offset')

      const limit = Math.min(parseInt(limitParam ?? '100', 10) || 100, 500)
      const offset = Math.max(parseInt(offsetParam ?? '0', 10) || 0, 0)

      const conditions = []

      // status can be a comma-separated list ("pending,accepted,in_progress")
      if (status) {
        const statuses = status.split(',').map(s => s.trim()).filter(Boolean)
        if (statuses.length === 1) conditions.push(eq(orders.status, statuses[0]))
        else if (statuses.length > 1) conditions.push(inArray(orders.status, statuses))
      }
      if (priority) conditions.push(eq(orders.priority, priority))
      if (categoryId) conditions.push(eq(orders.categoryId, categoryId))
      if (companyId) conditions.push(eq(orders.companyId, companyId))
      if (assignedTo) conditions.push(eq(orders.assignedTo, assignedTo))

      const rows = await db
        .select({
          id: orders.id,
          title: orders.title,
          status: orders.status,
          priority: orders.priority,
          categoryId: orders.categoryId,
          categoryName: orderCategories.name,
          categoryColor: orderCategories.color,
          companyId: orders.companyId,
          companyName: companies.name,
          assignedTo: orders.assignedTo,
          assignedToName: users.email,  // Email as display; names joined below not needed for queue
          createdAt: orders.createdAt,
          acceptedAt: orders.acceptedAt,
          completedAt: orders.completedAt,
        })
        .from(orders)
        .leftJoin(orderCategories, eq(orders.categoryId, orderCategories.id))
        .leftJoin(companies, eq(orders.companyId, companies.id))
        .leftJoin(users, eq(orders.assignedTo, users.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(orders.createdAt))
        .limit(limit)
        .offset(offset)

      return apiSuccess(rows)
    } catch (error) {
      logger.error('Failed to list orders (admin)', error, { module: 'AdminOrdersAPI' })
      return apiError('LIST_FAILED', 'Aufträge konnten nicht geladen werden', 500)
    }
  })
}
