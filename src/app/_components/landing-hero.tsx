import Link from 'next/link'
import { ArrowRight, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function LandingHero() {
  return (
    <section className="relative min-h-[66vh] flex items-center">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?q=80&w=2070&auto=format&fit=crop")',
        }}
      />
      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/70" />

      {/* Content */}
      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col items-center text-center space-y-8 py-20 md:py-24">
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--brand-400)]/30 px-4 py-2 text-sm bg-white/10 backdrop-blur-md text-white">
          <Building2 className="h-4 w-4 text-[var(--brand-400)]" />
          <span>Professionelles Business Operating System</span>
        </div>

        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight max-w-4xl text-white drop-shadow-lg">
          Ihr Unternehmen.{' '}
          <span className="bg-gradient-to-r from-[var(--brand-400)] to-[var(--brand-gradient-to)] bg-clip-text text-transparent">
            Eine Plattform.
          </span>
        </h1>

        <p className="text-xl md:text-2xl text-gray-100 max-w-2xl drop-shadow-md">
          XKMU Business OS vereint CRM, Lead-Management, Produktkatalog und KI-gestützte
          Prozesse in einer modernen, mandantenfähigen Lösung.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mt-8">
          <Link href="/intern/login">
            <Button size="lg" className="text-lg px-8">
              Zum Login
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link href="/intern/register">
            <Button size="lg" variant="outline" className="text-lg px-8">
              Kostenlos registrieren
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-8 md:gap-16 pt-12 text-center border-t border-white/20 mt-16 w-full max-w-3xl">
          <div>
            <div className="text-3xl md:text-4xl font-bold text-white">100%</div>
            <div className="text-sm text-gray-300 mt-1">Open Source</div>
          </div>
          <div>
            <div className="text-3xl md:text-4xl font-bold text-white">Multi</div>
            <div className="text-sm text-gray-300 mt-1">Tenant</div>
          </div>
          <div>
            <div className="text-3xl md:text-4xl font-bold text-white">KI</div>
            <div className="text-sm text-gray-300 mt-1">Powered</div>
          </div>
        </div>
        </div>
      </div>
    </section>
  )
}
