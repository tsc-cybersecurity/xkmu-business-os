import { db } from '@/lib/db'
import { leads, companies, persons, users } from '@/lib/db/schema'
import { eq, and, ilike, count, desc, or, getTableColumns, inArray } from 'drizzle-orm'
import type { Lead, NewLead } from '@/lib/db/schema'
import type { PaginatedResult } from '@/lib/utils/api-response'
import { logger } from '@/lib/utils/logger'

// Type for lead with related data
export interface LeadWithRelations extends Lead {
  company: { id: string; name: string } | null
  person: { id: string; firstName: string; lastName: string; email: string | null } | null
  assignedToUser: { id: string; firstName: string | null; lastName: string | null; email: string } | null
}

export interface LeadFilters {
  status?: string | string[]
  source?: string
  assignedTo?: string
  search?: string
  page?: number
  limit?: number
}

export interface CreateLeadInput {
  companyId?: string | null
  personId?: string | null
  title?: string
  source: string
  sourceDetail?: string
  status?: string
  score?: number
  assignedTo?: string | null
  tags?: string[]
  notes?: string
  rawData?: Record<string, unknown>
  contactFirstName?: string
  contactLastName?: string
  contactCompany?: string
  contactPhone?: string
  contactEmail?: string
}

export type UpdateLeadInput = Partial<CreateLeadInput> & {
  aiResearchStatus?: string
  aiResearchResult?: Record<string, unknown>
}

// Helper to convert empty strings to null
function emptyToNull<T>(value: T): T | null {
  if (value === '' || value === undefined) return null
  return value
}

