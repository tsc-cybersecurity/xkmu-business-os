'use client'

import { CategoryPage } from '../_components/category-page'
import { FileText, Receipt, FileCheck } from 'lucide-react'

export default function FinancePage() {
  return (
    <CategoryPage
      title="Finanzen"
      description="Rechnungen und Angebote verwalten"
      icon={FileText}
      items={[
        { name: 'Rechnungen', href: '/intern/finance/invoices', description: 'Rechnungen erstellen und verwalten', icon: Receipt },
        { name: 'Angebote', href: '/intern/finance/offers', description: 'Angebote erstellen und nachverfolgen', icon: FileCheck },
      ]}
    />
  )
}
