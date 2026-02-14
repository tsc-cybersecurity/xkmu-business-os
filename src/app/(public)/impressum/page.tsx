import { unstable_noStore as noStore } from 'next/cache'
import { CmsPageContent } from '../../_components/cms-page-content'
import { CmsPageService } from '@/lib/services/cms-page.service'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  noStore()
  try {
    const page = await CmsPageService.getBySlugPublic('/impressum')
    if (page) {
      return {
        title: page.seoTitle || page.title || 'Impressum',
        description: page.seoDescription || undefined,
      }
    }
  } catch {
    // DB not available
  }
  return { title: 'Impressum' }
}

export default function ImpressumPage() {
  return <CmsPageContent slug="/impressum" />
}
