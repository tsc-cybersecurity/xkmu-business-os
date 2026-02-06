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
};

export default nextConfig;
