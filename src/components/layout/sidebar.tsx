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
  Lightbulb,
  Settings,
  Shield,
  Globe,
  ChevronLeft,
  ChevronRight,
  Brain,
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
    icon: Building2,
    children: [
      { name: 'Firmen', href: '/intern/contacts/companies', requiredModule: 'companies' },
      { name: 'Personen', href: '/intern/contacts/persons', requiredModule: 'persons' },
    ],
  },
  {
    name: 'Katalog',
    icon: Package,
    children: [
      { name: 'Produkte', href: '/intern/catalog/products', requiredModule: 'products' },
      { name: 'Dienstleistungen', href: '/intern/catalog/services', requiredModule: 'products' },
      { name: 'Kategorien', href: '/intern/catalog/categories', requiredModule: 'product_categories' },
    ],
  },
  {
    name: 'Finanzen',
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
    name: 'Ideen',
    href: '/intern/ideas',
    icon: Lightbulb,
    requiredModule: 'ideas',
  },
  {
    name: 'Website',
    icon: Globe,
    children: [
      { name: 'CMS Seiten', href: '/intern/cms', requiredModule: 'cms' },
      { name: 'Navigation', href: '/intern/cms/navigation', requiredModule: 'cms' },
      { name: 'Blog', href: '/intern/blog', requiredModule: 'blog' },
    ],
  },
  {
    name: 'Marketing & KI',
    icon: Brain,
    children: [
      { name: 'Business Intelligence', href: '/intern/business-intelligence', requiredModule: 'business_intelligence' },
      { name: 'Marketing', href: '/intern/marketing', requiredModule: 'marketing' },
      { name: 'Social Media', href: '/intern/social-media', requiredModule: 'social_media' },
    ],
  },
  {
    name: 'Cybersecurity',
    icon: Shield,
    children: [
      { name: 'DIN SPEC Audits', href: '/intern/din-audit', requiredModule: 'din_audits' },
      { name: 'Foerdermittel', href: '/intern/din-audit/grants', requiredModule: 'din_grants' },
      { name: 'Basisabsicherung', href: '/intern/cybersecurity/basisabsicherung', requiredModule: 'basisabsicherung' },
    ],
  },
  {
    name: 'Einstellungen',
    icon: Settings,
    children: [
      { name: 'Übersicht', href: '/intern/settings', requiredModule: 'settings' },
      { name: 'Integrations', href: '/intern/settings/ai-providers', requiredModule: 'ai_providers' },
      { name: 'KI-Prompts', href: '/intern/settings/ai-prompts', requiredModule: 'ai_prompts' },
      { name: 'KI-Logging', href: '/intern/settings/ai-logs', requiredModule: 'ai_logs' },
      { name: 'Webhooks', href: '/intern/settings/webhooks', requiredModule: 'webhooks' },
      { name: 'Benutzer', href: '/intern/settings/users', requiredModule: 'users' },
      { name: 'Rollen', href: '/intern/settings/roles', requiredModule: 'roles' },
      { name: 'API-Schlüssel', href: '/intern/settings/api-keys', requiredModule: 'api_keys' },
      { name: 'Organisation', href: '/intern/settings/tenant', requiredModule: 'settings' },
      { name: 'App-Dokumentation', href: '/intern/settings/app-docs', requiredModule: 'settings' },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [expandedItems, setExpandedItems] = useState<string[]>(['Kontakte'])
  const { hasPermission, loading: permissionsLoading } = usePermissions()

  const toggleExpanded = (name: string) => {
    setExpandedItems((prev) =>
      prev.includes(name)
        ? prev.filter((item) => item !== name)
        : [...prev, name]
    )
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
          <span className="font-semibold text-lg">
            xKMU OS
            <sup className="ml-1 text-[10px] font-normal text-muted-foreground">v{packageJson.version}</sup>
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      <nav className="flex-1 space-y-1 p-2">
        {navigation.map((item) => {
          // Top-Level mit requiredModule pruefen
          if (item.href && !canAccessModule(item.requiredModule)) return null

          if (item.children) {
            const visibleChildren = filterChildren(item.children)
            if (visibleChildren.length === 0) return null

            const isExpanded = expandedItems.includes(item.name)
            const isActive = visibleChildren.some((child) =>
              child.href.length <= 10
                ? pathname === child.href
                : pathname.startsWith(child.href)
            )

            return (
              <div key={item.name}>
                <button
                  onClick={() => toggleExpanded(item.name)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{item.name}</span>
                      <ChevronRight
                        className={cn(
                          'h-4 w-4 transition-transform',
                          isExpanded && 'rotate-90'
                        )}
                      />
                    </>
                  )}
                </button>
                {!collapsed && isExpanded && (
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
