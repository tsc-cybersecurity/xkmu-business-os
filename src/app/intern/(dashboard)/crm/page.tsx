import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Building2,
  Users,
  Package,
  Briefcase,
  Tags,
  FileText,
  FileEdit,
  ScrollText,
  Clock,
  TrendingUp,
  Telescope,
  Lightbulb,
} from 'lucide-react'
import Link from 'next/link'

const cards = [
  { title: 'Firmen', description: 'Firmenkontakte verwalten', href: '/intern/contacts/companies', icon: Building2 },
  { title: 'Personen', description: 'Ansprechpartner und Kontaktpersonen', href: '/intern/contacts/persons', icon: Users },
  { title: 'Produkte', description: 'Produktkatalog verwalten', href: '/intern/catalog/products', icon: Package },
  { title: 'Dienstleistungen', description: 'Dienstleistungskatalog', href: '/intern/catalog/services', icon: Briefcase },
  { title: 'Kategorien', description: 'Produkt- und Dienstleistungskategorien', href: '/intern/catalog/categories', icon: Tags },
  { title: 'Rechnungen', description: 'Rechnungen erstellen und verwalten', href: '/intern/finance/invoices', icon: FileText },
  { title: 'Angebote', description: 'Angebote erstellen und versenden', href: '/intern/finance/offers', icon: FileEdit },
  { title: 'Verträge', description: 'Verträge verwalten', href: '/intern/finance/contracts', icon: ScrollText },
  { title: 'Zeiterfassung', description: 'Arbeitszeiten erfassen', href: '/intern/zeiterfassung', icon: Clock },
  { title: 'Leads', description: 'Verkaufschancen und Anfragen', href: '/intern/leads', icon: TrendingUp },
  { title: 'Chancen', description: 'Opportunities und Pipeline', href: '/intern/chancen', icon: Telescope },
  { title: 'Ideen', description: 'Ideen und Vorschläge sammeln', href: '/intern/ideas', icon: Lightbulb },
]

export default function CrmPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">CRM</h1>
        <p className="text-muted-foreground">
          Kunden, Produkte und Vertrieb verwalten
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.href} href={card.href}>
            <Card className="cursor-pointer transition-colors hover:bg-muted/50">
              <CardHeader>
                <card.icon className="h-8 w-8 text-muted-foreground" />
                <CardTitle className="mt-4">{card.title}</CardTitle>
                <CardDescription>{card.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
