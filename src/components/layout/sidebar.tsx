'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Building2,
  Package,
  FileText,
  TrendingUp,
  Telescope,
  Lightbulb,
  Settings,
  Shield,
  Globe,
  ChevronLeft,
  ChevronRight,
  Brain,
  Database,
  Workflow,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { usePermissions } from '@/hooks/use-permissions'
import type { Module } from '@/lib/types/permissions'
import packageJson from '../../../package.json'

interface NavChild {
  name: string
  href: string
  requiredModule?: Module
}

interface NavItem {
  name: string
  href?: string
  icon: typeof LayoutDashboard
  requiredModule?: Module
  children?: NavChild[]
}

const navigation: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/intern/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Kontakte',
    href: '/intern/contacts',
    icon: Building2,
    children: [
      { name: 'Firmen', href: '/intern/contacts/companies', requiredModule: 'companies' },
      { name: 'Personen', href: '/intern/contacts/persons', requiredModule: 'persons' },
    ],
  },
  {
    name: 'Katalog',
    href: '/intern/catalog',
    icon: Package,
    children: [
      { name: 'Produkte', href: '/intern/catalog/products', requiredModule: 'products' },
      { name: 'Dienstleistungen', href: '/intern/catalog/services', requiredModule: 'products' },
      { name: 'Kategorien', href: '/intern/catalog/categories', requiredModule: 'product_categories' },
    ],
  },
  {
    name: 'Finanzen',
    href: '/intern/finance',
    icon: FileText,
    children: [
      { name: 'Rechnungen', href: '/intern/finance/invoices', requiredModule: 'documents' },
      { name: 'Angebote', href: '/intern/finance/offers', requiredModule: 'documents' },
    ],
  },
  {
    name: 'Leads',
    href: '/intern/leads',
    icon: TrendingUp,
    requiredModule: 'leads',
  },
  {
    name: 'Chancen',
    href: '/intern/chancen',
    icon: Telescope,
    requiredModule: 'opportunities',
  },
  {
    name: 'Ideen',
    href: '/intern/ideas',
    icon: Lightbulb,
    requiredModule: 'ideas',
  },
  {
    name: 'Website',
    href: '/intern/website',
    icon: Globe,
    children: [
      { name: 'CMS Seiten', href: '/intern/cms', requiredModule: 'cms' },
      { name: 'Vorlagen', href: '/intern/cms/templates', requiredModule: 'cms' },
      { name: 'Navigation', href: '/intern/cms/navigation', requiredModule: 'cms' },
      { name: 'Blog', href: '/intern/blog', requiredModule: 'blog' },
    ],
  },
  {
    name: 'Marketing & KI',
    href: '/intern/marketing-ki',
    icon: Brain,
    children: [
      { name: 'Business Intelligence', href: '/intern/business-intelligence', requiredModule: 'business_intelligence' },
      { name: 'Marketing', href: '/intern/marketing', requiredModule: 'marketing' },
      { name: 'Social Media', href: '/intern/social-media', requiredModule: 'social_media' },
      { name: 'n8n Workflows', href: '/intern/n8n-workflows', requiredModule: 'n8n_workflows' },
      { name: 'KI-Chat', href: '/intern/chat', requiredModule: 'chat' },
    ],
  },
  {
    name: 'Cybersecurity',
    href: '/intern/cybersecurity',
    icon: Shield,
    children: [
      { name: 'DIN SPEC Audits', href: '/intern/din-audit', requiredModule: 'din_audits' },
      { name: 'WiBA-Checks', href: '/intern/wiba', requiredModule: 'wiba_audits' },
      { name: 'Foerdermittel', href: '/intern/din-audit/grants', requiredModule: 'din_grants' },
    ],
  },
  {
    name: 'Einstellungen',
    href: '/intern/settings',
    icon: Settings,
    children: [
      { name: 'Organisation', href: '/intern/settings/tenant', requiredModule: 'settings' },
      { name: 'Benutzer', href: '/intern/settings/users', requiredModule: 'users' },
      { name: 'Rollen', href: '/intern/settings/roles', requiredModule: 'roles' },
      { name: 'KI-Provider', href: '/intern/settings/ai-providers', requiredModule: 'ai_providers' },
      { name: 'KI-Prompts', href: '/intern/settings/ai-prompts', requiredModule: 'ai_prompts' },
      { name: 'KI-Logging', href: '/intern/settings/ai-logs', requiredModule: 'ai_logs' },
      { name: 'Webhooks', href: '/intern/settings/webhooks', requiredModule: 'webhooks' },
      { name: 'API-Schluessel', href: '/intern/settings/api-keys', requiredModule: 'api_keys' },
      { name: 'n8n-Verbindung', href: '/intern/settings/n8n', requiredModule: 'n8n_workflows' },
      { name: 'Datenbank', href: '/intern/settings/database', requiredModule: 'database' },
      { name: 'Export / Import', href: '/intern/settings/export', requiredModule: 'settings' },
      { name: 'App-Dokumentation', href: '/intern/settings/app-docs', requiredModule: 'settings' },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [manualToggles, setManualToggles] = useState<Record<string, boolean>>({})
  const { hasPermission, loading: permissionsLoading } = usePermissions()

  // Auto-expand groups whose href or children match the current path
  const isGroupActive = (item: NavItem): boolean => {
    if (item.href && pathname.startsWith(item.href)) return true
    if (item.children) return item.children.some((c) => pathname.startsWith(c.href))
    return false
  }

  const isExpanded = (name: string, item: NavItem): boolean => {
    // Manual toggle overrides auto-expand
    if (manualToggles[name] !== undefined) return manualToggles[name]
    // Auto-expand if active
    return isGroupActive(item)
  }

  const toggleExpanded = (name: string) => {
    setManualToggles((prev) => ({ ...prev, [name]: !isExpanded(name, navigation.find(n => n.name === name)!) }))
  }

  // Berechtigungscheck: Mindestens Lesen fuer das Modul
  const canAccessModule = (mod?: Module): boolean => {
    if (!mod) return true
    if (permissionsLoading) return true // Waehrend Laden alles anzeigen
    return hasPermission(mod, 'read')
  }

  // Kinder nach Berechtigung filtern
  const filterChildren = (children: NavChild[]): NavChild[] => {
    return children.filter((child) => canAccessModule(child.requiredModule))
  }

  return (
    <aside
      className={cn(
        'flex flex-col border-r bg-card transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex h-14 items-center justify-between border-b px-4">
        {!collapsed && (
          <Link href="/intern/dashboard" className="font-semibold text-lg hover:text-primary transition-colors">
            xKMU OS
            <sup className="ml-1 text-[10px] font-normal text-muted-foreground">v{packageJson.version}</sup>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? 'Seitenleiste ausklappen' : 'Seitenleiste einklappen'}
          className="h-8 w-8"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {navigation.map((item) => {
          // Top-Level mit requiredModule pruefen
          if (item.href && !canAccessModule(item.requiredModule)) return null

          if (item.children) {
            const visibleChildren = filterChildren(item.children)
            if (visibleChildren.length === 0) return null

            const expanded = isExpanded(item.name, item)
            const isActive = visibleChildren.some((child) =>
              child.href.length <= 10
                ? pathname === child.href
                : pathname.startsWith(child.href)
            )

            return (
              <div key={item.name}>
                {collapsed ? (
                  // Collapsed: icon links to category page
                  <Link
                    href={item.href || visibleChildren[0]?.href || '#'}
                    className={cn(
                      'flex w-full items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                    title={item.name}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                  </Link>
                ) : (
                  // Expanded: click toggles children, icon area links to category page
                  <div className="flex items-center">
                    <Link
                      href={item.href || '#'}
                      className={cn(
                        'flex items-center gap-3 rounded-l-md px-3 py-2 text-sm font-medium transition-colors flex-1',
                        isActive
                          ? 'bg-accent text-accent-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1 text-left">{item.name}</span>
                    </Link>
                    <button
                      onClick={() => toggleExpanded(item.name)}
                      className={cn(
                        'rounded-r-md px-2 py-2 text-sm transition-colors',
                        isActive
                          ? 'bg-accent text-accent-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      )}
                      aria-label={expanded ? `${item.name} einklappen` : `${item.name} ausklappen`}
                    >
                      <ChevronRight className={cn('h-4 w-4 transition-transform', expanded && 'rotate-90')} />
                    </button>
                  </div>
                )}
                {!collapsed && expanded && (
                  <div className="ml-7 mt-1 space-y-1">
                    {visibleChildren.map((child) => {
                      // Exact match for short paths like /settings, startsWith for longer paths
                      const isChildActive = child.href.length <= 10
                        ? pathname === child.href
                        : pathname.startsWith(child.href)
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            'block rounded-md px-3 py-2 text-sm transition-colors',
                            isChildActive
                              ? 'bg-accent text-accent-foreground'
                              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                          )}
                        >
                          {child.name}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          }

          const isActive = pathname === item.href

          return (
            <Link
              key={item.name}
              href={item.href!}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          )
        })}
      </nav>

    </aside>
  )
}
