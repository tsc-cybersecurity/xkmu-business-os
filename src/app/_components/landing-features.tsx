import { Building, Users, TrendingUp, Bot, Package, Zap } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const features = [
  {
    icon: Building,
    title: 'CRM & Kontaktmanagement',
    description:
      'Verwalten Sie Firmen und Kontaktpersonen zentral. Strukturierte Datenhaltung mit vollständiger Historie.',
  },
  {
    icon: TrendingUp,
    title: 'Lead-Management',
    description:
      'Von der ersten Anfrage bis zum Abschluss. Lead-Scoring, Pipeline-Management und automatische Workflows.',
  },
  {
    icon: Bot,
    title: 'KI-Integration',
    description:
      'Automatische Recherche, intelligente Textvervollständigung und KI-gestützte Analyse mit OpenRouter, Ollama & mehr.',
  },
  {
    icon: Package,
    title: 'Produktkatalog',
    description:
      'Produkte und Dienstleistungen zentral verwalten. Kategorisierung, Preise und flexible Custom Fields.',
  },
  {
    icon: Zap,
    title: 'Webhooks & API',
    description:
      'Vollständige REST API mit Dokumentation. Webhook-Integration für externe Automatisierungen.',
  },
  {
    icon: Users,
    title: 'Rollen & Berechtigungen',
    description:
      'Granulares RBAC-System. Definieren Sie eigene Rollen mit spezifischen Berechtigungen pro Modul.',
  },
]

export function LandingFeatures() {
  return (
    <section className="container mx-auto px-4 py-16 md:py-24">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          Alles, was Ihr Business braucht
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Eine All-in-One Plattform für modernes Kundenmanagement, Vertrieb und Prozessautomatisierung
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature) => {
          const Icon = feature.icon
          return (
            <Card key={feature.title} className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription className="text-base">{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          )
        })}
      </div>
    </section>
  )
}
