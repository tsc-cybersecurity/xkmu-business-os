import type { Metadata } from 'next'
import { CmsPageService } from '@/lib/services/cms-page.service'

// Reihenfolge: NEXT_PUBLIC_SITE_URL (vom root layout genutzt) > NEXT_PUBLIC_APP_URL > Production-Fallback.
// 'localhost' wird ausgefiltert, weil OG-/Twitter-Image-URLs immer absolut auf die
// oeffentliche Domain zeigen muessen (sonst zerlegen Crawler die Karten).
const BASE_URL = (() => {
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
  return `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`
}

/**
 * Generates full metadata (title, description, keywords, OG, Twitter) for CMS pages.
 */
export async function generateCmsMetadata(slug: string, fallbackTitle: string): Promise<Metadata> {
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
        openGraph: {
          title,
          description,
          type: 'website',
          url: slug,
          ...(image ? { images: [image] } : {}),
        },
        twitter: {
          card: image ? 'summary_large_image' : 'summary',
          title,
          description,
          ...(image ? { images: [image] } : {}),
        },
      }
    }
  } catch {
    // DB not available
  }
  return { title: fallbackTitle }
}
