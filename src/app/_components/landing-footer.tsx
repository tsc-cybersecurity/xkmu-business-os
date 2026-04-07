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
  const [footerText, setFooterText] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/v1/public/navigation?location=footer')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success && data.data?.length > 0) {
          setDynamicLinks(data.data)
        }
      })
      .catch(() => {})

    fetch('/api/v1/public/branding', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success && data.data) {
          const ft = data.data.footerText
          if (ft && typeof ft === 'string' && ft.trim().length > 0) {
            setFooterText(ft)
          }
        }
      })
      .catch(() => {})
  }, [])

  return (
    <footer className="border-t bg-background/80 backdrop-blur-sm mt-20">
      <div className="container mx-auto px-4 py-12">
        {dynamicLinks.length > 0 && (
          <div className="flex flex-wrap gap-x-8 gap-y-2 mb-8 text-sm text-muted-foreground">
            {dynamicLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                {...(item.openInNewTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                className="hover:text-foreground transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}

        <div className="border-t pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <p>{footerText ? footerText : <>&copy; {new Date().getFullYear()} XKMU Business OS. Alle Rechte vorbehalten.</>}</p>
        </div>
      </div>
    </footer>
  )
}
