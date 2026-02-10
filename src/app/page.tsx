import { LandingHero } from './_components/landing-hero'
import { LandingFeatures } from './_components/landing-features'
import { LandingCTA } from './_components/landing-cta'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <LandingHero />
      <LandingFeatures />
      <LandingCTA />

      <footer className="border-t py-8 mt-20">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} XKMU Business OS. Alle Rechte vorbehalten.</p>
        </div>
      </footer>
    </div>
  )
}
