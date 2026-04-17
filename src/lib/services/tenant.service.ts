import { db } from '@/lib/db'
import { tenants } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import type { Tenant, NewTenant } from '@/lib/db/schema'

export const TenantService = {
  async getById(): Promise<Tenant | null> {
    const [tenant] = await db.select().from(tenants).limit(1)
    return tenant ?? null
  },

  async update(
    data: Partial<Omit<NewTenant, 'id' | 'createdAt'>>
  ): Promise<Tenant | null> {
    const current = await this.getById()
    if (!current) return null

    const [tenant] = await db
      .update(tenants)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, current.id))
      .returning()

    return tenant ?? null
  },

  async slugExists(slug: string): Promise<boolean> {
    const current = await this.getById()
    const [row] = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.slug, slug))
      .limit(1)

    if (!row) return false
    if (current && row.id === current.id) return false
    return true
  },
}
