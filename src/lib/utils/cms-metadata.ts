import type { Metadata } from 'next'
import { CmsPageService } from '@/lib/services/cms-page.service'

/**
 * Generates full metadata (title, description, keywords, OG, Twitter) for CMS pages.
 */
export async function generateCmsMetadata(slug: string, fallbackTitle: string): Promise<Metadata> {
  try {
    const page = await CmsPageService.getBySlugPublic(slug)
    if (page) {
      const title = page.seoTitle || page.title || fallbackTitle
      const description = page.seoDescription || undefined
      const image = page.ogImage || undefined

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
