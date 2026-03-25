import { unstable_noStore as noStore } from 'next/cache'
import { CmsPageContent } from '../_components/cms-page-content'
import { LandingHero } from '../_components/landing-hero'
import { LandingFeatures } from '../_components/landing-features'
import { LandingCTA } from '../_components/landing-cta'
import { generateCmsMetadata } from '@/lib/utils/cms-metadata'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  return generateCmsMetadata('/', 'xKMU Business OS')
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
