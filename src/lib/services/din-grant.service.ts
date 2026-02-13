import { db } from '@/lib/db'
import { dinGrants } from '@/lib/db/schema'
import { eq, and, gte, lte, asc, or } from 'drizzle-orm'
import type { DinGrant } from '@/lib/db/schema'

export interface GrantFilters {
  region?: string
  employeeCount?: number
}

export const DinGrantService = {
  async list(filters: GrantFilters = {}): Promise<DinGrant[]> {
    const conditions = []

    if (filters.region) {
      conditions.push(
        or(
          eq(dinGrants.region, filters.region),
          eq(dinGrants.region, 'Bundesweit')
        )!
      )
    }

    if (filters.employeeCount !== undefined) {
      conditions.push(
        or(
          // No min constraint or meets min
          and(
            or(eq(dinGrants.minEmployees, 0), lte(dinGrants.minEmployees, filters.employeeCount))!,
            or(eq(dinGrants.maxEmployees, 0), gte(dinGrants.maxEmployees, filters.employeeCount))!
          )!,
          // Null min/max (no constraint)
          and(
            eq(dinGrants.minEmployees, 0),
            eq(dinGrants.maxEmployees, 0)
          )!
        )!
      )
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    return db
      .select()
      .from(dinGrants)
      .where(whereClause)
      .orderBy(asc(dinGrants.region), asc(dinGrants.name))
  },

  async getById(id: string): Promise<DinGrant | null> {
    const [grant] = await db
      .select()
      .from(dinGrants)
      .where(eq(dinGrants.id, id))
      .limit(1)
    return grant ?? null
  },

  async getRegions(): Promise<string[]> {
    const results = await db
      .select({ region: dinGrants.region })
      .from(dinGrants)
      .groupBy(dinGrants.region)
      .orderBy(asc(dinGrants.region))
    return results.map((r) => r.region)
  },
}
