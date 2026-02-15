'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface FooterNavItem {
  label: string
  href: string
  openInNewTab: boolean
}

export function LandingFooter() {
  const [dynamicLinks, setDynamicLinks] = useState<FooterNavItem[]>([])

  useEffect(() => {
    fetch('/api/v1/public/navigation?location=footer')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success && data.data?.length > 0) {
          setDynamicLinks(data.data)
        }
      })
      .catch(() => {})
  }, [])

  return (
    <footer className="border-t bg-background/80 backdrop-blur-sm mt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          {dynamicLinks.length > 0 && (
            <div>
              <h3 className="font-semibold mb-4">Seiten</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {dynamicLinks.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      {...(item.openInNewTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                      className="hover:text-foreground transition-colors"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h3 className="font-semibold mb-4">Produkt</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/intern/register" className="hover:text-foreground transition-colors">
                  Kostenlos starten
                </Link>
              </li>
              <li>
                <Link href="/api-docs" className="hover:text-foreground transition-colors">
                  API-Dokumentation
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Rechtliches</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/agb" className="hover:text-foreground transition-colors">
                  AGB
                </Link>
              </li>
              <li>
                <Link href="/datenschutz" className="hover:text-foreground transition-colors">
                  Datenschutz
                </Link>
              </li>
              <li>
                <Link href="/impressum" className="hover:text-foreground transition-colors">
                  Impressum
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Support</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="mailto:support@example.com" className="hover:text-foreground transition-colors">
                  support@example.com
                </a>
              </li>
              <li>
                <Link href="/kontakt" className="hover:text-foreground transition-colors">
                  Kontakt
                </Link>
              </li>
              <li>
                <Link href="/intern/login" className="hover:text-foreground transition-colors">
                  Login
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} XKMU Business OS. Alle Rechte vorbehalten.</p>
          <div className="flex gap-6">
            <Link href="/agb" className="hover:text-foreground transition-colors">
              AGB
            </Link>
            <Link href="/impressum" className="hover:text-foreground transition-colors">
              Impressum
            </Link>
            <Link href="/api-docs" className="hover:text-foreground transition-colors">
              API
            </Link>
            <Link href="/kontakt" className="hover:text-foreground transition-colors">
              Kontakt
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
