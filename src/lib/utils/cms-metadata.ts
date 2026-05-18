import type { Metadata } from 'next'
import { CmsPageService } from '@/lib/services/cms-page.service'
import { CmsDesignService } from '@/lib/services/cms-design.service'

// Reihenfolge: NEXT_PUBLIC_SITE_URL (vom root layout genutzt) > NEXT_PUBLIC_APP_URL > Production-Fallback.
// 'localhost' wird ausgefiltert, weil OG-/Twitter-Image-URLs immer absolut auf die
// oeffentliche Domain zeigen muessen (sonst zerlegen Crawler die Karten).
const ENV_BASE_URL = (() => {
  const candidates = [process.env.NEXT_PUBLIC_SITE_URL, process.env.NEXT_PUBLIC_APP_URL]
  for (const c of candidates) {
    if (c && !c.includes('localhost')) return c
  }
  return 'https://www.xkmu.de'
})()

/** Make relative URLs absolute for OG tags */
export function toAbsoluteUrl(url: string): string {
  if (!url) return url
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `${ENV_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`
}

/**
 * Kanonischer Host fuer rel="canonical". Quelle: CMS-Design-Setting
 * (cms_settings.design.appUrl) — vom Operator unter /intern/cms/design
 * pflegbar. Faellt bei DB-Aussetzer auf die ENV-Reihenfolge zurueck.
 * Immer ohne Trailing-Slash.
 */
export async function getCanonicalBaseUrl(): Promise<string> {
  try {
    return await CmsDesignService.getAppUrl()
  } catch {
    return ENV_BASE_URL.replace(/\/+$/, '')
  }
}

/** Baut die kanonische Absolute-URL fuer einen Pfad ('/agb' → 'https://…/agb'). */
export async function buildCanonical(path: string): Promise<string> {
  const base = await getCanonicalBaseUrl()
  if (!path) return base
  return path.startsWith('/') ? `${base}${path}` : `${base}/${path}`
}

/**
 * Generates full metadata (title, description, keywords, OG, Twitter,
 * canonical) for CMS pages. canonical wird IMMER gesetzt — auch wenn
 * keine Page in der DB existiert (404-Fallback), sodass Suchmaschinen
 * die kanonische Form der URL kennen.
 */
export async function generateCmsMetadata(slug: string, fallbackTitle: string): Promise<Metadata> {
  const canonical = await buildCanonical(slug).catch(() => undefined)
  try {
    const page = await CmsPageService.getBySlugPublic(slug)
    if (page) {
      const title = page.seoTitle || page.title || fallbackTitle
      const description = page.seoDescription || undefined
      const image = page.ogImage ? toAbsoluteUrl(page.ogImage) : undefined

      return {
        title,
        description,
        keywords: page.seoKeywords || undefined,
        ...(canonical ? { alternates: { canonical } } : {}),
        openGraph: {
          title,
          description,
          type: 'website',
          url: canonical ?? slug,
          ...(image ? { images: [image] } : {}),
        },
        twitter: {
          card: image ? 'summary_large_image' : 'summary',
          site: '@xkmu',
          creator: '@xkmu',
          title,
          description,
          ...(image ? { images: [image] } : {}),
        },
      }
    }
  } catch {
    // DB not available
  }
  return {
    title: fallbackTitle,
    ...(canonical ? { alternates: { canonical } } : {}),
  }
}
