'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Building2,
  Settings,
  Shield,
  Globe,
  ChevronLeft,
  ChevronRight,
  Brain,
  Monitor,
  ListTodo,
  Sun,
  Moon,
  MonitorSmartphone,
  LogOut,
  User,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePermissions } from '@/hooks/use-permissions'
import { useDesign } from '@/app/_components/design-provider'
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
    name: 'Cockpit',
    href: '/intern/cockpit',
    icon: Monitor,
    requiredModule: 'cockpit',
  },
  // ── CRM ──
  {
    name: 'CRM',
    href: '/intern/crm',
    icon: Building2,
    children: [
      { name: 'Firmen', href: '/intern/contacts/companies', requiredModule: 'companies' },
      { name: 'Personen', href: '/intern/contacts/persons', requiredModule: 'persons' },
      { name: 'Produkte', href: '/intern/catalog/products', requiredModule: 'products' },
      { name: 'Dienstleistungen', href: '/intern/catalog/services', requiredModule: 'products' },
      { name: 'Kategorien', href: '/intern/catalog/categories', requiredModule: 'product_categories' },
      { name: 'Rechnungen', href: '/intern/finance/invoices', requiredModule: 'documents' },
      { name: 'Angebote', href: '/intern/finance/offers', requiredModule: 'documents' },
      { name: 'Verträge', href: '/intern/finance/contracts', requiredModule: 'documents' },
      { name: 'Zeiterfassung', href: '/intern/zeiterfassung', requiredModule: 'time_entries' },
      { name: 'Leads', href: '/intern/leads', requiredModule: 'leads' },
      { name: 'Chancen', href: '/intern/chancen', requiredModule: 'opportunities' },
      { name: 'Ideen', href: '/intern/ideas', requiredModule: 'ideas' },
    ],
  },
  // ── CMS ──
  {
    name: 'CMS',
    href: '/intern/cms-hub',
    icon: Globe,
    children: [
      { name: 'Content', href: '/intern/cms', requiredModule: 'cms' },
      { name: 'Design', href: '/intern/cms/design', requiredModule: 'cms' },
      { name: 'Vorlagen', href: '/intern/cms/templates', requiredModule: 'cms' },
      { name: 'Navigation', href: '/intern/cms/navigation', requiredModule: 'cms' },
      { name: 'Blogartikel', href: '/intern/blog', requiredModule: 'blog' },
      { name: 'Kampagnen', href: '/intern/marketing', requiredModule: 'marketing' },
      { name: 'Social Media', href: '/intern/social-media', requiredModule: 'social_media' },
      { name: 'Newsletter', href: '/intern/marketing/newsletter', requiredModule: 'marketing' },
      { name: 'Bildgenerierung', href: '/intern/images', requiredModule: 'media' },
      { name: 'E-Mail-Vorlagen', href: '/intern/settings/email-templates', requiredModule: 'settings' },
    ],
  },
  // ── Intelligence ──
  {
    name: 'Intelligence',
    href: '/intern/intelligence',
    icon: Brain,
    children: [
      { name: 'Business Intelligence', href: '/intern/business-intelligence', requiredModule: 'business_intelligence' },
      { name: 'n8n Workflows', href: '/intern/n8n-workflows', requiredModule: 'n8n_workflows' },
      { name: 'KI-Chat', href: '/intern/chat', requiredModule: 'chat' },
      { name: 'Projekte', href: '/intern/projekte', requiredModule: 'processes' },
      { name: 'Prozesse', href: '/intern/prozesse', requiredModule: 'processes' },
      { name: 'Workflows', href: '/intern/settings/workflows', requiredModule: 'settings' },
    ],
  },
  // ── Cybersecurity ──
  {
    name: 'Cybersecurity',
    href: '/intern/cybersecurity',
    icon: Shield,
    children: [
      { name: 'CS DIN SPEC 27076', href: '/intern/din-audit', requiredModule: 'din_audits' },
      { name: 'CS WiBA-Check BSI', href: '/intern/wiba', requiredModule: 'wiba_audits' },
      { name: 'CS IT-Grundschutz++', href: '/intern/cybersecurity/grundschutz', requiredModule: 'basisabsicherung' },
      { name: 'CS IR Playbooks', href: '/intern/cybersecurity/ir-playbook', requiredModule: 'basisabsicherung' },
      { name: 'IT-Assets (Kunden)', href: '/intern/cybersecurity/grundschutz/assets', requiredModule: 'basisabsicherung' },
      { name: 'Fördermitteldatenbank', href: '/intern/din-audit/grants', requiredModule: 'din_grants' },
    ],
  },
  // ── Einstellungen ──
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
      { name: 'Datenbank', href: '/intern/settings/database', requiredModule: 'database' },
      { name: 'Mein Profil', href: '/intern/settings/profile', requiredModule: 'settings' },
    ],
  },
  // ── Task-Queue (standalone) ──
  {
    name: 'Task-Queue',
    href: '/intern/settings/task-queue',
    icon: ListTodo,
    requiredModule: 'settings',
  },
]

