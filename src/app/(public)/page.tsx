import { LandingHero } from '../_components/landing-hero'
import { LandingFeatures } from '../_components/landing-features'
import { LandingCTA } from '../_components/landing-cta'

export default function HomePage() {
  return (
    <>
      <LandingHero />
      <LandingFeatures />
      <LandingCTA />
    </>
  )
}
