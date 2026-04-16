import { db } from '@/lib/db'
import { contractTemplates } from '@/lib/db/schema'
import { eq, and, or, isNull, desc } from 'drizzle-orm'
import { TENANT_ID } from '@/lib/constants/tenant'

export const ContractTemplateService = {
  async list(_tenantId: string, category?: string) {
    const conditions = [
      or(eq(contractTemplates.tenantId, TENANT_ID), isNull(contractTemplates.tenantId)),
    ]
    if (category) conditions.push(eq(contractTemplates.category, category))

    return db
      .select()
      .from(contractTemplates)
      .where(and(...conditions))
      .orderBy(desc(contractTemplates.isSystem), desc(contractTemplates.updatedAt))
  },

  async getById(_tenantId: string, id: string) {
    const [row] = await db
      .select()
      .from(contractTemplates)
      .where(
        and(
          eq(contractTemplates.id, id),
          or(eq(contractTemplates.tenantId, TENANT_ID), isNull(contractTemplates.tenantId))
        )
      )
      .limit(1)
    return row ?? null
  },

  async create(_tenantId: string, data: {
    name: string
    category: string
    description?: string
    bodyHtml?: string
    placeholders?: unknown[]
    clauses?: unknown[]
  }) {
    const [row] = await db
      .insert(contractTemplates)
      .values({
        tenantId: TENANT_ID,
        name: data.name,
        category: data.category,
        description: data.description || null,
        bodyHtml: data.bodyHtml || null,
        placeholders: data.placeholders || [],
        clauses: data.clauses || [],
        isSystem: false,
      })
      .returning()
    return row
  },

  async update(_tenantId: string, id: string, data: Partial<{
    name: string
    category: string
    description: string
    bodyHtml: string
    placeholders: unknown[]
    clauses: unknown[]
  }>) {
    const existing = await this.getById(_tenantId, id)
    if (!existing) return null
    if (existing.isSystem) throw new Error('System-Templates koennen nicht bearbeitet werden')

    const [row] = await db
      .update(contractTemplates)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(contractTemplates.id, id), eq(contractTemplates.tenantId, TENANT_ID)))
      .returning()
    return row ?? null
  },

  async delete(_tenantId: string, id: string) {
    const existing = await this.getById(_tenantId, id)
    if (!existing) return false
    if (existing.isSystem) throw new Error('System-Templates koennen nicht geloescht werden')

    const result = await db
      .delete(contractTemplates)
      .where(and(eq(contractTemplates.id, id), eq(contractTemplates.tenantId, TENANT_ID)))
      .returning({ id: contractTemplates.id })
    return result.length > 0
  },

  async duplicate(_tenantId: string, id: string) {
    const original = await this.getById(_tenantId, id)
    if (!original) return null

    return this.create(_tenantId, {
      name: `${original.name} (Kopie)`,
      category: original.category,
      description: original.description || undefined,
      bodyHtml: original.bodyHtml || undefined,
      placeholders: (original.placeholders as unknown[]) || [],
      clauses: (original.clauses as unknown[]) || [],
    })
  },
}
