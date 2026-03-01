import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { tenants, cmsNavigationItems } from '@/lib/db/schema'
import { asc, eq, and, count } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // 1. Count tenants
    const [tenantCount] = await db.select({ total: count() }).from(tenants)

    // 2. Get first tenant
    const allTenants = await db
      .select({ id: tenants.id, name: tenants.name, status: tenants.status })
      .from(tenants)
      .orderBy(asc(tenants.createdAt))
      .limit(5)

    // 3. Count nav items
    const [navCount] = await db.select({ total: count() }).from(cmsNavigationItems)

    // 4. Get nav items for first tenant
    let navItems: unknown[] = []
    if (allTenants.length > 0) {
      navItems = await db
        .select()
        .from(cmsNavigationItems)
        .where(
          and(
            eq(cmsNavigationItems.tenantId, allTenants[0].id),
            eq(cmsNavigationItems.isVisible, true),
          )
        )
        .orderBy(asc(cmsNavigationItems.sortOrder))
    }

    return NextResponse.json({
      tenantCount: Number(tenantCount.total),
      tenants: allTenants,
      totalNavItems: Number(navCount.total),
      navItemsForFirstTenant: navItems.length,
      navItems,
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
