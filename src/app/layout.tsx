import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { DesignProvider } from "./_components/design-provider";
import { db } from "@/lib/db";
import { cmsSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { OrganizationService } from "@/lib/services/organization.service";

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

// Public-facing canonical site URL — used in OG/Twitter/JSON-LD metadata.
// Overridable via NEXT_PUBLIC_SITE_URL fuer abweichende Deployments.
const PUBLIC_SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('localhost')
    ? process.env.NEXT_PUBLIC_SITE_URL
    : 'https://www.xkmu.de'
const DEFAULT_LOGO_URL = `${PUBLIC_SITE_URL}/xkmu_q_gross_slogan.png`

export const metadata: Metadata = {
  metadataBase: new URL(PUBLIC_SITE_URL),
  title: "xKMU Business OS",
  description: "Professionelles Business Operating System für KMU",
  openGraph: {
    type: 'website',
    siteName: 'xKMU Business OS',
    images: [{ url: DEFAULT_LOGO_URL, width: 400, height: 128, alt: 'xKMU Business OS' }],
  },
  twitter: {
    card: 'summary',
    site: '@xkmu',
  },
  icons: {
    icon: '/favicon.ico',
  },
};

async function loadBrandingLogoUrl(): Promise<string> {
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
    // ignore — fall back to default
  }
  return DEFAULT_LOGO_URL
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const logoUrl = await loadBrandingLogoUrl()
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'xKMU',
    url: PUBLIC_SITE_URL,
    logo: logoUrl,
  }

  return (
    <html lang="de">
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </head>
      <body
        className={`${ubuntu.variable} ${ubuntuMono.variable} ${inter.variable} ${roboto.variable} ${montserrat.variable} antialiased`}
      >
        <DesignProvider>{children}</DesignProvider>
      </body>
    </html>
  );
}