interface SidebarProps {
  user?: { firstName?: string | null; lastName?: string | null; email: string }
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [manualToggles, setManualToggles] = useState<Record<string, boolean>>({})
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const { hasPermission, loading: permissionsLoading } = usePermissions()
  const { theme, setTheme } = useDesign()

  const initials = user
    ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || user.email[0].toUpperCase()
    : 'U'
  const displayName = user
    ? (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email)
    : 'User'

  const handleLogout = async () => {
    await fetch('/api/v1/auth/logout', { method: 'POST' })
    router.push('/')
    router.refresh()
  }

  const cycleTheme = () => {
    const order = ['light', 'dark', 'system'] as const
    const idx = order.indexOf(theme)
    setTheme(order[(idx + 1) % order.length])
  }
  const ThemeIcon = theme === 'dark' ? Moon : theme === 'system' ? MonitorSmartphone : Sun
  const themeLabel = theme === 'dark' ? 'Dunkel' : theme === 'system' ? 'System' : 'Hell'

  // Auto-collapse sidebar on small screens
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) setCollapsed(true)
    }
    handleChange(mq)
    mq.addEventListener('change', handleChange)
    return () => mq.removeEventListener('change', handleChange)
  }, [])

  // Don't clear manual toggles on navigation - keep user's expand state

  // Auto-expand groups whose children match the current path
  const isGroupActive = (item: NavItem): boolean => {
    // Groups with children: only expand if a CHILD matches (not the parent href)
    if (item.children && item.children.length > 0) {
      return item.children.some((c) => pathname.startsWith(c.href))
    }
    // Standalone items: match by href
    if (item.href && pathname.startsWith(item.href)) return true
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

  // Berechtigungscheck: Mindestens Lesen für das Modul
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
                  // Expanded: click expands children AND navigates to hub page
                  <button
                    onClick={() => {
                      toggleExpanded(item.name)
                      if (item.href && !expanded) {
                        router.push(item.href)
                      }
                    }}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 text-left">{item.name}</span>
                    <ChevronRight className={cn('h-4 w-4 transition-transform', expanded && 'rotate-90')} />
                  </button>
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

      {/* Bottom: Website + Theme + User */}
      <div className="border-t p-2 space-y-1">
        {/* Quick links row */}
        <div className="flex items-center gap-1">
          <Link
            href="/"
            target="_blank"
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              collapsed ? 'justify-center flex-1' : 'flex-1'
            )}
            title="Webseite öffnen"
          >
            <Globe className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Webseite</span>}
            {!collapsed && <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground/50" />}
          </Link>
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={cycleTheme}
              title={`Theme: ${themeLabel}`}
            >
              <ThemeIcon className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* User */}
        {collapsed ? (
          <Link href="/intern/settings/profile" className="flex justify-center py-2" title={displayName}>
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
          </Link>
        ) : (
          <>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
              </Avatar>
              <span className="flex-1 text-left truncate">{displayName}</span>
              <ChevronRight className={cn('h-4 w-4 transition-transform', userMenuOpen && 'rotate-90')} />
            </button>
            {userMenuOpen && (
              <div className="ml-7 space-y-1">
                <Link
                  href="/intern/settings"
                  className="block rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  Einstellungen
                </Link>
                <Link
                  href="/intern/settings/profile"
                  className="block rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  Profil
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Abmelden
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  )
}
