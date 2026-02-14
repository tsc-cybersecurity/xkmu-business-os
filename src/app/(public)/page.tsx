import { CmsPageContent } from '../_components/cms-page-content'
import { LandingHero } from '../_components/landing-hero'
import { LandingFeatures } from '../_components/landing-features'
import { LandingCTA } from '../_components/landing-cta'
import { CmsPageService } from '@/lib/services/cms-page.service'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  try {
    const page = await CmsPageService.getBySlugPublic('/')
    if (page) {
      return {
        title: page.seoTitle || page.title || 'xKMU Business OS',
        description: page.seoDescription || undefined,
        keywords: page.seoKeywords || undefined,
        openGraph: page.ogImage ? { images: [page.ogImage] } : undefined,
      }
    }
  } catch {
    // DB not available, use defaults
  }
  return { title: 'xKMU Business OS' }
}

function HardcodedFallback() {
  return (
    <>
      <LandingHero />
      <LandingFeatures />
      <LandingCTA />
    </>
  )
}

export default function HomePage() {
  return (
    <CmsPageContent
      slug="/"
      fallback={<HardcodedFallback />}
    />
  )
}