export const LeadService = {
  async create(data: CreateLeadInput
  ): Promise<Lead> {
    const [lead] = await db
      .insert(leads)
      .values({
        companyId: emptyToNull(data.companyId),
        personId: emptyToNull(data.personId),
        title: emptyToNull(data.title),
        source: data.source,
        sourceDetail: emptyToNull(data.sourceDetail),
        status: data.status || 'new',
        score: data.score || 0,
        assignedTo: emptyToNull(data.assignedTo),
        tags: data.tags || [],
        notes: emptyToNull(data.notes),
        rawData: data.rawData || {},
        contactFirstName: emptyToNull(data.contactFirstName),
        contactLastName: emptyToNull(data.contactLastName),
        contactCompany: emptyToNull(data.contactCompany),
        contactPhone: emptyToNull(data.contactPhone),
        contactEmail: emptyToNull(data.contactEmail),
      })
      .returning()

    // Auto-Score: KI-basierte Qualifizierung im Hintergrund (non-blocking)
    this.autoScore(lead.id).catch(() => {})

    // Erstantwort-E-Mail in Task-Queue wenn E-Mail vorhanden
    if (lead.contactEmail) {
      import('@/lib/services/task-queue.service').then(({ TaskQueueService }) => {
        TaskQueueService.create({
          type: 'email',
          priority: 1,
          payload: {
            templateSlug: 'lead_first_response',
            to: lead.contactEmail,
            placeholders: {
              name: [lead.contactFirstName, lead.contactLastName].filter(Boolean).join(' ') || 'Interessent',
              firma: lead.contactCompany || '',
            },
            leadId: lead.id,
          },
          referenceType: 'lead',
          referenceId: lead.id,
        }).catch(() => {})
      }).catch(() => {})
    }

    return lead
  },

  /**
   * Automatische KI-Qualifizierung: Bewertet Lead basierend auf verfuegbaren Daten
   */
  async autoScore(leadId: string): Promise<void> {
    try {
      const lead = await this.getById(leadId)
      if (!lead || (lead.score ?? 0) > 0) return // Nur fuer neue Leads ohne Score

      let score = 20 // Basis-Score fuer jeden neuen Lead

      // +20 wenn E-Mail vorhanden
      if (lead.contactEmail) score += 20
      // +10 wenn Telefon vorhanden
      if (lead.contactPhone) score += 10
      // +10 wenn Firma vorhanden
      if (lead.contactCompany || lead.company) score += 10
      // +10 wenn ueber Formular/API (statt manuell)
      if (lead.source === 'form' || lead.source === 'api' || lead.source === 'website') score += 10
      // +15 wenn Firma eine Website hat
      if (lead.company?.name) score += 15

      // Auf 0-100 begrenzen
      score = Math.min(100, Math.max(0, score))

      if (score > 0) {
        await db
          .update(leads)
          .set({ score, updatedAt: new Date() })
          .where(eq(leads.id, leadId))
      }

      logger.info(`Auto-scored lead ${leadId}: ${score}`, { module: 'LeadService' })
    } catch (error) {
      logger.warn(`Auto-score failed for lead ${leadId}`, { module: 'LeadService' })
    }
  },

  async getById(leadId: string): Promise<LeadWithRelations | null> {
    const rows = await db
      .select({
        ...getTableColumns(leads),
        company: {
          id: companies.id,
          name: companies.name,
        },
        person: {
          id: persons.id,
          firstName: persons.firstName,
          lastName: persons.lastName,
          email: persons.email,
        },
        assignedToUser: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
      })
      .from(leads)
      .leftJoin(companies, eq(leads.companyId, companies.id))
      .leftJoin(persons, eq(leads.personId, persons.id))
      .leftJoin(users, eq(leads.assignedTo, users.id))
      .where(eq(leads.id, leadId))
      .limit(1)

    if (rows.length === 0) return null

    const row = rows[0]
    return {
      ...row,
      company: row.company?.id ? row.company : null,
      person: row.person?.id ? row.person : null,
      assignedToUser: row.assignedToUser?.id ? row.assignedToUser : null,
    }
  },

  async update(leadId: string,
    data: UpdateLeadInput
  ): Promise<Lead | null> {
    // Build update object with proper null handling
    const updateData: Partial<NewLead> = {
      updatedAt: new Date(),
    }

    // Only include fields that are explicitly provided
    if ('companyId' in data) {
      updateData.companyId = emptyToNull(data.companyId)
    }
    if ('personId' in data) {
      updateData.personId = emptyToNull(data.personId)
    }
    if ('source' in data && data.source) {
      updateData.source = data.source
    }
    if ('sourceDetail' in data) {
      updateData.sourceDetail = emptyToNull(data.sourceDetail)
    }
    if ('status' in data && data.status) {
      updateData.status = data.status
    }
    if ('score' in data && data.score !== undefined) {
      updateData.score = data.score
    }
    if ('assignedTo' in data) {
      updateData.assignedTo = emptyToNull(data.assignedTo)
    }
    if ('rawData' in data) {
      updateData.rawData = data.rawData ?? {}
    }
    if ('aiResearchStatus' in data) {
      updateData.aiResearchStatus = data.aiResearchStatus
    }
    if ('aiResearchResult' in data) {
      updateData.aiResearchResult = data.aiResearchResult
    }

    const [lead] = await db
      .update(leads)
      .set(updateData)
      .where(eq(leads.id, leadId))
      .returning()

    return lead ?? null
  },

  async delete(leadId: string): Promise<boolean> {
    const result = await db
      .delete(leads)
      .where(eq(leads.id, leadId))
      .returning({ id: leads.id })

    return result.length > 0
  },

  async list(filters: LeadFilters = {}
  ): Promise<PaginatedResult<LeadWithRelations>> {
    const { status, source, assignedTo, search, page = 1, limit = 20 } = filters
    const offset = (page - 1) * limit

    const conditions = []

    if (status) {
      if (Array.isArray(status)) {
        conditions.push(inArray(leads.status, status))
      } else {
        conditions.push(eq(leads.status, status))
      }
    }

    if (source) {
      conditions.push(eq(leads.source, source))
    }

    if (assignedTo) {
      conditions.push(eq(leads.assignedTo, assignedTo))
    }

    if (search) {
      conditions.push(
        or(
          ilike(companies.name, `%${search}%`),
          ilike(persons.firstName, `%${search}%`),
          ilike(persons.lastName, `%${search}%`),
          ilike(leads.sourceDetail, `%${search}%`)
        )!
      )
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const countConditions = []
    if (status) {
      if (Array.isArray(status)) {
        countConditions.push(inArray(leads.status, status))
      } else {
        countConditions.push(eq(leads.status, status))
      }
    }
    const countWhere = countConditions.length > 0 ? and(...countConditions) : undefined

    const [rows, [{ count: total }]] = await Promise.all([
      db
        .select({
          ...getTableColumns(leads),
          company: {
            id: companies.id,
            name: companies.name,
          },
          person: {
            id: persons.id,
            firstName: persons.firstName,
            lastName: persons.lastName,
            email: persons.email,
          },
          assignedToUser: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
          },
        })
        .from(leads)
        .leftJoin(companies, eq(leads.companyId, companies.id))
        .leftJoin(persons, eq(leads.personId, persons.id))
        .leftJoin(users, eq(leads.assignedTo, users.id))
        .where(whereClause)
        .orderBy(desc(leads.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(leads).where(countWhere),
    ])

    // Transform rows to handle null relations
    const items: LeadWithRelations[] = rows.map((row) => ({
      ...row,
      company: row.company?.id ? row.company : null,
      person: row.person?.id ? row.person : null,
      assignedToUser: row.assignedToUser?.id ? row.assignedToUser : null,
    }))

    return {
      items,
      meta: {
        page,
        limit,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / limit),
      },
    }
  },

  async updateStatus(leadId: string,
    status: string,
    oldStatus?: string
  ): Promise<Lead | null> {
    const lead = await this.update(leadId, { status })
    if (lead) {
      // Webhook-Trigger asynchron feuern (blockiert nicht)
      import('@/lib/services/webhook.service').then(({ WebhookService }) => {
        WebhookService.fire('lead.status_changed', {
          leadId,
          oldStatus: oldStatus || 'unknown',
          newStatus: status,
        }).catch(() => {})

        if (status === 'won') {
          WebhookService.fire('lead.won', { leadId }).catch(() => {})
          // Willkommens-E-Mail in Queue
          if (lead!.contactEmail) {
            import('@/lib/services/task-queue.service').then(({ TaskQueueService }) => {
              TaskQueueService.create({
                type: 'email',
                priority: 1,
                payload: {
                  templateSlug: 'welcome',
                  to: lead!.contactEmail,
                  placeholders: {
                    name: [lead!.contactFirstName, lead!.contactLastName].filter(Boolean).join(' ') || 'Kunde',
                  },
                  leadId,
                },
                referenceType: 'lead',
                referenceId: leadId,
              }).catch(() => {})
            }).catch(() => {})
          }
        }
        if (status === 'lost') {
          WebhookService.fire('lead.lost', { leadId }).catch(() => {})
        }
      }).catch(() => {})
    }
    return lead
  },

  async assignTo(leadId: string,
    userId: string | null
  ): Promise<Lead | null> {
    return this.update(leadId, { assignedTo: userId })
  },

  async getStatusCounts(): Promise<{ status: string; count: number }[]> {
    const result = await db
      .select({
        status: leads.status,
        count: count(),
      })
      .from(leads)
      .groupBy(leads.status)

    return result.map((r) => ({
      status: r.status || 'unknown',
      count: Number(r.count),
    }))
  },

  async updateAIResearch(leadId: string,
    status: string,
    result?: Record<string, unknown>
  ): Promise<Lead | null> {
    return this.update(leadId, {
      aiResearchStatus: status,
      aiResearchResult: result,
    })
  },
}
