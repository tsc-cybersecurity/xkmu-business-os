import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { tenants } from '@/lib/db/schema'
import { asc } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

const DEFAULT_LOGO_URL = 'https://www.xkmu.de/xkmu_q_gross_slogan.png'
const DEFAULT_LOGO_ALT = 'xKMU'

export async function GET() {
  try {
    const [tenant] = await db
      .select({ settings: tenants.settings })
      .from(tenants)
      .orderBy(asc(tenants.createdAt))
      .limit(1)

    const settings = (tenant?.settings ?? {}) as Record<string, unknown>

    return NextResponse.json({
      success: true,
      data: {
        logoUrl: (settings.logoUrl as string) || DEFAULT_LOGO_URL,
        logoAlt: (settings.logoAlt as string) || DEFAULT_LOGO_ALT,
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
