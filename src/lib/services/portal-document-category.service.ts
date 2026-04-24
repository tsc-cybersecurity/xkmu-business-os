import { db } from '@/lib/db'
import { portalDocumentCategories, portalDocuments } from '@/lib/db/schema'
import type { PortalDocumentCategory } from '@/lib/db/schema'
import { and, asc, eq, isNull, count } from 'drizzle-orm'
import { logger } from '@/lib/utils/logger'

const VALID_DIRECTIONS = ['admin_to_portal', 'portal_to_admin', 'both'] as const
type Direction = typeof VALID_DIRECTIONS[number]

export interface CreateCategoryInput {
  name: string
  direction: Direction
  sortOrder?: number
}

export interface UpdateCategoryInput {
  name?: string
  sortOrder?: number
}

export const PortalDocumentCategoryService = {
  async listActive(direction?: Direction | 'any'): Promise<PortalDocumentCategory[]> {
    const conds = [isNull(portalDocumentCategories.deletedAt)]
    if (direction && direction !== 'any') {
      conds.push(eq(portalDocumentCategories.direction, direction))
    }
    return db
      .select()
      .from(portalDocumentCategories)
      .where(and(...conds))
      .orderBy(asc(portalDocumentCategories.sortOrder), asc(portalDocumentCategories.name))
  },

  /** Kategorien für einen Raum: passende direction + 'both' */
  async listForRoom(room: 'admin_to_portal' | 'portal_to_admin'): Promise<PortalDocumentCategory[]> {
    const all = await this.listActive('any')
    return all.filter(c => c.direction === room || c.direction === 'both')
  },

  async getById(id: string): Promise<PortalDocumentCategory | null> {
    const [row] = await db
      .select()
      .from(portalDocumentCategories)
      .where(eq(portalDocumentCategories.id, id))
      .limit(1)
    return row ?? null
  },

  async create(input: CreateCategoryInput): Promise<PortalDocumentCategory> {
    if (!VALID_DIRECTIONS.includes(input.direction)) {
      throw new Error(`Ungültige direction: ${input.direction}`)
    }
    if (!input.name || input.name.trim().length === 0) {
      throw new Error('Name darf nicht leer sein')
    }
    const [created] = await db.insert(portalDocumentCategories).values({
      name: input.name.trim(),
      direction: input.direction,
      sortOrder: input.sortOrder ?? 0,
      isSystem: false,
    }).returning()
    logger.info(`Document category created: ${created.name}`, { module: 'PortalDocumentCategoryService' })
    return created
  },

  async update(id: string, input: UpdateCategoryInput): Promise<PortalDocumentCategory> {
    const existing = await this.getById(id)
    if (!existing) throw new Error('Kategorie nicht gefunden')
    if (existing.isSystem && input.name !== undefined) {
      throw new Error('Systemkategorie — Name nicht änderbar')
    }
    const update: Partial<PortalDocumentCategory> = { updatedAt: new Date() }
    if (input.name !== undefined) update.name = input.name.trim()
    if (input.sortOrder !== undefined) update.sortOrder = input.sortOrder

    const [updated] = await db.update(portalDocumentCategories)
      .set(update)
      .where(eq(portalDocumentCategories.id, id))
      .returning()
    return updated
  },

  /**
   * Soft-delete. Blocks if:
   *   - isSystem=true
   *   - active documents (deletedAt IS NULL) reference this category
   */
  async softDelete(id: string): Promise<void> {
    const existing = await this.getById(id)
    if (!existing) throw new Error('Kategorie nicht gefunden')
    if (existing.isSystem) throw new Error('Systemkategorie — nicht löschbar')

    const [{ count: refCount }] = await db
      .select({ count: count() })
      .from(portalDocuments)
      .where(and(
        eq(portalDocuments.categoryId, id),
        isNull(portalDocuments.deletedAt),
      ))
      .limit(1)

    if (Number(refCount) > 0) {
      throw new Error(`Kategorie hat noch ${refCount} aktive Dokumente — nicht löschbar`)
    }

    await db.update(portalDocumentCategories)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(portalDocumentCategories.id, id))
    logger.info(`Document category soft-deleted: ${existing.name}`, { module: 'PortalDocumentCategoryService' })
  },
}
