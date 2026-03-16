'use client'

import { CategoryPage } from '../_components/category-page'
import { Package, Briefcase, FolderTree } from 'lucide-react'

export default function CatalogPage() {
  return (
    <CategoryPage
      title="Katalog"
      description="Produkte, Dienstleistungen und Kategorien"
      icon={Package}
      items={[
        { name: 'Produkte', href: '/intern/catalog/products', description: 'Physische Produkte und Waren', icon: Package },
        { name: 'Dienstleistungen', href: '/intern/catalog/services', description: 'Service-Angebote und Beratung', icon: Briefcase },
        { name: 'Kategorien', href: '/intern/catalog/categories', description: 'Produkt- und Service-Kategorien', icon: FolderTree },
      ]}
    />
  )
}
