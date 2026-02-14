import { unstable_noStore as noStore } from 'next/cache'
import { CmsPageContent } from '../../_components/cms-page-content'
import { CmsPageService } from '@/lib/services/cms-page.service'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  noStore()
  try {
    const page = await CmsPageService.getBySlugPublic('/ki-automation')
    if (page) {
      return {
        title: page.seoTitle || page.title || 'KI & Automation',
        description: page.seoDescription || undefined,
        keywords: page.seoKeywords || undefined,
      }
    }
  } catch {
    // DB not available
  }
  return { title: 'KI & Automation' }
}

export default function KIAutomationPage() {
  return <CmsPageContent slug="/ki-automation" />
}
