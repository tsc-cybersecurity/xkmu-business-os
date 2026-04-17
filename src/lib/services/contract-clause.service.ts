import { db } from '@/lib/db'
import { contractClauses } from '@/lib/db/schema'
import { eq, and, or, isNull, asc } from 'drizzle-orm'
import { TENANT_ID } from '@/lib/constants/tenant'

export const ContractClauseService = {
  async list(_tenantId: string, category?: string) {
    const conditions: ReturnType<typeof eq>[] = []
    if (category) conditions.push(eq(contractClauses.category, category))

    return db
      .select()
      .from(contractClauses)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(contractClauses.sortOrder, asc(contractClauses.name))
  },

  async getById(_tenantId: string, id: string) {
    const [row] = await db
      .select()
      .from(contractClauses)
      .where(eq(contractClauses.id, id))
      .limit(1)
    return row ?? null
  },

  async create(_tenantId: string, data: {
    name: string
    category: string
    bodyHtml?: string
    sortOrder?: number
  }) {
    const [row] = await db
      .insert(contractClauses)
      .values({
        name: data.name,
        category: data.category,
        bodyHtml: data.bodyHtml || null,
        sortOrder: data.sortOrder ?? 0,
        isSystem: false,
      })
      .returning()
    return row
  },

  async update(_tenantId: string, id: string, data: Partial<{
    name: string
    category: string
    bodyHtml: string
    sortOrder: number
  }>) {
    const existing = await this.getById(_tenantId, id)
    if (!existing) return null
    if (existing.isSystem) throw new Error('System-Bausteine koennen nicht bearbeitet werden')

    const [row] = await db
      .update(contractClauses)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(contractClauses.id, id)))
      .returning()
    return row ?? null
  },

  async delete(_tenantId: string, id: string) {
    const existing = await this.getById(_tenantId, id)
    if (!existing) return false
    if (existing.isSystem) throw new Error('System-Bausteine koennen nicht geloescht werden')

    const result = await db
      .delete(contractClauses)
      .where(and(eq(contractClauses.id, id)))
      .returning({ id: contractClauses.id })
    return result.length > 0
  },
}
