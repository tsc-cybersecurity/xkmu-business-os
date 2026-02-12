import { LandingNavbar } from '../_components/landing-navbar'
import { LandingFooter } from '../_components/landing-footer'
import { Breadcrumb } from '../_components/breadcrumb'

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-[var(--brand-50)] to-[var(--brand-100)] dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
      <LandingNavbar />
      <main className="pt-[100px]">
        <Breadcrumb />
        {children}
      </main>
      <LandingFooter />
    </div>
  )
}
