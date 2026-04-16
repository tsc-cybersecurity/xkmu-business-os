import { db } from '@/lib/db'
import { activities, leads, companies, persons, users } from '@/lib/db/schema'
import { eq, and, count, desc, getTableColumns } from 'drizzle-orm'
import type { Activity, NewActivity } from '@/lib/db/schema'
import { TENANT_ID } from '@/lib/constants/tenant'

export interface ActivityFilters {
  leadId?: string
  companyId?: string
  personId?: string
  type?: string
  page?: number
  limit?: number
}

export interface CreateActivityInput {
  leadId?: string | null
  companyId?: string | null
  personId?: string | null
  type: string
  subject?: string | null
  content?: string | null
  metadata?: Record<string, unknown>
}

export const ActivityService = {
  async create(_tenantId: string, data: CreateActivityInput, userId?: string | null): Promise<Activity> {
    const [activity] = await db
      .insert(activities)
      .values({
        tenantId: TENANT_ID,
        leadId: data.leadId || undefined,
        companyId: data.companyId || undefined,
        personId: data.personId || undefined,
        type: data.type,
        subject: data.subject || undefined,
        content: data.content || undefined,
        metadata: data.metadata || {},
        userId: userId || undefined,
      })
      .returning()
    return activity
  },

  async getById(_tenantId: string, activityId: string): Promise<Activity | null> {
    const [activity] = await db
      .select()
      .from(activities)
      .where(eq(activities.id, activityId))
      .limit(1)
    return activity ?? null
  },

  async update(_tenantId: string, activityId: string, data: { subject?: string | null; content?: string | null; metadata?: Record<string, unknown> }) {
    const result = await db
      .update(activities)
      .set(data)
      .where(eq(activities.id, activityId))
      .returning()
    return result[0] || null
  },

  async delete(_tenantId: string, activityId: string): Promise<boolean> {
    const result = await db
      .delete(activities)
      .where(eq(activities.id, activityId))
      .returning({ id: activities.id })
    return result.length > 0
  },

  async listByLead(_tenantId: string, leadId: string, filters: Pick<ActivityFilters, 'page' | 'limit'> = {}) {
    const { page = 1, limit = 50 } = filters
    const offset = (page - 1) * limit

    const whereClause = eq(activities.leadId, leadId)

    const [items, [{ total }]] = await Promise.all([
      db
        .select({
          ...getTableColumns(activities),
          user: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
          },
        })
        .from(activities)
        .leftJoin(users, eq(activities.userId, users.id))
        .where(whereClause)
        .orderBy(desc(activities.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(activities).where(whereClause),
    ])

    return {
      items: items.map((row) => ({
        ...row,
        user: row.user?.id ? row.user : null,
      })),
      meta: { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) },
    }
  },

  async listByCompany(_tenantId: string, companyId: string, filters: Pick<ActivityFilters, 'page' | 'limit'> = {}) {
    const { page = 1, limit = 50 } = filters
    const offset = (page - 1) * limit

    const whereClause = eq(activities.companyId, companyId)

    const [items, [{ total }]] = await Promise.all([
      db
        .select({
          ...getTableColumns(activities),
          user: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
          },
        })
        .from(activities)
        .leftJoin(users, eq(activities.userId, users.id))
        .where(whereClause)
        .orderBy(desc(activities.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(activities).where(whereClause),
    ])

    return {
      items: items.map((row) => ({
        ...row,
        user: row.user?.id ? row.user : null,
      })),
      meta: { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) },
    }
  },

  async list(_tenantId: string, filters: ActivityFilters = {}) {
    const { leadId, companyId, personId, type, page = 1, limit = 50 } = filters
    const offset = (page - 1) * limit

    const conditions = []
    if (leadId) conditions.push(eq(activities.leadId, leadId))
    if (companyId) conditions.push(eq(activities.companyId, companyId))
    if (personId) conditions.push(eq(activities.personId, personId))
    if (type) conditions.push(eq(activities.type, type))

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const [items, [{ total }]] = await Promise.all([
      db
        .select({
          ...getTableColumns(activities),
          user: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
          },
        })
        .from(activities)
        .leftJoin(users, eq(activities.userId, users.id))
        .where(whereClause)
        .orderBy(desc(activities.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(activities).where(whereClause),
    ])

    return {
      items: items.map((row) => ({
        ...row,
        user: row.user?.id ? row.user : null,
      })),
      meta: { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) },
    }
  },
}
