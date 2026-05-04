import { db } from '@/lib/db'
import {
  availabilityRules, availabilityOverrides,
  type AvailabilityRule, type NewAvailabilityRule,
  type AvailabilityOverride, type NewAvailabilityOverride,
} from '@/lib/db/schema'
import { and, asc, eq, gte, lte } from 'drizzle-orm'

export type RuleCreateInput = Omit<NewAvailabilityRule, 'id' | 'userId' | 'createdAt'>
export type RuleUpdateInput = Partial<RuleCreateInput>

export type OverrideCreateInput = Omit<NewAvailabilityOverride, 'id' | 'userId' | 'createdAt'>

export const AvailabilityService = {
  async listRules(userId: string): Promise<AvailabilityRule[]> {
    return db.select().from(availabilityRules)
      .where(eq(availabilityRules.userId, userId))
      .orderBy(asc(availabilityRules.dayOfWeek), asc(availabilityRules.startTime))
  },

  async createRule(userId: string, input: RuleCreateInput): Promise<AvailabilityRule> {
    const [row] = await db.insert(availabilityRules)
      .values({ ...input, userId })
      .returning()
    return row
  },

  async updateRule(id: string, input: RuleUpdateInput): Promise<AvailabilityRule> {
    const [row] = await db.update(availabilityRules)
      .set(input)
      .where(eq(availabilityRules.id, id))
      .returning()
    return row
  },

  async deleteRule(id: string): Promise<void> {
    await db.delete(availabilityRules).where(eq(availabilityRules.id, id))
  },

  async listOverrides(userId: string, fromDate?: Date, toDate?: Date): Promise<AvailabilityOverride[]> {
    const conditions = [eq(availabilityOverrides.userId, userId)]
    if (fromDate) conditions.push(gte(availabilityOverrides.endAt, fromDate))
    if (toDate) conditions.push(lte(availabilityOverrides.startAt, toDate))
    return db.select().from(availabilityOverrides)
      .where(and(...conditions))
      .orderBy(asc(availabilityOverrides.startAt))
  },

  async createOverride(userId: string, input: OverrideCreateInput): Promise<AvailabilityOverride> {
    const [row] = await db.insert(availabilityOverrides)
      .values({ ...input, userId })
      .returning()
    return row
  },

  async deleteOverride(id: string): Promise<void> {
    await db.delete(availabilityOverrides).where(eq(availabilityOverrides.id, id))
  },
}
