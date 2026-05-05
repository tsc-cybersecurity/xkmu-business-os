'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/portal/company', label: 'Firmendaten' },
  { href: '/portal/contracts', label: 'Verträge' },
  { href: '/portal/projects', label: 'Projekte' },
  { href: '/portal/orders', label: 'Aufträge' },
  { href: '/portal/termin', label: 'Termine' },
  { href: '/portal/documents', label: 'Dokumente' },
  { href: '/portal/kurse', label: 'Onlinekurse' },
  { href: '/portal/chat', label: 'Chat' },
  { href: '/portal/company/requests', label: 'Anträge' },
]

function isActive(pathname: string, href: string): boolean {
  if (href === '/portal/company') {
    // Company is active only when not deeper on /requests
    return pathname === '/portal/company' || pathname.startsWith('/portal/company/') && !pathname.startsWith('/portal/company/requests')
  }
  return pathname === href || pathname.startsWith(href + '/')
}

export function PortalNav() {
  const pathname = usePathname() ?? ''
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Desktop: inline */}
      <nav className="hidden md:flex items-center gap-4">
        {NAV_ITEMS.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'text-sm transition-colors hover:text-foreground',
              isActive(pathname, item.href) ? 'text-foreground font-medium' : 'text-muted-foreground',
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Mobile: hamburger + drawer */}
      <div className="md:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Navigation öffnen">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <SheetHeader className="border-b p-4">
              <SheetTitle>Kundenportal</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col p-2">
              {NAV_ITEMS.map(item => {
                const active = isActive(pathname, item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'rounded-md px-3 py-2.5 text-sm transition-colors',
                      active
                        ? 'bg-muted font-medium text-foreground'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                    )}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}
