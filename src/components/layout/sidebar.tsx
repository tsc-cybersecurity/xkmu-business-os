'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  // Layout / Top-Level
  LayoutDashboard, Building2, Settings, Shield, Globe, Brain, Bot, Monitor,
  ListTodo, Mail, MessageCircle, GraduationCap, CalendarDays, ClipboardList,
  ListOrdered, Briefcase, Phone,
  // System-UI
  ChevronLeft, ChevronRight, Sun, Moon, MonitorSmartphone, LogOut, User,
  ExternalLink,
  // CRM
  Building, Users, Package, Wrench, Tag, Receipt, FileText, FileSignature,
  Clock, UserPlus, Target, Lightbulb,
  // CMS
  BookOpen, Palette, Map, LayoutTemplate, Menu, Newspaper, Folder, Megaphone,
  Share2, CalendarClock, MailOpen, Rss, Image as ImageIcon, PanelRight,
  // Intelligence
  BarChart3, Workflow, MessageSquare, FolderKanban, Network,
  // Agents
  Gauge, Goal, Database, FileCode, Euro,
  // Cybersecurity
  ScrollText, Bug, Lock, BookOpenCheck, Laptop, Banknote,
  // Management
  Compass, PackageCheck,
  // Einstellungen
  UserCog, Cpu, Sparkles, MessageSquarePlus, FileSearch, Inbox, Link2,
  FolderTree, AlarmClock, UserCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePermissions } from '@/hooks/use-permissions'
import { useDesign } from '@/app/_components/design-provider'
import type { Module } from '@/lib/types/permissions'
import packageJson from '../../../package.json'

export interface NavChild {
  name: string
  href: string
  requiredModule?: Module
  icon?: typeof LayoutDashboard
}

export interface NavItem {
  name: string
  href?: string
  icon: typeof LayoutDashboard
  requiredModule?: Module
  children?: NavChild[]
}

