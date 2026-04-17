import { db } from '@/lib/db'
import { opportunities, companies } from '@/lib/db/schema'
import { eq, and, ilike, count, desc, or, inArray } from 'drizzle-orm'
import type { Opportunity, NewOpportunity } from '@/lib/db/schema'
import type { PaginatedResult } from '@/lib/utils/api-response'
import { CompanyService } from './company.service'
import { LeadService } from './lead.service'
import { TENANT_ID } from '@/lib/constants/tenant'

/** Extract street name and house number from address string */
function parseStreetAndNumber(address: string | null): { street: string; houseNumber: string } {
  if (!address) return { street: '', houseNumber: '' }

  const trimmed = address.trim()

  // "Musterstraße 12a" or "Musterstr. 12" or "Am Markt 3-5"
  const match = trimmed.match(/^(.+?)\s+(\d+[\s\-/]*\w*)$/)
  if (match) {
    return { street: match[1].trim(), houseNumber: match[2].trim() }
  }

  // If the address contains a comma, it might be "Street 12, 80331 München"
  // Just take the first part
  const commaParts = trimmed.split(',')
  if (commaParts.length > 1) {
    const firstPart = commaParts[0].trim()
    const matchFirst = firstPart.match(/^(.+?)\s+(\d+[\s\-/]*\w*)$/)
    if (matchFirst) {
      return { street: matchFirst[1].trim(), houseNumber: matchFirst[2].trim() }
    }
    return { street: firstPart, houseNumber: '' }
  }

  return { street: trimmed, houseNumber: '' }
}

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
    _tenantId: string,
    data: CreateOpportunityInput
  ): Promise<Opportunity> {
    const [opportunity] = await db
      .insert(opportunities)
      .values({
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
    _tenantId: string,
    items: CreateOpportunityInput[]
  ): Promise<{ inserted: number; enriched: number; skipped: number }> {
    if (items.length === 0) return { inserted: 0, enriched: 0, skipped: 0 }

    const values = items.map((data) => ({
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
      status: 'new' as const,
      source: data.source || 'google_maps',
      searchQuery: emptyToNull(data.searchQuery),
      searchLocation: emptyToNull(data.searchLocation),
      notes: emptyToNull(data.notes),
      metadata: data.metadata || {},
    }))

    // Find existing records by placeId to enrich instead of duplicate
    const placeIds = values
      .map((v) => v.placeId)
      .filter((p): p is string => p !== null && p !== undefined)

    const existingMap = new Map<string, { id: string; phone: string | null; website: string | null; address: string | null; postalCode: string | null; city: string | null; rating: number | null; reviewCount: number | null; metadata: Record<string, unknown> | null }>()

    if (placeIds.length > 0) {
      const existing = await db
        .select({
          id: opportunities.id,
          placeId: opportunities.placeId,
          phone: opportunities.phone,
          website: opportunities.website,
          address: opportunities.address,
          postalCode: opportunities.postalCode,
          city: opportunities.city,
          rating: opportunities.rating,
          reviewCount: opportunities.reviewCount,
          metadata: opportunities.metadata,
        })
        .from(opportunities)
        .where(inArray(opportunities.placeId, placeIds))
      for (const row of existing) {
        if (row.placeId) existingMap.set(row.placeId, { ...row, metadata: (row.metadata as Record<string, unknown>) || null })
      }
    }

    let inserted = 0
    let enriched = 0

    // Separate new items from existing ones to enrich
    const newValues = []
    for (const val of values) {
      const existing = val.placeId ? existingMap.get(val.placeId) : null
      if (!existing) {
        newValues.push(val)
      } else {
        // Enrich: update fields that were empty with new data
        const updates: Record<string, unknown> = {}
        if (!existing.phone && val.phone) updates.phone = val.phone
        if (!existing.website && val.website) updates.website = val.website
        if (!existing.address && val.address) updates.address = val.address
        if (!existing.postalCode && val.postalCode) updates.postalCode = val.postalCode
        if (!existing.city && val.city) updates.city = val.city
        if (val.rating !== null && (existing.rating === null || val.rating !== existing.rating)) updates.rating = val.rating
        if (val.reviewCount !== null && (existing.reviewCount === null || val.reviewCount !== existing.reviewCount)) updates.reviewCount = val.reviewCount
        // Merge metadata
        if (val.metadata && Object.keys(val.metadata).length > 0) {
          const merged = { ...(existing.metadata as Record<string, unknown> || {}), ...val.metadata }
          updates.metadata = merged
        }
        updates.updatedAt = new Date()

        if (Object.keys(updates).length > 1) { // > 1 because updatedAt is always there
          await db.update(opportunities).set(updates).where(eq(opportunities.id, existing.id))
          enriched++
        }
      }
    }

    // Insert truly new records
    if (newValues.length > 0) {
      const result = await db
        .insert(opportunities)
        .values(newValues)
        .returning({ id: opportunities.id })
      inserted = result.length
    }

    return {
      inserted,
      enriched,
      skipped: items.length - inserted - enriched,
    }
  },

  async getById(_tenantId: string, id: string): Promise<Opportunity | null> {
    const [opportunity] = await db
      .select()
      .from(opportunities)
      .where(eq(opportunities.id, id))
      .limit(1)

    return opportunity ?? null
  },

  async list(
    _tenantId: string,
    filters: OpportunityFilters = {}
  ): Promise<PaginatedResult<Opportunity>> {
    const { status, city, search, page = 1, limit = 20 } = filters
    const offset = (page - 1) * limit

    const conditions = []

    if (status) {
      if (Array.isArray(status)) {
        conditions.push(inArray(opportunities.status, status))
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

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

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
    _tenantId: string,
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
      .where(eq(opportunities.id, id))
      .returning()

    return opportunity ?? null
  },

  /**
   * Re-parse addresses for all opportunities that have data in address but
   * are missing city/postalCode. Uses metadata.fullAddress as source.
   */
  async repairAddresses(_tenantId: string): Promise<number> {
    const all = await db
      .select()
      .from(opportunities)

    let fixed = 0
    for (const opp of all) {
      const meta = (opp.metadata || {}) as Record<string, unknown>
      const fullAddress = typeof meta.fullAddress === 'string' ? meta.fullAddress : opp.address || ''
      if (!fullAddress) continue

      // Parse full address: "Musterstr. 1, 80331 München, Germany"
      const parts = fullAddress.split(',').map((p: string) => p.trim())
      const updates: Record<string, unknown> = {}

      // Extract street + house number from first part
      if (parts.length >= 1) {
        const { street, houseNumber } = parseStreetAndNumber(parts[0])
        if (street && (!opp.address || opp.address === fullAddress || opp.address.includes(','))) {
          updates.address = houseNumber ? `${street} ${houseNumber}` : street
        }
      }

      // Extract PLZ + City
      for (const part of parts) {
        const plzMatch = part.match(/(\d{4,5})\s+(.+)/)
        if (plzMatch) {
          if (!opp.postalCode) updates.postalCode = plzMatch[1]
          if (!opp.city || opp.city === opp.searchLocation) updates.city = plzMatch[2]
          break
        }
      }

      // Extract country from last part
      const lastPart = parts[parts.length - 1] || ''
      if (/^(Germany|Deutschland)$/i.test(lastPart) && (!opp.country || opp.country === 'DE')) {
        updates.country = 'DE'
      }

      if (Object.keys(updates).length > 0) {
        updates.updatedAt = new Date()
        await db.update(opportunities).set(updates).where(eq(opportunities.id, opp.id))
        fixed++
      }
    }

    return fixed
  },

  async delete(_tenantId: string, id: string): Promise<boolean> {
    const result = await db
      .delete(opportunities)
      .where(eq(opportunities.id, id))
      .returning({ id: opportunities.id })

    return result.length > 0
  },

  async convert(
    _tenantId: string,
    id: string,
    userId?: string
  ): Promise<{
    company: typeof companies.$inferSelect
    lead: Awaited<ReturnType<typeof LeadService.create>>
    opportunity: Opportunity
  }> {
    // 1. Load opportunity
    const opportunity = await this.getById(_tenantId, id)
    if (!opportunity) {
      throw new Error('Opportunity nicht gefunden')
    }
    if (opportunity.status === 'converted') {
      throw new Error('Opportunity wurde bereits konvertiert')
    }

    // 2. Parse street and house number from address field
    const { street, houseNumber } = parseStreetAndNumber(opportunity.address)

    // Use opportunity fields, fall back to parsing fullAddress from metadata
    let city = opportunity.city
    let postalCode = opportunity.postalCode
    if (!city || !postalCode) {
      const meta = (opportunity.metadata || {}) as Record<string, unknown>
      const fullAddress = typeof meta.fullAddress === 'string' ? meta.fullAddress : ''
      if (fullAddress) {
        const parts = fullAddress.split(',').map(p => p.trim())
        for (const part of parts) {
          const plzMatch = part.match(/(\d{4,5})\s+(.+)/)
          if (plzMatch) {
            if (!postalCode) postalCode = plzMatch[1]
            if (!city) city = plzMatch[2]
          }
        }
      }
    }

    // 3. Create company via CompanyService
    const company = await CompanyService.create(
      _tenantId,
      {
        name: opportunity.name,
        industry: opportunity.industry || undefined,
        street: street || undefined,
        houseNumber: houseNumber || undefined,
        city: city || undefined,
        postalCode: postalCode || undefined,
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
    const lead = await LeadService.create(_tenantId, {
      companyId: company.id,
      source: 'google_maps',
      sourceDetail: opportunity.searchQuery || 'Google Maps Prospecting',
      title: opportunity.name,
      status: 'new',
      notes: opportunity.notes || undefined,
    })

    // 4. Update opportunity status
    const updatedOpportunity = await this.update(_tenantId, id, {
      status: 'converted',
    })

    // Also set convertedCompanyId directly
    await db
      .update(opportunities)
      .set({ convertedCompanyId: company.id })
      .where(eq(opportunities.id, id))

    return {
      company,
      lead,
      opportunity: updatedOpportunity || opportunity,
    }
  },
}
