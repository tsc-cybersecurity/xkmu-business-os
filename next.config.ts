import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Remove standalone for Vercel - it handles this automatically
  // output: 'standalone', // Only needed for Docker/self-hosted

  // Vercel-optimized settings
  experimental: {
    // Optimize serverless functions
    serverComponentsExternalPackages: ['postgres', 'pdf-parse'],
  },

  // Skip type checking during build if needed (Vercel runs it separately)
  // typescript: {
  //   ignoreBuildErrors: true,
  // },

  // Environment variables that should be available at build time
  env: {
    // Add any build-time env vars here if needed
  },

  // Disable image optimization if not using Vercel's image service
  // images: {
  //   unoptimized: true,
  // },
};

export default nextConfig;
