'use client'

import { CategoryPage } from '../_components/category-page'
import { Brain, BarChart3, Megaphone, Share2, Workflow, MessageSquare } from 'lucide-react'

export default function MarketingKiPage() {
  return (
    <CategoryPage
      title="Marketing & KI"
      description="Intelligente Marketing-Tools und Automatisierung"
      icon={Brain}
      items={[
        { name: 'Business Intelligence', href: '/intern/business-intelligence', description: 'Dokumente analysieren, SWOT, KPIs', icon: BarChart3 },
        { name: 'Marketing', href: '/intern/marketing', description: 'Kampagnen, E-Mails, Anrufe', icon: Megaphone },
        { name: 'Social Media', href: '/intern/social-media', description: 'Beitraege, Themen, Content-Plaene', icon: Share2 },
        { name: 'n8n Workflows', href: '/intern/n8n-workflows', description: 'Automatisierungen und Integrationen', icon: Workflow },
        { name: 'KI-Chat', href: '/intern/chat', description: 'KI-Assistent fuer Fragen und Aufgaben', icon: MessageSquare },
      ]}
    />
  )
}
