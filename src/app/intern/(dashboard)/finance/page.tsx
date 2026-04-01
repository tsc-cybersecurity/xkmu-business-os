'use client'

import { CategoryPage } from '../_components/category-page'
import { FileText, Receipt, FileCheck, FileSignature } from 'lucide-react'

export default function FinancePage() {
  return (
    <CategoryPage
      title="Finanzen"
      description="Rechnungen, Angebote und Vertraege verwalten"
      icon={FileText}
      items={[
        { name: 'Rechnungen', href: '/intern/finance/invoices', description: 'Rechnungen erstellen und verwalten', icon: Receipt },
        { name: 'Angebote', href: '/intern/finance/offers', description: 'Angebote erstellen und nachverfolgen', icon: FileCheck },
        { name: 'Vertraege', href: '/intern/finance/contracts', description: 'Kundenvertraege mit Templates erstellen und verwalten', icon: FileSignature },
      ]}
    />
  )
}
