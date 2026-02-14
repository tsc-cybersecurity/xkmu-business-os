import { CmsPageContent } from '../../_components/cms-page-content'
import { CmsPageService } from '@/lib/services/cms-page.service'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  try {
    const page = await CmsPageService.getBySlugPublic('/datenschutz')
    if (page) {
      return {
        title: page.seoTitle || page.title || 'Datenschutzerklaerung',
        description: page.seoDescription || undefined,
      }
    }
  } catch {
    // DB not available
  }
  return { title: 'Datenschutzerklaerung' }
}

export default function DatenschutzPage() {
  return <CmsPageContent slug="/datenschutz" />
}
