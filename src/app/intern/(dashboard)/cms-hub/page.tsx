import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Globe,
  Palette,
  LayoutTemplate,
  Navigation,
  Newspaper,
  Megaphone,
  Share2,
  Mail,
  ImageIcon,
  FileText,
} from 'lucide-react'
import Link from 'next/link'

const cards = [
  { title: 'Content', description: 'CMS-Seiten verwalten und bearbeiten', href: '/intern/cms', icon: Globe },
  { title: 'Design', description: 'Farben, Schriften und Layout konfigurieren', href: '/intern/cms/design', icon: Palette },
  { title: 'Vorlagen', description: 'Block-Vorlagen verwalten', href: '/intern/cms/templates', icon: LayoutTemplate },
  { title: 'Navigation', description: 'Header- und Footer-Navigation', href: '/intern/cms/navigation', icon: Navigation },
  { title: 'Blogartikel', description: 'Blog-Beiträge erstellen und veröffentlichen', href: '/intern/blog', icon: Newspaper },
  { title: 'Kampagnen', description: 'Marketing-Kampagnen planen', href: '/intern/marketing', icon: Megaphone },
  { title: 'Social Media', description: 'Social-Media-Beiträge verwalten', href: '/intern/social-media', icon: Share2 },
  { title: 'Newsletter', description: 'Newsletter erstellen und versenden', href: '/intern/marketing/newsletter', icon: Mail },
  { title: 'Bildgenerierung', description: 'KI-Bilder generieren', href: '/intern/images', icon: ImageIcon },
  { title: 'E-Mail-Vorlagen', description: 'E-Mail-Templates bearbeiten', href: '/intern/settings/email-templates', icon: FileText },
]

export default function CmsHubPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">CMS</h1>
        <p className="text-muted-foreground">
          Website-Inhalte, Marketing und Kommunikation
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
