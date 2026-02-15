import { unstable_noStore as noStore } from 'next/cache'
import { notFound } from 'next/navigation'
import { CmsPageContent } from '../../_components/cms-page-content'
import { CmsPageService } from '@/lib/services/cms-page.service'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string[] }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  noStore()
  try {
    const { slug } = await params
    const fullSlug = '/' + slug.join('/')
    const page = await CmsPageService.getBySlugPublic(fullSlug)
    if (page) {
      return {
        title: page.seoTitle || page.title,
        description: page.seoDescription || undefined,
        keywords: page.seoKeywords || undefined,
      }
    }
  } catch {
    // DB not available
  }
  return {}
}

export default async function CmsCatchAllPage({ params }: Props) {
  noStore()
  const { slug } = await params
  const fullSlug = '/' + slug.join('/')

  const page = await CmsPageService.getBySlugPublic(fullSlug)
  if (!page) notFound()

  return <CmsPageContent slug={fullSlug} />
}
