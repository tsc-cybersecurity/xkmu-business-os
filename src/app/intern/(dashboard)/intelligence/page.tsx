import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart3,
  Workflow,
  MessageSquare,
  Kanban,
  BookOpen,
  Zap,
} from 'lucide-react'
import Link from 'next/link'

const cards = [
  { title: 'Business Intelligence', description: 'Datenanalyse und Reports', href: '/intern/business-intelligence', icon: BarChart3 },
  { title: 'n8n Workflows', description: 'Automatisierungen mit n8n', href: '/intern/n8n-workflows', icon: Workflow },
  { title: 'KI-Chat', description: 'KI-Assistent für Recherche und Analyse', href: '/intern/chat', icon: MessageSquare },
  { title: 'Projekte', description: 'Projekte planen und verfolgen', href: '/intern/projekte', icon: Kanban },
  { title: 'Prozesse', description: 'Geschäftsprozesse dokumentieren', href: '/intern/prozesse', icon: BookOpen },
  { title: 'Workflows', description: 'Automatisierte Workflows konfigurieren', href: '/intern/settings/workflows', icon: Zap },
]

export default function IntelligencePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Intelligence</h1>
        <p className="text-muted-foreground">
          KI, Automatisierung und Business Intelligence
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
