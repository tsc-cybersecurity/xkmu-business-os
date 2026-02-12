'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, Home } from 'lucide-react'

const pathLabels: Record<string, string> = {
  'agb': 'AGB',
  'impressum': 'Impressum',
  'datenschutz': 'Datenschutz',
  'cyber-security': 'Cyber Security',
  'ki-automation': 'KI & Automation',
  'it-consulting': 'IT Consulting',
  'it-news': 'IT-News',
  'kontakt': 'Kontakt',
}

export function Breadcrumb() {
  const pathname = usePathname()

  if (pathname === '/') return null

  const segments = pathname.split('/').filter(Boolean)

  return (
    <nav aria-label="Breadcrumb" className="container mx-auto px-4 py-4">
      <ol className="flex items-center gap-2 text-sm text-muted-foreground">
        <li>
          <Link href="/" className="hover:text-foreground transition-colors flex items-center gap-1">
            <Home className="h-3.5 w-3.5" />
            <span>Startseite</span>
          </Link>
        </li>
        {segments.map((segment, index) => {
          const path = '/' + segments.slice(0, index + 1).join('/')
          const isLast = index === segments.length - 1
          const label = pathLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1)

          return (
            <li key={path} className="flex items-center gap-2">
              <ChevronRight className="h-3.5 w-3.5" />
              {isLast ? (
                <span className="text-foreground font-medium">{label}</span>
              ) : (
                <Link href={path} className="hover:text-foreground transition-colors">
                  {label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
