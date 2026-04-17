import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield,
  Server,
  AlertTriangle,
  ClipboardCheck,
  CheckSquare,
  Coins,
} from 'lucide-react'
import Link from 'next/link'

const cards = [
  { title: 'IT-Grundschutz++', description: 'BSI IT-Grundschutz Basisabsicherung', href: '/intern/cybersecurity/grundschutz', icon: Shield },
  { title: 'IT-Assets', description: 'IT-Systeme und Assets verwalten', href: '/intern/cybersecurity/grundschutz/assets', icon: Server },
  { title: 'IR Playbooks', description: 'Incident-Response-Playbooks', href: '/intern/cybersecurity/ir-playbook', icon: AlertTriangle },
  { title: 'DIN SPEC 27076', description: 'DIN SPEC 27076 Audits durchführen', href: '/intern/din-audit', icon: ClipboardCheck },
  { title: 'WiBA-Check', description: 'WiBA Sicherheitschecks', href: '/intern/wiba', icon: CheckSquare },
  { title: 'Fördermitteldatenbank', description: 'Fördermittel und Zuschüsse finden', href: '/intern/din-audit/grants', icon: Coins },
]

export default function CybersecurityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">IT-Sicherheit</h1>
        <p className="text-muted-foreground">
          Cybersecurity, Compliance und Audits
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
