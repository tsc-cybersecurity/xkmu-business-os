import { CmsPageContent } from '../../_components/cms-page-content'
import { CmsPageService } from '@/lib/services/cms-page.service'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  try {
    const page = await CmsPageService.getBySlugPublic('/it-consulting')
    if (page) {
      return {
        title: page.seoTitle || page.title || 'IT Consulting',
        description: page.seoDescription || undefined,
        keywords: page.seoKeywords || undefined,
      }
    }
  } catch {
    // DB not available
  }
  return { title: 'IT Consulting' }
}

export default function ITConsultingPage() {
  return <CmsPageContent slug="/it-consulting" />
}
