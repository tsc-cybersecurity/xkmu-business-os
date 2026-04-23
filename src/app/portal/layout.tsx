import type { Metadata } from 'next'
import Link from 'next/link'
import { CsrfProvider } from '@/components/csrf-provider'
import { LogoutButton } from './_components/logout-button'

export const metadata: Metadata = {
  title: 'Kundenportal',
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <CsrfProvider>
      <div className="min-h-screen bg-muted/20 flex flex-col">
        <header className="border-b bg-background">
          <div className="container mx-auto flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-6">
              <Link href="/portal" className="font-semibold">
                Kundenportal
              </Link>
              <nav className="flex items-center gap-4">
                <Link href="/portal/company" className="text-sm text-muted-foreground hover:text-foreground">Firmendaten</Link>
                <Link href="/portal/contracts" className="text-sm text-muted-foreground hover:text-foreground">Verträge</Link>
                <Link href="/portal/projects" className="text-sm text-muted-foreground hover:text-foreground">Projekte</Link>
                <Link href="/portal/company/requests" className="text-sm text-muted-foreground hover:text-foreground">Anträge</Link>
              </nav>
            </div>
            <LogoutButton />
          </div>
        </header>
        <main className="flex-1 container mx-auto px-4 py-8">
          {children}
        </main>
        <footer className="border-t py-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} · Kundenportal
        </footer>
      </div>
    </CsrfProvider>
  )
}
