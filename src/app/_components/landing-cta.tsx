import Link from 'next/link'
import { ArrowRight, Shield, Zap, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function LandingCTA() {
  return (
    <section className="container mx-auto px-4 py-16 md:py-24">
      <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 p-8 md:p-12 text-white">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold">
            Bereit durchzustarten?
          </h2>
          <p className="text-lg text-blue-100">
            Starten Sie jetzt kostenlos und erleben Sie, wie XKMU Business OS
            Ihre Geschäftsprozesse vereinfacht und automatisiert.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link href="/intern/register">
              <Button size="lg" variant="secondary" className="text-lg px-8">
                Jetzt registrieren
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/intern/login">
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 bg-white/10 hover:bg-white/20 text-white border-white/30"
              >
                Zum Login
              </Button>
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-6 pt-12 border-t border-white/20">
            <div className="flex flex-col items-center gap-2">
              <Shield className="h-8 w-8 text-blue-100" />
              <div className="font-semibold">Sicher & DSGVO-konform</div>
              <div className="text-sm text-blue-100">
                Ihre Daten bleiben geschützt
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Zap className="h-8 w-8 text-blue-100" />
              <div className="font-semibold">Sofort einsatzbereit</div>
              <div className="text-sm text-blue-100">
                In Minuten startklar
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Globe className="h-8 w-8 text-blue-100" />
              <div className="font-semibold">Open Source</div>
              <div className="text-sm text-blue-100">
                Volle Transparenz & Kontrolle
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
