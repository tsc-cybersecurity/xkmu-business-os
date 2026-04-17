import { db } from '@/lib/db'
import { organization } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import type { Organization, NewOrganization } from '@/lib/db/schema'

export const OrganizationService = {
  async getById(): Promise<Organization | null> {
    const [org] = await db.select().from(organization).limit(1)
    return org ?? null
  },

  async update(
    data: Partial<Omit<NewOrganization, 'id' | 'createdAt'>>
  ): Promise<Organization | null> {
    const current = await this.getById()
    if (!current) return null

    const [org] = await db
      .update(organization)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(organization.id, current.id))
      .returning()

    return org ?? null
  },

  async slugExists(slug: string): Promise<boolean> {
    const current = await this.getById()
    const [row] = await db
      .select({ id: organization.id })
      .from(organization)
      .where(eq(organization.slug, slug))
      .limit(1)

    if (!row) return false
    if (current && row.id === current.id) return false
    return true
  },
}
