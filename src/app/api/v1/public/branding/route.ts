import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cmsSettings, tenants } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

const DEFAULT_LOGO_URL = 'https://www.xkmu.de/xkmu_q_gross_slogan.png'
const DEFAULT_LOGO_ALT = 'xKMU'

export async function GET() {
  try {
    // 1. CMS Design settings
    const [row] = await db
      .select({ value: cmsSettings.value })
      .from(cmsSettings)
      .where(eq(cmsSettings.key, 'design'))
      .limit(1)

    const s = (row?.value ?? {}) as Record<string, unknown>

    // 2. Fallback: check tenant settings for logo (uploaded via Organisation page)
    let logoUrl = (s.logoUrl as string) || ''
    let logoAlt = (s.logoAlt as string) || ''

    if (!logoUrl) {
      const allTenants = await db
        .select({ settings: tenants.settings, name: tenants.name })
        .from(tenants)
        .where(eq(tenants.status, 'active'))

      const real = allTenants.find((t) => t.name !== 'Default Organisation') || allTenants[0]
      const ts = (real?.settings ?? {}) as Record<string, unknown>
      logoUrl = (ts.logoUrl as string) || ''
      if (!logoAlt) logoAlt = (ts.logoAlt as string) || ''
    }

    return NextResponse.json({
      success: true,
      data: {
        logoUrl: logoUrl || DEFAULT_LOGO_URL,
        logoAlt: logoAlt || DEFAULT_LOGO_ALT,
        defaultFont: (s.defaultFont as string) || null,
        defaultAccent: (s.defaultAccent as string) || null,
        defaultRadius: (s.defaultRadius as string) || null,
        defaultTheme: (s.defaultTheme as string) || null,
        headerSticky: s.headerSticky !== false,
        footerText: (s.footerText as string) || null,
        contactHeadline: (s.contactHeadline as string) || null,
        contactDescription: (s.contactDescription as string) || null,
        contactInterestTags: (s.contactInterestTags as string[]) || null,
      },
    })
  } catch {
    return NextResponse.json({
      success: true,
      data: {
        logoUrl: DEFAULT_LOGO_URL,
        logoAlt: DEFAULT_LOGO_ALT,
      },
    })
  }
}
