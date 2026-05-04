import { db } from '@/lib/db'
import { slotTypes, type NewSlotType, type SlotType } from '@/lib/db/schema'
import { and, asc, eq } from 'drizzle-orm'

export type SlotTypeCreateInput = Omit<NewSlotType, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
export type SlotTypeUpdateInput = Partial<SlotTypeCreateInput>

export const SlotTypeService = {
  async list(userId: string): Promise<SlotType[]> {
    return db.select().from(slotTypes)
      .where(eq(slotTypes.userId, userId))
      .orderBy(asc(slotTypes.displayOrder), asc(slotTypes.createdAt))
  },

  async listActive(userId: string): Promise<SlotType[]> {
    return db.select().from(slotTypes)
      .where(and(eq(slotTypes.userId, userId), eq(slotTypes.isActive, true)))
      .orderBy(asc(slotTypes.displayOrder), asc(slotTypes.createdAt))
  },

  async getById(id: string): Promise<SlotType | null> {
    const rows = await db.select().from(slotTypes).where(eq(slotTypes.id, id)).limit(1)
    return rows[0] ?? null
  },

  async getByUserAndSlug(userId: string, slug: string): Promise<SlotType | null> {
    const rows = await db.select().from(slotTypes)
      .where(and(eq(slotTypes.userId, userId), eq(slotTypes.slug, slug)))
      .limit(1)
    return rows[0] ?? null
  },

  async create(userId: string, input: SlotTypeCreateInput): Promise<SlotType> {
    const [row] = await db.insert(slotTypes).values({ ...input, userId }).returning()
    return row
  },

  async update(id: string, input: SlotTypeUpdateInput): Promise<SlotType> {
    const [row] = await db.update(slotTypes)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(slotTypes.id, id))
      .returning()
    return row
  },

  async delete(id: string): Promise<void> {
    await db.delete(slotTypes).where(eq(slotTypes.id, id))
  },

  async reorder(userId: string, ids: string[]): Promise<void> {
    await Promise.all(
      ids.map((id, index) =>
        db.update(slotTypes)
          .set({ displayOrder: index, updatedAt: new Date() })
          .where(and(eq(slotTypes.id, id), eq(slotTypes.userId, userId))),
      ),
    )
  },
}
