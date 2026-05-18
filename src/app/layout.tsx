import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { DesignProvider } from "./_components/design-provider";
import { db } from "@/lib/db";
import { cmsSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { OrganizationService } from "@/lib/services/organization.service";
import { CmsDesignService } from "@/lib/services/cms-design.service";
import { buildOrganizationJsonLd } from "@/lib/seo/organization-schema";

const ubuntu = localFont({
  src: "./fonts/ubuntu-regular.woff2",
  variable: "--font-ubuntu",
  weight: "400",
  display: "swap",
});

const ubuntuMono = localFont({
  src: "./fonts/ubuntu-mono-regular.woff2",
  variable: "--font-ubuntu-mono",
  weight: "400",
  display: "swap",
});

const inter = localFont({
  src: "./fonts/inter-variable.woff2",
  variable: "--font-inter",
  display: "swap",
});

const roboto = localFont({
  src: "./fonts/roboto-variable.woff2",
  variable: "--font-roboto",
  display: "swap",
});

const montserrat = localFont({
  src: "./fonts/montserrat-variable.woff2",
  variable: "--font-montserrat",
  display: "swap",
});

// Fallback-Host wenn CmsDesignService nichts liefert. NEXT_PUBLIC_SITE_URL
// hat Vorrang vor NEXT_PUBLIC_APP_URL; 'localhost' wird gefiltert, weil
// OG-Crawler absolute Produktions-URLs erwarten.
const PUBLIC_SITE_URL_FALLBACK =
  process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('localhost')
    ? process.env.NEXT_PUBLIC_SITE_URL
    : 'https://www.xkmu.de'

// metadataBase wird vom CMS-Design-Setting gesteuert (Operator pflegt das
// unter /intern/cms/design). Jede Page kann dann `alternates.canonical`
// als relativen Pfad setzen — Next resolvet ihn gegen diese Base.
// generateMetadata statt const, damit der DB-Lookup pro Request laeuft.
export async function generateMetadata(): Promise<Metadata> {
  let baseUrl = PUBLIC_SITE_URL_FALLBACK
  try {
    baseUrl = await CmsDesignService.getAppUrl()
  } catch {
    // DB nicht erreichbar → Fallback
  }
  return {
    metadataBase: new URL(baseUrl),
    title: "xKMU Business OS",
    description: "Professionelles Business Operating System für KMU",
    alternates: { canonical: baseUrl },
    openGraph: {
      type: 'website',
      siteName: 'xKMU Business OS',
      url: baseUrl,
    },
    twitter: {
      card: 'summary',
      site: '@xkmu',
    },
    icons: {
      icon: '/favicon.ico',
    },
  }
}

async function loadBrandingLogoUrl(): Promise<string | null> {
  try {
    const [row] = await db
      .select({ value: cmsSettings.value })
      .from(cmsSettings)
      .where(eq(cmsSettings.key, 'design'))
      .limit(1)
    const designLogo = (row?.value as Record<string, unknown> | undefined)?.logoUrl as string | undefined
    if (designLogo) return designLogo

    const org = await OrganizationService.getById()
    const orgLogo = (org?.settings as Record<string, unknown> | undefined)?.logoUrl as string | undefined
    if (orgLogo) return orgLogo
  } catch {
    // ignore — no logo configured
  }
  return null
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const logoUrl = await loadBrandingLogoUrl()
  let siteUrl = PUBLIC_SITE_URL_FALLBACK
  try {
    siteUrl = await CmsDesignService.getAppUrl()
  } catch {
    // ignore — fallback bleibt aktiv
  }
  const jsonLdGraph = buildOrganizationJsonLd({ siteUrl, logoUrl })

  return (
    <html lang="de-DE">
      <head>
        {jsonLdGraph.map((schema, i) => (
          <script key={i} type="application/ld+json">{JSON.stringify(schema)}</script>
        ))}
      </head>
      <body
        className={`${ubuntu.variable} ${ubuntuMono.variable} ${inter.variable} ${roboto.variable} ${montserrat.variable} antialiased`}
      >
        <DesignProvider>{children}</DesignProvider>
      </body>
    </html>
  );
}
