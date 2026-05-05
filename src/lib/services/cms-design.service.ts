import { db } from '@/lib/db'
import { cmsSettings } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

const DESIGN_KEY = 'design'

interface DesignSettings {
  appUrl?: string
  brandColor?: string
  logoUrl?: string
  [key: string]: unknown
}

export interface BrandingSettings {
  brandColor: string | null
  logoUrl: string | null
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
    // Precedence: cms design setting → NEXT_PUBLIC_SITE_URL (public canonical
    // host, e.g. www.xkmu.de) → NEXT_PUBLIC_APP_URL (deploy host, may differ
    // in dev/staging) → NEXTAUTH_URL → safe public default.
    const raw = design.appUrl?.trim()
      || process.env.NEXT_PUBLIC_SITE_URL
      || process.env.NEXT_PUBLIC_APP_URL
      || process.env.NEXTAUTH_URL
      || 'https://www.xkmu.de'
    return raw.replace(/\/+$/, '')
  },

  /**
   * Branding fuer ausgehende Artefakte (PDFs, Email-Header etc.).
   * Beide Felder optional — Konsumenten greifen auf eigene Defaults zurueck.
   */
  async getBranding(): Promise<BrandingSettings> {
    const design = await getDesign()
    return {
      brandColor: design.brandColor?.trim() || null,
      logoUrl: design.logoUrl?.trim() || null,
    }
  },
}
