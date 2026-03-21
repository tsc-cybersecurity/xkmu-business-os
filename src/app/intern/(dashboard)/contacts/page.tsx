'use client'

import { CategoryPage } from '../_components/category-page'
import { Building2, Users } from 'lucide-react'

export default function ContactsPage() {
  return (
    <CategoryPage
      title="Kontakte"
      description="Firmen und Personen verwalten"
      icon={Building2}
      items={[
        { name: 'Firmen', href: '/intern/contacts/companies', description: 'Firmenstammdaten, KI-Recherche, Aktivitäten', icon: Building2 },
        { name: 'Personen', href: '/intern/contacts/persons', description: 'Ansprechpartner und Kontaktpersonen', icon: Users },
      ]}
    />
  )
}
