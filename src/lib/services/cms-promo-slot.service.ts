import { db } from '@/lib/db'
import { cmsPromoSlots } from '@/lib/db/schema'
import { eq, inArray, asc, and } from 'drizzle-orm'
import type { CmsPromoSlot } from '@/lib/db/schema'

export interface CreateCmsPromoSlotInput {
  slug: string
  name: string
  description?: string | null
  blockType: string
  content?: Record<string, unknown>
  settings?: Record<string, unknown>
  isActive?: boolean
}

export type UpdateCmsPromoSlotInput = Partial<CreateCmsPromoSlotInput>

// Slug-Format: nur Kleinbuchstaben, Ziffern, Bindestriche. Wird im
// Blog-Markdown als {promo:slug} referenziert; strenges Regex schuetzt
// gegen Whitespace- oder Sonderzeichen-Tippfehler.
export const PROMO_SLUG_REGEX = /^[a-z0-9][a-z0-9-]{0,118}[a-z0-9]$|^[a-z0-9]$/

export function isValidPromoSlug(slug: string): boolean {
  return PROMO_SLUG_REGEX.test(slug)
}

export const CmsPromoSlotService = {
  async list(): Promise<CmsPromoSlot[]> {
    return db
      .select()
      .from(cmsPromoSlots)
      .orderBy(asc(cmsPromoSlots.name))
  },

  async getById(id: string): Promise<CmsPromoSlot | null> {
    const [row] = await db
      .select()
      .from(cmsPromoSlots)
      .where(eq(cmsPromoSlots.id, id))
      .limit(1)
    return row ?? null
  },

  async getBySlug(slug: string): Promise<CmsPromoSlot | null> {
    const [row] = await db
      .select()
      .from(cmsPromoSlots)
      .where(eq(cmsPromoSlots.slug, slug))
      .limit(1)
    return row ?? null
  },

  // Batch-Lookup fuer den Blog-Renderer — alle in einem Query, nur aktive.
  async getActiveBySlugs(slugs: string[]): Promise<CmsPromoSlot[]> {
    if (slugs.length === 0) return []
    return db
      .select()
      .from(cmsPromoSlots)
      .where(and(inArray(cmsPromoSlots.slug, slugs), eq(cmsPromoSlots.isActive, true)))
  },

  async create(data: CreateCmsPromoSlotInput): Promise<CmsPromoSlot> {
    if (!isValidPromoSlug(data.slug)) {
      throw new Error('Ungueltiger Slug — nur a-z, 0-9 und Bindestriche erlaubt.')
    }
    const [row] = await db
      .insert(cmsPromoSlots)
      .values({
        slug: data.slug,
        name: data.name,
        description: data.description ?? null,
        blockType: data.blockType,
        content: data.content ?? {},
        settings: data.settings ?? {},
        isActive: data.isActive ?? true,
      })
      .returning()
    return row
  },

  async update(id: string, data: UpdateCmsPromoSlotInput): Promise<CmsPromoSlot | null> {
    const patch: Record<string, unknown> = { updatedAt: new Date() }
    if (data.slug !== undefined) {
      if (!isValidPromoSlug(data.slug)) {
        throw new Error('Ungueltiger Slug — nur a-z, 0-9 und Bindestriche erlaubt.')
      }
      patch.slug = data.slug
    }
    if (data.name !== undefined) patch.name = data.name
    if (data.description !== undefined) patch.description = data.description
    if (data.blockType !== undefined) patch.blockType = data.blockType
    if (data.content !== undefined) patch.content = data.content
    if (data.settings !== undefined) patch.settings = data.settings
    if (data.isActive !== undefined) patch.isActive = data.isActive

    const [row] = await db
      .update(cmsPromoSlots)
      .set(patch)
      .where(eq(cmsPromoSlots.id, id))
      .returning()
    return row ?? null
  },

  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(cmsPromoSlots)
      .where(eq(cmsPromoSlots.id, id))
      .returning({ id: cmsPromoSlots.id })
    return result.length > 0
  },
}
