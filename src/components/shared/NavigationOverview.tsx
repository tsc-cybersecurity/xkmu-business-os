'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight, Compass } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu'
import { navigation, type NavItem, type NavChild } from '@/components/layout/sidebar'
import { usePermissions } from '@/hooks/use-permissions'
import type { Module } from '@/lib/types/permissions'
import { cn } from '@/lib/utils'

const STORAGE_KEY = 'xkmu_dashboard_nav_overview_open'

/**
 * Navigation-Schnellzugriff fuer das Dashboard. Listet alle Top-Level-Eintraege
 * der Sidebar mit ihren Children als gruppierte Buttons. Permission-gefiltert,
 * minimierbar, Persistierung in localStorage.
 *
 * Themenseiten-Tabs werden in der Subcategorie-Liste eingehaengt — pflegbar
 * ueber THEMENSEITEN_TABS unten. Wenn ein Top-Level-Eintrag eine `tabs`-Map
 * hat, werden die Tabs als zusaetzliche Buttons unter den children gerendert.
 */
type Permissions = ReturnType<typeof usePermissions>

function canSee(item: NavItem | NavChild, perms: Permissions): boolean {
  if (!item.requiredModule) return true
  return perms.hasPermission(item.requiredModule as Module, 'read')
}

// Tabs/Unterseiten der jeweiligen Themenseiten — manuell gepflegt.
// Key = Top-Level-Name aus navigation[]; Value = zusaetzliche Buttons.
const THEMENSEITEN_TABS: Record<string, NavChild[]> = {
  CRM: [
    { name: 'Geburtstage', href: '/intern/contacts/persons/birthdays', requiredModule: 'persons' as Module },
  ],
  CMS: [
    { name: 'Medien-Galerie', href: '/intern/images', requiredModule: 'media' as Module },
    { name: 'Social Media · Themen', href: '/intern/social-media/topics', requiredModule: 'social_media' as Module },
    { name: 'Social Media · Contentplan', href: '/intern/social-media/content-plan', requiredModule: 'social_media' as Module },
  ],
  Cybersecurity: [
    { name: 'CS Risiko-Matrix', href: '/intern/cybersecurity/risk-matrix', requiredModule: 'basisabsicherung' as Module },
  ],
  Management: [
    { name: 'Termine', href: '/intern/termine' },
    { name: 'Termin-Verfügbarkeit', href: '/intern/termine/availability' },
    { name: 'Termin-Arten', href: '/intern/termine/slot-types' },
  ],
  Einstellungen: [
    { name: 'Workflow-Designer', href: '/intern/settings/workflows' },
  ],
}

export function NavigationOverview() {
  const [open, setOpen] = useState(true)
  const perms = usePermissions()

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
    if (stored !== null) setOpen(stored === '1')
  }, [])

  const toggle = () => {
    const next = !open
    setOpen(next)
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
  }

  const visibleSections = navigation
    .map((section) => {
      if (!canSee(section, perms)) return null
      const childItems = (section.children ?? []).filter((c) => canSee(c, perms))
      const extraTabs = (THEMENSEITEN_TABS[section.name] ?? []).filter((c) => canSee(c, perms))
      const allChildren = [...childItems, ...extraTabs]
      // Section ohne Children + ohne href → unsinnig zu zeigen
      if (allChildren.length === 0 && !section.href) return null
      return { section, allChildren }
    })
    .filter((x): x is { section: NavItem; allChildren: NavChild[] } => x !== null)

  return (
    <Card>
      <CardHeader className="pb-3">
        <button
          type="button"
          onClick={toggle}
          className="flex w-full items-center justify-between text-left"
          aria-expanded={open}
        >
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Compass className="h-5 w-5 text-primary" />
            Schnell-Navigation
            <span className="text-xs font-normal text-muted-foreground">
              ({visibleSections.length} Bereiche)
            </span>
          </CardTitle>
          {open ? (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          )}
        </button>
      </CardHeader>
      {open && (
        <CardContent className="pt-0">
          {/* shadcn NavigationMenu: Top-Level-Bereiche horizontal mit Wrap; Sub-Items als Dropdown.
              viewport={false} — Dropdowns positionieren absolut unter dem jeweiligen Trigger,
              damit flex-wrap mit 15+ Triggern korrekt funktioniert. */}
          <NavigationMenu viewport={false} className="max-w-full">
            <NavigationMenuList className="flex-wrap justify-start gap-x-1 gap-y-1.5">
              {visibleSections.map(({ section, allChildren }) => {
                const Icon = section.icon

                // Bereich ohne Sub-Items → direkter Link
                if (allChildren.length === 0 && section.href) {
                  return (
                    <NavigationMenuItem key={section.name}>
                      <NavigationMenuLink
                        asChild
                        className={cn(navigationMenuTriggerStyle(), 'h-8 px-3 text-xs font-medium')}
                      >
                        <Link href={section.href}>
                          <Icon className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                          {section.name}
                        </Link>
                      </NavigationMenuLink>
                    </NavigationMenuItem>
                  )
                }

                // Bereich mit Sub-Items → Trigger + Dropdown
                return (
                  <NavigationMenuItem key={section.name}>
                    <NavigationMenuTrigger className="h-8 px-3 text-xs font-medium">
                      <Icon className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                      {section.name}
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <ul className="grid w-[260px] gap-0.5 p-2">
                        {section.href && (
                          <li>
                            <NavigationMenuLink asChild>
                              <Link
                                href={section.href}
                                className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-xs font-semibold text-foreground hover:bg-accent"
                              >
                                <Icon className="h-3.5 w-3.5" />
                                {section.name} – Übersicht
                              </Link>
                            </NavigationMenuLink>
                          </li>
                        )}
                        {allChildren.map((child) => (
                          <li key={child.href}>
                            <NavigationMenuLink asChild>
                              <Link
                                href={child.href}
                                className="block rounded-sm px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                              >
                                {child.name}
                              </Link>
                            </NavigationMenuLink>
                          </li>
                        ))}
                      </ul>
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                )
              })}
            </NavigationMenuList>
          </NavigationMenu>
        </CardContent>
      )}
    </Card>
  )
}
