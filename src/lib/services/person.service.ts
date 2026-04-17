import { db } from '@/lib/db'
import { persons, companies } from '@/lib/db/schema'
import { eq, and, ilike, count, arrayContains, sql, or, getTableColumns } from 'drizzle-orm'
import type { Person, NewPerson } from '@/lib/db/schema'
import type { PaginatedResult } from '@/lib/utils/api-response'

// Type for person with company info
export interface PersonWithCompany extends Person {
  company: { id: string; name: string } | null
}

export interface PersonFilters {
  companyId?: string
  status?: string
  tags?: string[]
  search?: string
  page?: number
  limit?: number
}

export interface CreatePersonInput {
  companyId?: string | null
  salutation?: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  mobile?: string
  jobTitle?: string
  department?: string
  street?: string
  houseNumber?: string
  postalCode?: string
  city?: string
  country?: string
  status?: string
  isPrimaryContact?: boolean
  tags?: string[]
  notes?: string
  customFields?: Record<string, unknown>
}

export type UpdatePersonInput = Partial<CreatePersonInput>

// Helper to convert empty strings to null
function emptyToNull<T>(value: T): T | null {
  if (value === '' || value === undefined) return null
  return value
}

export const PersonService = {
  async create(data: CreatePersonInput,
    createdBy?: string
  ): Promise<Person> {
    const [person] = await db
      .insert(persons)
      .values({
        companyId: emptyToNull(data.companyId),
        salutation: emptyToNull(data.salutation),
        firstName: data.firstName,
        lastName: data.lastName,
        email: emptyToNull(data.email),
        phone: emptyToNull(data.phone),
        mobile: emptyToNull(data.mobile),
        jobTitle: emptyToNull(data.jobTitle),
        department: emptyToNull(data.department),
        street: emptyToNull(data.street),
        houseNumber: emptyToNull(data.houseNumber),
        postalCode: emptyToNull(data.postalCode),
        city: emptyToNull(data.city),
        country: data.country || 'DE',
        status: data.status || 'active',
        isPrimaryContact: data.isPrimaryContact || false,
        tags: data.tags || [],
        notes: emptyToNull(data.notes),
        customFields: data.customFields || {},
        createdBy,
      })
      .returning()

    return person
  },

  async getById(personId: string): Promise<Person | null> {
    const [person] = await db
      .select()
      .from(persons)
      .where(eq(persons.id, personId))
      .limit(1)

    return person ?? null
  },

  async update(personId: string,
    data: UpdatePersonInput
  ): Promise<Person | null> {
    const updateData: Partial<NewPerson> = {
      ...data,
      updatedAt: new Date(),
    }

    const [person] = await db
      .update(persons)
      .set(updateData)
      .where(eq(persons.id, personId))
      .returning()

    return person ?? null
  },

  async delete(personId: string): Promise<boolean> {
    const result = await db
      .delete(persons)
      .where(eq(persons.id, personId))
      .returning({ id: persons.id })

    return result.length > 0
  },

  async list(filters: PersonFilters = {}
  ): Promise<PaginatedResult<PersonWithCompany>> {
    const { companyId, status, tags, search, page = 1, limit = 20 } = filters
    const offset = (page - 1) * limit

    const conditions = []

    if (companyId) {
      conditions.push(eq(persons.companyId, companyId))
    }

    if (status) {
      conditions.push(eq(persons.status, status))
    }

    if (tags && tags.length > 0) {
      conditions.push(arrayContains(persons.tags, tags))
    }

    if (search) {
      conditions.push(
        or(
          ilike(persons.firstName, `%${search}%`),
          ilike(persons.lastName, `%${search}%`),
          ilike(persons.email, `%${search}%`)
        )!
      )
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const [rows, [{ count: total }]] = await Promise.all([
      db
        .select({
          ...getTableColumns(persons),
          company: {
            id: companies.id,
            name: companies.name,
          },
        })
        .from(persons)
        .leftJoin(companies, eq(persons.companyId, companies.id))
        .where(whereClause)
        .orderBy(persons.lastName, persons.firstName)
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(persons).where(whereClause),
    ])

    // Transform rows to handle null company
    const items: PersonWithCompany[] = rows.map((row) => ({
      ...row,
      company: row.company?.id ? row.company : null,
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

  async search(query: string, limit = 10): Promise<Person[]> {
    if (!query.trim()) {
      return []
    }

    const items = await db
      .select()
      .from(persons)
      .where(
        or(
          ilike(persons.firstName, `%${query}%`),
          ilike(persons.lastName, `%${query}%`),
          ilike(persons.email, `%${query}%`)
        )
      )
      .limit(limit)

    return items
  },

  async addTag(personId: string,
    tag: string
  ): Promise<Person | null> {
    const person = await this.getById(personId)
    if (!person) return null

    const currentTags = person.tags || []
    if (currentTags.includes(tag)) {
      return person
    }

    return this.update(personId, {
      tags: [...currentTags, tag],
    })
  },

  async removeTag(personId: string,
    tag: string
  ): Promise<Person | null> {
    const person = await this.getById(personId)
    if (!person) return null

    const currentTags = person.tags || []

    return this.update(personId, {
      tags: currentTags.filter((t) => t !== tag),
    })
  },

  async setPrimaryContact(companyId: string,
    personId: string
  ): Promise<Person | null> {
    // First, unset any existing primary contact for this company
    await db
      .update(persons)
      .set({ isPrimaryContact: false })
      .where(
        and(
          eq(persons.companyId, companyId),
          eq(persons.isPrimaryContact, true)
        )
      )

    // Then set the new primary contact
    return this.update(personId, { isPrimaryContact: true })
  },
}
