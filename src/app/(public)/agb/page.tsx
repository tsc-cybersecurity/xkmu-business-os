import { CmsPageContent } from '../../_components/cms-page-content'
import { CmsPageService } from '@/lib/services/cms-page.service'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  try {
    const page = await CmsPageService.getBySlugPublic('/agb')
    if (page) {
      return {
        title: page.seoTitle || page.title || 'Allgemeine Geschaeftsbedingungen',
        description: page.seoDescription || undefined,
      }
    }
  } catch {
    // DB not available
  }
  return { title: 'Allgemeine Geschaeftsbedingungen' }
}

export default function AGBPage() {
  return <CmsPageContent slug="/agb" />
}
