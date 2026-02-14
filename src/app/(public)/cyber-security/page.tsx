import { CmsPageContent } from '../../_components/cms-page-content'
import { CmsPageService } from '@/lib/services/cms-page.service'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
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
