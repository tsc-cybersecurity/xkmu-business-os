import type { MetadataRoute } from 'next'
import { headers } from 'next/headers'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://www.xkmu.de'

// Hosts die NICHT von Suchmaschinen indexiert werden sollen — z.B. Dev-
// Subdomains die noch im DNS stehen aber Google nichts angehen. robots.ts
// laeuft dynamisch und kann den Host-Header lesen.
const BLOCKED_HOSTS = ['bos.dev.xkmu.de']

export default async function robots(): Promise<MetadataRoute.Robots> {
  const hdrs = await headers()
  const host = (hdrs.get('host') ?? '').toLowerCase()

  if (BLOCKED_HOSTS.includes(host) || host.startsWith('bos.dev.')) {
    return {
      rules: [{ userAgent: '*', disallow: '/' }],
    }
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/intern/', '/api/', '/_next/'],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  }
}
