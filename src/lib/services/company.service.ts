import { db } from '@/lib/db'
import { companies, persons } from '@/lib/db/schema'
import { eq, and, ilike, count, arrayContains, sql } from 'drizzle-orm'
import type { Company, NewCompany, Person } from '@/lib/db/schema'
import type { PaginatedResult } from '@/lib/utils/api-response'

export interface CompanyFilters {
  status?: string | string[]
  tags?: string[]
  search?: string
  page?: number
  limit?: number
  sortBy?: keyof Company
  sortOrder?: 'asc' | 'desc'
}

export interface CreateCompanyInput {
  name: string
  legalForm?: string
  street?: string
  houseNumber?: string
  postalCode?: string
  city?: string
  country?: string
  phone?: string
  email?: string
  website?: string
  industry?: string
  employeeCount?: number | null
  annualRevenue?: number | null
  vatId?: string
  status?: string
  tags?: string[]
  notes?: string
  customFields?: Record<string, unknown>
}

export type UpdateCompanyInput = Partial<CreateCompanyInput>

// Helper to convert empty strings to null
function emptyToNull<T>(value: T): T | null {
  if (value === '' || value === undefined) return null
  return value
}

export const CompanyService = {
  async create(
    _tenantId: string,
    data: CreateCompanyInput,
    createdBy?: string
  ): Promise<Company> {
    const [company] = await db
      .insert(companies)
      .values({
        name: data.name,
        legalForm: emptyToNull(data.legalForm),
        street: emptyToNull(data.street),
        houseNumber: emptyToNull(data.houseNumber),
        postalCode: emptyToNull(data.postalCode),
        city: emptyToNull(data.city),
        country: data.country || 'DE',
        phone: emptyToNull(data.phone),
        email: emptyToNull(data.email),
        website: emptyToNull(data.website),
        industry: emptyToNull(data.industry),
        employeeCount: emptyToNull(data.employeeCount),
        annualRevenue: data.annualRevenue?.toString() || null,
        vatId: emptyToNull(data.vatId),
        status: data.status || 'prospect',
        tags: data.tags || [],
        notes: emptyToNull(data.notes),
        customFields: data.customFields || {},
        createdBy,
      })
      .returning()

    return company
  },

  async getById(_tenantId: string, companyId: string): Promise<Company | null> {
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1)

    return company ?? null
  },

  async update(
    _tenantId: string,
    companyId: string,
    data: UpdateCompanyInput
  ): Promise<Company | null> {
    // Build update data excluding fields that need transformation
    const { annualRevenue, employeeCount, ...rest } = data
    const updateData: Partial<NewCompany> = {
      ...rest,
      updatedAt: new Date(),
    }

    // Handle annualRevenue conversion (number -> string)
    if (annualRevenue !== undefined) {
      updateData.annualRevenue = annualRevenue?.toString() ?? null
    }

    // Handle employeeCount (can be null)
    if (employeeCount !== undefined) {
      updateData.employeeCount = employeeCount
    }

    const [company] = await db
      .update(companies)
      .set(updateData)
      .where(eq(companies.id, companyId))
      .returning()

    return company ?? null
  },

  async delete(_tenantId: string, companyId: string): Promise<boolean> {
    const result = await db
      .delete(companies)
      .where(eq(companies.id, companyId))
      .returning({ id: companies.id })

    return result.length > 0
  },

  async list(
    _tenantId: string,
    filters: CompanyFilters = {}
  ): Promise<PaginatedResult<Company>> {
    const { status, tags, search, page = 1, limit = 20 } = filters
    const offset = (page - 1) * limit

    const conditions = []

    if (status) {
      if (Array.isArray(status)) {
        conditions.push(sql`${companies.status} = ANY(${status})`)
      } else {
        conditions.push(eq(companies.status, status))
      }
    }

    if (tags && tags.length > 0) {
      conditions.push(arrayContains(companies.tags, tags))
    }

    if (search) {
      conditions.push(ilike(companies.name, `%${search}%`))
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const [items, [{ count: total }]] = await Promise.all([
      db
        .select()
        .from(companies)
        .where(whereClause)
        .orderBy(companies.createdAt)
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(companies).where(whereClause),
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

  async search(_tenantId: string, query: string, limit = 10): Promise<Company[]> {
    if (!query.trim()) {
      return []
    }

    const items = await db
      .select()
      .from(companies)
      .where(ilike(companies.name, `%${query}%`))
      .limit(limit)

    return items
  },

  async addTag(
    _tenantId: string,
    companyId: string,
    tag: string
  ): Promise<Company | null> {
    const company = await this.getById(_companyId)
    if (!company) return null

    const currentTags = company.tags || []
    if (currentTags.includes(tag)) {
      return company
    }

    return this.update(_companyId, {
      tags: [...currentTags, tag],
    })
  },

  async removeTag(
    _tenantId: string,
    companyId: string,
    tag: string
  ): Promise<Company | null> {
    const company = await this.getById(_companyId)
    if (!company) return null

    const currentTags = company.tags || []

    return this.update(_companyId, {
      tags: currentTags.filter((t) => t !== tag),
    })
  },

  async getPersons(_tenantId: string, companyId: string): Promise<Person[]> {
    const items = await db
      .select()
      .from(persons)
      .where(eq(persons.companyId, companyId))
      .orderBy(persons.lastName, persons.firstName)

    return items
  },

  /**
   * Prüft ob eine Firma mit gleichem Namen oder Website-Domain bereits existiert.
   */
  async checkDuplicate(
    _tenantId: string,
    name: string,
    website?: string
  ): Promise<Company | null> {
    // Name-Check (case-insensitive)
    const [byName] = await db
      .select()
      .from(companies)
      .where(ilike(companies.name, name))
      .limit(1)

    if (byName) return byName

    // Website-Domain-Check
    if (website) {
      try {
        const domain = new URL(website.startsWith('http') ? website : `https://${website}`).hostname
          .replace(/^www\./, '')
        // Suche nach Website die die gleiche Domain enthält
        const [byDomain] = await db
          .select()
          .from(companies)
          .where(ilike(companies.website, `%${domain}%`))
          .limit(1)

        if (byDomain) return byDomain
      } catch {
        // Ungültige URL ignorieren
      }
    }

    return null
  },
}
