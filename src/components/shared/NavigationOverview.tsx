'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight, Compass } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { navigation, type NavItem, type NavChild } from '@/components/layout/sidebar'
import { usePermissions } from '@/hooks/use-permissions'
import type { Module } from '@/lib/types/permissions'

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
        <CardContent className="pt-0 space-y-4">
          {visibleSections.map(({ section, allChildren }) => {
            const Icon = section.icon
            return (
              <div key={section.name} className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  <Icon className="h-4 w-4" />
                  {section.href ? (
                    <Link href={section.href} className="hover:text-foreground transition-colors">
                      {section.name}
                    </Link>
                  ) : (
                    <span>{section.name}</span>
                  )}
                </div>
                {allChildren.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pl-6">
                    {allChildren.map((child) => (
                      <Button
                        key={child.href}
                        asChild
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs font-normal"
                      >
                        <Link href={child.href}>{child.name}</Link>
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </CardContent>
      )}
    </Card>
  )
}
