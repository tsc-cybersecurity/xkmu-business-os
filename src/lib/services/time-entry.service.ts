// ============================================
// Time Entry Service (Zeiterfassung)
// ============================================

import { db } from '@/lib/db'
import { timeEntries, companies, users } from '@/lib/db/schema'
import type { TimeEntry, NewTimeEntry } from '@/lib/db/schema'
import { eq, and, gte, lte, desc, count, sum, isNull } from 'drizzle-orm'
import { TENANT_ID } from '@/lib/constants/tenant'

export const TimeEntryService = {
  async list(_tenantId: string, filters: {
    userId?: string
    companyId?: string
    from?: Date
    to?: Date
    page?: number
    limit?: number
  } = {}) {
    const { userId, companyId, from, to, page = 1, limit = 50 } = filters
    const offset = (page - 1) * limit

    const conditions = []
    if (userId) conditions.push(eq(timeEntries.userId, userId))
    if (companyId) conditions.push(eq(timeEntries.companyId, companyId))
    if (from) conditions.push(gte(timeEntries.date, from))
    if (to) conditions.push(lte(timeEntries.date, to))

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const items = await db
      .select({
        entry: timeEntries,
        companyName: companies.name,
        userName: users.email,
      })
      .from(timeEntries)
      .leftJoin(companies, eq(timeEntries.companyId, companies.id))
      .leftJoin(users, eq(timeEntries.userId, users.id))
      .where(whereClause)
      .orderBy(desc(timeEntries.date), desc(timeEntries.startTime))
      .limit(limit)
      .offset(offset)

    const [{ total }] = await db.select({ total: count() }).from(timeEntries).where(whereClause)

    return {
      items: items.map(r => ({ ...r.entry, companyName: r.companyName, userName: r.userName })),
      meta: { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) },
    }
  },

  async getById(_tenantId: string, id: string): Promise<TimeEntry | null> {
    const [entry] = await db
      .select()
      .from(timeEntries)
      .where(eq(timeEntries.id, id))
      .limit(1)
    return entry ?? null
  },

  async create(_tenantId: string, userId: string, data: {
    companyId?: string
    description?: string
    date: Date
    startTime?: Date
    endTime?: Date
    durationMinutes?: number
    billable?: boolean
    hourlyRate?: string
  }): Promise<TimeEntry> {
    // Calculate duration if start/end provided
    let duration = data.durationMinutes || 0
    if (data.startTime && data.endTime) {
      duration = Math.round((data.endTime.getTime() - data.startTime.getTime()) / 60000)
    }

    const [entry] = await db
      .insert(timeEntries)
      .values({
        userId,
        companyId: data.companyId || null,
        description: data.description || null,
        date: data.date,
        startTime: data.startTime || null,
        endTime: data.endTime || null,
        durationMinutes: duration,
        billable: data.billable ?? true,
        hourlyRate: data.hourlyRate || null,
      })
      .returning()
    return entry
  },

  async update(_tenantId: string, id: string, data: Partial<{
    companyId: string | null
    description: string
    date: Date
    startTime: Date
    endTime: Date
    durationMinutes: number
    billable: boolean
    hourlyRate: string
  }>): Promise<TimeEntry | null> {
    const updateData: Partial<NewTimeEntry> = { updatedAt: new Date() }
    if (data.companyId !== undefined) updateData.companyId = data.companyId
    if (data.description !== undefined) updateData.description = data.description
    if (data.date !== undefined) updateData.date = data.date
    if (data.startTime !== undefined) updateData.startTime = data.startTime
    if (data.endTime !== undefined) updateData.endTime = data.endTime
    if (data.durationMinutes !== undefined) updateData.durationMinutes = data.durationMinutes
    if (data.billable !== undefined) updateData.billable = data.billable
    if (data.hourlyRate !== undefined) updateData.hourlyRate = data.hourlyRate

    // Recalculate duration
    if (data.startTime && data.endTime) {
      updateData.durationMinutes = Math.round((data.endTime.getTime() - data.startTime.getTime()) / 60000)
    }

    const [entry] = await db
      .update(timeEntries)
      .set(updateData)
      .where(eq(timeEntries.id, id))
      .returning()
    return entry ?? null
  },

  async delete(_tenantId: string, id: string): Promise<boolean> {
    const result = await db
      .delete(timeEntries)
      .where(eq(timeEntries.id, id))
      .returning({ id: timeEntries.id })
    return result.length > 0
  },

  // Running timer: entry with startTime but no endTime
  async getRunningTimer(_tenantId: string, userId: string): Promise<TimeEntry | null> {
    const [entry] = await db
      .select()
      .from(timeEntries)
      .where(and(
        eq(timeEntries.userId, userId),
        isNull(timeEntries.endTime)))
      .orderBy(desc(timeEntries.startTime))
      .limit(1)
    return entry ?? null
  },

  async startTimer(_tenantId: string, userId: string, data: {
    companyId?: string
    description?: string
    hourlyRate?: string
  }): Promise<TimeEntry> {
    // Stop any running timer first
    const running = await this.getRunningTimer(_tenantId, userId)
    if (running) {
      await this.stopTimer(_tenantId, userId)
    }

    const now = new Date()
    return this.create(_tenantId, userId, {
      companyId: data.companyId,
      description: data.description,
      date: now,
      startTime: now,
      billable: true,
      hourlyRate: data.hourlyRate,
    })
  },

  async stopTimer(_tenantId: string, userId: string): Promise<TimeEntry | null> {
    const running = await this.getRunningTimer(_tenantId, userId)
    if (!running) return null

    const endTime = new Date()
    const duration = Math.round((endTime.getTime() - (running.startTime?.getTime() || endTime.getTime())) / 60000)

    return this.update(_tenantId, running.id, {
      endTime,
      durationMinutes: duration,
    })
  },

  async sumByCompany(_tenantId: string, companyId: string, from?: Date, to?: Date) {
    const conditions = [
      eq(timeEntries.companyId, companyId),
    ]
    if (from) conditions.push(gte(timeEntries.date, from))
    if (to) conditions.push(lte(timeEntries.date, to))

    const [result] = await db
      .select({
        totalMinutes: sum(timeEntries.durationMinutes),
        entryCount: count(),
      })
      .from(timeEntries)
      .where(and(...conditions))

    return {
      totalMinutes: Number(result.totalMinutes || 0),
      totalHours: Number(result.totalMinutes || 0) / 60,
      entryCount: Number(result.entryCount),
    }
  },
}
