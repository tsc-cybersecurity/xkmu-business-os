import type { ReactNode } from 'react'
import Link from 'next/link'

export default function TermineLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 p-6">
      <header>
        <h1 className="text-2xl font-semibold">Termine</h1>
      </header>
      <nav className="flex gap-1 border-b">
        {[
          { href: '/intern/termine', label: 'Übersicht' },
          { href: '/intern/termine/slot-types', label: 'Termin-Arten' },
          { href: '/intern/termine/availability', label: 'Verfügbarkeit' },
        ].map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="px-4 py-2 text-sm font-medium border-b-2 border-transparent hover:border-primary/50 hover:text-foreground text-muted-foreground"
          >
            {label}
          </Link>
        ))}
      </nav>
      <div>{children}</div>
    </div>
  )
}
