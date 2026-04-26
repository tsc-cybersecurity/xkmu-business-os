import type { Metadata } from 'next'
import Link from 'next/link'
import { CsrfProvider } from '@/components/csrf-provider'
import { LogoutButton } from './_components/logout-button'
import { PortalNav } from './_components/portal-nav'

export const metadata: Metadata = {
  title: 'Kundenportal',
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <CsrfProvider>
      <div className="min-h-screen bg-muted/20 flex flex-col">
        <header className="border-b bg-background sticky top-0 z-30">
          <div className="container mx-auto flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex items-center gap-3 md:gap-6 min-w-0">
              <Link href="/portal" className="font-semibold truncate">
                Kundenportal
              </Link>
              <PortalNav />
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
