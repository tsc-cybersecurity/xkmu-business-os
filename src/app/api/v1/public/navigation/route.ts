import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { tenants } from '@/lib/db/schema'
import { asc } from 'drizzle-orm'
import { CmsNavigationService } from '@/lib/services/cms-navigation.service'

export const dynamic = 'force-dynamic'

// Global navigation items - always visible, not tenant-dependent
const GLOBAL_HEADER_ITEMS = [
  { label: 'Startseite', href: '/', sortOrder: 0, openInNewTab: false },
  { label: 'Cyber Security', href: '/cyber-security', sortOrder: 1, openInNewTab: false },
  { label: 'KI & Automation', href: '/ki-automation', sortOrder: 2, openInNewTab: false },
  { label: 'IT Consulting', href: '/it-consulting', sortOrder: 3, openInNewTab: false },
  { label: 'IT-News', href: '/it-news', sortOrder: 4, openInNewTab: false },
]

const GLOBAL_FOOTER_ITEMS = [
  { label: 'Kostenlos starten', href: '/intern/register', sortOrder: 0, openInNewTab: false },
  { label: 'API-Dokumentation', href: '/api-docs', sortOrder: 1, openInNewTab: false },
  { label: 'Impressum', href: '/impressum', sortOrder: 2, openInNewTab: false },
  { label: 'Kontakt', href: '/kontakt', sortOrder: 3, openInNewTab: false },
  { label: 'AGB', href: '/agb', sortOrder: 4, openInNewTab: false },
  { label: 'Datenschutz', href: '/datenschutz', sortOrder: 5, openInNewTab: false },
]

const GLOBAL_HREFS = new Set([
  ...GLOBAL_HEADER_ITEMS.map((i) => i.href),
  ...GLOBAL_FOOTER_ITEMS.map((i) => i.href),
])

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const location = searchParams.get('location')

    if (!location || !['header', 'footer'].includes(location)) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'location muss "header" oder "footer" sein' } },
        { status: 400 }
      )
    }

    // Start with global items
    const globalItems = location === 'header' ? GLOBAL_HEADER_ITEMS : GLOBAL_FOOTER_ITEMS

    // Try to load additional tenant-specific items from DB
    let tenantItems: Array<{ label: string; href: string; sortOrder: number; openInNewTab: boolean }> = []
    try {
      const [tenant] = await db
        .select({ id: tenants.id })
        .from(tenants)
        .orderBy(asc(tenants.createdAt))
        .limit(1)

      if (tenant) {
        const dbItems = await CmsNavigationService.listPublic(tenant.id, location)
        // Only include tenant items that are NOT already in global list (avoid duplicates)
        tenantItems = dbItems
          .filter((item) => !GLOBAL_HREFS.has(item.href))
          .map((item) => ({
            label: item.label,
            href: item.href,
            sortOrder: globalItems.length + (item.sortOrder ?? 0),
            openInNewTab: item.openInNewTab ?? false,
          }))
      }
    } catch {
      // DB not available - return global items only
    }

    const allItems = [...globalItems, ...tenantItems]
    return NextResponse.json({ success: true, data: allItems })
  } catch (error) {
    console.error('Error fetching public navigation:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}
