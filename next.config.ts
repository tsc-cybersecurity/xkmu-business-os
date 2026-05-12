import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === 'development'

// Matomo-Tracker (siehe src/app/(public)/layout.tsx) laedt scripts und
// schickt Beacons an statistik.xkmu.de — muss in script-src + connect-src
// erlaubt sein, sonst blockiert CSP.
const MATOMO_URL = (process.env.NEXT_PUBLIC_MATOMO_URL ?? 'https://statistik.xkmu.de').replace(/\/$/, '')

// 'unsafe-inline' fuer style-src ist bei Next.js/React-Apps Standard:
// Next injiziert Inline-Styles fuer Font-Loading, Hydration und dynamische
// Werte (z.B. Slot-Type-Farben im Wochenkalender). XSS-Risiko via Style ist
// gering im Vergleich zu Script.
// 'upgrade-insecure-requests' wird in Report-Only-Policies vom Browser
// ignoriert (Konsolen-Warnung) und erst beim Wechsel auf enforce sinnvoll.
const cspDirectives = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${MATOMO_URL}${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self'",
  `connect-src 'self' ${MATOMO_URL}${isDev ? ' ws://localhost:*' : ''}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ')

const nextConfig: NextConfig = {
  // Standalone output for Docker deployments
  output: 'standalone',

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.xkmu.de',
      },
    ],
  },

  serverExternalPackages: ['postgres', 'pdf-parse'],

  // Body-Limit für Server-Actions (10mb für CRUD); Course-Asset-Uploads laufen
  // über reguläre API-Routen mit FormData und werden vom Reverse-Proxy begrenzt
  // (Coolify/NGINX: client_max_body_size 2200m).
  experimental: {
    serverActions: {
      bodySizeLimit: '2200mb',
    },
  },

  // /blog/<slug> → /it-news/<slug> (permanent). Aliase fuer Bestands-Links;
  // CMS publiziert intern unter /it-news, externe Links nutzen oft /blog.
  async redirects() {
    return [
      { source: '/blog', destination: '/it-news', permanent: true },
      { source: '/blog/:slug*', destination: '/it-news/:slug*', permanent: true },
    ]
  },

  // Security headers for all responses
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()',
          },
          // Report-Only: violations are reported but NOT blocked.
          // After verifying zero violations in Docker production build,
          // switch key to 'Content-Security-Policy' to enforce.
          { key: 'Content-Security-Policy-Report-Only', value: cspDirectives },
        ],
      },
      // SCORM-Iframe-Override: SCORM-Inhalte werden in einem Iframe der EIGENEN
      // Domain geladen — der globale X-Frame-Options=DENY wuerde das blocken.
      // Reihenfolge ist wichtig: dieser Eintrag MUSS nach dem globalen kommen,
      // damit die Header bei Doppelung die strengere Variante ersetzen.
      {
        source: '/api/v1/courses/:courseId/scorm/:packageId/serve/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
        ],
      },
      // NOTE: No CORS block here. CORS is handled in src/proxy.ts where
      // request headers (Origin) are readable. next.config.ts headers()
      // cannot read request headers — dynamic origin checks are impossible here.
    ]
  },
};

export default nextConfig;
