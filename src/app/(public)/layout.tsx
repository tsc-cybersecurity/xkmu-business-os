import Script from 'next/script'
import { LandingNavbar } from '../_components/landing-navbar'
import { LandingFooter } from '../_components/landing-footer'
import { Breadcrumb } from '../_components/breadcrumb'

// Matomo-Tracker fuer alle oeffentlichen (CMS-)Seiten.
// Konfigurierbar ueber NEXT_PUBLIC_MATOMO_URL / NEXT_PUBLIC_MATOMO_SITE_ID;
// leere Werte deaktivieren das Tracking (z.B. in dev/staging).
const MATOMO_URL = process.env.NEXT_PUBLIC_MATOMO_URL ?? 'https://statistik.xkmu.de'
const MATOMO_SITE_ID = process.env.NEXT_PUBLIC_MATOMO_SITE_ID ?? '2'
const MATOMO_ENABLED = Boolean(MATOMO_URL && MATOMO_SITE_ID)

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-[var(--brand-50)] to-[var(--brand-100)] dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
      {MATOMO_ENABLED && (
        <Script id="matomo-tracker" strategy="afterInteractive">
          {`
            var _paq = window._paq = window._paq || [];
            _paq.push(['trackPageView']);
            _paq.push(['enableLinkTracking']);
            (function() {
              var u="${MATOMO_URL.replace(/\/$/, '')}/";
              _paq.push(['setTrackerUrl', u+'matomo.php']);
              _paq.push(['setSiteId', '${MATOMO_SITE_ID}']);
              var d=document, g=d.createElement('script'), s=d.getElementsByTagName('script')[0];
              g.async=true; g.src=u+'matomo.js'; s.parentNode.insertBefore(g,s);
            })();
          `}
        </Script>
      )}
      <LandingNavbar />
      <main className="pt-[100px]">
        <Breadcrumb />
        {children}
      </main>
      <LandingFooter />
    </div>
  )
}
