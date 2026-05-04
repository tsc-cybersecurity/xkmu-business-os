import type { ReactNode } from 'react'
import Link from 'next/link'

export default function TermineLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Termine</h1>
        <nav className="flex gap-3 text-sm">
          <Link href="/intern/termine" className="text-muted-foreground hover:text-foreground">Übersicht</Link>
        </nav>
      </header>
      {children}
    </div>
  )
}