export const navigation: NavItem[] = [
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
      { name: 'Firmen',           href: '/intern/contacts/companies',  icon: Building,       requiredModule: 'companies' },
      { name: 'Personen',         href: '/intern/contacts/persons',    icon: Users,          requiredModule: 'persons' },
      { name: 'Produkte',         href: '/intern/catalog/products',    icon: Package,        requiredModule: 'products' },
      { name: 'Dienstleistungen', href: '/intern/catalog/services',    icon: Wrench,         requiredModule: 'products' },
      { name: 'Kategorien',       href: '/intern/catalog/categories',  icon: Tag,            requiredModule: 'product_categories' },
      { name: 'Rechnungen',       href: '/intern/finance/invoices',    icon: Receipt,        requiredModule: 'documents' },
      { name: 'Angebote',         href: '/intern/finance/offers',      icon: FileText,       requiredModule: 'documents' },
      { name: 'Verträge',         href: '/intern/finance/contracts',   icon: FileSignature,  requiredModule: 'documents' },
      { name: 'Zeiterfassung',    href: '/intern/zeiterfassung',       icon: Clock,          requiredModule: 'time_entries' },
      { name: 'Leads',            href: '/intern/leads',               icon: UserPlus,       requiredModule: 'leads' },
      { name: 'Chancen',          href: '/intern/chancen',             icon: Target,         requiredModule: 'opportunities' },
      { name: 'Ideen',            href: '/intern/ideas',               icon: Lightbulb,      requiredModule: 'ideas' },
    ],
  },
  // ── CMS ──
  {
    name: 'CMS',
    href: '/intern/cms-hub',
    icon: Globe,
    children: [
      { name: 'Content',           href: '/intern/cms',                       icon: BookOpen,       requiredModule: 'cms' },
      { name: 'Promo-Slots',       href: '/intern/cms/promos',                icon: Megaphone,      requiredModule: 'cms' },
      { name: 'Design',            href: '/intern/cms/design',                icon: Palette,        requiredModule: 'cms' },
      { name: 'Sitemap',           href: '/intern/cms/sitemap',               icon: Map,            requiredModule: 'cms' },
      { name: 'Vorlagen',          href: '/intern/cms/templates',             icon: LayoutTemplate, requiredModule: 'cms' },
      { name: 'Navigation',        href: '/intern/cms/navigation',            icon: Menu,           requiredModule: 'cms' },
      { name: 'Blogartikel',       href: '/intern/blog',                      icon: Newspaper,      requiredModule: 'blog' },
      { name: 'Blog-Kategorien',   href: '/intern/cms/blog-categories',       icon: Folder,         requiredModule: 'blog' },
      { name: 'Blog-Sidebar',      href: '/intern/cms/blog-sidebar',          icon: PanelRight,     requiredModule: 'blog' },
      { name: 'Kampagnen',         href: '/intern/marketing',                 icon: Megaphone,      requiredModule: 'marketing' },
      { name: 'Social Media',      href: '/intern/social-media',              icon: Share2,         requiredModule: 'social_media' },
      { name: 'Posting-Kalender',  href: '/intern/social-media/kalender',     icon: CalendarClock,  requiredModule: 'social_media' },
      { name: 'Newsletter',        href: '/intern/marketing/newsletter',      icon: MailOpen,       requiredModule: 'marketing' },
      { name: 'News-Modul',        href: '/intern/news',                      icon: Rss,            requiredModule: 'news' },
      { name: 'Bildgenerierung',   href: '/intern/images',                    icon: ImageIcon,      requiredModule: 'media' },
    ],
  },
  // ── Intelligence ──
  {
    name: 'Intelligence',
    href: '/intern/intelligence',
    icon: Brain,
    children: [
      { name: 'Business Intelligence', href: '/intern/business-intelligence', icon: BarChart3,    requiredModule: 'business_intelligence' },
      { name: 'Businessplan-KI',       href: '/intern/business-plans',        icon: Briefcase,    requiredModule: 'business_plans' },
      { name: 'n8n Workflows',         href: '/intern/n8n-workflows',         icon: Network,      requiredModule: 'n8n_workflows' },
      { name: 'KI-Chat',               href: '/intern/chat',                  icon: MessageSquare,requiredModule: 'chat' },
      { name: 'Projekte',              href: '/intern/projekte',              icon: FolderKanban, requiredModule: 'processes' },
      { name: 'Workflows',             href: '/intern/settings/workflows',    icon: Workflow,     requiredModule: 'settings' },
    ],
  },
  // ── Agents ──
  {
    name: 'Agents',
    href: '/intern/agents',
    icon: Bot,
    children: [
      { name: 'Dashboard',    href: '/intern/agents',             icon: Gauge },
      { name: 'Goals',        href: '/intern/agents/goals',       icon: Goal },
      { name: 'Memory',       href: '/intern/agents/memory',      icon: Database },
      { name: 'Definitions',  href: '/intern/agents/definitions', icon: FileCode },
      { name: 'Templates',    href: '/intern/agents/templates',   icon: LayoutTemplate },
      { name: 'Kosten',       href: '/intern/agents/cost',        icon: Euro },
      { name: 'Voice-Agents', href: '/intern/agents/voice',       icon: Phone },
    ],
  },
  // ── Cybersecurity ──
  {
    name: 'Cybersecurity',
    href: '/intern/cybersecurity',
    icon: Shield,
    children: [
      { name: 'CS DIN SPEC 27076',     href: '/intern/din-audit',                       icon: ScrollText,     requiredModule: 'din_audits' },
      { name: 'CS WiBA-Check BSI',     href: '/intern/wiba',                            icon: Bug,            requiredModule: 'wiba_audits' },
      { name: 'CS IT-Grundschutz++',   href: '/intern/cybersecurity/grundschutz',       icon: Lock,           requiredModule: 'basisabsicherung' },
      { name: 'CS IR Playbooks',       href: '/intern/cybersecurity/ir-playbook',       icon: BookOpenCheck,  requiredModule: 'basisabsicherung' },
      { name: 'IT-Assets (Kunden)',    href: '/intern/cybersecurity/grundschutz/assets',icon: Laptop,         requiredModule: 'basisabsicherung' },
      { name: 'Fördermitteldatenbank', href: '/intern/din-audit/grants',                icon: Banknote,       requiredModule: 'din_grants' },
    ],
  },
  // ── Management ──
  {
    name: 'Management',
    href: '/intern/management',
    icon: Briefcase,
    children: [
      { name: 'Dashboard',     href: '/intern/management',              icon: Gauge },
      { name: 'EOS Framework', href: '/intern/management/eos',          icon: Compass },
      { name: 'OKR Ziele',     href: '/intern/management/okr',          icon: Target },
      { name: 'Prozesse',      href: '/intern/management/sops',         icon: Workflow },
      { name: 'Deliverables',  href: '/intern/management/deliverables', icon: PackageCheck },
    ],
  },
  // ── Einstellungen ──
  {
    name: 'Einstellungen',
    href: '/intern/settings',
    icon: Settings,
    children: [
      { name: 'Organisation',             href: '/intern/settings/organization',                icon: Building,           requiredModule: 'settings' },
      { name: 'Benutzer',                 href: '/intern/settings/users',                       icon: Users,              requiredModule: 'users' },
      { name: 'Rollen',                   href: '/intern/settings/roles',                       icon: UserCog,            requiredModule: 'roles' },
      { name: 'KI-Provider',              href: '/intern/settings/ai-providers',                icon: Cpu,                requiredModule: 'ai_providers' },
      { name: 'KI-Prompts',               href: '/intern/settings/ai-prompts',                  icon: Sparkles,           requiredModule: 'ai_prompts' },
      { name: 'Eigene Prompts',           href: '/intern/settings/custom-prompts',              icon: MessageSquarePlus,  requiredModule: 'ai_prompts' },
      { name: 'KI-Logging',               href: '/intern/settings/ai-logs',                     icon: FileSearch,         requiredModule: 'ai_logs' },
      { name: 'E-Mail (IMAP)',            href: '/intern/settings/email-imap',                  icon: Inbox,              requiredModule: 'settings' },
      { name: 'E-Mail (Vorlagen)',        href: '/intern/settings/email-templates',             icon: MailOpen,           requiredModule: 'settings' },
      { name: 'Social Media Connectoren', href: '/intern/integrations/social',                  icon: Link2,              requiredModule: 'social_media' },
      { name: 'Portal-Dok.-Kategorien',   href: '/intern/settings/portal-document-categories',  icon: FolderTree,         requiredModule: 'settings' },
      { name: 'Cron-Jobs',                href: '/intern/settings/cron-jobs',                   icon: AlarmClock,         requiredModule: 'settings' },
      { name: 'Datenbank',                href: '/intern/settings/database',                    icon: Database,           requiredModule: 'database' },
      { name: 'Mein Profil',              href: '/intern/settings/profile',                     icon: UserCircle,         requiredModule: 'settings' },
    ],
  },
  // ── Task-Queue (standalone) ──
  {
    name: 'Task-Queue',
    href: '/intern/settings/task-queue',
    icon: ListTodo,
    requiredModule: 'settings',
  },
  // ── Portal-Anträge (standalone) ──
  {
    name: 'Portal-Anträge',
    href: '/intern/portal/change-requests',
    icon: ClipboardList,
    requiredModule: 'users',
  },
  // ── Aufträge (standalone) ──
  {
    name: 'Aufträge',
    href: '/intern/orders',
    icon: ListOrdered,
    requiredModule: 'users',
  },
  // ── Onlinekurse (standalone) ──
  {
    name: 'Onlinekurse',
    href: '/intern/elearning',
    icon: GraduationCap,
    requiredModule: 'courses',
  },
  // ── Termine (standalone) ──
  {
    name: 'Termine',
    href: '/intern/termine',
    icon: CalendarDays,
    requiredModule: 'appointments',
  },
  // ── E-Mail Inbox (standalone) ──
  {
    name: 'E-Mail Inbox',
    href: '/intern/emails',
    icon: Mail,
    requiredModule: 'settings',
  },
  // ── Kunden-Chat (standalone) ──
  {
    name: 'Kunden-Chat',
    href: '/intern/portal/chat',
    icon: MessageCircle,
    requiredModule: 'users',
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
          <Link href="/intern/dashboard" className="hover:text-primary transition-colors leading-tight">
            <div className="font-semibold text-lg">xKMU BusinessOS</div>
            <div className="text-[10px] text-muted-foreground">v{packageJson.version}</div>
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
                      const ChildIcon = child.icon
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                            isChildActive
                              ? 'bg-accent text-accent-foreground'
                              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                          )}
                        >
                          {ChildIcon && <ChildIcon className="h-3.5 w-3.5 shrink-0" />}
                          <span className="truncate">{child.name}</span>
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
          <div className="flex flex-col items-center gap-1 py-2">
            <Link href="/intern/settings/profile" className="flex justify-center" title={displayName}>
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
            </Link>
            <button
              onClick={handleLogout}
              className="flex h-8 w-8 items-center justify-center rounded-md text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              title="Abmelden"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex flex-1 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
                </Avatar>
                <span className="flex-1 text-left truncate">{displayName}</span>
                <ChevronRight className={cn('h-4 w-4 transition-transform', userMenuOpen && 'rotate-90')} />
              </button>
              <button
                onClick={handleLogout}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                title="Abmelden"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
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
