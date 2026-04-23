import { db } from '@/lib/db'
import { cmsSettings } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

const DESIGN_KEY = 'design'

interface DesignSettings {
  appUrl?: string
  [key: string]: unknown
}

async function getDesign(): Promise<DesignSettings> {
  const [row] = await db
    .select({ value: cmsSettings.value })
    .from(cmsSettings)
    .where(eq(cmsSettings.key, DESIGN_KEY))
    .limit(1)
  return (row?.value as DesignSettings | undefined) ?? {}
}

export const CmsDesignService = {
  /**
   * Resolve the canonical public app URL for generating links in outgoing content
   * (invite emails, notifications, etc.).
   *
   * Precedence: cms design setting → NEXT_PUBLIC_APP_URL → NEXTAUTH_URL → localhost.
   * Always returns a URL without trailing slash.
   */
  async getAppUrl(): Promise<string> {
    const design = await getDesign()
    const raw = design.appUrl?.trim()
      || process.env.NEXT_PUBLIC_APP_URL
      || process.env.NEXTAUTH_URL
      || 'http://localhost:3000'
    return raw.replace(/\/+$/, '')
  },
}
