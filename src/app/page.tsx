import { LandingNavbar } from './_components/landing-navbar'
import { LandingHero } from './_components/landing-hero'
import { LandingFeatures } from './_components/landing-features'
import { LandingCTA } from './_components/landing-cta'
import { LandingFooter } from './_components/landing-footer'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
      <LandingNavbar />
      <LandingHero />
      <LandingFeatures />
      <LandingCTA />
      <LandingFooter />
    </div>
  )
}
