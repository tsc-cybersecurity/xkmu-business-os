import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cmsSettings } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

const DEFAULT_LOGO_URL = 'https://www.xkmu.de/xkmu_q_gross_slogan.png'
const DEFAULT_LOGO_ALT = 'xKMU'

export async function GET() {
  try {
    const [row] = await db
      .select({ value: cmsSettings.value })
      .from(cmsSettings)
      .where(eq(cmsSettings.key, 'design'))
      .limit(1)

    const s = (row?.value ?? {}) as Record<string, unknown>

    return NextResponse.json({
      success: true,
      data: {
        logoUrl: (s.logoUrl as string) || DEFAULT_LOGO_URL,
        logoAlt: (s.logoAlt as string) || DEFAULT_LOGO_ALT,
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
