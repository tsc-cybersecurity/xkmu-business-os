import { unstable_noStore as noStore } from 'next/cache'
import { CmsPageContent } from '../../_components/cms-page-content'
import { CmsPageService } from '@/lib/services/cms-page.service'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  noStore()
  try {
    const page = await CmsPageService.getBySlugPublic('/cyber-security')
    if (page) {
      return {
        title: page.seoTitle || page.title || 'Cyber Security',
        description: page.seoDescription || undefined,
        keywords: page.seoKeywords || undefined,
      }
    }
  } catch {
    // DB not available
  }
  return { title: 'Cyber Security' }
}

export default function CyberSecurityPage() {
  return <CmsPageContent slug="/cyber-security" />
}
