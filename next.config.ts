import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === 'development'

const cspDirectives = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  `style-src 'self'${isDev ? " 'unsafe-inline'" : ''}`,
  "img-src 'self' data: https:",
  "font-src 'self'",
  `connect-src 'self'${isDev ? ' ws://localhost:*' : ''}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
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

  // Limit request body size to 10MB (default is unlimited)
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
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
      // NOTE: No CORS block here. CORS is handled in src/proxy.ts where
      // request headers (Origin) are readable. next.config.ts headers()
      // cannot read request headers — dynamic origin checks are impossible here.
    ]
  },
};

export default nextConfig;
