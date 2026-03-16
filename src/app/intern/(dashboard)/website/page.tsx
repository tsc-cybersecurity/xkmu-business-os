'use client'

import { CategoryPage } from '../_components/category-page'
import { Globe, FileCode, Layout, Navigation, BookOpen } from 'lucide-react'

export default function WebsitePage() {
  return (
    <CategoryPage
      title="Website"
      description="CMS, Blog und Navigation verwalten"
      icon={Globe}
      items={[
        { name: 'CMS Seiten', href: '/intern/cms', description: 'Webseiten mit Baukasten erstellen', icon: FileCode },
        { name: 'Vorlagen', href: '/intern/cms/templates', description: 'Block-Vorlagen verwalten', icon: Layout },
        { name: 'Navigation', href: '/intern/cms/navigation', description: 'Menue und Seitenstruktur', icon: Navigation },
        { name: 'Blog', href: '/intern/blog', description: 'Blogbeitraege erstellen und verwalten', icon: BookOpen },
      ]}
    />
  )
}
