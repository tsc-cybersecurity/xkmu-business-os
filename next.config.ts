import type { NextConfig } from "next";

// Detect if running in Docker/Coolify (standalone mode needed)
const isDocker = process.env.DOCKER === 'true' || process.env.COOLIFY === 'true';

const nextConfig: NextConfig = {
  // Standalone output for Docker/Coolify deployments
  // Vercel handles this automatically, so only enable for self-hosted
  ...(isDocker && { output: 'standalone' }),

  // Optimize external packages for serverless/Docker
  experimental: {
    serverComponentsExternalPackages: ['postgres', 'pdf-parse'],
  },

  // Environment variables that should be available at build time
  env: {
    // Add any build-time env vars here if needed
  },

  // CORS headers for API routes (works on all platforms, not just Vercel)
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-Api-Key',
          },
        ],
      },
    ]
  },
};

export default nextConfig;
