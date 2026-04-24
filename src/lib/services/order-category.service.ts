import { db } from '@/lib/db'
import { orderCategories } from '@/lib/db/schema'
import type { OrderCategory } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'

export const OrderCategoryService = {
  async list(activeOnly = true): Promise<OrderCategory[]> {
    const where = activeOnly ? eq(orderCategories.isActive, true) : undefined
    return db
      .select()
      .from(orderCategories)
      .where(where)
      .orderBy(asc(orderCategories.sortOrder), asc(orderCategories.name))
  },

  async getById(id: string): Promise<OrderCategory | null> {
    const [row] = await db.select().from(orderCategories).where(eq(orderCategories.id, id)).limit(1)
    return row ?? null
  },
}
