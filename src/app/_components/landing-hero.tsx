import Link from 'next/link'
import { ArrowRight, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function LandingHero() {
  return (
    <section className="container mx-auto px-4 pt-20 pb-16 md:pt-32 md:pb-24">
      <div className="flex flex-col items-center text-center space-y-8">
        <div className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm bg-muted/50">
          <Building2 className="h-4 w-4" />
          <span>Professionelles Business Operating System</span>
        </div>

        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight max-w-4xl">
          Ihr Unternehmen.{' '}
          <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
            Eine Plattform.
          </span>
        </h1>

        <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl">
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

        <div className="grid grid-cols-3 gap-8 md:gap-16 pt-12 text-center border-t mt-16 w-full max-w-3xl">
          <div>
            <div className="text-3xl md:text-4xl font-bold">100%</div>
            <div className="text-sm text-muted-foreground mt-1">Open Source</div>
          </div>
          <div>
            <div className="text-3xl md:text-4xl font-bold">Multi</div>
            <div className="text-sm text-muted-foreground mt-1">Tenant</div>
          </div>
          <div>
            <div className="text-3xl md:text-4xl font-bold">KI</div>
            <div className="text-sm text-muted-foreground mt-1">Powered</div>
          </div>
        </div>
      </div>
    </section>
  )
}
