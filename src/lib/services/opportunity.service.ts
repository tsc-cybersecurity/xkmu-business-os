import { db } from '@/lib/db'
import { opportunities, companies } from '@/lib/db/schema'
import { eq, and, ilike, count, desc, or, inArray } from 'drizzle-orm'
import type { Opportunity, NewOpportunity } from '@/lib/db/schema'
import type { PaginatedResult } from '@/lib/utils/api-response'
import { CompanyService } from './company.service'
import { LeadService } from './lead.service'

export interface OpportunityFilters {
  status?: string | string[]
  city?: string
  search?: string
  page?: number
  limit?: number
}

export interface CreateOpportunityInput {
  name: string
  industry?: string | null
  address?: string | null
  city?: string | null
  postalCode?: string | null
  country?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  rating?: number | null
  reviewCount?: number | null
  placeId?: string | null
  status?: string
  source?: string
  searchQuery?: string | null
  searchLocation?: string | null
  notes?: string | null
  metadata?: Record<string, unknown>
}

export type UpdateOpportunityInput = Partial<CreateOpportunityInput>

// Helper to convert empty strings to null
function emptyToNull<T>(value: T): T | null {
  if (value === '' || value === undefined) return null
  return value
}

export const OpportunityService = {
  async create(
    tenantId: string,
    data: CreateOpportunityInput
  ): Promise<Opportunity> {
    const [opportunity] = await db
      .insert(opportunities)
      .values({
        tenantId,
        name: data.name,
        industry: emptyToNull(data.industry),
        address: emptyToNull(data.address),
        city: emptyToNull(data.city),
        postalCode: emptyToNull(data.postalCode),
        country: data.country || 'DE',
        phone: emptyToNull(data.phone),
        email: emptyToNull(data.email),
        website: emptyToNull(data.website),
        rating: data.rating ?? null,
        reviewCount: data.reviewCount ?? null,
        placeId: emptyToNull(data.placeId),
        status: data.status || 'new',
        source: data.source || 'google_maps',
        searchQuery: emptyToNull(data.searchQuery),
        searchLocation: emptyToNull(data.searchLocation),
        notes: emptyToNull(data.notes),
        metadata: data.metadata || {},
      })
      .returning()

    return opportunity
  },

  async createMany(
    tenantId: string,
    items: CreateOpportunityInput[]
  ): Promise<{ inserted: number; skipped: number }> {
    if (items.length === 0) return { inserted: 0, skipped: 0 }

    const values: NewOpportunity[] = items.map((data) => ({
      tenantId,
      name: data.name,
      industry: emptyToNull(data.industry),
      address: emptyToNull(data.address),
      city: emptyToNull(data.city),
      postalCode: emptyToNull(data.postalCode),
      country: data.country || 'DE',
      phone: emptyToNull(data.phone),
      email: emptyToNull(data.email),
      website: emptyToNull(data.website),
      rating: data.rating ?? null,
      reviewCount: data.reviewCount ?? null,
      placeId: emptyToNull(data.placeId),
      status: data.status || 'new',
      source: data.source || 'google_maps',
      searchQuery: emptyToNull(data.searchQuery),
      searchLocation: emptyToNull(data.searchLocation),
      notes: emptyToNull(data.notes),
      metadata: data.metadata || {},
    }))

    // Filter out items whose placeId already exists for this tenant
    const placeIds = values
      .map((v) => v.placeId)
      .filter((p): p is string => p !== null && p !== undefined)

    let existingPlaceIds = new Set<string>()
    if (placeIds.length > 0) {
      const existing = await db
        .select({ placeId: opportunities.placeId })
        .from(opportunities)
        .where(
          and(
            eq(opportunities.tenantId, tenantId),
            inArray(opportunities.placeId, placeIds)
          )
        )
      existingPlaceIds = new Set(existing.map((e) => e.placeId!))
    }

    const newValues = values.filter(
      (v) => !v.placeId || !existingPlaceIds.has(v.placeId)
    )

    if (newValues.length === 0) {
      return { inserted: 0, skipped: items.length }
    }

    const result = await db
      .insert(opportunities)
      .values(newValues)
      .returning({ id: opportunities.id })

    return {
      inserted: result.length,
      skipped: items.length - result.length,
    }
  },

  async getById(tenantId: string, id: string): Promise<Opportunity | null> {
    const [opportunity] = await db
      .select()
      .from(opportunities)
      .where(and(eq(opportunities.tenantId, tenantId), eq(opportunities.id, id)))
      .limit(1)

    return opportunity ?? null
  },

  async list(
    tenantId: string,
    filters: OpportunityFilters = {}
  ): Promise<PaginatedResult<Opportunity>> {
    const { status, city, search, page = 1, limit = 20 } = filters
    const offset = (page - 1) * limit

    const conditions = [eq(opportunities.tenantId, tenantId)]

    if (status) {
      if (Array.isArray(status)) {
        conditions.push(sql`${opportunities.status} = ANY(${status})`)
      } else {
        conditions.push(eq(opportunities.status, status))
      }
    }

    if (city) {
      conditions.push(ilike(opportunities.city, `%${city}%`))
    }

    if (search) {
      conditions.push(
        or(
          ilike(opportunities.name, `%${search}%`),
          ilike(opportunities.industry, `%${search}%`),
          ilike(opportunities.city, `%${search}%`)
        )!
      )
    }

    const whereClause = and(...conditions)

    const [items, [{ count: total }]] = await Promise.all([
      db
        .select()
        .from(opportunities)
        .where(whereClause)
        .orderBy(desc(opportunities.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(opportunities).where(whereClause),
    ])

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

  async update(
    tenantId: string,
    id: string,
    data: UpdateOpportunityInput
  ): Promise<Opportunity | null> {
    const updateData: Partial<NewOpportunity> = {
      ...data,
      updatedAt: new Date(),
    }

    const [opportunity] = await db
      .update(opportunities)
      .set(updateData)
      .where(and(eq(opportunities.tenantId, tenantId), eq(opportunities.id, id)))
      .returning()

    return opportunity ?? null
  },

  async delete(tenantId: string, id: string): Promise<boolean> {
    const result = await db
      .delete(opportunities)
      .where(and(eq(opportunities.tenantId, tenantId), eq(opportunities.id, id)))
      .returning({ id: opportunities.id })

    return result.length > 0
  },

  async convert(
    tenantId: string,
    id: string,
    userId?: string
  ): Promise<{
    company: typeof companies.$inferSelect
    lead: Awaited<ReturnType<typeof LeadService.create>>
    opportunity: Opportunity
  }> {
    // 1. Load opportunity
    const opportunity = await this.getById(tenantId, id)
    if (!opportunity) {
      throw new Error('Opportunity nicht gefunden')
    }
    if (opportunity.status === 'converted') {
      throw new Error('Opportunity wurde bereits konvertiert')
    }

    // 2. Create company via CompanyService
    const company = await CompanyService.create(
      tenantId,
      {
        name: opportunity.name,
        industry: opportunity.industry || undefined,
        street: opportunity.address || undefined,
        city: opportunity.city || undefined,
        postalCode: opportunity.postalCode || undefined,
        country: opportunity.country || 'DE',
        phone: opportunity.phone || undefined,
        email: opportunity.email || undefined,
        website: opportunity.website || undefined,
        status: 'prospect',
        notes: opportunity.notes || undefined,
      },
      userId
    )

    // 3. Create lead via LeadService
    const lead = await LeadService.create(tenantId, {
      companyId: company.id,
      source: 'google_maps',
      sourceDetail: opportunity.searchQuery || 'Google Maps Prospecting',
      title: opportunity.name,
      status: 'new',
      notes: opportunity.notes || undefined,
    })

    // 4. Update opportunity status
    const updatedOpportunity = await this.update(tenantId, id, {
      status: 'converted',
    })

    // Also set convertedCompanyId directly
    await db
      .update(opportunities)
      .set({ convertedCompanyId: company.id })
      .where(and(eq(opportunities.tenantId, tenantId), eq(opportunities.id, id)))

    return {
      company,
      lead,
      opportunity: updatedOpportunity || opportunity,
    }
  },
}
