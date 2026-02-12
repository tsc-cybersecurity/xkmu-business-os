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
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

const navigation = [
  {
    name: 'Dashboard',
    href: '/intern/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Kontakte',
    icon: Building2,
    children: [
      { name: 'Firmen', href: '/intern/contacts/companies' },
      { name: 'Personen', href: '/intern/contacts/persons' },
    ],
  },
  {
    name: 'Katalog',
    icon: Package,
    children: [
      { name: 'Produkte', href: '/intern/catalog/products' },
      { name: 'Dienstleistungen', href: '/intern/catalog/services' },
      { name: 'Kategorien', href: '/intern/catalog/categories' },
    ],
  },
  {
    name: 'Finanzen',
    icon: FileText,
    children: [
      { name: 'Rechnungen', href: '/intern/finance/invoices' },
      { name: 'Angebote', href: '/intern/finance/offers' },
    ],
  },
  {
    name: 'Leads',
    href: '/intern/leads',
    icon: TrendingUp,
  },
  {
    name: 'Ideen',
    href: '/intern/ideas',
    icon: Lightbulb,
  },
  {
    name: 'Einstellungen',
    icon: Settings,
    children: [
      { name: 'Übersicht', href: '/intern/settings' },
      { name: 'KI-Anbieter', href: '/intern/settings/ai-providers' },
      { name: 'KI-Prompts', href: '/intern/settings/ai-prompts' },
      { name: 'KI-Logging', href: '/intern/settings/ai-logs' },
      { name: 'Webhooks', href: '/intern/settings/webhooks' },
      { name: 'Benutzer', href: '/intern/settings/users' },
      { name: 'Rollen', href: '/intern/settings/roles' },
      { name: 'API-Schlüssel', href: '/intern/settings/api-keys' },
      { name: 'Organisation', href: '/intern/settings/tenant' },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [expandedItems, setExpandedItems] = useState<string[]>(['Kontakte'])

  const toggleExpanded = (name: string) => {
    setExpandedItems((prev) =>
      prev.includes(name)
        ? prev.filter((item) => item !== name)
        : [...prev, name]
    )
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
          <span className="font-semibold text-lg">xKMU OS</span>
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
          if (item.children) {
            const isExpanded = expandedItems.includes(item.name)
            const isActive = item.children.some((child) =>
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
                    {item.children.map((child) => {
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
              href={item.href}
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
