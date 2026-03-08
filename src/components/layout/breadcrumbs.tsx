'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { Fragment } from 'react'

const segmentLabels: Record<string, string> = {
  intern: 'Home',
  dashboard: 'Dashboard',
  settings: 'Einstellungen',
  users: 'Benutzer',
  roles: 'Rollen',
  profile: 'Profil',
  tenant: 'Organisation',
  contacts: 'Kontakte',
  companies: 'Firmen',
  persons: 'Personen',
  leads: 'Leads',
  ideas: 'Ideen',
  catalog: 'Katalog',
  products: 'Produkte',
  services: 'Dienstleistungen',
  categories: 'Kategorien',
  finance: 'Finanzen',
  invoices: 'Rechnungen',
  offers: 'Angebote',
  cms: 'CMS',
  blog: 'Blog',
  marketing: 'Marketing',
  'social-media': 'Social Media',
  'business-intelligence': 'Business Intelligence',
  'din-audit': 'DIN Audits',
  cybersecurity: 'Cybersecurity',
  basisabsicherung: 'Basisabsicherung',
  'api-keys': 'API-Schlüssel',
  'ai-providers': 'Integrations',
  'ai-prompts': 'KI-Prompts',
  'ai-logs': 'KI-Logging',
  webhooks: 'Webhooks',
  export: 'Export',
  import: 'Import',
  'api-docs': 'API-Docs',
  'app-docs': 'App-Docs',
  database: 'Datenbank',
  n8n: 'n8n',
  'n8n-workflows': 'n8n Workflows',
  templates: 'Vorlagen',
  navigation: 'Navigation',
  grants: 'Fördermittel',
  new: 'Neu',
  checklist: 'Checkliste',
  report: 'Bericht',
  interview: 'Interview',
}

// Segments to skip in breadcrumb display
const skipSegments = new Set(['intern', '(dashboard)', '(auth)'])

export function Breadcrumbs() {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  const crumbs: { label: string; href: string }[] = []
  let href = ''

  for (const segment of segments) {
    href += `/${segment}`
    if (skipSegments.has(segment)) continue

    // Skip UUID segments (show as "Details")
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}/.test(segment)
    const label = isUuid ? 'Details' : (segmentLabels[segment] || segment)

    crumbs.push({ label, href })
  }

  if (crumbs.length === 0) return null

  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground">
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1
        return (
          <Fragment key={crumb.href}>
            {i > 0 && <ChevronRight className="h-3 w-3 shrink-0" />}
            {isLast ? (
              <span className="font-medium text-foreground truncate max-w-[200px]">
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="hover:text-foreground transition-colors truncate max-w-[200px]"
              >
                {crumb.label}
              </Link>
            )}
          </Fragment>
        )
      })}
    </nav>
  )
}
