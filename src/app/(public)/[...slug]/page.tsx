import { unstable_noStore as noStore } from 'next/cache'
import { notFound } from 'next/navigation'
import { CmsPageContent } from '../../_components/cms-page-content'
import { CmsPageService } from '@/lib/services/cms-page.service'
import { generateCmsMetadata } from '@/lib/utils/cms-metadata'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string[] }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const fullSlug = '/' + slug.join('/')
  return generateCmsMetadata(fullSlug, slug[slug.length - 1] || 'Seite')
}

export default async function CmsCatchAllPage({ params }: Props) {
  noStore()
  const { slug } = await params
  const fullSlug = '/' + slug.join('/')

  const page = await CmsPageService.getBySlugPublic(fullSlug)
  if (!page) notFound()

  return <CmsPageContent slug={fullSlug} />
}
