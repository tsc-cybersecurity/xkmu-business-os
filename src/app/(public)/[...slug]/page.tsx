import { unstable_noStore as noStore } from 'next/cache'
import { notFound, redirect } from 'next/navigation'
import { CmsPageContent } from '../../_components/cms-page-content'
import { CmsPageService } from '@/lib/services/cms-page.service'
import { ShortcodeService, isShortcodeFormat } from '@/lib/services/shortcode.service'
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

  // Shortcode-Resolver: bei /xxxxxx (genau 1 Segment, 6 Zeichen base36)
  // erst gegen shortcode-Tabellen pruefen. Hit → 301 auf kanonische URL.
  // Miss → durchfallen lassen, damit normale Slug-Aufloesung weitermacht
  // (z.B. /buchen oder /pakete sind 6 Zeichen lang und sollen weiterhin
  // ihre CMS-Page sein).
  if (slug.length === 1 && isShortcodeFormat(slug[0])) {
    try {
      const resolved = await ShortcodeService.resolve(slug[0])
      if (resolved && resolved.isPublished) {
        redirect(resolved.canonicalUrl)
      }
    } catch {
      // DB nicht erreichbar → wie Miss behandeln, normale Aufloesung versuchen
    }
  }

  const fullSlug = '/' + slug.join('/')
  const page = await CmsPageService.getBySlugPublic(fullSlug)
  if (!page) notFound()

  return <CmsPageContent slug={fullSlug} />
}
